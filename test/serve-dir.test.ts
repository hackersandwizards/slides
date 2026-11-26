import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { decodeRequestPath, serveDir } from "../scripts/serve-dir";

describe("decodeRequestPath", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("decodes valid percent-encoded paths and returns null for malformed encodings", () => {
    expect(decodeRequestPath("/hello%20world.html?x=1")).toBe("/hello world.html");
    expect(decodeRequestPath("/%E0%A4%A")).toBeNull();
  });

  it("propagates unexpected errors from decodeURIComponent", () => {
    vi.spyOn(globalThis, "decodeURIComponent").mockImplementation(() => {
      throw new TypeError("unexpected decode error");
    });
    expect(() => decodeRequestPath("/hello%20world.html")).toThrow("unexpected decode error");
  });
});

describe("serveDir", () => {
  const dir = mkdtempSync(join(tmpdir(), "serve-dir-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("serves existing files and answers 404 for malformed percent-encoded paths", async () => {
    writeFileSync(join(dir, "index.html"), "<p>ok</p>");
    const served = await serveDir(dir);
    try {
      const ok = await fetch(`${served.origin}/`);
      const bad = await fetch(`${served.origin}/%E0%A4%A`);
      expect(ok.status).toBe(200);
      expect(bad.status).toBe(404);
    } finally {
      served.close();
    }
  });
});
