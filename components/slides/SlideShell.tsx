import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import type { Grounded, SlideGround } from "../../types/slide";
import { fitSlide } from "./fit-slide";

/** Each ground's class, whole so Tailwind sees it: a deck's deprecated `background` names one. */
export const GROUNDS: Record<SlideGround, string> = {
  intro: "bg-section-intro",
  primary: "bg-section-primary",
  secondary: "bg-section-secondary",
  accent: "bg-section-accent",
  success: "bg-section-success",
};

/** A slide's ground from `ground`, or from the class its deprecated `background` names. */
export function groundOf(slide: Grounded): SlideGround {
  const named = slide.ground ?? slide.background?.slice("bg-section-".length);
  return named && Object.hasOwn(GROUNDS, named) ? (named as SlideGround) : "intro";
}

/** Whether the deck holding the slide stands on night (`theme-brand-dark`): SlideContainer and
 *  PrintSlide provide it, so a day slide in a night deck stays night. */
export const DeckNight = createContext(false);

/** The deck's language (`deckLang`), for the words a slide takes from brand, such as the claim on
 *  a contact closing: PrintSlide and SlideContainer's `lang` provide it, English outside a frame. */
export const DeckLang = createContext<"en" | "de">("en");

const SHELL_DIRECTIONS = new Map<string, string>([["col", "flex-col"]]);

function groundClass(ground: SlideGround) {
  return Object.hasOwn(GROUNDS, ground) ? GROUNDS[ground] : undefined;
}

// The theme is set on every slide, "light" included: the brand's night stops at the nearest light
// theme, so a dark page around a day slide (talks' and trainer-hub's <html>) leaves its elements day.
export function SlideShell({
  children,
  ground = "intro",
  direction = "row",
  overflowHidden = false,
  night = false,
  className,
}: {
  children: ReactNode;
  ground?: SlideGround;
  direction?: "row" | "col";
  overflowHidden?: boolean;
  /** The slide stands on night: `slides.css` sets the night tokens on it and on the frame holding
   *  it, the corner mark included, and the brand's elements take their night rule. */
  night?: boolean;
  className?: string;
}) {
  const ref = useFitToSlide();
  const deckNight = useContext(DeckNight);
  const classes = [
    "slide-shell relative flex min-h-screen items-center justify-center",
    SHELL_DIRECTIONS.get(direction),
    overflowHidden && "overflow-hidden",
    groundClass(ground),
    night && "slide-night",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={ref}
      className={classes}
      data-hw-scale="stage"
      data-theme={night || deckNight ? "dark" : "light"}
      data-hw-night={night ? "" : undefined}
    >
      {children}
    </div>
  );
}

function useFitToSlide() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => fitSlide(ref.current), []);
  return ref;
}
