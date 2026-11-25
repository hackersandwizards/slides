import { submitDeckEdit } from "./deck-edit-client";

export const DECK_EDIT_LEAD = "var(--color-teal)";

// The field is its own document, where the deck's custom properties do not reach: its tokens are
// read off the deck when the field opens.
const fieldDoc = () => {
  const token = (name: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return `<!doctype html><style>html,body{margin:0;height:100%}textarea{box-sizing:border-box;
width:100%;height:100%;border:0;padding:${token("--slide-edit-field-padding")};font:${token("--slide-edit-field-font")};
color:${token("--color-ink")};background:${token("--color-white")};resize:none;outline:none}</style><textarea spellcheck="false"></textarea>`;
};

export type EditNote = { text: string; error: boolean };
type EditTarget = { deck: string; element: Element; value: string };

function editFieldBox(
  rect: Pick<DOMRect, "left" | "top" | "width">,
  viewport: { width: number; height: number },
) {
  const width = Math.min(Math.max(rect.width + 16, 360), viewport.width - 16);
  const left = Math.min(Math.max(rect.left - 8, 8), viewport.width - width - 8);
  const top = Math.min(Math.max(rect.top - 8, 8), viewport.height - 120);
  return { left, top, width };
}

function createEditFrame(element: Element): HTMLIFrameElement {
  const box = editFieldBox(element.getBoundingClientRect(), {
    width: innerWidth,
    height: innerHeight,
  });
  const frame = document.createElement("iframe");
  frame.title = "Edit text";
  Object.assign(frame.style, {
    position: "fixed",
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: "var(--slide-edit-field)",
    zIndex: "90",
    border: `var(--slide-edit-outline) solid ${DECK_EDIT_LEAD}`,
    borderRadius: "var(--radius-sm)",
    background: "var(--color-white)",
    boxShadow: "var(--shadow-overlay)",
  });
  frame.srcdoc = fieldDoc();
  return frame;
}

type CloseField = (field?: EditField) => void;

class EditField {
  private readonly frame: HTMLIFrameElement;
  private done = false;
  private readonly target: EditTarget;
  private readonly onNote: (note: EditNote) => void;
  private readonly close: CloseField;

  constructor(target: EditTarget, onNote: (note: EditNote) => void, close: CloseField) {
    this.target = target;
    this.onNote = onNote;
    this.close = close;
    this.frame = createEditFrame(target.element);
    this.frame.addEventListener("load", this.bindTextarea);
    document.body.append(this.frame);
  }

  remove = () => this.frame.remove();

  private fit(area: HTMLTextAreaElement) {
    const top = Number.parseFloat(this.frame.style.top);
    this.frame.style.height = "0";
    this.frame.style.height = `${Math.min(Math.max(area.scrollHeight + 4, 64), innerHeight - top - 8)}px`;
  }

  // The field stays open until the write answers, so a refused one keeps what was typed.
  private async save(area: HTMLTextAreaElement) {
    if (this.done) return;
    this.done = true;
    const { deck, value } = this.target;
    const to = area.value;
    if (to === value) return this.close();
    const answer = await submitDeckEdit(deck, value, to);
    if (answer.ok) {
      this.close(this);
      this.onNote({ text: "Saved. The slide reloads.", error: false });
    } else {
      this.onNote({ text: answer.error ?? "The write failed.", error: true });
      this.done = false;
      area.focus();
    }
  }

  private bindTextarea = () => {
    const area = this.frame.contentDocument?.querySelector("textarea");
    if (!area) return;
    const { value } = this.target;
    area.value = value;
    this.fit(area);
    area.focus();
    area.setSelectionRange(value.length, value.length);
    area.addEventListener("input", () => this.fit(area));
    // A click elsewhere on the page saves; switching to another app keeps the field open.
    area.addEventListener("blur", () =>
      setTimeout(() => {
        if (document.hasFocus()) void this.save(area);
      }),
    );
    area.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void this.save(area);
      } else if (event.key === "Escape") {
        this.done = true;
        this.close();
      }
    });
  };
}

export function createEditOverlay(onNote: (note: EditNote) => void) {
  let current: EditField | null = null;
  const close = (field?: EditField) => {
    if (field && field !== current) return;
    current?.remove();
    current = null;
  };
  return {
    isOpen: () => current !== null,
    close,
    open(target: EditTarget) {
      close();
      current = new EditField(target, onNote, close);
    },
  };
}
