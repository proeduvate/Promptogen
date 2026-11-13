import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import * as api from "../lib/api";
import * as readinessApi from "../lib/promptReadinessApi";
import { READINESS_FIXTURES } from "../mocks/promptReadinessFixtures";

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    startPipeline: vi.fn(),
    continuePipeline: vi.fn(),
    followUpPipeline: vi.fn(),
    fetchCurrentUser: vi.fn(),
    fetchRateLimitStatus: vi.fn(),
    fetchAvailableModels: vi.fn(),
    logoutUser: vi.fn(),
    saveLibraryPrompt: vi.fn(),
  };
});

vi.mock("../lib/promptReadinessApi", () => ({
  isPromptReadinessEnabled: vi.fn(() => false),
  isReadinessStubEnabled: vi.fn(() => false),
  analyzePromptReadiness: vi.fn(),
}));

const USER = { id: "user-1", name: "Test User", email: "test@example.com" };
const CHAT = {
  id: "chat-1",
  title: "Task Tracker Prompt",
  status: "Awaiting clarification",
  timestamp: "10:00",
  query: "Build a task tracker",
  step: 1,
  answers: { 1: "Agencies" },
  contextAdditions: [],
  isComplete: false,
  isSubmitting: false,
  threadId: "thread-1",
  backendQuestions: [
    { id: 1, question: "Who is the audience?", type: "text", level: "required" },
    { id: 2, question: "Which platform?", type: "text", level: "recommended" },
  ],
  depthAnalysis: null,
  taskDomain: "general",
  isSufficient: false,
  model: "gemini-3.5-flash-lite",
  conversation: [],
};

const GENERATED = {
  thread_id: "thread-1",
  prompt_title: "Task Tracker Prompt",
  optimized_prompt: "You are...",
  sections: [],
  overall_score: 90,
  clarity: 90,
  specificity: 90,
  context: 90,
  structure: 90,
  actionability: 90,
  suggestions: [],
};

function respond(name) {
  return async (payload) => ({
    thread_id: payload.thread_id,
    client_revision: payload.client_revision,
    ...JSON.parse(JSON.stringify(READINESS_FIXTURES[name])),
  });
}

function seedSignedInUserWithChat() {
  localStorage.setItem("promptogen_auth_token", "token");
  localStorage.setItem("promptogen_user", JSON.stringify(USER));
  localStorage.setItem(`promptogen_active_chats_${USER.id}`, JSON.stringify([{ group: "Today", items: [CHAT] }]));
}

async function openChat() {
  render(<App />);
  const items = await screen.findAllByRole("button", { name: /Task Tracker Prompt/ });
  await userEvent.click(items[0]);
  await screen.findByText("Who is the audience?");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  window.history.pushState({}, "", "/");
  api.fetchCurrentUser.mockResolvedValue(USER);
  api.fetchRateLimitStatus.mockResolvedValue({ locked: false, remaining: 10 });
  api.fetchAvailableModels.mockResolvedValue({ models: api.GEMINI_FREE_TIER_MODELS, providers: {} });
  api.continuePipeline.mockResolvedValue(GENERATED);
  seedSignedInUserWithChat();
});

describe("App generation gating with Prompt Readiness", () => {
  it("keeps the existing flow unchanged when the feature flag is off", async () => {
    readinessApi.isPromptReadinessEnabled.mockReturnValue(false);
    await openChat();

    expect(screen.queryByRole("heading", { name: "Prompt Readiness" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /proceed to step 2/i }));

    await waitFor(() => expect(api.continuePipeline).toHaveBeenCalledTimes(1));
    expect(readinessApi.analyzePromptReadiness).not.toHaveBeenCalled();
    const [threadId, answers] = api.continuePipeline.mock.calls[0];
    expect(threadId).toBe("thread-1");
    // Existing default-filling for unanswered questions is preserved.
    expect(answers).toEqual([
      { question_id: 1, question: "Who is the audience?", selected_option: "Agencies", custom_input: "" },
      { question_id: 2, question: "Which platform?", selected_option: "Default", custom_input: "" },
    ]);
  });

  it("blocks every generation path until the backend allows it, then sends saved context with Generate Anyway", async () => {
    readinessApi.isPromptReadinessEnabled.mockReturnValue(true);
    readinessApi.analyzePromptReadiness
      .mockImplementationOnce(respond("missing-required"))
      .mockImplementation(respond("recommended-gaps"));

    await openChat();
    expect(await screen.findByText("42%")).toBeInTheDocument();

    // The readiness request carries the real answers (blank when unanswered).
    const firstPayload = readinessApi.analyzePromptReadiness.mock.calls[0][0];
    expect(firstPayload).toMatchObject({
      thread_id: "thread-1",
      answers: [
        { question_id: 1, selected_option: "Agencies" },
        { question_id: 2, selected_option: "" },
      ],
      context_additions: [],
    });

    // Final question step, Skip Questions quick action: all blocked by the backend policy.
    await userEvent.click(screen.getByRole("button", { name: /proceed to step 2/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Add the target users before generating.");
    await userEvent.click(screen.getByRole("button", { name: /skip questions/i }));
    expect(api.continuePipeline).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /generate anyway/i })).not.toBeInTheDocument();

    // Add Details for the required gap; answers and step stay as they were.
    await userEvent.click(screen.getByRole("button", { name: "Add details for Target users" }));
    const dialog = screen.getByRole("dialog", { name: "Add details: Target users" });
    await userEvent.type(within(dialog).getByLabelText("Your details"), "Small agency teams");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(readinessApi.analyzePromptReadiness).toHaveBeenCalledTimes(2));
    expect(readinessApi.analyzePromptReadiness.mock.calls[1][0].context_additions).toEqual([
      { gap_id: "context-gap-1", value: "Small agency teams" },
    ]);
    expect(await screen.findByText("78%")).toBeInTheDocument();
    // Saving a detail kept the existing answer and the current step.
    expect(screen.getByDisplayValue("Agencies")).toBeInTheDocument();
    expect(screen.getAllByText("Step 1 of 1").length).toBeGreaterThan(0);

    // Standard generation is still not allowed; the authorized bypass is.
    await userEvent.click(screen.getByRole("button", { name: /generate anyway/i }));

    await waitFor(() => expect(api.continuePipeline).toHaveBeenCalledTimes(1));
    const [, answers, options] = api.continuePipeline.mock.calls[0];
    expect(answers[0]).toMatchObject({ question_id: 1, selected_option: "Agencies" });
    expect(options.contextAdditions).toEqual([{ gap_id: "context-gap-1", value: "Small agency teams" }]);
  });

  it("fails closed when the readiness request errors, and Retry recovers", async () => {
    readinessApi.isPromptReadinessEnabled.mockReturnValue(true);
    readinessApi.analyzePromptReadiness
      .mockImplementationOnce(async () => {
        throw new Error("Readiness service unavailable");
      })
      .mockImplementation(respond("ready"));

    await openChat();
    expect(await screen.findByText("Readiness service unavailable")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /proceed to step 2/i }));
    expect(api.continuePipeline).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("96%")).toBeInTheDocument();

    // Answers were not reset by the failure.
    expect(screen.getByDisplayValue("Agencies")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /generate prompt/i }));
    await waitFor(() => expect(api.continuePipeline).toHaveBeenCalledTimes(1));
  });

  it("does not start generation twice on a double click", async () => {
    readinessApi.isPromptReadinessEnabled.mockReturnValue(false);
    let release;
    api.continuePipeline.mockImplementation(() => new Promise((resolve) => (release = () => resolve(GENERATED))));
    await openChat();

    const proceed = screen.getByRole("button", { name: /proceed to step 2/i });
    await act(async () => {
      proceed.click();
      proceed.click();
    });
    expect(api.continuePipeline).toHaveBeenCalledTimes(1);
    await act(async () => release());
  });
});
