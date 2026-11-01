"use client";

import type { TeamTopologySlide as TeamTopologySlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { TitledContent, SlideTitle, SlideSubtitle } from "./primitives";

interface Props {
  slide: TeamTopologySlideType;
}

function Chips({ labels, className }: { labels: string[]; className: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label, i) => (
        <span
          key={`${label}-${i}`}
          className={`rounded-full bg-white px-3 py-0.5 text-base font-semibold ${className}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

// The Team Shape Templates of Team Topologies, in brand colours: stream-aligned teams are
// horizontal bars with rounded corners (teal), enabling teams vertical bars with rounded corners
// (purple), complicated-subsystem teams octagons (neutral), and the platform a grouping with a dotted
// border (teal) under everything; it keeps the brand corner, the template's square corners lost the
// blind panel. Change flows left to right, so no team
// stands between a stream team and its users on the right: the enabling teams stand on the left.
export function TeamTopologySlide({ slide }: Props) {
  const subsystems = slide.complicatedSubsystem ?? [];
  return (
    <SlideShell background="bg-section-intro">
      <TitledContent>
        <SlideTitle>{slide.headline}</SlideTitle>
        {slide.subtitle && <SlideSubtitle>{slide.subtitle}</SlideSubtitle>}
        <div className="slide-body">
          <BlurFade delay={0.2} duration={0.5} className="flex flex-col gap-3">
            {(slide.enabling.length > 0 ||
              slide.streamAligned.length > 0 ||
              subsystems.length > 0) && (
              <div className="flex flex-col gap-3 md:flex-row">
                {slide.enabling.map((team) => (
                  <div
                    key={team.name}
                    className="flex shrink-0 flex-col gap-1 rounded-brand border-[3px] border-secondary bg-secondary/7 px-4 py-3 md:w-52"
                  >
                    <span className="text-lg leading-tight font-bold text-secondary">
                      {team.name}
                    </span>
                    {team.experts.map((expert) => (
                      <span key={expert} className="text-base leading-snug text-text">
                        {expert}
                      </span>
                    ))}
                  </div>
                ))}

                <div className="flex flex-1 flex-col gap-3">
                  {slide.streamAligned.map((team) => (
                    <div
                      key={team.name}
                      className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-brand border-[3px] border-primary bg-primary/7 px-5 py-3"
                    >
                      <span className="text-lg leading-tight font-bold text-text">{team.name}</span>
                      <Chips labels={team.roles} className="text-teal-dark" />
                    </div>
                  ))}

                  {subsystems.length > 0 && (
                    <div className="flex flex-col gap-3 md:flex-row">
                      {subsystems.map((team) => (
                        <div key={team.name} className="team-octagon flex-1 bg-ampersand">
                          <div className="team-octagon flex h-full flex-col justify-center gap-0.5 bg-[color-mix(in_srgb,var(--color-ampersand)_7%,var(--background))] px-7 py-3">
                            <span className="text-lg leading-tight font-bold text-text">
                              {team.name}
                            </span>
                            {team.description && (
                              <span className="text-base leading-snug text-text-muted">
                                {team.description}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {slide.platform.length > 0 && (
              <div className="flex flex-col gap-3 rounded-brand border-[3px] border-dotted border-primary p-3 md:flex-row">
                {slide.platform.map((team) => (
                  <div key={team.name} className="flex flex-1 flex-col gap-1.5 px-2 py-1">
                    <span className="text-lg leading-tight font-bold text-teal-dark">
                      {team.name}
                    </span>
                    {team.description && (
                      <span className="text-base leading-snug text-text-muted">
                        {team.description}
                      </span>
                    )}
                    {team.roles && <Chips labels={team.roles} className="text-teal-dark" />}
                  </div>
                ))}
              </div>
            )}

            {slide.caption && <p className="mt-2 text-xl text-text-muted">{slide.caption}</p>}
          </BlurFade>
        </div>
      </TitledContent>
    </SlideShell>
  );
}
