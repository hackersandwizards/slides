import { defined } from "@hackersandwizards/scaffolding/defined";
import { rejection } from "@hackersandwizards/scaffolding/rejection";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, assert, describe, expect, it, vi } from "vitest";
import { resolveDeckClick, submitDeckEdit } from "../lib/deck-edit-client";
import { applyDeckClick, DeckEdit } from "../lib/deck-edit-mode";

// F30: a refused write closed the field, losing the typed text, and the click that committed a
// field also picked the text under it, which then reported a refusal over "Saved".
describe("edit mode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = "";
  });

  const setup = (answers: object[]) => {
    sessionStorage.setItem("deck-edit", "on");
    sessionStorage.setItem("deck-edit-armed", "on");
    const fetch = vi.spyOn(globalThis, "fetch");
    for (const answer of answers) fetch.mockResolvedValueOnce(new Response(JSON.stringify(answer)));
    const page = document.createElement("p");
    page.textContent = "Old text";
    document.body.append(page);
    render(<DeckEdit deck="/d" />);
    return { fetch, page };
  };
  // jsdom loads no `srcdoc`: the field's document is written here and its load fired.
  const opened = async () => {
    await waitFor(() => expect(document.querySelector("iframe")).not.toBeNull());
    const frame = defined(document.querySelector("iframe"), "edit iframe");
    defined(frame.contentDocument, "edit iframe document").body.innerHTML = "<textarea></textarea>";
    await act(async () => frame.dispatchEvent(new Event("load")));
  };

  it("shows the refusal note when the answer points outside the clicked chain", async () => {
    const { page } = setup([{ value: "Old text", index: 99 }]);
    await act(async () => page.click());
    await waitFor(() =>
      expect(document.body.textContent).toContain("This text cannot be edited here."),
    );
  });

  it.each([
    { answer: { error: "Refused." }, edit: "New text", note: "Refused." },
    { answer: { ok: true }, edit: "Updated text", note: "Saved. The slide reloads." },
  ])("shows the write note in the badge: $note", async ({ answer, edit, note }) => {
    const { page } = setup([{ value: "Old text", index: 0 }, answer]);
    await act(async () => page.click());
    await opened();
    const input = document.querySelector("iframe")?.contentDocument?.querySelector("textarea");
    assert(input, "edit textarea should be mounted");
    input.value = edit;
    await act(async () =>
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    );
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe(note));
  });

  it("commits an open field with a click elsewhere and picks nothing with it", async () => {
    const { fetch, page } = setup([{ value: "Old text", index: 0 }, { ok: true }]);
    await act(async () => page.click());
    await opened();
    await act(async () => {
      page.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      page.click();
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  // A stray E while presenting from the dev server saved into the deck file: `?edit` opts in.
  it("starts with E only in a tab opened with ?edit", async () => {
    const press = () =>
      act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "e" })));
    const first = render(<DeckEdit deck="/d" />);
    await press();
    expect(document.documentElement.hasAttribute("data-deck-edit")).toBe(false);
    first.unmount();
    // The control: the same press after `?edit` starts it, and the opt-in outlives the query.
    history.replaceState(null, "", "/d/1?edit");
    render(<DeckEdit deck="/d" />);
    history.replaceState(null, "", "/d/2");
    await press();
    expect(document.documentElement.hasAttribute("data-deck-edit")).toBe(true);
  });

  it("reports network and malformed JSON failures from the dev server", async () => {
    const page = document.createElement("p");
    page.textContent = "Old text";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect(await resolveDeckClick("/d", [page])).toEqual({
      error: "The dev server did not answer.",
    });
    fetchSpy.mockResolvedValueOnce(new Response("<html>502</html>"));
    expect(await resolveDeckClick("/d", [page])).toEqual({
      error: "The dev server did not answer.",
    });
  });

  it("propagates unexpected fetch errors from resolveDeckClick and submitDeckEdit", async () => {
    const page = document.createElement("p");
    page.textContent = "Old text";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockRejectedValueOnce(new Error("unexpected resolve failure"));
    expect(await rejection(resolveDeckClick("/d", [page]))).toMatch(/unexpected resolve failure/);
    fetchSpy.mockRejectedValueOnce(new Error("unexpected save failure"));
    expect(await rejection(submitDeckEdit("/d", "Old text", "New text"))).toMatch(
      /unexpected save failure/,
    );
    expect(sessionStorage.getItem("slide-direction")).toBeNull();
  });

  it("propagates unexpected overlay errors from applyDeckClick instead of flashing refusal", async () => {
    const page = document.createElement("p");
    page.textContent = "Old text";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ value: "Old text", index: 0 })),
    );
    const flash = vi.fn();
    const mark = vi.fn();
    expect(
      await rejection(
        applyDeckClick("/d", [page], {
          open: () => {
            throw new Error("unexpected overlay error");
          },
          flash,
          mark,
        }),
      ),
    ).toMatch(/unexpected overlay error/);
    expect(flash).not.toHaveBeenCalled();
  });
});
