import { afterEach, describe, expect, it } from "vitest";
import {
  createDeckSync,
  planSync,
  roleOf,
  ROLE_NAMES,
  targetFor,
  type DeckState,
  type Role,
} from "../lib/presenter-sync";

const at = (slide: number, step = 0, back = false, time = 1): DeckState => ({
  slide,
  back,
  step,
  at: time,
  from: "",
});

describe("roleOf", () => {
  it("reads the role off the window name, anything else is the audience", () => {
    expect(roleOf(ROLE_NAMES.presenter)).toBe("presenter");
    expect(roleOf(ROLE_NAMES.follow)).toBe("follow");
    expect(roleOf(ROLE_NAMES.preview)).toBe("preview");
    expect(roleOf("")).toBe("audience");
    expect(roleOf("some-other-tab")).toBe("audience");
  });
});

describe("planSync", () => {
  it("navigates to another slide in the direction the target arrived", () => {
    expect(planSync(at(2), at(5))).toEqual({ navigate: 5, direction: "forward" });
    expect(planSync(at(5), at(4, 0, true))).toEqual({ navigate: 4, direction: "back" });
  });
  it("presses one arrow at a time on the same slide", () => {
    expect(planSync(at(3, 1), at(3, 3))).toEqual({ key: "ArrowRight" });
    expect(planSync(at(3, 2), at(3, 1))).toEqual({ key: "ArrowLeft" });
    expect(planSync(at(3, 2), at(3, 2))).toBeNull();
  });
});

describe("targetFor", () => {
  it("leaves the state alone for every role but the preview", () => {
    for (const role of ["audience", "presenter", "follow"] as Role[])
      expect(targetFor(role, at(3, 2), 10)).toEqual(at(3, 2));
  });
  it("points the preview at the next slide, fully revealed, and nowhere past the end", () => {
    expect(targetFor("preview", at(3, 2), 10)).toEqual(at(4, 0, true));
    expect(targetFor("preview", at(9, 0), 10)).toBeNull();
  });
});

// A window: a deck of slides with N reveal steps each, wired to the sync the way
// SlideNavigation wires it, over a shared in-memory channel.
type Member = { onmessage: ((event: MessageEvent) => void) | null };

// Every member of every bus, so a test's windows go silent before jsdom is torn down.
const open = new Set<{ close(): void }>();

function bus() {
  const members = new Set<Member>();
  return () => {
    const member: Member & Pick<BroadcastChannel, "postMessage" | "close"> = {
      onmessage: null,
      postMessage(data: unknown) {
        const copy = structuredClone(data);
        for (const other of members)
          if (other !== member)
            setTimeout(
              () => members.has(other) && other.onmessage?.({ data: copy } as MessageEvent),
            );
      },
      close() {
        members.delete(member);
        open.delete(member);
      },
    };
    members.add(member);
    open.add(member);
    return member;
  };
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const settle = async () => {
  for (let i = 0; i < 30; i++) await tick();
};

// A message still on its way would replay a key press after the test, when jsdom has no
// KeyboardEvent left: close every window, then let what is already queued run out.
afterEach(async () => {
  for (const member of [...open]) member.close();
  for (let i = 0; i < 10; i++) await settle();
});

let clock = 0;

let ids = 0;

function makeWindow(
  role: Role,
  channel: ReturnType<typeof bus>,
  steps: number[],
  start = 0,
  now = () => ++clock,
  /** Slides that open at their first step even when arrived at backwards, as a carousel does. */
  carousels: number[] = [],
) {
  const target = new EventTarget();
  const view = { slide: start, revealed: 0 };
  const sync = createDeckSync({
    role: () => role,
    channel,
    target: () => target,
    now,
    tick,
    pending: () => view.revealed < steps[view.slide],
    id: String(++ids),
  });

  const go = (slide: number, direction: "back" | "forward") => {
    view.slide = slide;
    view.revealed = direction === "back" && !carousels.includes(slide) ? steps[slide] : 0;
    setTimeout(() => sync.arrive(slide, direction === "back"));
  };
  // The slide's reveal handler, then the navigation, then the observer, as on the page.
  target.addEventListener("keydown", (event) => {
    const key = (event as KeyboardEvent).key;
    if (key === "ArrowRight" && view.revealed < steps[view.slide]) {
      view.revealed++;
      event.preventDefault();
    }
  });
  target.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || sync.isReplayed(event)) return;
    const key = (event as KeyboardEvent).key;
    const next = key === "ArrowRight" ? view.slide + 1 : view.slide - 1;
    if (next < 0 || next >= steps.length) return;
    const direction = key === "ArrowRight" ? "forward" : "back";
    go(next, direction);
    sync.navigated(next, direction);
  });
  target.addEventListener("keydown", (event) => {
    const slide = sync.getState().slide;
    setTimeout(() => sync.pressed(event as KeyboardEvent, slide, event.defaultPrevented));
  });

  const leave = sync.connect("deck", steps.length, go);
  sync.arrive(start, false);
  const press = (key: "ArrowRight" | "ArrowLeft") =>
    target.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true }));
  /** The browser's back button: the host mounts another slide without a press. */
  const browserBack = () => go(view.slide - 1, "forward");
  /** Arrives backwards, as an ArrowLeft from the next slide would. */
  const arriveBackwards = () => {
    view.revealed = steps[view.slide];
    sync.arrive(view.slide, true);
  };
  return { view, sync, press, browserBack, leave, arriveBackwards };
}

describe("createDeckSync", () => {
  const steps = [0, 3, 0, 2, 0];

  it("moves the speaker window with the audience window, steps included", async () => {
    const channel = bus();
    const audience = makeWindow("audience", channel, steps);
    const presenter = makeWindow("presenter", channel, steps);
    audience.press("ArrowRight");
    audience.press("ArrowRight");
    audience.press("ArrowRight");
    await settle();
    expect(presenter.view).toEqual({ slide: 1, revealed: 2 });
    expect(presenter.sync.getState()).toMatchObject({ slide: 1, step: 2 });
  });

  it("moves the audience window with the speaker window", async () => {
    const channel = bus();
    const audience = makeWindow("audience", channel, steps);
    const presenter = makeWindow("presenter", channel, steps);
    for (let i = 0; i < 6; i++) presenter.press("ArrowRight");
    await settle();
    expect(audience.view).toEqual({ slide: 3, revealed: 0 });
    presenter.press("ArrowLeft");
    await settle();
    expect(audience.view).toEqual({ slide: 2, revealed: 0 });
    presenter.press("ArrowLeft");
    await settle();
    // Arriving backwards opens the slide fully revealed, in both windows.
    expect(audience.view).toEqual({ slide: 1, revealed: 3 });
    expect(presenter.view).toEqual({ slide: 1, revealed: 3 });
  });

  it("keeps up with fast presses without sending the leader back", async () => {
    const channel = bus();
    const audience = makeWindow("audience", channel, steps);
    const presenter = makeWindow("presenter", channel, steps);
    for (let i = 0; i < 7; i++) audience.press("ArrowRight");
    await settle();
    expect(audience.view).toEqual({ slide: 3, revealed: 1 });
    expect(presenter.view).toEqual({ slide: 3, revealed: 1 });
  });

  it("brings a window that joins late to where the others are", async () => {
    const channel = bus();
    const audience = makeWindow("audience", channel, steps);
    audience.press("ArrowRight");
    audience.press("ArrowRight");
    await settle();
    const follow = makeWindow("follow", channel, steps);
    await settle();
    expect(follow.view).toEqual({ slide: 1, revealed: 1 });
  });

  it("joins a deck nobody has touched yet at the leader's slide", async () => {
    const channel = bus();
    const audience = makeWindow("audience", channel, steps, 2);
    const presenter = makeWindow("presenter", channel, steps);
    await settle();
    expect(audience.view.slide).toBe(2);
    expect(presenter.view.slide).toBe(2);
  });

  it("never lets a follower or the preview lead", async () => {
    const channel = bus();
    const audience = makeWindow("audience", channel, steps);
    const follow = makeWindow("follow", channel, steps);
    const preview = makeWindow("preview", channel, steps);
    audience.press("ArrowRight");
    await settle();
    expect(follow.view).toEqual({ slide: 1, revealed: 0 });
    expect(preview.view).toEqual({ slide: 2, revealed: 0 });
    audience.press("ArrowRight");
    audience.press("ArrowRight");
    audience.press("ArrowRight");
    audience.press("ArrowRight");
    await settle();
    expect(preview.view).toEqual({ slide: 3, revealed: 2 });
  });

  it("stops replaying when the slide does not take the press", async () => {
    const channel = bus();
    const audience = makeWindow("audience", channel, [0, 3, 0]);
    // A copy of the deck whose slide 1 reveals nothing: the replayed press must not navigate.
    const presenter = makeWindow("presenter", channel, [0, 0, 0]);
    audience.press("ArrowRight");
    audience.press("ArrowRight");
    await settle();
    expect(presenter.view).toEqual({ slide: 1, revealed: 0 });
  });

  it("carries a move made with the browser's back button to the other windows", async () => {
    const channel = bus();
    const audience = makeWindow("audience", channel, steps, 2);
    const presenter = makeWindow("presenter", channel, steps, 2);
    await settle();
    audience.browserBack();
    await settle();
    expect(presenter.view.slide).toBe(1);
  });

  it("ignores a slide that fast presses already left", async () => {
    const channel = bus();
    const audience = makeWindow("audience", channel, steps);
    audience.sync.navigated(2, "forward");
    audience.sync.arrive(1, false);
    expect(audience.sync.getState().slide).toBe(2);
  });

  it("orders two states stamped in the same millisecond", async () => {
    const channel = bus();
    const frozen = () => 5;
    const audience = makeWindow("audience", channel, steps, 0, frozen);
    const presenter = makeWindow("presenter", channel, steps, 0, frozen);
    audience.press("ArrowRight");
    audience.press("ArrowRight");
    audience.press("ArrowRight");
    await settle();
    expect(presenter.view).toEqual({ slide: 1, revealed: 2 });
  });

  it("meets at the more revealed state when both windows step at once", async () => {
    const channel = bus();
    const audience = makeWindow("audience", channel, steps, 1);
    const presenter = makeWindow("presenter", channel, steps, 1);
    audience.press("ArrowRight");
    audience.press("ArrowRight");
    presenter.press("ArrowRight");
    await settle();
    expect(audience.view).toEqual(presenter.view);
    expect(audience.view.revealed).toBe(2);
  });

  it("opens a slide fully revealed in a window that joins where another arrived backwards", async () => {
    const channel = bus();
    const audience = makeWindow("audience", channel, steps, 2);
    audience.press("ArrowLeft");
    await settle();
    expect(audience.view).toEqual({ slide: 1, revealed: 3 });
    const presenter = makeWindow("presenter", channel, steps, 1);
    await settle();
    expect(presenter.view).toEqual({ slide: 1, revealed: 3 });
  });

  it("leaves two audience windows of one deck apart, as two tabs were before", async () => {
    const channel = bus();
    const first = makeWindow("audience", channel, steps);
    const second = makeWindow("audience", channel, steps, 2);
    await settle();
    first.press("ArrowRight");
    second.press("ArrowRight");
    await settle();
    expect(first.view).toEqual({ slide: 1, revealed: 0 });
    expect(second.view).toEqual({ slide: 3, revealed: 0 });
  });

  it("stops following once its last slide has unmounted", async () => {
    const channel = bus();
    const audience = makeWindow("audience", channel, steps);
    const left = makeWindow("presenter", channel, steps);
    left.leave();
    await settle();
    audience.press("ArrowRight");
    await settle();
    expect(left.view.slide).toBe(0);
  });

  it("knows while a speaker window is open, so the audience window can drop its hints", async () => {
    const channel = bus();
    const audience = makeWindow("audience", channel, steps);
    expect(audience.sync.speakerOpen()).toBe(false);
    const presenter = makeWindow("presenter", channel, steps);
    await settle();
    expect(audience.sync.speakerOpen()).toBe(true);
    presenter.leave();
    await settle();
    expect(audience.sync.speakerOpen()).toBe(false);
  });

  it("keeps the preview on the newest slide when the deck moves on mid-replay", async () => {
    const channel = bus();
    const deck = [0, 0, 3, 0, 0];
    const audience = makeWindow("audience", channel, deck);
    const preview = makeWindow("preview", channel, deck, 1, undefined, [2]);
    await settle();
    audience.press("ArrowRight");
    // The preview is now stepping slide 2's carousel to its end, one press per tick.
    await tick();
    await tick();
    await tick();
    audience.press("ArrowRight");
    await settle();
    expect(preview.view.slide).toBe(3);
  });

  it("shows a carousel in the preview at its last step", async () => {
    const channel = bus();
    const deck = [0, 3, 0];
    makeWindow("audience", channel, deck);
    const preview = makeWindow("preview", channel, deck, 1, undefined, [1]);
    await settle();
    expect(preview.view).toEqual({ slide: 1, revealed: 3 });
  });
});
