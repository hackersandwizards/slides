import { act, render } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CodeLines } from "../lib/use-code-highlight";

const { failure } = vi.hoisted(() => ({ failure: new SyntaxError("invalid highlighter module") }));
vi.mock("../lib/code-highlight", () => {
  throw failure;
});

it("keeps code visible and clears the pending marker after the highlighter import fails", async () => {
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const { container } = render(<CodeLines code="const answer = 42;" language="typescript" />);
    await act(() => vi.dynamicImportSettled());
    expect(container.textContent).toBe("const answer = 42;");
    expect(container.querySelector("[data-code-plain]")).toBeNull();
    expect(logged).toHaveBeenCalledWith(
      "Could not load the slide code highlighter",
      expect.objectContaining({ cause: failure }),
    );
  } finally {
    logged.mockRestore();
  }
});
