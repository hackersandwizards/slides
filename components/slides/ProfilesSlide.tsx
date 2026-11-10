"use client";

import type { ProfilesSlide as ProfilesSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { SectionHeader } from "./SectionHeader";
import { useCarousel } from "../../lib/use-carousel";
import User from "lucide-react/icons/user";
import {
  TitledContent,
  SlideTitle,
  SlideCard,
  SlideFooter,
  LinkCaption,
  Portrait,
} from "./primitives";
import { personAccent } from "../../lib/slide-utils";
import { renderMarkdown } from "../../lib/markdown";

interface Props {
  slide: ProfilesSlideType;
}

type Accent = "primary" | "secondary";

const ACCENT = {
  primary: {
    text: "text-primary",
    tone: "primary" as const,
    dot: "bg-primary",
  },
  secondary: {
    text: "text-secondary",
    tone: "secondary" as const,
    dot: "bg-secondary",
  },
} satisfies Record<Accent, Record<string, string>>;

export function ProfilesSlide({ slide }: Props) {
  // At -1 no profile is highlighted.
  const [highlightIndex, , stepped] = useCarousel({ count: slide.profiles.length, min: -1 });

  return (
    <SlideShell>
      <TitledContent>
        <SectionHeader label={slide.sectionLabel} />
        <SlideTitle duration={0.6}>{slide.headline}</SlideTitle>
        <div className="slide-body items-center">
          {/* Each card runs as wide as its share of the row, the portrait beside the name, so the
              bullets get full lines instead of a narrow column that outgrows the slide. */}
          <div
            className={`flex w-full flex-col justify-center gap-10 md:flex-row ${slide.profiles.length === 1 ? "max-w-5xl" : ""}`}
          >
            {slide.profiles.map((profile, index) => {
              const isHighlighted = stepped && index === highlightIndex;
              const a = ACCENT[personAccent(index)];

              return (
                <BlurFade
                  key={profile.name}
                  delay={0.2 + index * 0.2}
                  duration={0.5}
                  className="flex md:min-w-0 md:flex-1"
                >
                  <SlideCard
                    tone={isHighlighted ? a.tone : "neutral"}
                    className="flex w-full flex-col transition-all duration-300 card-pad-10"
                  >
                    {/* On a phone the portrait stands above the name, so name, role and company
                        get the card's full width; a word still too long breaks rather than overflow. */}
                    <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:gap-8">
                      <Portrait src={profile.imageSrc} alt={profile.name} tone={a.tone} size="md">
                        <User className="h-16 w-16" />
                      </Portrait>

                      <div className="min-w-0 break-words">
                        <h2 className="card-title text-3xl text-text">{profile.name}</h2>
                        <p className={`mt-2 text-xl font-semibold ${a.text}`}>{profile.title}</p>
                        <p className="text-lg text-text-muted">{profile.company}</p>
                      </div>
                    </div>

                    <ul className="mt-8 space-y-3">
                      {profile.bullets?.map((bullet, i) => (
                        <li key={i} className="flex items-baseline gap-3 text-lg text-text-muted">
                          <span className={`hw-marker ${a.dot}`} />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>

                    {profile.linkedIn && (
                      <span className="mt-8 self-start">
                        <LinkCaption href={profile.linkedIn} variant="linkedin" />
                      </span>
                    )}
                  </SlideCard>
                </BlurFade>
              );
            })}
          </div>
          {slide.footer && (
            <SlideFooter delay={0.6} className="self-stretch">
              {renderMarkdown(slide.footer)}
            </SlideFooter>
          )}
        </div>
      </TitledContent>
    </SlideShell>
  );
}
