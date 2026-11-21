import { fc, test, unicodeString } from "@hackersandwizards/scaffolding/property";
import { expect } from "vitest";
import { planSync, roleOf, targetFor, ROLE_NAMES } from "../lib/presenter-sync";

test.prop([unicodeString], { examples: [[""], ["constructor"], ["/舞台".repeat(512)]] })(
  "only the three exact reserved names change a window's role",
  (name) => {
    const reserved = new Map<string, string>(
      Object.entries(ROLE_NAMES).map(([role, name]) => [name, role]),
    );
    expect(roleOf(name)).toBe(reserved.get(name) ?? "audience");
    for (const [name, role] of reserved) expect(roleOf(name)).toBe(role);
  },
);

const state = fc.record({
  slide: fc.nat({ max: 10 }),
  step: fc.nat({ max: 10 }),
  back: fc.boolean(),
});

test.prop([state, state], {
  examples: [
    [
      { slide: 0, step: 0, back: false },
      { slide: 0, step: 0, back: false },
    ],
    [
      { slide: 0, step: 0, back: false },
      { slide: 0, step: 0, back: true },
    ],
    [
      { slide: 0, step: 0, back: true },
      { slide: 0, step: 0, back: false },
    ],
    [
      { slide: 0, step: 1, back: false },
      { slide: 0, step: 0, back: false },
    ],
    [
      { slide: 0, step: 0, back: false },
      { slide: 0, step: 1, back: false },
    ],
    [
      { slide: 1, step: 1, back: false },
      { slide: 0, step: 0, back: true },
    ],
    [
      { slide: 0, step: 1, back: true },
      { slide: 1, step: 0, back: false },
    ],
    [
      { slide: 0, step: 0, back: true },
      { slide: 0, step: 0, back: true },
    ],
  ],
})(
  "a sync move resolves the first difference in slide, full reveal, then step",
  (local, target) => {
    if (local.slide !== target.slide) {
      expect(planSync(local, target)).toEqual({
        navigate: target.slide,
        direction: target.back ? "back" : "forward",
      });
    } else if (local.back !== target.back) {
      expect(planSync(local, target)).toEqual(target.back ? { fill: true } : { ahead: true });
    } else {
      const arrows = new Map([
        [-1, { key: "ArrowLeft" }],
        [1, { key: "ArrowRight" }],
      ]);
      expect(planSync(local, target)).toEqual(
        arrows.get(Math.sign(target.step - local.step)) ?? null,
      );
    }
  },
);

test.prop([state, fc.nat({ max: 5 }), unicodeString, fc.nat()], {
  examples: [
    [{ slide: 0, step: 0, back: true }, 0, "", 0],
    [{ slide: 0, step: 7, back: false }, 1, "/舞台".repeat(512), 1],
  ],
})(
  "only a preview targets the next in-range slide, fully revealed and at step zero",
  (state, remaining, from, at) => {
    const remote = { ...state, at, from };
    const total = state.slide + remaining + 1;
    for (const role of ["audience", "follow", "presenter"] as const)
      expect(targetFor(role, remote, total)).toEqual(remote);
    expect(targetFor("preview", remote, total)).toEqual(
      remaining ? { ...remote, slide: remote.slide + 1, back: true, step: 0 } : null,
    );
  },
);
