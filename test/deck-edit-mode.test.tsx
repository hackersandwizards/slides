import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeckEdit } from "../lib/deck-edit-mode";

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
  const area = () =>
    document.querySelector("iframe")?.contentDocument?.querySelector("textarea") ?? null;
  // jsdom loads no `srcdoc`: the field's document is written here and its load fired.
  const opened = async () => {
    await waitFor(() => expect(document.querySelector("iframe")).not.toBeNull());
    const frame = document.querySelector("iframe")!;
    frame.contentDocument!.body.innerHTML = "<textarea></textarea>";
    await act(async () => frame.dispatchEvent(new Event("load")));
  };

  it("keeps the field and its text when the write is refused", async () => {
    const { page } = setup([{ value: "Old text", index: 0 }, { error: "Refused." }]);
    await act(async () => page.click());
    await opened();
    area()!.value = "New text";
    await act(async () =>
      area()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    );
    await waitFor(() => expect(document.body.textContent).toContain("Refused."));
    expect(area()?.value).toBe("New text");
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
});
