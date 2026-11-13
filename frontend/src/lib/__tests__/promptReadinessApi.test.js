import { describe, it, expect, vi } from "vitest";
import { analyzePromptReadiness, isPromptReadinessEnabled, isReadinessStubEnabled } from "../promptReadinessApi";

const payload = {
  thread_id: "thread-9",
  client_revision: 4,
  answers: [],
  context_additions: [],
  additional_context: "",
};

describe("promptReadinessApi", () => {
  it("is disabled by default", () => {
    vi.stubEnv("VITE_ENABLE_PROMPT_READINESS", "");
    vi.stubEnv("VITE_USE_READINESS_STUB", "");
    expect(isReadinessStubEnabled()).toBe(false);
    expect(isPromptReadinessEnabled()).toBe(false);
  });

  it("uses backend-shaped fixtures when the dev stub is enabled", async () => {
    vi.stubEnv("VITE_USE_READINESS_STUB", "true");
    vi.stubEnv("VITE_READINESS_STUB_SCENARIO", "recommended-gaps");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(isPromptReadinessEnabled()).toBe(true);
    const res = await analyzePromptReadiness(payload);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res).toMatchObject({
      thread_id: "thread-9",
      client_revision: 4,
      readiness: { percentage: 78, status: "partially_ready" },
      generation_policy: { can_generate_anyway: true },
    });
  });

  it("calls the proposed readiness endpoint through the shared API client otherwise", async () => {
    vi.stubEnv("VITE_ENABLE_PROMPT_READINESS", "true");
    vi.stubEnv("VITE_USE_READINESS_STUB", "false");
    const body = { thread_id: "thread-9", readiness: { percentage: 50, status: "partially_ready" } };
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 200, json: async () => body }));
    vi.stubGlobal("fetch", fetchSpy);
    localStorage.setItem("promptogen_auth_token", "token-123");

    const controller = new AbortController();
    const res = await analyzePromptReadiness(payload, { signal: controller.signal });

    expect(res).toEqual(body);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/v1/pipeline/readiness");
    expect(options.method).toBe("POST");
    expect(options.signal).toBe(controller.signal);
    expect(options.headers.Authorization).toBe("Bearer token-123");
    expect(JSON.parse(options.body)).toEqual(payload);
  });
});
