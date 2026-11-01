"use client";

import type { ProfilesSlide as ProfilesSlideType } from "../../types/slide";
import Image from "../ui/image";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { useCarousel } from "../../lib/use-carousel";
import User from "lucide-react/icons/user";
import { Linkedin } from "../../lib/icons";
import { TitledContent, SlideTitle, SlideCard } from "./primitives";
import { personAccent } from "../../lib/slide-utils";

interface Props {
  slide: ProfilesSlideType;
}

type Accent = "primary" | "secondary";

const ACCENT = {
  primary: {
    ring: "ring-primary/25",
    text: "text-primary",
    tone: "primary" as const,
    pillIdle: "bg-primary/7 text-primary hover:bg-primary/15",
    dot: "from-primary to-primary/70",
    avatarFrame: "from-primary/25 to-primary/7",
  },
  secondary: {
    ring: "ring-secondary/25",
    text: "text-secondary",
    tone: "secondary" as const,
    pillIdle: "bg-secondary/7 text-secondary hover:bg-secondary/15",
    dot: "from-secondary to-secondary/70",
    avatarFrame: "from-secondary/25 to-secondary/7",
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
                    className="flex w-full flex-col p-10 transition-all duration-300"
                  >
                    <div className="flex items-center gap-8">
                      <div
                        className={`flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${a.avatarFrame} p-1`}
                      >
                        {profile.imageSrc ? (
                          <Image
                            src={profile.imageSrc}
                            alt={profile.name}
                            width={128}
                            height={128}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <User className={`h-16 w-16 ${a.text}`} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h2 className="font-heading text-3xl font-bold text-text">
                          {profile.name}
                        </h2>
                        <p className={`mt-2 text-xl font-semibold ${a.text}`}>{profile.title}</p>
                        <p className="text-lg text-text-muted">{profile.company}</p>
                      </div>
                    </div>

                    <ul className="mt-8 space-y-3">
                      {profile.bullets?.map((bullet, i) => (
                        <li key={i} className="flex items-baseline gap-3 text-lg text-text-muted">
                          <span className={`hw-marker bg-gradient-to-r ${a.dot}`} />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>

                    {profile.linkedIn && (
                      <a
                        href={profile.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mt-8 flex items-center gap-2 self-start rounded-full px-5 py-2 text-base font-medium transition-colors ${a.pillIdle}`}
                      >
                        <Linkedin className="h-5 w-5" />
                        LinkedIn
                      </a>
                    )}
                  </SlideCard>
                </BlurFade>
              );
            })}
          </div>
          {slide.footer && (
            <BlurFade delay={0.6} duration={0.5}>
              <p className="mt-10 text-center text-lg text-text-muted">{slide.footer}</p>
            </BlurFade>
          )}
        </div>
      </TitledContent>
    </SlideShell>
  );
}
