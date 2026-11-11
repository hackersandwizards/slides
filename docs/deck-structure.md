# Deck structure

How to build a deck from the slide types: which slide carries what. The catalog's print page gives each type's when, do and don't.

A deck that runs an hour or longer with three or more chapters shows an `agenda` slide before its
first chapter, listing the chapters in order. Each chapter opens with a `transition` slide: its
`headline` is the chapter's agenda item, its `preText` the chapter's position in the agenda, such
as `"3 / 9"`. A break, lunch, a live demo or the thanks is not a chapter. A timetable is an `agenda`
whose items carry a `when` ("09:00"), and so are a pitch's next steps (a due date as `when`, the
owner as `text`, the decision needed as `footer`). A deck whose agenda is a map that returns before
each part (`phased-pills`) keeps that instead.

One or two short statements under a headline are a `statement` slide, never a content slide of
bullets, which leaves the slide empty around them, and `slides-density` fails on such a slide. Three
are one too where they lead up to one line. Three parallel points stay bullets: only the deck's
author can tell the two apart, so the check leaves three alone. The section label is the `kicker`,
the headline the `lines`, the statements that lead up the `subtitle` (one per line) and the one they
lead to the `closing`.

An exercise, a live demo and a debrief are an `activity` slide (`kind`): the steps, watch points or
questions, the exact instruction as `prompt`, and the timebox, mode and outcome in one card. On
screen a countdown stands under the items, set to the first number in `duration` (else 2): a click on the
time starts, pauses and, at zero, restarts it; minus and plus change it by a minute. The speaker
window's frame counts along; paper and PowerPoint draw no timer.

`evolution`, `dual-pill-overview`, `overview` and `media` still render, as a `process` slide with
`loop: false`, a `roadmap` whose columns carry `phases`, a `phased-pills` slide and a `content`
slide with an `image`, `video` or `gallery` block; new slides use those (`aliasTypes` in
`lib/slide-components.ts`). A gallery names each picture by its `caption` and sets its `tags` only
for what the pictures share. `deprecated` beside it lists every prop and value a deck
should no longer write, so a consumer's story coverage can skip them.
A chapter divider is a `transition`; `deep-dive-divider` marks a deep-dive part only. Every slide of a
deep-dive part, the `deep-dive-divider`, a slide whose `sectionTheme` is `deepdive` and a pill map whose
phases are, stands on night (`isDeepDive` in `lib/slide-utils`); nothing else marks the part.

A concept slide whose words claim a mechanism or a relationship in up to four short cards, and
which has no diagram of the engine, may carry a generated marker sketch beside them: the
`image-and-grid` block takes the sketch as its image, marked `sketch: true` so it stands without a
frame, and the cards as its items, words unchanged.
`bun run brand-slide-sketch-prompt` prints the prompt. No other slide gets
a sketch: on a title, agenda, transition, statement, comparison, process, data or closing slide, and
on a concept slide of paragraphs, the slide reads better without one.
