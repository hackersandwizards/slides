"use client";

import { useContext, type ReactNode } from "react";
import Image from "../ui/image";
import Mail from "lucide-react/icons/mail";
import type { ClosingSlide as ClosingSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { DeckLang, SlideShell, groundOf } from "./SlideShell";
import {
  DisplayHeading,
  LinkCaption,
  Portrait,
  SlideCard,
  SlideTitle,
  TitledContent,
} from "./primitives";
import { claimParts, closingClaim, personAccent, profileLabel, WORDS } from "../../lib/slide-utils";

interface Props {
  slide: ClosingSlideType;
}

/** Companies the contact layout shows as a logo, so their name is not printed a second time under
 *  the speaker. */
const companiesWithLogo = (slide: ClosingSlideType) =>
  new Set(["hackers&wizards", ...(slide.partners ?? []).map((p) => p.company.toLowerCase())]);

function DiscussionVariant({ slide }: { slide: ClosingSlideType }) {
  const lang = useContext(DeckLang);
  return (
    <SlideShell ground={groundOf(slide)}>
      <TitledContent>
        <SlideTitle>{slide.headline ?? slide.line1 ?? WORDS[lang].discussion}</SlideTitle>
        {slide.seedQuestions && slide.seedQuestions.length > 0 && (
          <div className="slide-body">
            <div className="w-full space-y-6">
              {slide.seedQuestions.map((question, index) => (
                <BlurFade key={index} delay={0.15 + index * 0.06} duration={0.4}>
                  <SlideCard className="card-pad-5/8">
                    <p className="text-xl font-medium text-text-muted md:text-2xl">{question}</p>
                  </SlideCard>
                </BlurFade>
              ))}
            </div>
          </div>
        )}
      </TitledContent>
    </SlideShell>
  );
}

const HUE = { primary: undefined, secondary: "purple" } as const;

/** A line under the speakers: brand's claim or a quote. */
function ClosingLine({ children }: { children: ReactNode }) {
  return (
    <BlurFade delay={0.35} duration={0.4}>
      <p className="mx-auto max-w-7xl px-(--slide-closing-side) text-center font-heading text-3xl leading-tight font-bold tracking-tight text-balance text-text-muted">
        {children}
      </p>
    </BlurFade>
  );
}

/** The closing line centred on the ground, the speakers and the lockup under it, no gradient field and
 *  no decoration, as on the title slide. */
function ContactVariant({ slide }: { slide: ClosingSlideType }) {
  const hasSpeakerImages = slide.speakers?.some((s) => s.imageSrc);
  const claim = closingClaim(slide, useContext(DeckLang));

  return (
    <SlideShell direction="col" overflowHidden ground={groundOf(slide)}>
      <div className="slide-content relative z-10 flex flex-col items-center justify-center space-y-12 px-4 text-center md:space-y-14 md:pt-(--slide-footer-band)">
        {slide.line1 && (
          <BlurFade delay={0.1} duration={0.5}>
            <DisplayHeading as="p">{slide.line1}</DisplayHeading>
          </BlurFade>
        )}

        {hasSpeakerImages ? (
          <BlurFade delay={0.2} duration={0.5}>
            <div className="mx-auto flex max-w-5xl flex-col items-stretch gap-10 md:flex-row md:gap-14">
              {slide.speakers!.map((speaker, index) => {
                const isLast = index === slide.speakers!.length - 1;
                const hue = HUE[personAccent(index)];
                return (
                  <div
                    key={index}
                    className="flex flex-col items-stretch gap-10 md:flex-row md:gap-14"
                  >
                    <div className="flex flex-col items-center text-center">
                      {speaker.imageSrc && (
                        <Portrait
                          src={speaker.imageSrc}
                          alt={speaker.name}
                          tone={personAccent(index)}
                          size="lg"
                          className="mb-8"
                        />
                      )}
                      <p className="font-heading text-3xl font-bold tracking-tight text-text md:text-4xl">
                        {speaker.name}
                      </p>
                      {speaker.company && (
                        <p
                          className="hw-label mt-3 [--hw-label-size:var(--text-xs)] md:[--hw-label-size:var(--text-sm)]"
                          data-hue={hue}
                        >
                          {speaker.company}
                        </p>
                      )}
                      <div className="mt-7 flex flex-col items-center gap-4">
                        {speaker.contact && (
                          <a
                            href={`mailto:${speaker.contact}`}
                            className="hw-button gap-2"
                            data-variant="secondary"
                            data-hue={hue}
                          >
                            <Mail className="size-6" />
                            <span>{speaker.contact}</span>
                          </a>
                        )}
                        {speaker.linkedIn && (
                          <LinkCaption href={speaker.linkedIn} variant="linkedin" />
                        )}
                      </div>
                    </div>
                    {!isLast && (
                      <div
                        aria-hidden="true"
                        className="hidden w-px self-stretch bg-text-subtle/25 md:block"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </BlurFade>
        ) : (
          <>
            <BlurFade delay={0.2} duration={0.5}>
              <div className="slide-closing-mark flex items-center justify-center gap-8 md:gap-12">
                {slide.partners?.map((p) => (
                  <span key={p.company} className="flex items-center gap-8 md:gap-12">
                    <Image
                      src={p.src}
                      alt={p.alt ?? p.company}
                      width={p.width}
                      height={p.height}
                      className="h-(--slide-closing-lockup)"
                      style={{ width: "auto" }}
                    />
                    <span className="text-4xl font-normal text-text-subtle md:text-5xl">
                      &times;
                    </span>
                  </span>
                ))}
                <Image
                  src="/hw-lockup.svg"
                  alt="hackers&wizards"
                  width={8042}
                  height={1489}
                  className="hw-wordmark h-(--slide-closing-lockup)"
                  style={{ width: "auto" }}
                />
                <Image
                  src="/hw-lockup-night.svg"
                  alt="hackers&wizards"
                  width={8196}
                  height={1641}
                  className="hw-wordmark-night h-(--slide-closing-lockup-night)"
                  style={{ width: "auto" }}
                />
              </div>
            </BlurFade>

            {slide.speakers && slide.speakers.length > 0 && (
              <BlurFade delay={0.3} duration={0.4}>
                <div className="flex flex-col items-center gap-8">
                  {slide.speakers.map((speaker, index) => (
                    <div key={index} className="text-center">
                      <p className="font-heading text-xl font-bold text-text md:text-2xl">
                        {speaker.name}
                      </p>
                      {!companiesWithLogo(slide).has(speaker.company.toLowerCase()) && (
                        <p
                          className="hw-label mt-1 md:[--hw-label-size:var(--text-sm)]"
                          data-tone="muted"
                        >
                          {speaker.company}
                        </p>
                      )}
                      {speaker.contact && (
                        <p className="text-base font-medium text-teal sm:text-lg">
                          {speaker.contact}
                        </p>
                      )}
                      {speaker.linkedIn && (
                        <a
                          href={speaker.linkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-base font-medium text-teal sm:text-lg"
                        >
                          {profileLabel(speaker.linkedIn)}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </BlurFade>
            )}
          </>
        )}

        {claim && (
          <ClosingLine>
            {/* The word brand names for its claim in the brand colour. */}
            {claimParts(claim).map((part, i) =>
              i === 1 ? (
                <span key={i} className="text-primary">
                  {part}
                </span>
              ) : (
                part
              ),
            )}
          </ClosingLine>
        )}

        {slide.closingQuote && (
          <ClosingLine>
            <span className="text-primary/70">&ldquo;</span>
            {slide.closingQuote}
            <span className="text-primary/70">&rdquo;</span>
          </ClosingLine>
        )}
      </div>
    </SlideShell>
  );
}

export function ClosingSlide({ slide }: Props) {
  if (slide.variant === "discussion") {
    return <DiscussionVariant slide={slide} />;
  }

  return <ContactVariant slide={slide} />;
}
