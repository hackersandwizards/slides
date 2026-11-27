"use client";

import { useContext, type ReactNode } from "react";
import Image from "../ui/image";
import Mail from "lucide-react/icons/mail";
import type { ClosingSlide as ClosingSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { DeckLang, SlideShell, groundOf } from "./SlideShell";
import { HW_LOGO } from "../../lib/logo";
import {
  DisplayHeading,
  ProfileLinks,
  Portrait,
  SlideCard,
  SlideTitle,
  TitledContent,
} from "./primitives";
import { claimParts, companiesWithLogo } from "../../lib/closing-copy";
import { closingClaim } from "../../lib/slide-utils";
import { personAccent } from "../../lib/people-slides";
import { profileLabel } from "../../lib/link-labels";
import { WORDS } from "../../lib/slide-words";

interface Props {
  slide: ClosingSlideType;
}

type ClosingSpeaker = NonNullable<ClosingSlideType["speakers"]>[number];

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

/** A line under the speakers: brand's claim or a quote. The claim stands one step below the quote's
 *  lead, so it holds one row in either language and the German slide keeps the English one's
 *  layout; a quote is the slide's last word and keeps the lead. */
function ClosingLine({ children, claim }: { children: ReactNode; claim?: boolean }) {
  return (
    <BlurFade delay={0.35} duration={0.4}>
      <p
        className={`mx-auto max-w-7xl px-(--slide-closing-side) text-center font-heading ${claim ? "text-2xl" : "text-3xl"} leading-tight font-bold tracking-tight text-balance text-text-muted`}
      >
        {children}
      </p>
    </BlurFade>
  );
}

function PortraitSpeakerLinks({
  contact,
  linkedIn,
  github,
  hue,
}: {
  contact?: string;
  linkedIn?: string;
  github?: string;
  hue: (typeof HUE)[keyof typeof HUE];
}) {
  return (
    <div className="mt-7 flex flex-col items-center gap-4">
      {contact && (
        <a
          href={`mailto:${contact}`}
          className="hw-button gap-2"
          data-variant="secondary"
          data-hue={hue}
        >
          <Mail className="size-6" />
          <span>{contact}</span>
        </a>
      )}
      <ProfileLinks linkedIn={linkedIn} github={github} />
    </div>
  );
}

function PortraitSpeaker({
  speaker,
  index,
  isLast,
}: {
  speaker: ClosingSpeaker;
  index: number;
  isLast: boolean;
}) {
  const hue = HUE[personAccent(index)];
  return (
    <div className="flex flex-col items-stretch gap-10 md:flex-row md:gap-14">
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
        <PortraitSpeakerLinks
          contact={speaker.contact}
          linkedIn={speaker.linkedIn}
          github={speaker.github}
          hue={hue}
        />
      </div>
      {!isLast && (
        <div aria-hidden="true" className="hidden w-px self-stretch bg-text-subtle/25 md:block" />
      )}
    </div>
  );
}

function ClosingLockup({ partners }: { partners?: ClosingSlideType["partners"] }) {
  return (
    <BlurFade delay={0.2} duration={0.5}>
      <div className="slide-closing-mark flex items-center justify-center gap-8 md:gap-12">
        {partners?.map((p) => (
          <span key={p.company} className="flex items-center gap-8 md:gap-12">
            <Image
              src={p.src}
              alt={p.alt ?? p.company}
              width={p.width}
              height={p.height}
              className="h-(--slide-closing-lockup)"
              style={{ width: "auto" }}
            />
            <span className="text-4xl font-normal text-text-subtle md:text-5xl">&times;</span>
          </span>
        ))}
        <Image
          src="/hw-lockup.svg"
          alt={HW_LOGO.alt}
          className="hw-wordmark h-(--slide-closing-lockup)"
          style={{ width: "auto" }}
        />
        <Image
          src="/hw-lockup-night.svg"
          alt={HW_LOGO.alt}
          className="hw-wordmark-night h-(--slide-closing-lockup-night)"
          style={{ width: "auto" }}
        />
      </div>
    </BlurFade>
  );
}

function SpeakerList({
  speakers,
  hiddenCompanies,
}: {
  speakers: ClosingSpeaker[];
  hiddenCompanies: Set<string>;
}) {
  return (
    <BlurFade delay={0.3} duration={0.4}>
      <div className="flex flex-col items-center gap-8">
        {speakers.map((speaker, index) => (
          <div key={index} className="text-center">
            <p className="font-heading text-xl font-bold text-text md:text-2xl">{speaker.name}</p>
            {!hiddenCompanies.has(speaker.company.toLowerCase()) && (
              <p className="hw-label mt-1 md:[--hw-label-size:var(--text-sm)]" data-tone="muted">
                {speaker.company}
              </p>
            )}
            {speaker.contact && (
              <p className="text-base font-medium text-teal sm:text-lg">{speaker.contact}</p>
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
            {speaker.github && (
              <a
                href={speaker.github}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-base font-medium text-teal sm:text-lg"
              >
                {profileLabel(speaker.github)}
              </a>
            )}
          </div>
        ))}
      </div>
    </BlurFade>
  );
}

function ClosingClaim({ lang }: { lang: NonNullable<ReturnType<typeof closingClaim>> }) {
  return (
    <ClosingLine claim>
      {claimParts(lang).map((part, i) =>
        i === 1 ? (
          <span key={i} className="text-primary">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </ClosingLine>
  );
}

/** The closing line centred on the ground, the speakers and the lockup under it, no gradient field and
 *  no decoration, as on the title slide. */
function ContactVariant({ slide }: { slide: ClosingSlideType }) {
  const portraitSpeakers = slide.speakers?.some((s) => s.imageSrc) ? slide.speakers : null;
  const claim = closingClaim(slide, useContext(DeckLang));

  return (
    <SlideShell direction="col" overflowHidden ground={groundOf(slide)}>
      <div className="slide-content relative z-10 flex flex-col items-center justify-center space-y-12 px-4 text-center md:space-y-14 md:pt-(--slide-footer-band)">
        {slide.line1 && (
          <BlurFade delay={0.1} duration={0.5}>
            <DisplayHeading as="p">{slide.line1}</DisplayHeading>
          </BlurFade>
        )}

        {portraitSpeakers ? (
          <BlurFade delay={0.2} duration={0.5}>
            <div className="mx-auto flex max-w-5xl flex-col items-stretch gap-10 md:flex-row md:gap-14">
              {portraitSpeakers.map((speaker, index) => (
                <PortraitSpeaker
                  key={index}
                  speaker={speaker}
                  index={index}
                  isLast={index === portraitSpeakers.length - 1}
                />
              ))}
            </div>
          </BlurFade>
        ) : (
          <>
            <ClosingLockup partners={slide.partners} />
            {slide.speakers && slide.speakers.length > 0 && (
              <SpeakerList speakers={slide.speakers} hiddenCompanies={companiesWithLogo(slide)} />
            )}
          </>
        )}

        {claim && <ClosingClaim lang={claim} />}

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
