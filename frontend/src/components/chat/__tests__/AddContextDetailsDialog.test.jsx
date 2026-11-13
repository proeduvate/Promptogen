import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddContextDetailsDialog from "../AddContextDetailsDialog";

function renderDialog(props = {}) {
  const handlers = { onSave: vi.fn(), onCancel: vi.fn(), onRemove: vi.fn() };
  render(
    <AddContextDetailsDialog
      open
      title="Add details: Device constraints"
      description="Specify the target device performance requirements."
      inputHint="e.g., Android 10+, 2 GB RAM"
      {...handlers}
      {...props}
    />
  );
  return handlers;
}

describe("AddContextDetailsDialog", () => {
  it("is an accessible dialog with the backend label, description and hint", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog", { name: "Add details: Device constraints" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("Specify the target device performance requirements.");
    expect(screen.getByLabelText("Your details")).toHaveAttribute("placeholder", "e.g., Android 10+, 2 GB RAM");
  });

  it("prefills the saved value and saves the trimmed draft", async () => {
    const { onSave } = renderDialog({ initialValue: "Android 10+" });
    const field = screen.getByLabelText("Your details");
    expect(field).toHaveValue("Android 10+");
    await userEvent.type(field, ", 2 GB RAM   ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith("Android 10+, 2 GB RAM");
  });

  it("does not save on Cancel, Close or Escape", async () => {
    const { onSave, onCancel } = renderDialog({ initialValue: "keep me" });
    await userEvent.type(screen.getByLabelText("Your details"), " changed");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(3);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("requires non-empty input and only offers Remove for an existing detail", async () => {
    const first = renderDialog();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Your details"), "   ");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /remove detail/i })).not.toBeInTheDocument();
    expect(first.onSave).not.toHaveBeenCalled();
  });

  it("offers Remove when a detail was already saved", async () => {
    const { onRemove } = renderDialog({ initialValue: "Android 10+" });
    await userEvent.click(screen.getByRole("button", { name: /remove detail/i }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    render(<AddContextDetailsDialog open={false} title="x" onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
