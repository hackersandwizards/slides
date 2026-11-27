import { afterEach, describe, expect, it } from "vitest";
import { createDeckSync, type Role } from "../lib/presenter-sync";

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

interface TestDeck {
  steps: number[];
  /** Slides that open at their first step even when arrived at backwards, as a carousel does. */
  carousels?: number[];
}

// One talk on one shared BroadcastChannel bus, opening windows wired like SlideNavigation.
function createTalk(defaultDeck: TestDeck, now = () => ++clock) {
  const channel = bus();

  function openWindow(role: Role, start = 0, deck: TestDeck = defaultDeck) {
    const { steps, carousels = [] } = deck;
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
    return { view, sync, press, browserBack, leave };
  }

  return { open: openWindow };
}

describe("createDeckSync", () => {
  const defaultDeck: TestDeck = { steps: [0, 3, 0, 2, 0] };

  it("does not read the clock when the expected slide arrives", () => {
    let clockReads = 0;
    const talk = createTalk(defaultDeck, () => ++clockReads);
    const { sync } = talk.open("audience");
    sync.navigated(1, "forward");
    sync.arrive(1, false);
    expect(clockReads).toBe(2);
  });

  it("moves the speaker window with the audience window, steps included", async () => {
    const talk = createTalk(defaultDeck);
    const audience = talk.open("audience");
    const presenter = talk.open("presenter");
    audience.press("ArrowRight");
    audience.press("ArrowRight");
    audience.press("ArrowRight");
    await settle();
    expect(presenter.view).toEqual({ slide: 1, revealed: 2 });
    expect(presenter.sync.getState()).toMatchObject({ slide: 1, step: 2 });
  });

  it("moves the audience window with the speaker window", async () => {
    const talk = createTalk(defaultDeck);
    const audience = talk.open("audience");
    const presenter = talk.open("presenter");
    for (let i = 0; i < 6; i++) presenter.press("ArrowRight");
    await settle();
    expect(audience.view).toEqual({ slide: 3, revealed: 0 });
    presenter.press("ArrowLeft");
    await settle();
    expect(audience.view).toEqual({ slide: 2, revealed: 0 });
    presenter.press("ArrowLeft");
    await settle();
    expect(audience.view).toEqual({ slide: 1, revealed: 3 });
    expect(presenter.view).toEqual({ slide: 1, revealed: 3 });
  });

  it("keeps up with fast presses without sending the leader back", async () => {
    const talk = createTalk(defaultDeck);
    const audience = talk.open("audience");
    const presenter = talk.open("presenter");
    for (let i = 0; i < 7; i++) audience.press("ArrowRight");
    await settle();
    expect(audience.view).toEqual({ slide: 3, revealed: 1 });
    expect(presenter.view).toEqual({ slide: 3, revealed: 1 });
  });

  it("brings a window that joins late to where the others are", async () => {
    const talk = createTalk(defaultDeck);
    const audience = talk.open("audience");
    audience.press("ArrowRight");
    audience.press("ArrowRight");
    await settle();
    const follow = talk.open("follow");
    await settle();
    expect(follow.view).toEqual({ slide: 1, revealed: 1 });
  });

  it("joins a deck nobody has touched yet at the leader's slide", async () => {
    const talk = createTalk(defaultDeck);
    const audience = talk.open("audience", 2);
    const presenter = talk.open("presenter");
    await settle();
    expect(audience.view.slide).toBe(2);
    expect(presenter.view.slide).toBe(2);
  });

  it("never lets a follower or the preview lead", async () => {
    const talk = createTalk(defaultDeck);
    const audience = talk.open("audience");
    const follow = talk.open("follow");
    const preview = talk.open("preview");
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
    const talk = createTalk({ steps: [0, 3, 0] });
    const audience = talk.open("audience");
    // A copy of the deck whose slide 1 reveals nothing: the replayed press must not navigate.
    const presenter = talk.open("presenter", 0, { steps: [0, 0, 0] });
    audience.press("ArrowRight");
    audience.press("ArrowRight");
    await settle();
    expect(presenter.view).toEqual({ slide: 1, revealed: 0 });
  });

  it("carries a move made with the browser's back button to the other windows", async () => {
    const talk = createTalk(defaultDeck);
    const audience = talk.open("audience", 2);
    const presenter = talk.open("presenter", 2);
    await settle();
    audience.browserBack();
    await settle();
    expect(presenter.view.slide).toBe(1);
  });

  it("ignores a slide that fast presses already left", async () => {
    const talk = createTalk(defaultDeck);
    const audience = talk.open("audience");
    audience.sync.navigated(2, "forward");
    audience.sync.arrive(1, false);
    expect(audience.sync.getState().slide).toBe(2);
  });

  it("orders two states stamped in the same millisecond", async () => {
    const talk = createTalk(defaultDeck, () => 5);
    const audience = talk.open("audience");
    const presenter = talk.open("presenter");
    audience.press("ArrowRight");
    audience.press("ArrowRight");
    audience.press("ArrowRight");
    await settle();
    expect(presenter.view).toEqual({ slide: 1, revealed: 2 });
  });

  it("meets at the more revealed state when both windows step at once", async () => {
    const talk = createTalk(defaultDeck);
    const audience = talk.open("audience", 1);
    const presenter = talk.open("presenter", 1);
    audience.press("ArrowRight");
    audience.press("ArrowRight");
    presenter.press("ArrowRight");
    await settle();
    expect(audience.view).toEqual(presenter.view);
    expect(audience.view.revealed).toBe(2);
  });

  it("opens a slide fully revealed in a window that joins where another arrived backwards", async () => {
    const talk = createTalk(defaultDeck);
    const audience = talk.open("audience", 2);
    audience.press("ArrowLeft");
    await settle();
    expect(audience.view).toEqual({ slide: 1, revealed: 3 });
    const presenter = talk.open("presenter", 1);
    await settle();
    expect(presenter.view).toEqual({ slide: 1, revealed: 3 });
  });

  it("leaves two audience windows of one deck apart, as two tabs were before", async () => {
    const talk = createTalk(defaultDeck);
    const first = talk.open("audience");
    const second = talk.open("audience", 2);
    await settle();
    first.press("ArrowRight");
    second.press("ArrowRight");
    await settle();
    expect(first.view).toEqual({ slide: 1, revealed: 0 });
    expect(second.view).toEqual({ slide: 3, revealed: 0 });
  });

  // The projector and a laptop tab with a speaker window open: the speaker window passes a press
  // in one on to the other (F25).
  it("moves a second audience window through the speaker window", async () => {
    const talk = createTalk(defaultDeck);
    const projector = talk.open("audience");
    const laptop = talk.open("audience");
    const presenter = talk.open("presenter");
    await settle();
    laptop.press("ArrowRight");
    laptop.press("ArrowRight");
    await settle();
    expect(presenter.view).toEqual({ slide: 1, revealed: 1 });
    expect(projector.view).toEqual({ slide: 1, revealed: 1 });
    expect(laptop.view).toEqual({ slide: 1, revealed: 1 });
  });

  it("stops following once its last slide has unmounted", async () => {
    const talk = createTalk(defaultDeck);
    const audience = talk.open("audience");
    const left = talk.open("presenter");
    left.leave();
    await settle();
    audience.press("ArrowRight");
    await settle();
    expect(left.view.slide).toBe(0);
  });

  it("knows while a speaker window is open, so the audience window can drop its hints", async () => {
    const talk = createTalk(defaultDeck);
    const audience = talk.open("audience");
    expect(audience.sync.speakerOpen()).toBe(false);
    const presenter = talk.open("presenter");
    await settle();
    expect(audience.sync.speakerOpen()).toBe(true);
    presenter.leave();
    await settle();
    expect(audience.sync.speakerOpen()).toBe(false);
  });

  it("keeps the preview on the newest slide when the deck moves on mid-replay", async () => {
    const steps = [0, 0, 3, 0, 0];
    const talk = createTalk({ steps });
    const audience = talk.open("audience");
    const preview = talk.open("preview", 1, { steps, carousels: [2] });
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
    const steps = [0, 3, 0];
    const talk = createTalk({ steps });
    talk.open("audience");
    const preview = talk.open("preview", 1, { steps, carousels: [1] });
    await settle();
    expect(preview.view).toEqual({ slide: 1, revealed: 3 });
  });

  it("brings the other leader forward when this leader already opened the slide fully revealed", async () => {
    const talk = createTalk(defaultDeck);
    const audience = talk.open("audience", 1);
    const presenter = talk.open("presenter", 2);
    presenter.press("ArrowLeft");
    audience.press("ArrowRight");
    await settle();
    expect(presenter.view).toEqual({ slide: 1, revealed: 3 });
    expect(audience.view).toEqual({ slide: 1, revealed: 3 });
  });

  it("keeps the preview in place when the leader reaches the last slide", async () => {
    const talk = createTalk({ steps: [0, 0] });
    const audience = talk.open("audience", 0);
    const preview = talk.open("preview", 1);
    await settle();
    audience.press("ArrowRight");
    await settle();
    expect(audience.view.slide).toBe(1);
    expect(preview.view.slide).toBe(1);
  });
});
