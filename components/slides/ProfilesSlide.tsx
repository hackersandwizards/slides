"use client";

import type { ProfilesSlide as ProfilesSlideType } from "../../types/slide";
import Image from "../ui/image";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { useCarousel } from "../../lib/use-carousel";
import { User } from "lucide-react";
import { Linkedin } from "../../lib/icons";
import { TitledContent, SlideTitle, Wash } from "./primitives";

interface Props {
  slide: ProfilesSlideType;
}

type Accent = "primary" | "secondary";

const ACCENT = {
  primary: {
    ring: "ring-primary/30",
    text: "text-primary",
    border: "border-primary",
    cardBg: "bg-primary/8",
    glow: "",
    pillIdle: "bg-primary/10 text-primary hover:bg-primary/20",
    dot: "from-primary to-primary/70",
    avatarFrame: "from-primary/25 to-primary/5",
  },
  secondary: {
    ring: "ring-secondary/30",
    text: "text-secondary",
    border: "border-secondary",
    cardBg: "bg-secondary/8",
    glow: "",
    pillIdle: "bg-secondary/10 text-secondary hover:bg-secondary/20",
    dot: "from-secondary to-secondary/70",
    avatarFrame: "from-secondary/25 to-secondary/5",
  },
} satisfies Record<Accent, Record<string, string>>;

export function ProfilesSlide({ slide }: Props) {
  // Starts at -1 (no profile highlighted); ArrowRight walks through, ArrowLeft
  // backs off and eventually falls through to the previous slide.
  const [highlightIndex] = useCarousel({ count: slide.profiles.length, min: -1 });

  return (
    <SlideShell>
      <Wash strength={3} />

      <TitledContent>
        <SlideTitle duration={0.6}>{slide.headline}</SlideTitle>
        <div className="slide-body items-center">
          {/* Each card runs as wide as its share of the row, the portrait beside the name, so the
              bullets get full lines instead of a narrow column that outgrows the slide. */}
          <div
            className={`flex w-full flex-col justify-center gap-10 md:flex-row ${slide.profiles.length === 1 ? "max-w-[64rem]" : ""}`}
          >
            {slide.profiles.map((profile, index) => {
              const isHighlighted = index === highlightIndex;
              const accent: Accent = profile.accent ?? (index === 0 ? "primary" : "secondary");
              const a = ACCENT[accent];

              return (
                <BlurFade
                  key={profile.name}
                  delay={0.2 + index * 0.2}
                  duration={0.5}
                  className="flex md:min-w-0 md:flex-1"
                >
                  <div
                    className={`flex w-full flex-col rounded-brand border p-10 transition-all duration-300 ${
                      isHighlighted ? `${a.border} ${a.cardBg} ${a.glow}` : "border-border bg-white"
                    }`}
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
                        <li key={i} className="flex items-start gap-3 text-lg text-text-muted">
                          <span className={`slide-marker bg-gradient-to-r ${a.dot}`} />
                          {bullet}
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
                  </div>
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
