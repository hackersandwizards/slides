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
          className={`rounded-full bg-white px-4 py-1 text-base font-semibold ${className}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

// Team Topologies' shapes: stream-aligned teams run horizontally, the complicated-subsystem
// teams they consume sit under them as blocks, platform teams lie underneath as a service, and
// each enabling team stands vertically beside the whole flow. A team's name sits above its
// roles: beside them, three enabling columns left the roles a column too narrow for one chip.
export function TeamTopologySlide({ slide }: Props) {
  const subsystems = slide.complicatedSubsystem ?? [];
  return (
    <SlideShell background="bg-section-intro">
      <TitledContent>
        <SlideTitle>{slide.headline}</SlideTitle>
        {slide.subtitle && <SlideSubtitle>{slide.subtitle}</SlideSubtitle>}
        <div className="slide-body">
          <BlurFade delay={0.2} duration={0.5} className="flex flex-col">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex flex-1 flex-col gap-3">
                {slide.streamAligned.map((team) => (
                  <div
                    key={team.name}
                    className="flex flex-col items-start gap-3 rounded-brand border border-success bg-success/7 px-6 py-5"
                  >
                    <span className="text-xl leading-tight font-bold text-text">{team.name}</span>
                    <Chips labels={team.roles} className="text-text" />
                  </div>
                ))}

                {subsystems.length > 0 && (
                  <div className="flex flex-col gap-3 md:flex-row">
                    {subsystems.map((team) => (
                      <div
                        key={team.name}
                        className="flex flex-1 flex-col gap-1 rounded-brand border border-factory bg-factory/7 px-6 py-4"
                      >
                        <span className="text-xl leading-tight font-bold text-factory">
                          {team.name}
                        </span>
                        {team.description && (
                          <span className="text-lg leading-tight text-text-muted">
                            {team.description}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {slide.platform.map((team) => (
                  <div
                    key={team.name}
                    className="flex flex-col items-start gap-2 rounded-brand border border-primary bg-primary/7 px-6 py-4"
                  >
                    <span className="text-xl leading-tight font-bold text-teal-dark">
                      {team.name}
                    </span>
                    <div className="flex flex-col gap-2">
                      {team.description && (
                        <span className="text-lg text-text-muted">{team.description}</span>
                      )}
                      {team.roles && <Chips labels={team.roles} className="text-teal-dark" />}
                    </div>
                  </div>
                ))}
              </div>

              {slide.enabling.map((team) => (
                <div
                  key={team.name}
                  className="flex flex-col gap-2 rounded-brand border border-secondary bg-secondary/7 px-5 py-5 md:w-64"
                >
                  <span className="text-xl leading-tight font-bold text-deep-800">{team.name}</span>
                  {team.experts.map((expert) => (
                    <span key={expert} className="text-lg leading-tight text-text">
                      {expert}
                    </span>
                  ))}
                </div>
              ))}
            </div>

            {slide.caption && <p className="mt-5 text-xl text-text-muted">{slide.caption}</p>}
          </BlurFade>
        </div>
      </TitledContent>
    </SlideShell>
  );
}
