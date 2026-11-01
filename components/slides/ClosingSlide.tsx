"use client";

import Image from "../ui/image";
import { Mail } from "lucide-react";
import { Linkedin } from "../../lib/icons";
import type { ClosingSlide as ClosingSlideType } from "../../types/slide";
import { BlurFade } from "../ui/blur-fade";
import { SlideShell, groundOf } from "./SlideShell";
import { DisplayHeading, SlideCard } from "./primitives";
import { personAccent } from "../../lib/slide-utils";

interface Props {
  slide: ClosingSlideType;
}

/** Partners shown as a logo beside the h&w lockup when one of them speaks, `className` sizing it
 *  in the centred layout. */
const PARTNERS = [
  {
    company: "inoio gmbh",
    src: "/inoio.png",
    alt: "inoio gmbh",
    width: 200,
    height: 112,
    className: "h-20 md:h-28",
  },
  {
    company: "digitale leute school",
    src: "/talk-factory-dls/dl-school-logo.svg",
    alt: "Digitale Leute School",
    width: 286,
    height: 86,
    className: "h-16 md:h-20",
  },
];

/** Companies the contact layout already shows as a logo, so their name is not printed a second
 *  time under the speaker. */
const COMPANIES_WITH_LOGO = new Set(["hackers&wizards", ...PARTNERS.map((p) => p.company)]);

const partnersOf = (slide: ClosingSlideType) =>
  PARTNERS.filter((p) => slide.speakers?.some((s) => s.company.toLowerCase() === p.company));

function DiscussionVariant({ slide }: { slide: ClosingSlideType }) {
  return (
    <SlideShell ground={groundOf(slide)}>
      <div className="slide-content relative z-10 flex flex-col items-center justify-center px-16">
        <BlurFade delay={0.1} duration={0.5} className="mb-16">
          <DisplayHeading className="text-center">
            {slide.headline ?? slide.line1 ?? "Discussion"}
          </DisplayHeading>
        </BlurFade>

        {slide.seedQuestions && slide.seedQuestions.length > 0 && (
          <div className="w-full max-w-3xl space-y-6">
            {slide.seedQuestions.map((question, index) => (
              <BlurFade key={index} delay={0.15 + index * 0.06} duration={0.4}>
                <SlideCard className="px-8 py-5">
                  <p className="text-center text-xl font-medium text-text-muted md:text-2xl">
                    {question}
                  </p>
                </SlideCard>
              </BlurFade>
            ))}
          </div>
        )}
      </div>
    </SlideShell>
  );
}

/** A speaker's colours, picked by position (`personAccent`). */
const ACCENT = {
  primary: { ring: "ring-primary/40", text: "text-primary", bg: "bg-primary/15 text-primary" },
  secondary: {
    ring: "ring-secondary/40",
    text: "text-secondary",
    bg: "bg-secondary/15 text-secondary",
  },
};

/** The closing line centred on the ground, the speakers and the lockup under it, no gradient field and
 *  no decoration, as on the title slide. */
function ContactVariant({ slide }: { slide: ClosingSlideType }) {
  const hasSpeakerImages = slide.speakers?.some((s) => s.imageSrc);

  return (
    <SlideShell direction="col" overflowHidden ground={groundOf(slide)}>
      <div className="w-full">
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
                  const a = ACCENT[personAccent(index)];
                  return (
                    <div
                      key={index}
                      className="flex flex-col items-stretch gap-10 md:flex-row md:gap-14"
                    >
                      <div className="flex flex-col items-center text-center">
                        {speaker.imageSrc && (
                          <div
                            className={`relative mb-8 rounded-full ring-2 ring-offset-4 ring-offset-transparent ${a.ring}`}
                          >
                            <Image
                              src={speaker.imageSrc}
                              alt={speaker.name}
                              width={160}
                              height={160}
                              className="h-36 w-36 rounded-full object-cover"
                            />
                          </div>
                        )}
                        <p className="font-heading text-3xl font-bold tracking-tight text-text md:text-4xl">
                          {speaker.name}
                        </p>
                        {speaker.company && (
                          <p className={`label-caps mt-3 text-xs md:text-sm ${a.text}`}>
                            {speaker.company}
                          </p>
                        )}
                        <div className="mt-7 flex items-center gap-2">
                          {speaker.contact && (
                            <a
                              href={`mailto:${speaker.contact}`}
                              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-base font-medium transition-colors md:text-lg ${a.bg}`}
                            >
                              <Mail className="h-4 w-4 md:h-5 md:w-5" />
                              <span>{speaker.contact}</span>
                            </a>
                          )}
                          {speaker.linkedIn && (
                            <a
                              href={speaker.linkedIn}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`${speaker.name} on LinkedIn`}
                              className={`flex items-center justify-center rounded-full p-3 transition-colors ${a.bg}`}
                            >
                              <Linkedin className="h-4 w-4 md:h-5 md:w-5" />
                            </a>
                          )}
                        </div>
                      </div>
                      {!isLast && (
                        <div
                          aria-hidden="true"
                          className="hidden w-px self-stretch bg-gradient-to-b from-transparent via-text-subtle/25 to-transparent md:block"
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
                  {partnersOf(slide).map((p) => (
                    <span key={p.company} className="flex items-center gap-8 md:gap-12">
                      <Image
                        src={p.src}
                        alt={p.alt}
                        width={p.width}
                        height={p.height}
                        className={p.className}
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
                        {!COMPANIES_WITH_LOGO.has(speaker.company.toLowerCase()) && (
                          <p className="label-caps mt-1 text-xs text-text-muted md:text-sm">
                            {speaker.company}
                          </p>
                        )}
                        {speaker.contact && (
                          <p className="text-base font-medium text-brand sm:text-lg">
                            {speaker.contact}
                          </p>
                        )}
                        {speaker.linkedIn && (
                          <a
                            href={speaker.linkedIn}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-base font-medium text-brand sm:text-lg"
                          >
                            {speaker.linkedIn.replace(/^https?:\/\/(www\.)?/, "")}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </BlurFade>
              )}
            </>
          )}

          {slide.closingQuote && (
            <BlurFade delay={0.35} duration={0.4}>
              <p className="mx-auto max-w-7xl px-(--slide-closing-side) text-center font-heading text-3xl leading-tight font-bold tracking-tight text-balance text-text-muted">
                <span className="text-primary/70">&ldquo;</span>
                {slide.closingQuote}
                <span className="text-primary/70">&rdquo;</span>
              </p>
            </BlurFade>
          )}
        </div>
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
