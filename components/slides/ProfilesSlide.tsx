"use client";

import type { ProfilesSlide as ProfilesSlideType } from "../../types/slide";
import Image from "../ui/image";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { useCarousel } from "../../lib/use-carousel";
import User from "lucide-react/icons/user";
import { TitledContent, SlideTitle, SlideCard, SlideFooter, LinkCaption } from "./primitives";
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
    avatarFrame: "bg-primary/15",
  },
  secondary: {
    text: "text-secondary",
    tone: "secondary" as const,
    dot: "bg-secondary",
    avatarFrame: "bg-secondary/15",
  },
} satisfies Record<Accent, Record<string, string>>;

export function ProfilesSlide({ slide }: Props) {
  // Starts at -1 (no profile highlighted); ArrowRight walks through, ArrowLeft
  // backs off and eventually falls through to the previous slide.
  const [highlightIndex] = useCarousel({ count: slide.profiles.length, min: -1 });

  return (
    <SlideShell>
      <TitledContent>
        <SlideTitle duration={0.6}>{slide.headline}</SlideTitle>
        <div className="slide-body items-center">
          {/* Each card runs as wide as its share of the row, the portrait beside the name, so the
              bullets get full lines instead of a narrow column that outgrows the slide. */}
          <div
            className={`flex w-full flex-col justify-center gap-10 md:flex-row ${slide.profiles.length === 1 ? "max-w-5xl" : ""}`}
          >
            {slide.profiles.map((profile, index) => {
              const isHighlighted = index === highlightIndex;
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
                    <div className="flex items-center gap-8">
                      <div
                        className={`flex h-32 w-32 shrink-0 items-center justify-center rounded-brand ${a.avatarFrame} p-1`}
                      >
                        {profile.imageSrc ? (
                          <Image
                            src={profile.imageSrc}
                            alt={profile.name}
                            width={128}
                            height={128}
                            className="h-full w-full rounded-brand object-cover"
                          />
                        ) : (
                          <User className={`h-16 w-16 ${a.text}`} />
                        )}
                      </div>

                      <div className="min-w-0">
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
