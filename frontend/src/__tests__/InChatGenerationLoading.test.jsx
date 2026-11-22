import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import * as api from "../lib/api";
import * as readinessApi from "../lib/promptReadinessApi";

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
  prompt_title: "Task Tracker Production Prompt",
  optimized_prompt: "You are an expert full-stack developer building a task tracker.",
  sections: [
    { title: "Core Architecture", content: "React + Node.js" },
  ],
  overall_score: 94,
  clarity: 95,
  specificity: 92,
  context: 94,
  structure: 93,
  actionability: 96,
  suggestions: [],
};

function seedSignedInUserWithChat() {
  localStorage.setItem("promptogen_auth_token", "token");
  localStorage.setItem("promptogen_user", JSON.stringify(USER));
  localStorage.setItem(
    `promptogen_active_chats_${USER.id}`,
    JSON.stringify([{ group: "Today", items: [CHAT] }]),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  window.history.pushState({}, "", "/");
  api.fetchCurrentUser.mockResolvedValue(USER);
  api.fetchRateLimitStatus.mockResolvedValue({ locked: false, remaining: 10 });
  api.fetchAvailableModels.mockResolvedValue({
    models: api.GEMINI_FREE_TIER_MODELS,
    providers: {},
  });
  seedSignedInUserWithChat();
});

describe("In-Chat Prompt Synthesis & Navigation Persistence", () => {
  it("renders the loading and typing indicator inside the chat interface with disabled inputs during synthesis", async () => {
    let resolvePipeline;
    api.continuePipeline.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePipeline = () => resolve(GENERATED);
        }),
    );

    render(<App />);
    const chatButton = await screen.findAllByRole("button", {
      name: /Task Tracker Prompt/,
    });
    await userEvent.click(chatButton[0]);

    // Proceed to Step 2 (last step triggers generation)
    const proceedBtn = await screen.findByRole("button", {
      name: /proceed to step 2/i,
    });
    await userEvent.click(proceedBtn);

    // Generation is in-flight: It must NOT show a separate page loading header
    expect(
      screen.queryByText("Synthesizing Final Adaptive Prompt..."),
    ).not.toBeInTheDocument();

    // Instead, the in-chat loading indicator and typing dots are visible inside the chat interface!
    expect(
      await screen.findByText(/Synthesizing final adaptive prompt/),
    ).toBeInTheDocument();
    expect(screen.getByText("Build a task tracker")).toBeInTheDocument();

    // Follow-up input and submission buttons are disabled
    const followUpInput = screen.getByPlaceholderText(
      "Synthesizing prompt, please wait...",
    );
    expect(followUpInput).toBeDisabled();

    // Quick action buttons are disabled while generating
    const regenerateBtn = screen.getByRole("button", {
      name: /regenerate prompt/i,
    });
    expect(regenerateBtn).toBeDisabled();

    // Resolve prompt generation
    await act(async () => {
      resolvePipeline();
    });

    // After completion, the generated prompt is visible
    expect(
      (await screen.findAllByText("Task Tracker Production Prompt")).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Core Architecture"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("React + Node.js"),
    ).toBeInTheDocument();

    // Inputs and actions are re-enabled
    expect(followUpInput).not.toBeDisabled();
    expect(regenerateBtn).not.toBeDisabled();
  });

  it("persists in-chat generation state when navigating between tabs and returns to the running synthesis", async () => {
    let resolvePipeline;
    api.continuePipeline.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePipeline = () => resolve(GENERATED);
        }),
    );

    render(<App />);
    const chatButton = await screen.findAllByRole("button", {
      name: /Task Tracker Prompt/,
    });
    await userEvent.click(chatButton[0]);

    // Trigger generation
    const proceedBtn = await screen.findByRole("button", {
      name: /proceed to step 2/i,
    });
    await userEvent.click(proceedBtn);

    // Verify in-chat loading turn
    expect(
      await screen.findByText(/Synthesizing final adaptive prompt/),
    ).toBeInTheDocument();

    // User navigates away to Library / My Prompts tab via bottom dock
    const libraryNav = screen.getByRole("button", { name: /^library$/i });
    await userEvent.click(libraryNav);

    // Verify we are on Library page
    expect(
      await screen.findByRole("heading", { name: "Prompt Library" }),
    ).toBeInTheDocument();

    // User navigates back to "Home" tab while generation is STILL running
    const homeNav = screen.getByRole("button", { name: /^home$/i });
    await userEvent.click(homeNav);

    // It returns directly to the chat interface showing the running synthesis loading animation!
    expect(
      await screen.findByText(/Synthesizing final adaptive prompt/),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Synthesizing prompt, please wait..."),
    ).toBeDisabled();

    // Now complete the generation in the background
    await act(async () => {
      resolvePipeline();
    });

    // The synthesized prompt is rendered
    expect(
      (await screen.findAllByText("Task Tracker Production Prompt")).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Core Architecture"),
    ).toBeInTheDocument();
  });
});
