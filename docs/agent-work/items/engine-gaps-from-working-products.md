---
kind: work
status: open
priority: 2
order: 40
owner: a slides session
evidence: "hycle-private aa5532b, report docs/agent-work/2026-11-06-working-products-deck.md, section 'For the slides engine'; blind panel of four reviewers, two rounds"
---

# Engine gaps found on the Working Products deck

The hycle-private session put the Working Products 2026 deck on v1.2.0 and found these limits of
the engine. The deck then only raises its tag.

- Content slide with prose only: body text small and grey, starting high under the headline, the
  lower third empty (3 of 4 reviewers, both rounds).
- Timeline: no label on a segment, so a duration ("1 Woche") stands over a node and reads as a
  point in time; no figure on an event, so a result like "-90%" can only sit in its text. A
  `numbers` block under a three-column timeline fails the density gate.
- Statement with `attribution` and `closing`: the attribution renders between subtitle and closing
  and splits a quotation that runs into the closing.
- Statement with `linkedImage` holding a square QR code: the 46%-wide frame puts the square code in
  a wide rounded box.
- Statement has no `footer`: a source line can only go into `attribution` ("— source").
- Title slide: `speakers` always joined with " & " (a German deck says "und"); the QR alt text is
  fixed in English.
