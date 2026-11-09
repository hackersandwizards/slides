"use client";

import { Fragment } from "react";
import type { TeamTopologySlide as TeamTopologySlideType } from "../../types/slide";
import { keepCompounds } from "../../lib/markdown";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { SectionHeader } from "./SectionHeader";
import { TitledContent, SlideTitle, SlideSubtitle } from "./primitives";

interface Props {
  slide: TeamTopologySlideType;
}

// A team's roles as one line of text, each whole behind its own bullet, so a wrap falls between two
// roles and the lines come out even: as chips the last role dropped alone onto a second row.
function Roles({ labels, className }: { labels: string[]; className: string }) {
  return (
    <p className={`text-xl leading-snug font-semibold text-balance ${className}`}>
      {labels.map((label, i) => (
        <Fragment key={`${label}-${i}`}>
          {i > 0 && " "}
          <span className="mr-4 last:mr-0 max-md:mr-0 max-md:flex md:whitespace-nowrap">
            <span aria-hidden className="shrink-0 text-text-subtle">
              •{"\u00a0"}
            </span>
            <span>{label}</span>
          </span>
        </Fragment>
      ))}
    </p>
  );
}

// The Team Shape Templates of Team Topologies, in brand colours, with the brand corner rather than
// the templates' square corners. Change flows left to right, so the enabling teams stand on the
// left, never between a stream team and its users on the right. An enabling team widens to its
// longest word rather than breaking it.
export function TeamTopologySlide({ slide }: Props) {
  const subsystems = slide.complicatedSubsystem ?? [];
  return (
    <SlideShell>
      <TitledContent>
        <SectionHeader label={slide.sectionLabel} />
        <SlideTitle>{slide.headline}</SlideTitle>
        {slide.subtitle && <SlideSubtitle>{slide.subtitle}</SlideSubtitle>}
        <div className="slide-body">
          <BlurFade delay={0.2} duration={0.5} className="flex flex-col gap-4">
            {(slide.enabling.length > 0 ||
              slide.streamAligned.length > 0 ||
              subsystems.length > 0) && (
              <div className="flex flex-col gap-4 md:flex-row">
                {slide.enabling.map((team) => (
                  <div
                    key={team.name}
                    className="flex shrink-0 flex-col justify-center gap-1 rounded-brand border-(length:--slide-rule-strong) border-secondary bg-secondary/7 px-4 py-3 md:w-56 md:min-w-min"
                  >
                    <span className="card-title text-2xl leading-tight text-secondary">
                      {keepCompounds(team.name)}
                    </span>
                    <div className="flex flex-col gap-2">
                      {team.experts.map((expert) => (
                        <span key={expert} className="text-xl leading-tight text-text">
                          {keepCompounds(expert)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex flex-1 flex-col gap-3">
                  {slide.streamAligned.map((team) => (
                    <div
                      key={team.name}
                      className="flex flex-col items-start gap-2 rounded-brand border-(length:--slide-rule-strong) border-primary bg-primary/7 px-5 py-3"
                    >
                      <span className="card-title text-2xl leading-tight text-text">
                        {keepCompounds(team.name)}
                      </span>
                      <Roles labels={team.roles} className="text-teal-dark" />
                    </div>
                  ))}

                  {subsystems.length > 0 && (
                    <div className="flex flex-col gap-4 md:flex-row">
                      {subsystems.map((team) => (
                        <div key={team.name} className="team-octagon flex-1 bg-(--slide-ampersand)">
                          <div className="team-octagon flex h-full flex-col justify-center gap-0.5 bg-(--slide-ampersand-ground) px-7 py-3">
                            <span className="card-title text-2xl leading-tight text-text">
                              {keepCompounds(team.name)}
                            </span>
                            {team.description && (
                              <span className="text-xl leading-snug text-text-muted">
                                {keepCompounds(team.description)}
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
              <div className="flex flex-col gap-4 rounded-brand border-(length:--slide-rule-strong) border-dotted border-primary p-3 md:flex-row">
                {slide.platform.map((team) => (
                  <div key={team.name} className="flex flex-1 flex-col gap-1.5 px-2 py-1">
                    <span className="card-title text-2xl leading-tight text-teal-dark">
                      {keepCompounds(team.name)}
                    </span>
                    {team.description && (
                      <span className="text-xl leading-snug text-text-muted">
                        {keepCompounds(team.description)}
                      </span>
                    )}
                    {team.roles && <Roles labels={team.roles} className="text-teal-dark" />}
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
