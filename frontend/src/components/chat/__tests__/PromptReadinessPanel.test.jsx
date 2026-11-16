import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PromptReadinessPanel from "../PromptReadinessPanel";
import { readinessFrom, fixture } from "./readinessTestUtils";

describe("PromptReadinessPanel", () => {
  it("shows the backend percentage and status, not question progress", () => {
    render(<PromptReadinessPanel readiness={readinessFrom(fixture("missing-required"))} />);
    expect(screen.getByRole("heading", { name: "Prompt Readiness" })).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("Needs More Details")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: "Prompt readiness" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("updates to the newer response after a save", () => {
    const { rerender } = render(<PromptReadinessPanel readiness={readinessFrom(fixture("recommended-gaps"))} />);
    expect(screen.getByText("78%")).toBeInTheDocument();
    expect(screen.getByText("Partially Ready")).toBeInTheDocument();
    rerender(<PromptReadinessPanel readiness={readinessFrom(fixture("ready"))} />);
    expect(screen.getByText("96%")).toBeInTheDocument();
    expect(screen.getByText("Ready to Generate")).toBeInTheDocument();
    expect(screen.queryByText("78%")).not.toBeInTheDocument();
  });

  it("renders collected context and every backend gap, including unknown categories", () => {
    const raw = fixture("recommended-gaps");
    raw.missing_context.push({ id: "gap-x", label: "Regulatory region", importance: "blocking-maybe" });
    render(<PromptReadinessPanel readiness={readinessFrom(raw)} />);

    expect(screen.getByText("Collected context (2)")).toBeInTheDocument();
    expect(screen.getByText("Small agency teams")).toBeInTheDocument();
    expect(screen.getByText("Missing context (3)")).toBeInTheDocument();
    expect(screen.getByText("Device constraints")).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByText("Optional")).toBeInTheDocument();
    expect(screen.getByText("Regulatory region")).toBeInTheDocument();
    expect(screen.getByText("Unclassified")).toBeInTheDocument();
  });

  it("hides Generate Anyway and shows the backend blocker when a required gap blocks generation", () => {
    render(<PromptReadinessPanel readiness={readinessFrom(fixture("missing-required"))} onGenerateAnyway={vi.fn()} />);
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate anyway/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate prompt/i })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Add the target users before generating.");
    expect(
      screen.getByText("Required information is missing, so the generated prompt would rely on guesses.")
    ).toBeInTheDocument();
  });

  it("offers Generate Anyway only when the backend authorizes it", async () => {
    const onGenerateAnyway = vi.fn();
    render(<PromptReadinessPanel readiness={readinessFrom(fixture("recommended-gaps"))} onGenerateAnyway={onGenerateAnyway} />);
    expect(screen.getByText(/will be left out of the generated prompt/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /generate anyway/i }));
    expect(onGenerateAnyway).toHaveBeenCalledTimes(1);
  });

  it("shows Generate Prompt for a ready result", async () => {
    const onGenerate = vi.fn();
    render(<PromptReadinessPanel readiness={readinessFrom(fixture("ready"))} onGenerate={onGenerate} />);
    expect(screen.getByText("No context gaps reported")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /generate prompt/i }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /generate anyway/i })).not.toBeInTheDocument();
  });

  it("renders empty states without fabricating items", () => {
    render(<PromptReadinessPanel readiness={readinessFrom(fixture("empty"))} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("No collected details reported yet.")).toBeInTheDocument();
    expect(screen.getByText("No context gaps reported")).toBeInTheDocument();
  });

  it("shows unavailable instead of a score for an incomplete contract", () => {
    render(<PromptReadinessPanel readiness={readinessFrom(fixture("invalid-response"))} onGenerateAnyway={vi.fn()} />);
    expect(screen.getByText("Readiness unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate/i })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/paused until readiness is available/i);
  });

  it("disables generation while the result is stale or updating", () => {
    render(
      <PromptReadinessPanel
        readiness={readinessFrom(fixture("recommended-gaps"), { isFresh: false, isUpdating: true })}
        onGenerateAnyway={vi.fn()}
      />
    );
    expect(screen.getByText("Updating…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate anyway/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /checking readiness/i })).toBeDisabled();
  });

  it("shows an error with Retry and keeps the last result marked as possibly out of date", async () => {
    const readiness = readinessFrom(fixture("recommended-gaps"), {
      isFresh: false,
      status: "error",
      error: "Readiness stub: simulated network failure.",
    });
    render(<PromptReadinessPanel readiness={readiness} onRetry={readiness.refresh} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("simulated network failure");
    expect(alert).toHaveTextContent(/may be out of date/i);
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(readiness.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /generation paused/i })).toBeDisabled();
  });

  it("shows a loading state before the first result", () => {
    render(
      <PromptReadinessPanel
        readiness={{ ...readinessFrom(fixture("ready")), status: "loading", data: null, isFresh: false, isUpdating: true }}
      />
    );
    expect(screen.getByText("Checking prompt readiness…")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onAddDetails with the gap and reflects saved details", async () => {
    const onAddDetails = vi.fn();
    render(
      <PromptReadinessPanel
        readiness={readinessFrom(fixture("recommended-gaps"))}
        contextAdditions={[{ gap_id: "context-gap-6", value: "Markdown PRD" }]}
        onAddDetails={onAddDetails}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Add details for Device constraints" }));
    expect(onAddDetails).toHaveBeenCalledWith(expect.objectContaining({ id: "context-gap-5", label: "Device constraints" }));
    expect(screen.getByRole("button", { name: "Edit details for Preferred output format" })).toBeInTheDocument();
    expect(screen.getByText("Markdown PRD")).toBeInTheDocument();
  });

  it("renders nothing when disabled", () => {
    const { container } = render(<PromptReadinessPanel readiness={{ status: "disabled" }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
