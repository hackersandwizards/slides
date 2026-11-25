import { waitFor } from "@testing-library/react";
import { afterEach, assert, describe, expect, it, vi } from "vitest";
import { createEditOverlay } from "../lib/deck-edit-field";

describe("edit field", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = "";
  });

  function openField() {
    const note = vi.fn();
    const overlay = createEditOverlay(note);
    const element = document.createElement("p");
    element.textContent = "Old text";
    document.body.append(element);
    overlay.open({ deck: "/d", element, value: "Old text" });

    const frame = document.querySelector("iframe");
    assert(frame?.contentDocument, "edit iframe should be mounted with a document");
    // jsdom loads no srcdoc.
    frame.contentDocument.body.innerHTML = "<textarea></textarea>";
    frame.dispatchEvent(new Event("load"));
    const input = frame.contentDocument.querySelector("textarea");
    assert(input, "edit textarea should be mounted");
    const press = (key: string) =>
      input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    return { input, note, press };
  }

  it("keeps the field and its text when the write is refused", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Refused." })),
    );
    const { input, note, press } = openField();
    input.value = "New text";

    press("Enter");

    await waitFor(() => expect(note).toHaveBeenCalledWith({ text: "Refused.", error: true }));
    expect(
      document.querySelector("iframe")?.contentDocument?.querySelector("textarea")?.value,
    ).toBe("New text");
  });

  it("saves on Enter, closes the field, announces reload and marks backward arrival", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));
    const { input, note, press } = openField();
    input.value = "Updated text";

    press("Enter");

    await waitFor(() =>
      expect(note).toHaveBeenCalledWith({ text: "Saved. The slide reloads.", error: false }),
    );
    expect(document.querySelector("iframe")).toBeNull();
    expect(sessionStorage.getItem("slide-direction")).toBe("back");
  });

  it.each(["Escape", "Enter"])("closes without saving on %s with unchanged text", (key) => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("{}"));
    const { press } = openField();

    press(key);

    expect(document.querySelector("iframe")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
