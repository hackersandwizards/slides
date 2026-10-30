/** Keeps the windows of one talk on the same slide and step: the audience window, the speaker
 *  window, and the two frames inside the speaker window (the live slide and the preview of the
 *  next one). Same-origin windows only, over a BroadcastChannel, as Spectacle and Slidev do.
 *
 *  A window's state is the slide it is on, whether it arrived there backwards (which opens a slide
 *  fully revealed), and its step: the net count of arrow presses the slide consumed since then,
 *  right adding one and left taking one away. A receiver on another slide navigates there; on the
 *  same slide it replays the missing presses on its own copy of the slide, which ends in the same
 *  reveal state because both copies run the same code from the same start.
 *
 *  Only a press made in this window is broadcast, stamped with a revision that orders every state
 *  of the deck (time, then the sending window); a receiver ignores any state older than the newest
 *  it has seen, so a window still catching up never sends the others back. Where a receiver cannot
 *  go back to a state (a reveal does not un-reveal), the windows meet at the more revealed one. */

import { hasPendingReveal } from "./use-progressive-reveal";

export type Direction = "back" | "forward";
export type ArrowKey = "ArrowRight" | "ArrowLeft";

/** The order of a state: when the press that produced it happened, then which window sent it. */
export interface Stamp {
  at: number;
  from: string;
}

export interface DeckState extends Stamp {
  slide: number;
  back: boolean;
  step: number;
}

const ZERO: Stamp = { at: 0, from: "" };
const newer = (x: Stamp, y: Stamp) => x.at > y.at || (x.at === y.at && x.from > y.from);

/** What a window does in the deck, read off its `window.name`, which survives navigation:
 *  the audience window and the speaker window lead; the frames inside the speaker window follow. */
export type Role = "audience" | "presenter" | "follow" | "preview";
export const ROLE_NAMES = {
  presenter: "hw-slides-presenter",
  follow: "hw-slides-follow",
  preview: "hw-slides-preview",
} as const;

/** An arrow press as the keyboard sends it, for a press the engine makes itself. */
export const arrowEvent = (key: ArrowKey) =>
  new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });

export function roleOf(name: string): Role {
  for (const role of ["presenter", "follow", "preview"] as const)
    if (name === ROLE_NAMES[role]) return role;
  return "audience";
}

export type Plan =
  | { navigate: number; direction: Direction }
  /** The target opened the slide fully revealed and this window did not: reveal everything. */
  | { fill: true }
  | { key: ArrowKey }
  /** This window opened the slide fully revealed and the target did not: it cannot go back. */
  | { ahead: true }
  | null;

/** The next move that brings `local` to `target`. */
export function planSync(
  local: Omit<DeckState, keyof Stamp>,
  target: Omit<DeckState, keyof Stamp>,
): Plan {
  if (local.slide !== target.slide)
    return { navigate: target.slide, direction: target.back ? "back" : "forward" };
  if (target.back && !local.back) return { fill: true };
  if (local.back && !target.back) return { ahead: true };
  if (target.step > local.step) return { key: "ArrowRight" };
  if (target.step < local.step) return { key: "ArrowLeft" };
  return null;
}

/** The state a window in `role` aims for when a leader reports `remote`: the preview shows the
 *  slide after it, fully revealed, and has nothing to show past the last slide. */
export function targetFor(role: Role, remote: DeckState, total: number): DeckState | null {
  if (role !== "preview") return remote;
  if (remote.slide + 1 >= total) return null;
  return { ...remote, slide: remote.slide + 1, back: true, step: 0 };
}

/** `reply` marks an answer to a window's hello, which that window takes even when nobody has
 *  pressed anything yet, so it opens where the others are. Every message names its sender's role,
 *  so a window knows whether a speaker window is open; `bye` is a window leaving the deck. */
type Message = { role: Role } & (
  { type: "state"; state: DeckState; reply?: boolean } | { type: "hello" } | { type: "bye" }
);

interface Deps {
  role: () => Role;
  channel: (name: string) => Pick<BroadcastChannel, "postMessage" | "close"> & {
    onmessage: ((event: MessageEvent<Message>) => void) | null;
  };
  /** Where replayed presses are dispatched. */
  target: () => EventTarget;
  now: () => number;
  /** Waits until a dispatched press has been handled and React has committed its result. */
  tick: () => Promise<void>;
  /** True while the slide still holds a reveal step. */
  pending: () => boolean;
  /** This window's id, the tie-break between two states stamped in the same millisecond. */
  id: string;
}

export function createDeckSync(deps: Deps) {
  const initial = (): DeckState => ({ slide: -1, back: false, step: 0, ...ZERO });
  // `local` is what this window shows, stamped with the state it shows; `seen` is the newest
  // state accepted from anywhere, which may still be on its way in.
  let local = initial();
  let seen: Stamp = ZERO;
  let goal: DeckState | null = null;
  let total = 0;
  let channel: ReturnType<Deps["channel"]> | null = null;
  let channelName = "";
  let users = 0;
  let go: (slide: number, direction: Direction) => void = () => {};
  let reconciling = false;
  // Counts every change of goal or slide, so a replay that awaited a press can tell it is stale.
  let generation = 0;
  // The slide a navigation from here is on its way to, and when it set off. A slide that mounts
  // meanwhile is one that fast presses already left, and counts for nothing; after two seconds
  // the navigation is taken as lost, so a failed one cannot freeze the window.
  let heading: { slide: number; since: number } | undefined;
  const replayed = new WeakSet<Event>();
  const listeners = new Set<() => void>();

  const set = (next: DeckState) => {
    local = next;
    notify();
  };
  const leads = () => ["audience", "presenter"].includes(deps.role());
  const stamp = (): Stamp => {
    seen = { at: Math.max(deps.now(), seen.at + 1, local.at + 1), from: deps.id };
    return seen;
  };
  const send = (message: Message) => channel?.postMessage(message);
  const broadcast = (reply?: boolean) =>
    send({ type: "state", state: local, reply, role: deps.role() });
  const notify = () => listeners.forEach((listener) => listener());
  let speaker = false;
  const bye = () => send({ type: "bye", role: deps.role() });
  const head = (slide: number) => (heading = { slide, since: deps.now() });
  /** A press here, or a state only this window can reach: it becomes the deck's newest. */
  const lead = (next: Omit<DeckState, keyof Stamp>) => {
    generation++;
    goal = null;
    set({ ...next, ...stamp() });
    broadcast();
  };

  function receive(message: Message) {
    if (message.role === "presenter" && speaker !== (message.type !== "bye")) {
      speaker = message.type !== "bye";
      notify();
    }
    // Two audience windows of one deck, such as two tabs, stay apart: an audience window follows
    // only the speaker window and is followed only by it and its frames.
    if (message.type === "bye" || (deps.role() === "audience" && message.role === "audience"))
      return;
    if (message.type === "hello") {
      if (leads() && local.slide >= 0) broadcast(true);
      return;
    }
    const target = targetFor(deps.role(), message.state, total);
    if (!target) return;
    const fresh = seen.at === 0 && local.at === 0;
    if (!newer(target, seen) && !(message.reply && fresh)) return;
    seen = { at: target.at, from: target.from };
    goal = target;
    generation++;
    void reconcile();
  }

  const press = async (key: ArrowKey) => {
    const event = arrowEvent(key);
    replayed.add(event);
    deps.target().dispatchEvent(event);
    await deps.tick();
    return event.defaultPrevented;
  };

  async function reconcile() {
    if (reconciling) return;
    reconciling = true;
    try {
      // Bounded: each pass presses at most one key or navigates once.
      for (let i = 0; i < 100 && goal && local.slide >= 0; i++) {
        // A navigation on its way: plan again once its slide has mounted.
        if (heading && deps.now() - heading.since < 2000) break;
        const plan = planSync(local, goal);
        // A new goal or another slide while a press was on its way: plan again from there.
        const gen = generation;
        const slide = local.slide;
        const moved = () => gen !== generation || slide !== local.slide;
        const drain = async () => {
          for (let j = 0; j < 50 && deps.pending() && !moved(); j++)
            if (!(await press("ArrowRight"))) break;
        };
        if (!plan) {
          // The preview shows a slide's last state: what arriving backwards leaves unrevealed,
          // such as a carousel, it steps through.
          if (deps.role() === "preview") await drain();
          if (moved()) continue;
          set({ ...local, step: goal.step, at: goal.at, from: goal.from });
          goal = null;
          break;
        }
        if ("navigate" in plan) {
          head(plan.navigate);
          go(plan.navigate, plan.direction);
          break;
        }
        if ("fill" in plan) {
          await drain();
          if (!moved()) set({ ...local, back: true, step: 0 });
          continue;
        }
        const before = local.step;
        if ("key" in plan) await press(plan.key);
        if (moved()) continue;
        if ("ahead" in plan || local.step === before) {
          // This window cannot reach the target: a leader makes its own state the newest, and
          // the others come forward to it; a frame stays where it is.
          if (leads()) lead(local);
          else goal = null;
          break;
        }
      }
    } finally {
      reconciling = false;
    }
  }

  function reset() {
    speaker = false;
    local = initial();
    seen = ZERO;
    goal = null;
    heading = undefined;
  }

  return {
    /** Joins the deck's channel and asks the leaders where they are. Returns the leave function;
     *  the channel closes once no slide of the deck is mounted, so a window that left the deck is
     *  never pulled back into it. */
    connect(name: string, slides: number, navigate: typeof go) {
      total = slides;
      go = navigate;
      users++;
      if (channelName !== name) {
        channel?.close();
        reset();
        channelName = name;
        channel = deps.channel(name);
        channel.onmessage = (event) => receive(event.data);
        send({ type: "hello", role: deps.role() });
        if (deps.role() === "presenter") addEventListener("pagehide", bye);
      }
      return () => {
        users--;
        // A slide change unmounts one slide and mounts the next in the same commit.
        setTimeout(() => {
          if (users > 0) return;
          bye();
          removeEventListener("pagehide", bye);
          channel?.close();
          channel = null;
          channelName = "";
          reset();
        });
      };
    },

    /** A slide mounted. Called after the slide's own key handlers are registered. A slide nobody
     *  here navigated to, after the first, came from the browser's back or forward button: a move
     *  in this window like any press. */
    arrive(slide: number, back: boolean) {
      if (heading && heading.slide !== slide && deps.now() - heading.since < 2000) return;
      const own = heading === undefined && local.slide >= 0 && local.slide !== slide;
      heading = undefined;
      if (own && leads()) lead({ slide, back, step: 0 });
      else if (local.slide !== slide) {
        generation++;
        set({ ...local, slide, back, step: 0 });
      }
      void reconcile();
    },

    /** A press in this window left the slide. */
    navigated(slide: number, direction: Direction) {
      head(slide);
      lead({ slide, back: direction === "back", step: 0 });
    },

    /** An arrow press on `slide` finished dispatching. `consumed` is whether the slide used it as
     *  a step; a press whose slide this window has since left counts for nothing. */
    pressed(event: KeyboardEvent, slide: number, consumed: boolean) {
      if (!consumed || slide !== local.slide) return;
      const step = local.step + (event.key === "ArrowRight" ? 1 : -1);
      if (replayed.has(event)) set({ ...local, step });
      else lead({ ...local, step });
    },

    /** True for a press this module replayed from another window, which must not navigate. */
    isReplayed: (event: Event) => replayed.has(event),
    role: () => deps.role(),
    /** True in the frames inside the speaker window, which only follow. */
    follows: () => !leads(),
    getState: () => local,
    /** True while a speaker window is open on this deck. */
    speakerOpen: () => speaker,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** A direct link to the speaker window: `?presenter` names the window once and leaves the URL. */
function windowRole(): Role {
  if (new URLSearchParams(location.search).has("presenter")) {
    window.name = ROLE_NAMES.presenter;
    const url = new URL(location.href);
    url.searchParams.delete("presenter");
    history.replaceState(history.state, "", url);
  }
  return roleOf(window.name);
}

let role: Role | undefined;

/** The one instance per window. Module state outlives a client-side navigation in both hosts. */
export const deckSync = createDeckSync({
  role: () => (role ??= typeof window === "undefined" ? "audience" : windowRole()),
  channel: (name) => new BroadcastChannel(name),
  target: () => window,
  now: () => Date.now(),
  tick: () => new Promise((resolve) => setTimeout(resolve, 0)),
  pending: () => hasPendingReveal(),
  id: Math.random().toString(36).slice(2),
});
