import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import usePromptReadiness from "../usePromptReadiness";

function createAnalyzer() {
  const calls = [];
  const analyze = vi.fn((payload, { signal } = {}) => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    calls.push({ payload, signal, resolve, reject });
    return promise;
  });
  return { analyze, calls };
}

function response(payload, { percentage = 78, status = "partially_ready", canGenerate = false, canGenerateAnyway = true, gaps } = {}) {
  return {
    thread_id: payload.thread_id,
    client_revision: payload.client_revision,
    readiness: { percentage, status },
    collected_context: [],
    missing_context: gaps ?? [{ id: "gap-1", label: "Target users", importance: "required" }],
    warnings: [],
    generation_policy: { can_generate: canGenerate, can_generate_anyway: canGenerateAnyway, reason: null },
  };
}

const answersA = [{ question_id: 1, question: "Audience?", selected_option: "", custom_input: "" }];
const answersB = [{ question_id: 1, question: "Audience?", selected_option: "Managers", custom_input: "" }];
const answersC = [{ question_id: 1, question: "Audience?", selected_option: "Developers", custom_input: "" }];

function setup(initialProps, analyze) {
  return renderHook((props) => usePromptReadiness({ debounceMs: 10, analyze, ...props }), {
    initialProps: {
      enabled: true,
      scopeKey: "chat-1::thread-1",
      threadId: "thread-1",
      answers: answersA,
      contextAdditions: [],
      additionalContext: "",
      ...initialProps,
    },
  });
}

describe("usePromptReadiness", () => {
  it("requests readiness immediately and exposes the backend result unchanged", async () => {
    const { analyze, calls } = createAnalyzer();
    const { result } = setup({}, analyze);

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].payload).toEqual({
      thread_id: "thread-1",
      client_revision: 1,
      answers: answersA,
      context_additions: [],
      additional_context: "",
    });

    await act(async () => calls[0].resolve(response(calls[0].payload, { percentage: 42, status: "needs_more_details", canGenerateAnyway: false })));

    expect(result.current.status).toBe("ready");
    expect(result.current.isFresh).toBe(true);
    expect(result.current.data.readiness.percentage).toBe(42);
    expect(result.current.permission).toEqual({ canGenerate: false, canGenerateAnyway: false, reason: null });
  });

  it("marks permission stale as soon as answers change, then refreshes", async () => {
    const { analyze, calls } = createAnalyzer();
    const { result, rerender } = setup({}, analyze);
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0].resolve(response(calls[0].payload, { canGenerateAnyway: true })));
    expect(result.current.permission.canGenerateAnyway).toBe(true);

    rerender({ enabled: true, scopeKey: "chat-1::thread-1", threadId: "thread-1", answers: answersB, contextAdditions: [], additionalContext: "" });

    // Same render: the previous permission must not be usable any more.
    expect(result.current.isFresh).toBe(false);
    expect(result.current.isUpdating).toBe(true);
    expect(result.current.permission).toEqual({ canGenerate: false, canGenerateAnyway: false, reason: null });
    expect(result.current.data.readiness.percentage).toBe(78); // last known score stays visible

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].payload.answers).toEqual(answersB);
    await act(async () => calls[1].resolve(response(calls[1].payload, { percentage: 96, status: "ready_to_generate", canGenerate: true, gaps: [] })));
    expect(result.current.isFresh).toBe(true);
    expect(result.current.data.readiness.percentage).toBe(96);
    expect(result.current.permission.canGenerate).toBe(true);
  });

  it("applies only the newest response when requests finish out of order", async () => {
    const { analyze, calls } = createAnalyzer();
    const { result, rerender } = setup({}, analyze);
    await waitFor(() => expect(calls).toHaveLength(1));

    rerender({ enabled: true, scopeKey: "chat-1::thread-1", threadId: "thread-1", answers: answersB, contextAdditions: [], additionalContext: "" });
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[0].signal.aborted).toBe(true);

    await act(async () => calls[1].resolve(response(calls[1].payload, { percentage: 80 })));
    await act(async () => calls[0].resolve(response(calls[0].payload, { percentage: 10 })));

    expect(result.current.data.readiness.percentage).toBe(80);
    expect(result.current.isFresh).toBe(true);
  });

  it("debounces rapid edits into a single request", async () => {
    const { analyze, calls } = createAnalyzer();
    const { rerender } = setup({}, analyze);
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0].resolve(response(calls[0].payload)));

    const base = { enabled: true, scopeKey: "chat-1::thread-1", threadId: "thread-1", contextAdditions: [], additionalContext: "" };
    rerender({ ...base, answers: answersB });
    rerender({ ...base, answers: answersC });
    await waitFor(() => expect(calls).toHaveLength(2));
    await new Promise((r) => setTimeout(r, 40));
    expect(calls).toHaveLength(2);
    expect(calls[1].payload.answers).toEqual(answersC);
  });

  it("never shows a previous chat's score after switching chats", async () => {
    const { analyze, calls } = createAnalyzer();
    const { result, rerender } = setup({}, analyze);
    await waitFor(() => expect(calls).toHaveLength(1));

    rerender({ enabled: true, scopeKey: "chat-2::thread-2", threadId: "thread-2", answers: [], contextAdditions: [], additionalContext: "" });
    expect(result.current.data).toBeNull();
    expect(result.current.status).toBe("loading");

    // The first chat's request finishes late: it must not appear in chat 2.
    await act(async () => calls[0].resolve(response(calls[0].payload, { percentage: 55 })));
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].payload.thread_id).toBe("thread-2");
    await act(async () => calls[1].resolve(response(calls[1].payload, { percentage: 33 })));
    expect(result.current.data.readiness.percentage).toBe(33);
  });

  it("keeps the last result as stale on failure, closes permission, and retries", async () => {
    const { analyze, calls } = createAnalyzer();
    const { result, rerender } = setup({}, analyze);
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0].resolve(response(calls[0].payload, { canGenerateAnyway: true })));

    rerender({ enabled: true, scopeKey: "chat-1::thread-1", threadId: "thread-1", answers: answersB, contextAdditions: [], additionalContext: "" });
    await waitFor(() => expect(calls).toHaveLength(2));
    await act(async () => calls[1].reject(new Error("Network down")));

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Network down");
    expect(result.current.data.readiness.percentage).toBe(78);
    expect(result.current.isFresh).toBe(false);
    expect(result.current.permission.canGenerateAnyway).toBe(false);

    act(() => result.current.refresh());
    await waitFor(() => expect(calls).toHaveLength(3));
    expect(calls[2].payload.answers).toEqual(answersB);
    expect(calls[2].payload.client_revision).toBeGreaterThan(calls[1].payload.client_revision);
    await act(async () => calls[2].resolve(response(calls[2].payload, { percentage: 90, canGenerate: true })));
    expect(result.current.status).toBe("ready");
    expect(result.current.permission.canGenerate).toBe(true);
  });

  it("reports unavailable (not 0%) when the response has no readiness object", async () => {
    const { analyze, calls } = createAnalyzer();
    const { result } = setup({}, analyze);
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0].resolve({ thread_id: "thread-1", is_sufficient: true }));
    expect(result.current.status).toBe("unavailable");
    expect(result.current.data.readiness.percentage).toBeNull();
    expect(result.current.permission).toEqual({ canGenerate: false, canGenerateAnyway: false, reason: null });
  });

  it("treats a mismatched client_revision echo as an error", async () => {
    const { analyze, calls } = createAnalyzer();
    const { result } = setup({}, analyze);
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0].resolve({ ...response(calls[0].payload), client_revision: 999 }));
    expect(result.current.status).toBe("error");
    expect(result.current.permission.canGenerate).toBe(false);
  });

  it("does nothing while disabled", async () => {
    const { analyze } = createAnalyzer();
    const { result } = setup({ enabled: false }, analyze);
    await new Promise((r) => setTimeout(r, 20));
    expect(analyze).not.toHaveBeenCalled();
    expect(result.current.status).toBe("disabled");
  });

  it("refreshes immediately after requestImmediateRefresh (e.g. Add Details > Save)", async () => {
    const { analyze, calls } = createAnalyzer();
    const { result, rerender } = renderHook((props) => usePromptReadiness({ debounceMs: 5000, analyze, ...props }), {
      initialProps: { enabled: true, scopeKey: "s", threadId: "t", answers: answersA, contextAdditions: [], additionalContext: "" },
    });
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0].resolve({ ...response(calls[0].payload), thread_id: "t" }));

    act(() => result.current.requestImmediateRefresh());
    rerender({ enabled: true, scopeKey: "s", threadId: "t", answers: answersA, contextAdditions: [{ gap_id: "gap-1", value: "Agencies" }], additionalContext: "" });
    await waitFor(() => expect(calls).toHaveLength(2), { timeout: 500 });
    expect(calls[1].payload.context_additions).toEqual([{ gap_id: "gap-1", value: "Agencies" }]);
  });
});
