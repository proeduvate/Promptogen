import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatResultView from "../ChatResultView";
import { RICH_ASSESSMENT, LEGACY_RESPONSE, clone } from "../../../test/qualityFixtures";

function promptMsg(id, version, data) {
  return {
    id,
    role: "assistant",
    type: "prompt",
    version,
    versionLabel: `v${version}: ${version === 1 ? "Initial Synthesis" : "Refined"}`,
    title: "Campaign Prompt",
    promptData: { optimized_prompt: `Prompt text v${version}`, sections: [], ...data },
    timestamp: "10:00",
  };
}

function makeChat(conversation, extra = {}) {
  return {
    id: "chat-1",
    title: "Campaign Prompt",
    query: "Plan a campaign",
    model: "gemini-3.5-flash-lite",
    isComplete: true,
    answers: {},
    backendQuestions: [],
    generatedPromptData: conversation[conversation.length - 1]?.promptData || null,
    conversation,
    ...extra,
  };
}

const v1 = promptMsg("msg_p_1", 1, clone(LEGACY_RESPONSE));
const v2 = promptMsg("msg_p_2", 2, { quality_assessment: clone(RICH_ASSESSMENT) });
const user = { id: "msg_u_init", role: "user", text: "Plan a campaign", timestamp: "09:59" };

function qualityPanel() {
  return screen.getByRole("heading", { name: "Prompt Strength" }).closest("section");
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("ChatResultView quality breakdown", () => {
  it("shows the latest version's assessment and per-version scores on each prompt card", () => {
    render(<ChatResultView chat={makeChat([user, v1, user, v2])} onReassessPrompt={vi.fn()} onImproveWithSuggestions={vi.fn()} />);
    const panel = qualityPanel();
    expect(within(panel).getByText("85")).toBeInTheDocument();
    expect(within(panel).getAllByText("v2: Refined").length).toBeGreaterThan(0);

    expect(screen.getByRole("button", { name: /Prompt Strength 81 out of 100\. View quality breakdown/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Prompt Strength 85 out of 100, Good\. View quality breakdown/ })).toBeInTheDocument();
  });

  it("switches the breakdown to an earlier version from its card, and back to the latest", async () => {
    render(<ChatResultView chat={makeChat([user, v1, user, v2])} onReassessPrompt={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Prompt Strength 81 out of 100/ }));
    const panel = qualityPanel();
    expect(within(panel).getByText("81")).toBeInTheDocument();
    expect(within(panel).getAllByText("v1: Initial Synthesis").length).toBeGreaterThan(0);
    expect(panel).toHaveFocus();

    await userEvent.click(within(panel).getByRole("button", { name: /Show latest/ }));
    expect(within(qualityPanel()).getByText("85")).toBeInTheDocument();
  });

  it("follows a newly generated version automatically", () => {
    const { rerender } = render(<ChatResultView chat={makeChat([user, v1])} />);
    expect(within(qualityPanel()).getByText("81")).toBeInTheDocument();
    rerender(<ChatResultView chat={makeChat([user, v1, user, v2])} />);
    expect(within(qualityPanel()).getByText("85")).toBeInTheDocument();
  });

  it("shows unassessed versions as not assessed instead of a made-up score", () => {
    const unscored = promptMsg("msg_p_1", 1, {});
    render(<ChatResultView chat={makeChat([user, unscored])} onReassessPrompt={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Prompt Strength not assessed/ })).toBeInTheDocument();
    expect(within(qualityPanel()).getByText("Quality assessment unavailable")).toBeInTheDocument();
    expect(within(qualityPanel()).getByRole("button", { name: "Assess prompt" })).toBeInTheDocument();
  });

  it("reassesses the selected version, then shows an error with Retry on failure", async () => {
    let reject;
    const onReassessPrompt = vi
      .fn()
      .mockImplementationOnce(() => new Promise((_, r) => (reject = r)))
      .mockResolvedValueOnce(undefined);
    render(<ChatResultView chat={makeChat([user, v1, user, v2])} onReassessPrompt={onReassessPrompt} />);

    await userEvent.click(within(qualityPanel()).getByRole("button", { name: "Reassess" }));
    expect(onReassessPrompt).toHaveBeenCalledWith(expect.objectContaining({ id: "msg_p_2" }), { isLatest: true });
    expect(within(qualityPanel()).getByText("Assessing prompt quality…")).toBeInTheDocument();

    reject(new Error("Assessment service timed out"));
    const alert = await within(qualityPanel()).findByRole("alert");
    expect(alert).toHaveTextContent("Assessment service timed out");

    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(within(qualityPanel()).queryByRole("alert")).not.toBeInTheDocument());
    expect(onReassessPrompt).toHaveBeenCalledTimes(2);
  });

  it("uses a stored reassessment for that version", () => {
    const chat = makeChat([user, v1], { qualityAssessments: { msg_p_1: { quality_assessment: clone(RICH_ASSESSMENT) } } });
    render(<ChatResultView chat={chat} />);
    expect(within(qualityPanel()).getByText("85")).toBeInTheDocument();
    expect(within(qualityPanel()).getByText("Good")).toBeInTheDocument();
  });

  it("passes the selected assessment to the improvement workflow", async () => {
    const onImproveWithSuggestions = vi.fn();
    render(<ChatResultView chat={makeChat([user, v1, user, v2])} onImproveWithSuggestions={onImproveWithSuggestions} />);
    await userEvent.click(within(qualityPanel()).getByRole("button", { name: "Improve with suggestions" }));
    expect(onImproveWithSuggestions).toHaveBeenCalledWith(expect.objectContaining({ overallScore: 85, classificationLabel: "Good" }));
  });

  it("shows a loading state while the first version is generating", () => {
    render(<ChatResultView chat={makeChat([], { isComplete: false, isSubmitting: true, generatedPromptData: null })} isGenerating />);
    expect(within(qualityPanel()).getByText("Assessing prompt quality…")).toBeInTheDocument();
  });
});
