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
 *  reach a state (a slide that opened fully revealed takes no step back), the windows meet at the
 *  one it shows. */

import { hasPendingReveal } from "./reveal-state";

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

type SlideState = Omit<DeckState, keyof Stamp>;

type Plans = {
  navigate: { navigate: number; direction: Direction };
  /** The target opened the slide fully revealed and this window did not: reveal everything. */
  fill: { fill: true };
  key: { key: ArrowKey };
  /** This window opened the slide fully revealed and the target did not: it cannot go back. */
  ahead: { ahead: true };
  settled: null;
};

export type Plan = Plans[keyof Plans];

/** The next move that brings `local` to `target`. */
export function planSync(local: SlideState, target: SlideState): Plan {
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
type StateMessage = { role: Role; type: "state"; state: DeckState; reply?: boolean };
type Message = StateMessage | { role: Role; type: "hello" | "bye" };

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

const initialState = (): DeckState => ({ slide: -1, back: false, step: 0, ...ZERO });
const leads = (role: Role) => ["audience", "presenter"].includes(role);

type ReplaySnapshot = { moved: () => boolean };

type Outcome = "replan" | "await-arrival" | "converged";
type PlanHandler<P> = (plan: P, at: ReplaySnapshot, goal: DeckState) => Outcome | Promise<Outcome>;

interface ReplayWindow {
  deps: Pick<Deps, "role" | "target" | "now" | "tick" | "pending">;
  read: () => DeckState;
  write: (state: DeckState) => void;
  lead: (state: SlideState) => void;
}

class DeckReplay {
  private goal: DeckState | null = null;
  navigate: (slide: number, direction: Direction) => void = () => {};
  private reconciling = false;
  // Counts every change of goal or slide, so a replay that awaited a press can tell it is stale.
  private generation = 0;
  // The slide a navigation from here is on its way to, and when it set off. A slide that mounts
  // meanwhile is one that fast presses already left, and counts for nothing; after two seconds
  // the navigation is taken as lost, so a failed one cannot freeze the window.
  private heading: { slide: number; since: number } | undefined;
  private readonly view: ReplayWindow;
  private readonly replayed = new WeakSet<Event>();

  constructor(view: ReplayWindow) {
    this.view = view;
  }

  isReplayed = (event: Event) => this.replayed.has(event);
  head = (slide: number) => (this.heading = { slide, since: this.view.deps.now() });
  private inFlight = () => this.heading && this.view.deps.now() - this.heading.since < 2000;
  private snapshot(): ReplaySnapshot {
    const generation = this.generation;
    const slide = this.view.read().slide;
    return { moved: () => generation !== this.generation || slide !== this.view.read().slide };
  }

  replaceGoal(goal: DeckState | null) {
    this.generation++;
    this.goal = goal;
    if (goal) void this.reconcile();
  }

  reset() {
    this.goal = null;
    this.heading = undefined;
  }

  /** A slide mounted. Called after the slide's own key handlers are registered. A slide nobody
   *  here navigated to, after the first, came from the browser's back or forward button: a move
   *  in this window like any press. */
  arrive(slide: number, back: boolean) {
    if (this.heading && this.heading.slide !== slide && this.inFlight()) return;
    const local = this.view.read();
    const own = !this.heading && local.slide >= 0 && local.slide !== slide;
    this.heading = undefined;
    if (own && leads(this.view.deps.role())) this.view.lead({ slide, back, step: 0 });
    else if (local.slide !== slide) {
      this.generation++;
      this.view.write({ ...local, slide, back, step: 0 });
    }
    void this.reconcile();
  }

  private async press(key: ArrowKey) {
    const event = arrowEvent(key);
    this.replayed.add(event);
    this.view.deps.target().dispatchEvent(event);
    await this.view.deps.tick();
    return event.defaultPrevented;
  }

  private async drainReveals(before: ReplaySnapshot) {
    for (let j = 0; j < 50 && this.view.deps.pending() && !before.moved(); j++)
      if (!(await this.press("ArrowRight"))) break;
  }

  private readonly plans = {
    navigate: ({ navigate, direction }) => {
      this.head(navigate);
      this.navigate(navigate, direction);
      return "await-arrival";
    },
    fill: async (_, before): Promise<Outcome> => {
      await this.drainReveals(before);
      if (!before.moved()) this.view.write({ ...this.view.read(), back: true, step: 0 });
      return "replan";
    },
    ahead: () => {
      // This window cannot reach the target: a leader makes its own state the newest, and
      // the others come forward to it; a frame stays where it is.
      if (leads(this.view.deps.role())) this.view.lead(this.view.read());
      else this.goal = null;
      return "converged";
    },
    key: async ({ key }, before): Promise<Outcome> => {
      const { step } = this.view.read();
      await this.press(key);
      if (before.moved() || this.view.read().step !== step) return "replan";
      return this.plans.ahead();
    },
    settled: async (_, before, goal): Promise<Outcome> => {
      // The preview shows a slide's last state: what arriving backwards leaves unrevealed,
      // such as a carousel, it steps through.
      if (this.view.deps.role() === "preview") await this.drainReveals(before);
      if (before.moved()) return "replan";
      this.view.write({ ...this.view.read(), step: goal.step, at: goal.at, from: goal.from });
      this.goal = null;
      return "converged";
    },
  } satisfies { [Kind in keyof Plans]: PlanHandler<Plans[Kind]> };

  private async reconcile() {
    if (this.reconciling) return;
    this.reconciling = true;
    try {
      // Bounded: each pass presses at most one key or navigates once.
      for (let i = 0; i < 100 && this.goal && this.view.read().slide >= 0; i++) {
        // A navigation on its way: plan again once its slide has mounted.
        if (this.inFlight()) break;
        const plan = planSync(this.view.read(), this.goal);
        const kind = (plan ? Object.keys(plan)[0] : "settled") as keyof Plans;
        const handle = this.plans[kind] as PlanHandler<Plan>;
        if ((await handle(plan, this.snapshot(), this.goal)) !== "replan") break;
      }
    } finally {
      this.reconciling = false;
    }
  }
}

type SyncWindow = { local: DeckState; seen: Stamp; total: number };

function acceptRemoteState(current: SyncWindow, message: StateMessage, role: Role) {
  const target = targetFor(role, message.state, current.total);
  if (target && newer(target, current.seen)) return target;
  return message.reply && current.seen.at === 0 && current.local.at === 0 ? target : null;
}

class DeckSync {
  // `local` is what this window shows, stamped with the state it shows; `seen` is the newest
  // state accepted from anywhere, which may still be on its way in.
  private readonly window: SyncWindow = { local: initialState(), seen: ZERO, total: 0 };
  private channel: ReturnType<Deps["channel"]> | null = null;
  private channelName = "";
  private users = 0;
  private speaker = false;
  private readonly deps: Deps;
  private readonly replay: DeckReplay;
  private readonly listeners = new Set<() => void>();

  constructor(deps: Deps) {
    this.deps = deps;
    this.replay = new DeckReplay({ deps, read: this.getState, write: this.set, lead: this.lead });
  }

  private set = (next: DeckState) => {
    this.window.local = next;
    this.notify();
  };

  private send = (message: Message) => this.channel?.postMessage(message);
  private broadcast = (reply?: boolean) =>
    this.send({ type: "state", state: this.window.local, reply, role: this.deps.role() });
  private notify = () => this.listeners.forEach((listener) => listener());
  private bye = () => this.send({ type: "bye", role: this.deps.role() });
  /** A press here, or a state only this window can reach: it becomes the deck's newest. */
  private lead = (next: SlideState) => {
    this.replay.replaceGoal(null);
    const at = Math.max(this.deps.now(), this.window.seen.at + 1, this.window.local.at + 1);
    this.window.seen = { at, from: this.deps.id };
    this.set({ ...next, ...this.window.seen });
    this.broadcast();
  };

  private updateSpeakerPresence(message: Message) {
    const open = message.type !== "bye";
    if (message.role !== "presenter" || this.speaker === open) return;
    this.speaker = open;
    this.notify();
  }

  private receive(message: Message) {
    this.updateSpeakerPresence(message);
    // Two audience windows of one deck, such as two tabs, stay apart: an audience window follows
    // only the speaker window, which passes a press made in one on to the other.
    if (message.type === "bye" || (this.deps.role() === "audience" && message.role === "audience"))
      return;
    if (message.type !== "state") {
      if (leads(this.deps.role()) && this.window.local.slide >= 0) this.broadcast(true);
      return;
    }
    const target = acceptRemoteState(this.window, message, this.role());
    if (!target) return;
    this.window.seen = { at: target.at, from: target.from };
    if (this.role() === "presenter" && message.role === "audience")
      this.send({ type: "state", state: target, role: "presenter" });
    this.replay.replaceGoal(target);
  }

  private reset() {
    this.channel?.close();
    this.speaker = false;
    this.window.local = initialState();
    this.window.seen = ZERO;
    this.replay.reset();
  }

  /** Joins the deck's channel and asks the leaders where they are. Returns the leave function;
   *  the channel closes once no slide of the deck is mounted, so a window that left the deck is
   *  never pulled back into it. */
  connect(name: string, slides: number, navigate: DeckReplay["navigate"]) {
    this.window.total = slides;
    this.replay.navigate = navigate;
    this.users++;
    if (this.channelName !== name) {
      this.reset();
      this.channelName = name;
      this.channel = this.deps.channel(name);
      this.channel.onmessage = (event) => this.receive(event.data);
      this.send({ type: "hello", role: this.deps.role() });
      if (this.deps.role() === "presenter") addEventListener("pagehide", this.bye);
    }
    return () => {
      this.users--;
      // A slide change unmounts one slide and mounts the next in the same commit.
      setTimeout(() => {
        if (this.users > 0) return;
        this.bye();
        removeEventListener("pagehide", this.bye);
        this.reset();
        this.channel = null;
        this.channelName = "";
      });
    };
  }

  arrive = (slide: number, back: boolean) => this.replay.arrive(slide, back);

  /** A press in this window left the slide. */
  navigated(slide: number, direction: Direction) {
    this.replay.head(slide);
    this.lead({ slide, back: direction === "back", step: 0 });
  }

  /** An arrow press on `slide` finished dispatching. `consumed` is whether the slide used it as
   *  a step; a press whose slide this window has since left counts for nothing. */
  pressed(event: KeyboardEvent, slide: number, consumed: boolean) {
    if (!consumed || slide !== this.window.local.slide) return;
    const { local } = this.window;
    const step = local.step + (event.key === "ArrowRight" ? 1 : -1);
    (this.replay.isReplayed(event) ? this.set : this.lead)({ ...local, step });
  }

  /** True for a press this module replayed from another window, which must not navigate. */
  isReplayed = (event: Event) => this.replay.isReplayed(event);
  role = () => this.deps.role();
  /** True in the frames inside the speaker window, which only follow. */
  follows = () => !leads(this.deps.role());
  getState = () => this.window.local;
  /** True while a speaker window is open on this deck. */
  speakerOpen = () => this.speaker;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

export const createDeckSync = (deps: Deps) => new DeckSync(deps);

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

/** The one instance per window. Module state outlives a slide change, which loads no document. */
export const deckSync = createDeckSync({
  role: () => (role ??= typeof window === "undefined" ? "audience" : windowRole()),
  channel: (name) => new BroadcastChannel(name),
  target: () => window,
  now: () => Date.now(),
  tick: () => new Promise((resolve) => setTimeout(resolve, 0)),
  pending: () => hasPendingReveal(),
  id: Math.random().toString(36).slice(2),
});
