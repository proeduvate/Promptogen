import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PromptQualityPanel from "../PromptQualityPanel";
import { normalizeQualityAssessment } from "../../../lib/promptQualityContract";
import { RICH_ASSESSMENT, LEGACY_RESPONSE, clone } from "../../../test/qualityFixtures";

const detailsFor = (toggle) => document.getElementById(toggle.getAttribute("aria-controls"));
const rich = () => normalizeQualityAssessment(clone(RICH_ASSESSMENT));
const legacy = () => normalizeQualityAssessment(clone(LEGACY_RESPONSE));

describe("PromptQualityPanel", () => {
  it("shows the overall score, backend classification, timestamp and version", () => {
    render(<PromptQualityPanel assessment={rich()} versionLabel="v2: Refined" />);
    expect(screen.getByRole("heading", { name: "Prompt Strength" })).toBeInTheDocument();
    const meter = screen.getByRole("meter", { name: "Prompt strength score" });
    expect(meter).toHaveAttribute("aria-valuenow", "85");
    expect(meter).toHaveAttribute("aria-valuetext", "85 out of 100, Good");
    expect(screen.getByText("Good")).toBeInTheDocument();
    expect(screen.getAllByText("v2: Refined").length).toBeGreaterThan(0);
    expect(screen.getByText("Assessed")).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    expect(screen.getByText(/not a tested-performance score/i)).toBeInTheDocument();
  });

  it("lists all eight dimensions with their scores and strong / moderate / weak indicators", () => {
    render(<PromptQualityPanel assessment={rich()} />);
    const list = screen.getByText("Quality dimensions (8)").closest("div").parentElement;
    const buttons = within(list).getAllByRole("button", { expanded: false });
    expect(buttons).toHaveLength(8);
    expect(buttons.map((b) => b.textContent)).toEqual([
      expect.stringContaining("Clarity"),
      expect.stringContaining("Specificity"),
      expect.stringContaining("Context"),
      expect.stringContaining("Structure"),
      expect.stringContaining("Actionability"),
      expect.stringContaining("Constraints"),
      expect.stringContaining("Output Definition"),
      expect.stringContaining("Consistency"),
    ]);
    expect(buttons[2]).toHaveTextContent("Moderate");
    expect(buttons[2]).toHaveTextContent("76/100");
    expect(buttons[5]).toHaveTextContent("Weak");
    expect(buttons[0]).toHaveTextContent("Strong");
    expect(screen.queryByText(/Not assessed:/)).not.toBeInTheDocument();
  });

  it("expands a dimension to explain its score", async () => {
    render(<PromptQualityPanel assessment={rich()} />);
    const toggle = screen.getByRole("button", { name: /Context/ });
    const details = detailsFor(toggle);
    expect(details).toHaveAttribute("role", "region");
    expect(details).not.toBeVisible();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(details).toBeVisible();
    expect(screen.getByRole("region", { name: "Context details" })).toBe(details);
    expect(within(details).getByText("Your prompt contains useful context but could be improved.")).toBeInTheDocument();
    expect(within(details).getByText("Weaknesses")).toBeInTheDocument();
    expect(within(details).getByText("Audience is described only in general terms.")).toBeInTheDocument();
    expect(within(details).getByText("Missing information")).toBeInTheDocument();
    expect(within(details).getByText("Geographic market")).toBeInTheDocument();
    expect(within(details).getByText("Add the geographic market and main competitors.")).toBeInTheDocument();
    expect(within(details).getByText("high")).toBeInTheDocument();

    await userEvent.click(toggle);
    expect(details).not.toBeVisible();
  });

  it("keeps mapped suggestions with their dimension and shows unmapped ones separately", async () => {
    render(<PromptQualityPanel assessment={rich()} />);
    await userEvent.click(screen.getByRole("button", { name: "Expand all" }));
    const constraints = screen.getByRole("region", { name: "Constraints details" });
    expect(within(constraints).getByText("Specify the campaign timeline.")).toBeInTheDocument();
    const general = screen.getByText("Improvement suggestions").parentElement;
    expect(within(general).getByText("Mention the brand voice.")).toBeInTheDocument();
    expect(within(general).queryByText("Specify the campaign timeline.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse all" })).toBeInTheDocument();
  });

  it("does not invent scores, explanations or a classification for the current backend response", async () => {
    render(<PromptQualityPanel assessment={legacy()} />);
    expect(screen.getByText("81")).toBeInTheDocument();
    expect(screen.getByText("Classification not provided")).toBeInTheDocument();
    expect(screen.getByText("Quality dimensions (5)")).toBeInTheDocument();
    expect(screen.getByText(/Not assessed:/).parentElement).toHaveTextContent(
      "Not assessed: Constraints, Output Definition, Consistency"
    );
    expect(screen.getByText(/Explanations were not provided/)).toBeInTheDocument();
    const clarity = screen.getByRole("button", { name: /Clarity/ });
    await userEvent.click(clarity);
    expect(within(detailsFor(clarity)).getByText(/did not include an explanation/)).toBeVisible();
    expect(screen.queryByText("Assessed")).not.toBeInTheDocument();
  });

  it("updates when a new assessment arrives", () => {
    const { rerender } = render(<PromptQualityPanel assessment={legacy()} versionLabel="v1" />);
    expect(screen.getByText("81")).toBeInTheDocument();
    rerender(<PromptQualityPanel assessment={rich()} versionLabel="v2" />);
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.queryByText("81")).not.toBeInTheDocument();
    expect(screen.getByText("Good")).toBeInTheDocument();
  });

  it("shows loading, unavailable and error states instead of scores", async () => {
    const onReassess = vi.fn();
    const { rerender } = render(<PromptQualityPanel assessment={null} status="loading" onReassess={onReassess} />);
    expect(screen.getByText("Assessing prompt quality…")).toBeInTheDocument();
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();

    rerender(<PromptQualityPanel assessment={normalizeQualityAssessment({})} onReassess={onReassess} />);
    expect(screen.getByText("Quality assessment unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Assess prompt" }));
    expect(onReassess).toHaveBeenCalledTimes(1);

    rerender(
      <PromptQualityPanel assessment={legacy()} status="error" error="Assessment service timed out" onReassess={onReassess} />
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Assessment service timed out");
    expect(alert).toHaveTextContent("Showing the previous assessment below.");
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(onReassess).toHaveBeenCalledTimes(2);
  });

  it("offers the improvement-suggestions entry point and reassess", async () => {
    const onImprove = vi.fn();
    const onReassess = vi.fn();
    render(<PromptQualityPanel assessment={rich()} onImprove={onImprove} onReassess={onReassess} />);
    await userEvent.click(screen.getByRole("button", { name: "Improve with suggestions" }));
    await userEvent.click(screen.getByRole("button", { name: "Reassess" }));
    expect(onImprove).toHaveBeenCalledTimes(1);
    expect(onReassess).toHaveBeenCalledTimes(1);
  });

  it("disables actions while a prompt is being generated", () => {
    render(<PromptQualityPanel assessment={rich()} onImprove={vi.fn()} onReassess={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: "Improve with suggestions" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reassess" })).toBeDisabled();
  });
});
