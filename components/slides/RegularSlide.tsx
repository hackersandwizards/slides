"use client";

import type { RegularSlide as RegularSlideType } from "../../types/slide";
import Image from "../ui/image";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import User from "lucide-react/icons/user";
import { regularAsContent } from "../../lib/slide-utils";
import { AgendaSlide } from "./AgendaSlide";
import { LinkCaption } from "./primitives";
import { ContentSlide } from "./ContentSlide";
import { useProgressiveReveal } from "../../lib/use-progressive-reveal";
import { usePrintMode } from "../../lib/print-context";
import { TitledContent } from "./primitives";

interface Props {
  slide: RegularSlideType;
}

function ProfileCard({ profile }: { profile: NonNullable<RegularSlideType["profile"]> }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <BlurFade delay={0.15} duration={0.5}>
        <div className="relative flex-shrink-0">
          {profile.imageSrc ? (
            <Image
              src={profile.imageSrc}
              alt={profile.name}
              width={208}
              height={208}
              className="h-36 w-36 rounded-brand border-4 border-border object-cover md:h-44 md:w-44"
            />
          ) : (
            <div className="flex h-36 w-36 items-center justify-center rounded-brand border-4 border-border bg-teal/7 md:h-44 md:w-44">
              <User className="h-16 w-16 text-teal/40 md:h-20 md:w-20" />
            </div>
          )}
        </div>
      </BlurFade>

      <BlurFade delay={0.25} duration={0.5}>
        <div className="flex flex-col items-center">
          <h2 className="font-heading text-xl font-bold tracking-tight text-text md:text-2xl">
            {profile.name}
          </h2>
          <p className="mt-1 text-base font-medium text-teal md:text-lg">{profile.title}</p>
          {profile.linkedIn && (
            <span className="mt-3">
              <LinkCaption href={profile.linkedIn} variant="linkedin" />
            </span>
          )}
        </div>
      </BlurFade>
    </div>
  );
}

/** A regular slide renders through the content blocks (`regularAsContent`); the cards layout is
 *  an agenda. One with a profile keeps the sidebar drawing. */
export function RegularSlide({ slide }: Props) {
  const replaced = regularAsContent(slide);
  if (replaced?.type === "agenda") return <AgendaSlide slide={replaced} />;
  if (replaced) return <ContentSlide slide={replaced} />;
  return <ProfileRegularSlide slide={slide} />;
}

function ProfileRegularSlide({ slide }: Props) {
  const { revealedCount, stepped } = useProgressiveReveal({ totalSteps: slide.sections.length });
  // Live, earlier sections step back so the room follows the newest one. A page shows them all.
  const printMode = usePrintMode();

  return (
    <SlideShell className="text-text">
      <TitledContent>
        <BlurFade delay={0.1} duration={0.6}>
          <h1 className="slide-title">{slide.headline}</h1>
        </BlurFade>

        <div className="slide-body items-center">
          <div className="flex w-full max-w-6xl flex-col items-center gap-10 md:flex-row md:gap-16">
            {slide.profile && (
              <div className="w-56 flex-shrink-0 md:w-80">
                <ProfileCard profile={slide.profile} />
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex flex-col gap-6 md:gap-8">
                {slide.sections.map((section, index) => {
                  const isRevealed = index < revealedCount;
                  // Opened fully revealed (a backward arrival), no step was taken: all are active.
                  const isActive = stepped ? index === revealedCount - 1 : isRevealed;

                  return (
                    <div
                      key={index}
                      inert={!isRevealed}
                      className={`transition-all duration-500 ${
                        isRevealed
                          ? "translate-y-0 opacity-100"
                          : "pointer-events-none translate-y-6 opacity-0"
                      }`}
                    >
                      <div
                        className={`flex flex-col gap-3 transition-opacity duration-300 md:gap-4 ${
                          isActive || printMode ? "opacity-100" : isRevealed ? "opacity-70" : ""
                        }`}
                      >
                        {section.title && (
                          <h2 className="font-heading text-xl font-bold text-teal sm:text-2xl md:text-3xl">
                            {section.title}
                          </h2>
                        )}
                        {section.text && (
                          <p className="text-base leading-relaxed text-text-muted sm:text-lg md:text-xl lg:text-2xl">
                            {section.text}
                          </p>
                        )}
                        {section.items && (
                          <ul className="flex flex-col gap-2 md:gap-3">
                            {section.items.map((item, itemIndex) => (
                              <li
                                key={itemIndex}
                                className="flex items-baseline gap-3 text-base text-text-muted sm:text-lg md:gap-4 md:text-xl lg:text-2xl"
                              >
                                <span className="hw-marker" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {section.link && (
                          <a
                            href={section.link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hw-button w-fit"
                            data-variant="secondary"
                          >
                            {section.link.label}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </TitledContent>
    </SlideShell>
  );
}
