import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PresenterView } from "../components/slides/PresenterView";
import { deckSync } from "../lib/presenter-sync";

function setupPresenter(slide = 0) {
  vi.spyOn(deckSync, "role").mockReturnValue("presenter");
  vi.spyOn(deckSync, "getState").mockReturnValue({
    slide,
    back: false,
    step: 0,
    at: 1,
    from: "p",
  });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  HTMLElement.prototype.scrollTo = vi.fn();
  HTMLElement.prototype.scrollBy = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(HTMLElement.prototype, "scrollTo");
  Reflect.deleteProperty(HTMLElement.prototype, "scrollBy");
  delete document.documentElement.dataset.deckEdit;
});

describe("PresenterView in the speaker window", () => {
  it("shows the slide position, status badge, notes and both preview frames", () => {
    setupPresenter(0);
    render(<PresenterView notes={["Opening note", "Second note"]} basePath="/deck" />);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByText("Next press: next slide")).toBeInTheDocument();
    expect(screen.getByText("Opening note")).toBeInTheDocument();
    expect(screen.getByTitle("Current slide")).toHaveAttribute("src", "/deck/0");
    expect(screen.getByTitle("Next slide")).toHaveAttribute("src", "/deck/1");
  });

  it("shows the last-slide status and end-of-deck fallback on the final slide", () => {
    setupPresenter(1);
    render(<PresenterView notes={["First", undefined]} basePath="/deck" />);
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    expect(screen.getByText("Last slide")).toBeInTheDocument();
    expect(screen.getByText("End of the deck")).toBeInTheDocument();
    expect(screen.getByText("No notes on this slide.")).toBeInTheDocument();
  });

  it("pauses, resumes and resets the speaker timer", () => {
    setupPresenter(0);
    render(<PresenterView notes={["Note"]} basePath="/deck" />);
    expect(screen.getByLabelText("Elapsed time")).toHaveTextContent("0:00");
    fireEvent.click(screen.getByRole("button", { name: "Pause timer" }));
    expect(screen.getByRole("button", { name: "Resume timer" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset timer" }));
    expect(screen.getByLabelText("Elapsed time")).toHaveTextContent("0:00");
    fireEvent.click(screen.getByRole("button", { name: "Resume timer" }));
    expect(screen.getByRole("button", { name: "Pause timer" })).toBeInTheDocument();
  });

  it("changes notes font size and persists it to localStorage", () => {
    setupPresenter(0);
    render(<PresenterView notes={["Sized note"]} basePath="/deck" />);
    const notesBox = screen.getByText("Sized note");
    expect(notesBox).toHaveStyle({ fontSize: "24px" });
    fireEvent.click(screen.getByRole("button", { name: "Larger notes" }));
    expect(notesBox).toHaveStyle({ fontSize: "26px" });
    expect(localStorage.getItem("slide-notes-size")).toBe("26");
    fireEvent.click(screen.getByRole("button", { name: "Smaller notes" }));
    expect(notesBox).toHaveStyle({ fontSize: "24px" });
  });

  it("resizes the split divider with keyboard arrows and resets on double-click", () => {
    setupPresenter(0);
    render(<PresenterView notes={["Note"]} basePath="/deck" />);
    const separator = screen.getByRole("separator", { name: "Resize slides and notes" });
    expect(separator).toHaveAttribute("aria-valuenow", "60");
    fireEvent.keyDown(separator, { key: "ArrowDown" });
    expect(separator).toHaveAttribute("aria-valuenow", "65");
    fireEvent.keyDown(separator, { key: "Home" });
    expect(separator).toHaveAttribute("aria-valuenow", "10");
    fireEvent.doubleClick(separator);
    expect(separator).toHaveAttribute("aria-valuenow", "60");
  });

  it("edits and saves speaker notes through /api/deck-edit", async () => {
    setupPresenter(0);
    const ask = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ok: true }));
    render(<PresenterView notes={["Original note"]} basePath="/deck" />);

    fireEvent.click(screen.getByRole("button", { name: "Edit notes" }));
    expect("deckEdit" in document.documentElement.dataset).toBe(true);
    const textarea = screen.getByLabelText("Speaker notes text");
    fireEvent.change(textarea, { target: { value: "Updated note" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save notes" }));
    });
    expect(ask).toHaveBeenCalledWith(
      "/api/deck-edit",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ deck: "/deck", from: "Original note", to: "Updated note" }),
      }),
    );
    expect(screen.getByText("Updated note")).toBeInTheDocument();
    expect("deckEdit" in document.documentElement.dataset).toBe(false);
  });

  it("reports an error when saving notes for a slide without a notes field", async () => {
    setupPresenter(0);
    render(<PresenterView notes={[undefined]} basePath="/deck" />);
    fireEvent.click(screen.getByRole("button", { name: "Edit notes" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save notes" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("no notes field");
    fireEvent.click(screen.getByRole("button", { name: "Cancel editing" }));
    expect(screen.getByRole("alert")).toHaveTextContent("");
  });
});
