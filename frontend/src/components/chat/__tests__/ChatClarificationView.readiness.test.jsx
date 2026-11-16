import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatClarificationView from "../ChatClarificationView";
import { readinessFrom, fixture } from "./readinessTestUtils";

const questions = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  question: `Question ${i + 1}?`,
  type: "text",
  level: "recommended",
}));

function makeChat(overrides = {}) {
  return {
    id: "chat-1",
    query: "Build a task tracker",
    threadId: "thread-1",
    backendQuestions: questions,
    answers: { 1: "Agencies", additional_context: "Existing note" },
    step: 1,
    isSufficient: false,
    depthAnalysis: null,
    taskDomain: "general",
    contextAdditions: [],
    ...overrides,
  };
}

function renderView(props = {}) {
  const handlers = {
    onUpdateAnswers: vi.fn(),
    onCompleteGeneration: vi.fn(),
    onSkipQuestions: vi.fn(),
    onSaveContextAddition: vi.fn(),
    onRemoveContextAddition: vi.fn(),
    onSaveAdditionalContext: vi.fn(),
    onGenerate: vi.fn(),
    onGenerateAnyway: vi.fn(),
  };
  const utils = render(<ChatClarificationView chat={makeChat()} {...handlers} {...props} />);
  return { ...handlers, ...utils };
}

beforeEach(() => {
  // AIModelSelectorPanel fetches models on mount; keep tests offline.
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("ChatClarificationView with Prompt Readiness", () => {
  it("renders one readiness panel next to the questions and keeps step progress separate", () => {
    renderView({ readiness: readinessFrom(fixture("recommended-gaps")) });
    expect(screen.getAllByRole("heading", { name: "Prompt Readiness" })).toHaveLength(1);
    expect(screen.getByText("78%")).toBeInTheDocument();
    expect(screen.getByText("Conversation Progress")).toBeInTheDocument();
    expect(screen.getAllByText("Step 1 of 2").length).toBeGreaterThan(0);
  });

  it("does not render the panel when the feature is off", () => {
    renderView({ readiness: null });
    expect(screen.queryByRole("heading", { name: "Prompt Readiness" })).not.toBeInTheDocument();
  });

  it("opens a gap-specific dialog and saves by gap_id without touching answers or step", async () => {
    const { onSaveContextAddition, onUpdateAnswers } = renderView({ readiness: readinessFrom(fixture("missing-required")) });

    await userEvent.click(screen.getByRole("button", { name: "Add details for Target users" }));
    const dialog = screen.getByRole("dialog", { name: "Add details: Target users" });
    await userEvent.type(within(dialog).getByLabelText("Your details"), "Small agency teams");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(onSaveContextAddition).toHaveBeenCalledWith({
      gap_id: "context-gap-1",
      label: "Target users",
      value: "Small agency teams",
    });
    expect(onUpdateAnswers).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cancelling the dialog changes nothing", async () => {
    const { onSaveContextAddition, onUpdateAnswers } = renderView({
      readiness: readinessFrom(fixture("missing-required")),
      contextAdditions: [{ gap_id: "context-gap-1", value: "Saved before", label: "Target users" }],
    });
    await userEvent.click(screen.getByRole("button", { name: "Edit details for Target users" }));
    const field = screen.getByLabelText("Your details");
    expect(field).toHaveValue("Saved before");
    await userEvent.clear(field);
    await userEvent.type(field, "Something else");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSaveContextAddition).not.toHaveBeenCalled();
    expect(onUpdateAnswers).not.toHaveBeenCalled();
  });

  it("navigates to the linked question when the gap has a valid question_id", async () => {
    const raw = fixture("recommended-gaps");
    raw.missing_context = [{ id: "gap-q5", label: "Answer question five", importance: "recommended", question_id: 5 }];
    const { onUpdateAnswers } = renderView({ readiness: readinessFrom(raw) });

    await userEvent.click(screen.getByRole("button", { name: "Add details for Answer question five" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onUpdateAnswers).toHaveBeenCalledTimes(1);
    const [updater, step] = onUpdateAnswers.mock.calls[0];
    expect(step).toBe(2);
    const answers = { 1: "Agencies" };
    expect(updater(answers)).toBe(answers); // answers passed through unchanged
  });

  it("routes Skip Questions through a single gated callback", async () => {
    const { onSkipQuestions, onCompleteGeneration } = renderView({ readiness: readinessFrom(fixture("missing-required")) });
    await userEvent.click(screen.getByRole("button", { name: /skip questions/i }));
    expect(onSkipQuestions).toHaveBeenCalledTimes(1);
    expect(onCompleteGeneration).not.toHaveBeenCalled();
  });

  it("uses a real free-form dialog for Add Context Profile when readiness is on", async () => {
    const { onSaveAdditionalContext, onUpdateAnswers } = renderView({ readiness: readinessFrom(fixture("ready")) });
    await userEvent.click(screen.getByRole("button", { name: /add context profile/i }));
    const field = screen.getByLabelText("Your details");
    expect(field).toHaveValue("Existing note");
    await userEvent.clear(field);
    await userEvent.type(field, "Must run offline");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSaveAdditionalContext).toHaveBeenCalledWith("Must run offline");
    expect(onUpdateAnswers).not.toHaveBeenCalled();
  });

  it("shows the generation blocker message from the gate", () => {
    renderView({
      readiness: readinessFrom(fixture("missing-required")),
      generationNotice: "Add the target users before generating.",
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Add the target users before generating.");
  });

  it("passes Generate Anyway to the app boundary", async () => {
    const { onGenerateAnyway } = renderView({ readiness: readinessFrom(fixture("recommended-gaps")) });
    await userEvent.click(screen.getByRole("button", { name: /generate anyway/i }));
    expect(onGenerateAnyway).toHaveBeenCalledTimes(1);
  });
});
