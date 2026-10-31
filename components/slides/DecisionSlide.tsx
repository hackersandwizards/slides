"use client";

import type {
  DecisionBranch,
  DecisionSlide as DecisionSlideType,
  DecisionTeam,
} from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { TitledContent, SlideTitle, SlideSubtitle } from "./primitives";

interface Props {
  slide: DecisionSlideType;
}

// The team-topology slide's colours, so a branch reads as the team type it hands the need to.
const TEAM: Record<DecisionTeam, string> = {
  platform: "border-primary bg-primary/15 text-teal-dark",
  enabling: "border-secondary bg-secondary/15 text-deep-800",
  "complicated-subsystem": "border-factory bg-factory/15 text-factory",
};

// An arrowhead at the right end of a 4px connector.
function Head() {
  return (
    <span className="absolute top-1/2 -right-1 h-0 w-0 -translate-y-1/2 border-y-[0.6rem] border-l-[0.9rem] border-y-transparent border-l-primary" />
  );
}

// Half of a fork or a join: from the grid's middle to the centre of one branch row. The vertical
// line keeps 2rem from the question and from the outcome, so a stub arrow links each to it.
function Elbow({
  side,
  half,
  label,
}: {
  side: "in" | "out";
  half: "top" | "bottom";
  label?: string;
}) {
  const vertical = half === "top" ? "top-1/2 -bottom-7 border-t-4" : "-top-7 bottom-1/2 border-b-4";
  const edge = side === "in" ? "left-8 right-0 border-l-4" : "left-0 right-8 border-r-4";
  return (
    <div
      className={`relative ${side === "in" ? "col-start-4" : "col-start-6"} ${half === "top" ? "row-start-1" : "row-start-2"}`}
    >
      <div className={`absolute border-primary ${vertical} ${edge}`}>
        {side === "in" && (
          <span
            className={`absolute -right-1 ${half === "top" ? "-top-[0.2rem]" : "-bottom-[0.2rem]"} block h-0 w-0 ${half === "top" ? "-translate-y-1/2" : "translate-y-1/2"} border-y-[0.6rem] border-l-[0.9rem] border-y-transparent border-l-primary`}
          />
        )}
        {label && (
          <span
            className={`label-caps absolute left-3 text-xl text-text-muted ${half === "top" ? "-top-12" : "-bottom-12"}`}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

function GridBranch({ branch, row }: { branch: DecisionBranch; row: 1 | 2 }) {
  return (
    <div
      className={`col-start-5 ${row === 1 ? "row-start-1" : "row-start-2"} flex flex-col justify-center rounded-brand border px-6 py-5 ${TEAM[branch.team]}`}
    >
      <p className="text-2xl leading-tight font-bold">{branch.title}</p>
      <p className="mt-2 text-xl leading-snug text-text">{branch.text}</p>
    </div>
  );
}

// A need, a question, two branches (yes up, no down) that join again on the outcome.
export function DecisionSlide({ slide }: Props) {
  return (
    <SlideShell background="bg-section-intro">
      <TitledContent>
        <SlideTitle>{slide.headline}</SlideTitle>
        {slide.subtitle && <SlideSubtitle>{slide.subtitle}</SlideSubtitle>}
        <div className="slide-body items-center">
          <BlurFade delay={0.2} duration={0.5} className="w-full">
            {/* Below md the 1120px canvas would overflow, so the same flow runs top to bottom. */}
            <div className="flex flex-col gap-3 md:hidden">
              <div className="rounded-brand border border-success bg-success/15 px-4 py-3 text-base leading-tight font-bold text-text">
                {slide.need}
              </div>
              <div className="rounded-brand border border-success bg-white px-4 py-3 text-center text-sm leading-tight font-bold text-text">
                {slide.question}
              </div>
              {[slide.yes, slide.no].map((branch) => (
                <div
                  key={branch.label}
                  className={`rounded-brand border px-4 py-3 ${TEAM[branch.team]}`}
                >
                  <p className="label-caps text-sm text-text-muted">{branch.label}</p>
                  <p className="text-lg leading-tight font-bold">{branch.title}</p>
                  <p className="text-sm leading-snug text-text">{branch.text}</p>
                </div>
              ))}
              <div className="rounded-brand bg-ink/7 px-4 py-3 text-base leading-tight font-bold text-text">
                {slide.outcome}
              </div>
            </div>
            {/* Desktop: the same flow left to right in a grid, so every box grows with its text.
                The branches are the grid's two rows; the need, the question and the outcome span
                both, so the elbows meet them at the grid's middle. */}
            <div
              className="decision-grid hidden w-full grid-rows-2 items-stretch gap-y-14 md:grid"
              style={{
                gridTemplateColumns:
                  "minmax(0,15rem) 4rem minmax(0,14rem) 7.5rem minmax(0,1fr) 3.5rem minmax(0,17rem)",
              }}
            >
              <div className="col-start-1 row-span-2 row-start-1 self-center rounded-brand border border-primary bg-primary/7 px-5 py-4 text-2xl leading-tight font-bold text-text">
                {slide.need}
              </div>
              <div className="relative col-start-2 row-span-2 row-start-1 h-1 self-center bg-primary">
                <Head />
              </div>
              <div className="relative col-start-3 row-span-2 row-start-1 self-center rounded-brand border border-primary bg-white px-5 py-5 text-center text-2xl leading-tight font-bold text-text">
                <span className="absolute top-1/2 -right-8 h-1 w-8 -translate-y-1/2 bg-primary" />
                {slide.question}
              </div>
              <Elbow side="in" half="top" label={slide.yes.label} />
              <GridBranch branch={slide.yes} row={1} />
              <Elbow side="out" half="top" />
              <div className="relative col-start-7 row-span-2 row-start-1 self-center rounded-brand bg-ink/7 px-5 py-4 text-2xl leading-tight font-bold text-text">
                <span className="absolute top-1/2 -left-8 h-1 w-8 -translate-y-1/2 bg-primary">
                  <Head />
                </span>
                {slide.outcome}
              </div>
              <Elbow side="in" half="bottom" label={slide.no.label} />
              <GridBranch branch={slide.no} row={2} />
              <Elbow side="out" half="bottom" />
            </div>
          </BlurFade>

          {slide.caption && <p className="mt-6 text-xl text-text-muted">{slide.caption}</p>}
        </div>
      </TitledContent>
    </SlideShell>
  );
}
