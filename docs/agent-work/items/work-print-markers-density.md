---
kind: work
status: open
priority: 2
order: 300
owner: Ada
evidence: "brand-markers v1.43.0, 08.11.: slides' density story over widths 1600 to 2050 (10 fits), the engine as of 579c844 80/20/20 off at 1x/2x/4x; the fit guard on zoom with brand's marker rounding through --hw-zoom 10/10/10; block-two-column 40/0/0 against 0/0/0, max 0.03 px"
---

# List markers on slides the fit guard shrinks

## Cause, shown by control

The fit guard shrinks a body with `scale`. Inside a scale that does not map a CSS pixel onto a
whole number of device pixels, Chrome sets each text baseline on the device pixel grid but draws a
box such as `.hw-marker` where the transform puts it. A marker therefore sits up to half a device
pixel off its line: up to 0.5 px at 1x, 0.25 at 2x, 0.125 at 4x.

Control on trainer-hub's built `content-slide/at-rest` story at 1280x900 (`.slide-body` at
`scale: 0.96897`), at 2x:

- `scale: none` takes all four readings from 0.26 px to 0.02 px, at 1x to 4x.
- Moving `.slide-body` down in steps of 0.0625 px forms a sawtooth: the offset rises 1:1 with the
  shift and drops by 0.5 px (one device pixel at 2x) every 0.5 px. Only the text snaps.
- Without `scale`, `translate: 0 0.25px` alone gives -0.23 px.
- `transform-origin` and the device scale change only the phase. The largest offset is about
  0.5 px divided by the device scale.

This explains every one of trainer-hub's 18 kept readings. at-rest and grids-and-callouts shrink
at 1280x900 (0.969). The five ground stories and text-blocks fit as served, but brand-markers' second
pass puts `"\n"` at the start of each `<li>`. `white-space-collapse: preserve-breaks` on
`.slide-content` keeps that newline as a blank line, so the body overflows and shrinks to 0.9938.
slides' own story pages do not shrink at 1280x900, so its gate reads 0.

Tried without effect: `rotate`, `skewX` and `perspective` on the body.

## The fix, waiting on brand

The guard has to shrink with `zoom`, which lays the body out smaller. Each `round(…, 1px)` in
brand's `marker.css` then rounds in the zoomed pixels. With brand v1.43.0 unchanged, `zoom` alone
reads 0.55 to 0.76 px off at every scale, which is worse than now. With every `1px` in
`marker.css` replaced by `calc(1px / var(--hw-zoom, 1))` (and `1px / 64` likewise), all 240
readings of slides' stories at 1920 read 0 off (max 0.19), and trainer-hub's at-rest reads
0.02 px. So brand releases the setting first and the engine follows.

Engine change once brand has released it (prototyped 08.11.; the shrunk stories lay out as
before at 1920x1080, checked by screenshot):

- `SlideShell` `useFitToSlide`: after `layout()`, set the box's `width` to its computed width in px
  (a px length zooms with the box, a percentage does not). A centred, narrow body gets
  `margin-inline: auto`. An untitled `.slide-content` gets `height` as computed height / zoom and
  `padding-top` as the top edge / zoom. Then set `zoom` and `--hw-zoom`. `reset()` clears the
  properties it set.
- `scripts/density.ts` reads `style.zoom` and lays the box out unzoomed.
- `test/slide-shell.test.tsx` expects `zoom` and `--hw-zoom`, never `scale`. It fails on the
  current engine (3 of 3 fit-guard cases).
- Raise `check:markers` to `--width 1920`, which fails on the current engine. Then drop the marker
  case of `test/pages/marker-position.test.ts` and keep its other cases.
- Pin the brand release and release slides.

The prototype's `/code-review` found the following, all still to settle before it ships:

- recharts' ResponsiveContainer takes its first size from `getBoundingClientRect`, the zoomed size,
  so a chart may be drawn shrunk twice. Check it on a shrunk chart slide.
- density.ts must clear everything the guard sets, `margin-inline` included. Read one list from
  the guard instead of keeping two.
- `reset()` must not clear an inline `height` or `padding-top` that a slide type sets itself.
- The jsdom test reads `width` as declared ("125%"), so it cannot catch a percentage width left
  on a zoomed body. The width needs a browser test.
- The comment on `measure()` still speaks of `scale`.

## Not yet explained

With `zoom` and the rounding setting, the density story keeps a residual that does not change with
the device scale. It varies with the marker rows' font size: -0.12 px at 20 to 26 px, 0.02 at
28, +0.13 at 30, and up to 0.27 in the newline pass, so 10 of 120 readings per scale are off. The
layout geometry is exact: box middle against baseline minus `1ex / 6 + 1cap / 3` is within
0.003 px. `ex`, `cap` and `em` agree with the unzoomed values at the same real size. Unzoomed,
sizes 24 to 28 px read 0.03. So the glyphs paint differently under zoom; the reason is not yet
shown. Settle this before raising `check:markers` to 1920.
