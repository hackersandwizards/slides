---
kind: work
status: open
priority: 3
order: 640
owner: Agent (slides session)
evidence: "slides v1.6.0 session of 06.11.2026: brand v1.4.0's `tokens/stage.css` sets one line height per type step (`--text-*--line-height`) and no slide leading token"
---

# Take brand's slide line-height token once brand releases it

A brand session was adding a line-height token for slides on 06.11.2026. Brand v1.4.0, the newest
tag when slides v1.6.0 shipped, does not have it yet.

Once brand tags a release with the token:

1. Raise `@hackersandwizards/brand` in `package.json` to that tag.
2. Name it as a role in `styles/tokens.css`. Replace with it the Tailwind leadings the components
   set themselves wherever the token applies. Count on 06.11.2026: 27 `leading-tight`,
   23 `leading-snug`, 12 `leading-relaxed`, 4 `leading-none`, 1 `md:leading-snug` and
   1 `leading-loose`.
3. Run `bun run check` and compare the print page before and after.

This item is done when no slide sets its own leading where brand's token applies.
