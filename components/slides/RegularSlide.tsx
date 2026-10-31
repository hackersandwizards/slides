"use client";

import type { RegularSlide as RegularSlideType, ContentSection } from "../../types/slide";
import Image from "../ui/image";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell } from "./SlideShell";
import { User } from "lucide-react";
import { iconMap, Linkedin } from "../../lib/icons";
import { useProgressiveReveal } from "../../lib/use-progressive-reveal";
import { useCarousel } from "../../lib/use-carousel";
import { usePrintMode } from "../../lib/print-context";
import { TitledContent, Wash } from "./primitives";

interface Props {
  slide: RegularSlideType;
}

const AGENDA_STYLES = [
  {
    bg: "bg-section-intro",
    activeBg: "bg-primary/8",
    border: "border-border",
    activeBorder: "border-primary/50",
    iconBg: "bg-primary/15 text-primary",
    shadow: "",
  },
  {
    bg: "bg-section-primary",
    activeBg: "bg-primary/12",
    border: "border-border",
    activeBorder: "border-primary/50",
    iconBg: "bg-primary/15 text-primary",
    shadow: "",
  },
  {
    bg: "bg-section-accent",
    activeBg: "bg-accent/12",
    border: "border-accent/30",
    activeBorder: "border-accent/50",
    iconBg: "bg-accent/15 text-accent",
    shadow: "",
  },
];

function AgendaCard({
  section,
  index,
  isActive,
}: {
  section: ContentSection;
  index: number;
  isActive: boolean;
}) {
  const IconComponent = section.icon ? iconMap[section.icon] : null;
  const style = AGENDA_STYLES[index % AGENDA_STYLES.length];

  return (
    <BlurFade delay={0.2 + index * 0.15} duration={0.5}>
      <div
        className={`flex h-full items-start gap-3 rounded-brand border p-4 transition-all duration-300 sm:gap-4 sm:rounded-brand sm:p-6 md:gap-6 md:p-8 ${
          isActive
            ? `${style.activeBorder} ${style.activeBg} ${style.shadow}`
            : `${style.border} ${style.bg} hover:${style.activeBorder} `
        }`}
      >
        {IconComponent && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-brand-sm sm:h-12 sm:w-12 md:h-16 md:w-16 ${
              isActive ? style.iconBg : "bg-primary/8 text-text-subtle"
            }`}
          >
            <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" />
          </div>
        )}
        <div className="flex flex-col gap-1 sm:gap-2">
          {section.title && (
            <h2
              className={`font-heading text-lg font-semibold sm:text-xl md:text-2xl lg:text-3xl ${isActive ? "text-text" : "text-text-muted"}`}
            >
              {section.title}
            </h2>
          )}
          {section.text && (
            <p
              className={`text-sm leading-relaxed sm:text-base md:text-lg lg:text-xl ${isActive ? "text-text-muted" : "text-text-subtle"}`}
            >
              {section.text}
            </p>
          )}
        </div>
      </div>
    </BlurFade>
  );
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
              className="h-36 w-36 rounded-full border-4 border-border object-cover md:h-44 md:w-44"
            />
          ) : (
            <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-border bg-gradient-to-br from-brand/5 to-white md:h-44 md:w-44">
              <User className="h-16 w-16 text-brand/40 md:h-20 md:w-20" />
            </div>
          )}
        </div>
      </BlurFade>

      <BlurFade delay={0.25} duration={0.5}>
        <div className="flex flex-col items-center">
          <h2 className="font-heading text-xl font-bold tracking-tight text-text md:text-2xl">
            {profile.name}
          </h2>
          <p className="mt-1 text-base font-medium text-brand md:text-lg">{profile.title}</p>
          {profile.linkedIn && (
            <a
              href={profile.linkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-brand/5 px-4 py-1.5 text-sm text-brand transition-colors hover:bg-brand/10 md:text-base"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </a>
          )}
        </div>
      </BlurFade>
    </div>
  );
}

/** `align: "center"` centres the headline with the sections, so the body does not read as an
 *  indent under a left-aligned title. The sections stay one column: every list shares its width
 *  and starts at the same left edge. */
export function RegularSlide({ slide }: Props) {
  const hasProfile = !!slide.profile;
  const isCardsLayout = slide.layout === "cards";
  const isCentered = slide.align === "center" && !hasProfile;
  const { revealedCount, stepped } = useProgressiveReveal({
    totalSteps: isCardsLayout ? 0 : slide.sections.length,
  });
  // Live, earlier sections step back so the room follows the newest one. A page shows them all.
  const printMode = usePrintMode();
  const [activeSection] = useCarousel({
    count: slide.sections.length,
    initial: slide.activeSection ?? 0,
    enabled: isCardsLayout,
  });

  return (
    <SlideShell className="text-text">
      <Wash strength={4} />

      <TitledContent>
        <BlurFade delay={0.1} duration={0.6}>
          <h1 className={isCentered ? "slide-title text-center" : "slide-title"}>
            {slide.headline}
          </h1>
        </BlurFade>

        <div className="slide-body items-center">
          {isCardsLayout ? (
            <div className="flex w-full max-w-3xl flex-col gap-2 sm:gap-3 md:gap-4">
              {slide.sections.map((section, index) => (
                <AgendaCard
                  key={index}
                  section={section}
                  index={index}
                  isActive={activeSection === index}
                />
              ))}
            </div>
          ) : (
            <div
              className={`flex w-full ${hasProfile ? "max-w-6xl flex-col items-center gap-10 md:flex-row md:gap-16" : "flex-col gap-8"}`}
            >
              {slide.profile && (
                <div className="w-56 flex-shrink-0 md:w-80">
                  <ProfileCard profile={slide.profile} />
                </div>
              )}

              <div
                className={`flex flex-col ${hasProfile ? "min-w-0 flex-1" : isCentered ? "mx-auto w-fit max-w-5xl text-center" : ""}`}
              >
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
                            isActive || printMode ? "opacity-100" : isRevealed ? "opacity-60" : ""
                          }`}
                        >
                          {section.title && (
                            <h2 className="font-heading text-xl font-semibold text-brand sm:text-2xl md:text-3xl">
                              {section.title}
                            </h2>
                          )}
                          {section.text && (
                            <p className="text-base leading-relaxed text-text-muted sm:text-lg md:text-xl lg:text-2xl">
                              {section.text}
                            </p>
                          )}
                          {section.items && (
                            <ul
                              className={`flex flex-col gap-2 md:gap-3 ${isCentered ? "text-left" : ""}`}
                            >
                              {section.items.map((item, itemIndex) => (
                                <li
                                  key={itemIndex}
                                  className="flex items-start gap-3 text-base text-text-muted sm:text-lg md:gap-4 md:text-xl lg:text-2xl"
                                >
                                  <span className="slide-marker" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          )}
                          {section.link && (
                            <a
                              href={section.link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex w-fit items-center gap-2 rounded-brand-sm border border-border bg-brand/5 px-4 py-2.5 text-base text-brand transition-all hover:border-brand/30 hover:bg-brand/10 md:gap-3 md:px-5 md:py-3 md:text-lg"
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
          )}
        </div>
      </TitledContent>
    </SlideShell>
  );
}
