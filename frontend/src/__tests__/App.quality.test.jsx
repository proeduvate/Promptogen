import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import * as api from "../lib/api";
import { RICH_ASSESSMENT, LEGACY_RESPONSE, clone } from "../test/qualityFixtures";

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    startPipeline: vi.fn(),
    continuePipeline: vi.fn(),
    followUpPipeline: vi.fn(),
    assessPrompt: vi.fn(),
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

const V1 = {
  id: "msg_p_1",
  role: "assistant",
  type: "prompt",
  version: 1,
  versionLabel: "v1: Initial Synthesis",
  title: "Campaign Prompt",
  promptData: { optimized_prompt: "Prompt text v1", sections: [], ...clone(LEGACY_RESPONSE) },
  timestamp: "10:00",
};

const COMPLETED_CHAT = {
  id: "chat-done",
  title: "Campaign Prompt",
  status: "Ready",
  timestamp: "10:00",
  query: "Plan a campaign",
  step: 1,
  answers: {},
  isComplete: true,
  isSubmitting: false,
  threadId: "thread-1",
  backendQuestions: [],
  model: "gemini-3.5-flash-lite",
  generatedPromptData: V1.promptData,
  conversation: [{ id: "msg_u_init", role: "user", text: "Plan a campaign", timestamp: "09:59" }, V1],
  score: 81,
  metrics: null,
};

const QUESTION_CHAT = {
  id: "chat-q",
  title: "Unscored Prompt",
  status: "Awaiting clarification",
  timestamp: "11:00",
  query: "Write onboarding emails",
  step: 1,
  answers: { 1: "New users" },
  isComplete: false,
  isSubmitting: false,
  threadId: "thread-2",
  backendQuestions: [{ id: 1, question: "Who are the readers?", type: "text", level: "required" }],
  model: "gemini-3.5-flash-lite",
  conversation: [],
};

function seed(chats) {
  localStorage.setItem("promptogen_auth_token", "token");
  localStorage.setItem("promptogen_user", JSON.stringify(USER));
  localStorage.setItem(`promptogen_active_chats_${USER.id}`, JSON.stringify([{ group: "Today", items: chats }]));
}

function qualityPanel() {
  return screen.getByRole("heading", { name: "Prompt Strength" }).closest("section");
}

async function openChat(title) {
  render(<App />);
  const items = await screen.findAllByRole("button", { name: new RegExp(title) });
  await userEvent.click(items[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  window.history.pushState({}, "", "/");
  api.fetchCurrentUser.mockResolvedValue(USER);
  api.fetchRateLimitStatus.mockResolvedValue({ locked: false, remaining: 10 });
  api.fetchAvailableModels.mockResolvedValue({ models: api.GEMINI_FREE_TIER_MODELS, providers: {} });
});

describe("App: Prompt quality breakdown", () => {
  it("reassesses a version and then improves it with the backend's suggestions", async () => {
    seed([COMPLETED_CHAT]);
    api.assessPrompt.mockResolvedValue({ quality_assessment: clone(RICH_ASSESSMENT) });
    const improved = clone(RICH_ASSESSMENT);
    improved.overall_score = 93;
    improved.classification = "excellent";
    improved.prompt_version = 2;
    api.followUpPipeline.mockResolvedValue({
      thread_id: "thread-1",
      action: "refine_prompt",
      version_label: "v2: Refined",
      prompt_title: "Campaign Prompt",
      optimized_prompt: "Prompt text v2",
      sections: [],
      quality_assessment: improved,
    });

    await openChat("Campaign Prompt");

    // Current backend shape: real scores only, nothing invented.
    const panel = qualityPanel();
    expect(within(panel).getByText("81")).toBeInTheDocument();
    expect(within(panel).getByText("Classification not provided")).toBeInTheDocument();
    expect(within(panel).getByText(/Not assessed:/).parentElement).toHaveTextContent(
      "Constraints, Output Definition, Consistency"
    );

    // Reassess the version
    await userEvent.click(within(panel).getByRole("button", { name: "Reassess" }));
    await waitFor(() => expect(within(qualityPanel()).getByText("85")).toBeInTheDocument());
    expect(api.assessPrompt).toHaveBeenCalledWith("Prompt text v1", { threadId: "thread-1", promptVersion: 1 });
    expect(within(qualityPanel()).getByText("Good")).toBeInTheDocument();
    expect(within(qualityPanel()).getByText("Quality dimensions (8)")).toBeInTheDocument();

    // Improve with suggestions -> refinement request built from the assessment
    await userEvent.click(within(qualityPanel()).getByRole("button", { name: "Improve with suggestions" }));
    await waitFor(() => expect(api.followUpPipeline).toHaveBeenCalledTimes(1));
    const [threadId, message] = api.followUpPipeline.mock.calls[0];
    expect(threadId).toBe("thread-1");
    expect(message).toContain("- [Context] Add the geographic market and main competitors.");
    expect(message).toContain("- [Constraints] Specify the campaign timeline.");

    // The breakdown follows the new version's assessment
    await waitFor(() => expect(within(qualityPanel()).getByText("93")).toBeInTheDocument());
    expect(within(qualityPanel()).getByText("Excellent")).toBeInTheDocument();
    expect(within(qualityPanel()).getAllByText("v2: Refined").length).toBeGreaterThan(0);
  });

  it("shows an error with Retry when reassessment fails, keeping the previous scores", async () => {
    seed([COMPLETED_CHAT]);
    api.assessPrompt.mockRejectedValueOnce(new Error("Assessment service unavailable"));
    await openChat("Campaign Prompt");

    await userEvent.click(within(qualityPanel()).getByRole("button", { name: "Reassess" }));
    const alert = await within(qualityPanel()).findByRole("alert");
    expect(alert).toHaveTextContent("Assessment service unavailable");
    expect(within(qualityPanel()).getByText("81")).toBeInTheDocument();
  });

  it("does not invent a score when generation returns no assessment", async () => {
    seed([QUESTION_CHAT]);
    api.continuePipeline.mockResolvedValue({
      thread_id: "thread-2",
      prompt_title: "Unscored Prompt",
      optimized_prompt: "Prompt without scores",
      sections: [],
    });
    await openChat("Unscored Prompt");
    await userEvent.click(await screen.findByRole("button", { name: /proceed to step 2/i }));

    await waitFor(() => expect(api.continuePipeline).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("button", { name: /Prompt Strength not assessed/ })).toBeInTheDocument();
    expect(within(qualityPanel()).getByText("Quality assessment unavailable")).toBeInTheDocument();
    expect(within(qualityPanel()).queryByText("90")).not.toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem(`promptogen_active_chats_${USER.id}`))[0].items[0];
    expect(stored.score).toBeNull();
    expect(stored.metrics).toBeNull();
  });
});
