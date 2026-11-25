import { act, render } from "@testing-library/react";
import { assert, afterEach, describe, expect, it, vi } from "vitest";
import { LaserPointer } from "../components/slides/LaserPointer";
import { deckSync } from "../lib/presenter-sync";

function mockCanvasContext() {
  const ctx = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    strokeStyle: "",
    lineWidth: 0,
    lineCap: "butt" as CanvasLineCap,
    lineJoin: "miter" as CanvasLineJoin,
    shadowColor: "",
    shadowBlur: 0,
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  return ctx;
}

function mouse(type: string, init: MouseEventInit = {}) {
  const event = new MouseEvent(type, { button: 0, bubbles: true, cancelable: true, ...init });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.style.userSelect = "";
  delete (document as Partial<Document>).elementFromPoint;
});

describe("LaserPointer", () => {
  it("leaves canvas sizing and event wiring alone without a 2D context", () => {
    vi.spyOn(deckSync, "role").mockReturnValue("audience");
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const listen = vi.spyOn(window, "addEventListener");
    const highlights = new Map<string, unknown>();
    vi.stubGlobal("Highlight", class {});
    vi.stubGlobal("CSS", { highlights });

    const { container, unmount } = render(<LaserPointer />);
    try {
      const canvas = container.querySelector("canvas");
      assert(canvas);
      expect([canvas.width, canvas.height]).toEqual([300, 150]);
      expect(highlights.has("slide-marker")).toBe(false);
      expect(
        listen.mock.calls.filter(([type]) =>
          ["resize", "mousedown", "mouseup", "mousemove", "keydown", "blur"].includes(type),
        ),
      ).toEqual([]);
    } finally {
      unmount();
      vi.unstubAllGlobals();
    }
  });

  it("keeps the last stroke colour when there is no element at the pointer", () => {
    vi.spyOn(deckSync, "role").mockReturnValue("audience");
    const ctx = mockCanvasContext();
    const frames = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const { container } = render(<LaserPointer />);
    const target = container.firstElementChild;
    assert(target instanceof HTMLElement);
    target.style.setProperty("--color-teal", "#123456");
    const hitTest = vi.fn().mockReturnValueOnce(target).mockReturnValueOnce(null);
    document.elementFromPoint = hitTest;

    mouse("mousedown");
    mouse("mouseup");
    mouse("mousedown");
    mouse("mousemove", { clientX: 10, clientY: 20, buttons: 1 });
    const frame = frames.mock.calls[0][0];
    act(() => frame(16));
    expect(ctx.strokeStyle).toBe("#123456");
  });

  it("draws a stroke on drag, locks userSelect during drag, and restores it on mouseup", () => {
    vi.spyOn(deckSync, "role").mockReturnValue("audience");
    const ctx = mockCanvasContext();
    const frames = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    document.elementFromPoint = () => document.body;

    render(<LaserPointer />);
    const down = mouse("mousedown", { clientX: 10, clientY: 20 });
    expect(down.defaultPrevented).toBe(true);
    expect(document.body.style.userSelect).toBe("none");

    mouse("mousemove", { clientX: 40, clientY: 50, buttons: 1 });
    const scheduled = frames.mock.calls[0];
    assert(scheduled, "Dragging should schedule a canvas frame");
    const [frame] = scheduled;
    act(() => frame(16));
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 20);
    expect(ctx.lineTo).toHaveBeenCalledWith(40, 50);

    mouse("mouseup", { clientX: 40, clientY: 50 });
    expect(document.body.style.userSelect).toBe("");
  });

  it("draws a just-finished stroke with full alpha in its hex color", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    vi.spyOn(deckSync, "role").mockReturnValue("audience");
    const ctx = mockCanvasContext();
    const frames = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const { container } = render(<LaserPointer />);
    const target = container.firstElementChild;
    assert(target instanceof HTMLElement);
    target.style.setProperty("--color-teal", "#123456");
    document.elementFromPoint = () => target;

    mouse("mousedown");
    mouse("mousemove", { clientX: 10, clientY: 20, buttons: 1 });
    mouse("mouseup");
    const scheduled = frames.mock.calls[0];
    assert(scheduled, "Drawing a stroke should schedule a canvas frame");
    const [frame] = scheduled;
    act(() => frame(16));
    expect(ctx.strokeStyle).toBe("#123456ff");
  });

  it("ignores clicks on interactive elements", () => {
    vi.spyOn(deckSync, "role").mockReturnValue("audience");
    mockCanvasContext();
    const { getByRole } = render(
      <>
        <button type="button">Action</button>
        <LaserPointer />
      </>,
    );
    document.elementFromPoint = () => getByRole("button");

    const down = mouse("mousedown", { clientX: 10, clientY: 20 });
    expect(down.defaultPrevented).toBe(false);
    expect(document.body.style.userSelect).toBe("");
  });

  it("ignores clicks while a modal dialog is open", () => {
    vi.spyOn(deckSync, "role").mockReturnValue("audience");
    mockCanvasContext();
    render(
      <>
        <dialog open>Open</dialog>
        <LaserPointer />
      </>,
    );
    document.elementFromPoint = () => document.body;

    const down = mouse("mousedown", { clientX: 10, clientY: 20 });
    expect(down.defaultPrevented).toBe(false);
  });

  it("ends an active stroke when the window loses focus", () => {
    vi.spyOn(deckSync, "role").mockReturnValue("audience");
    mockCanvasContext();
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    document.elementFromPoint = () => document.body;

    render(<LaserPointer />);
    mouse("mousedown", { clientX: 10, clientY: 20 });
    expect(document.body.style.userSelect).toBe("none");
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    expect(document.body.style.userSelect).toBe("");
  });

  it("highlights text on Alt-drag and clears highlights on Escape", () => {
    vi.spyOn(deckSync, "role").mockReturnValue("audience");
    mockCanvasContext();
    const added: Range[] = [];
    const cleared = vi.fn();
    const highlights = new Map<string, unknown>();
    class FakeHighlight {
      add(range: Range) {
        added.push(range);
      }
      clear() {
        cleared();
      }
    }
    vi.stubGlobal("Highlight", FakeHighlight);
    vi.stubGlobal("CSS", { highlights });
    const range = document.createRange();
    vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
      getRangeAt: () => range,
    } as unknown as Selection);

    try {
      const { unmount } = render(<LaserPointer />);
      expect(highlights.has("slide-marker")).toBe(true);
      const down = mouse("mousedown", { altKey: true });
      expect(down.defaultPrevented).toBe(false);
      mouse("mouseup");
      expect(added).toHaveLength(1);

      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });
      expect(cleared).toHaveBeenCalledTimes(1);
      unmount();
      expect(highlights.has("slide-marker")).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
