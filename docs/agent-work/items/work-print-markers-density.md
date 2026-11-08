---
kind: work
status: open
priority: 3
order: 300
owner: Ada
evidence: "08.11., slides v2.3.0 (fit guard on zoom, brand v1.48.0): slides' density story over widths 1600 to 2050 reads 10/10/10 off at 1x/2x/4x (before: 80/20/20); with the guard's refit held off (ResizeObserver removed) 0/0/0, max 0.03 px"
---

# Drop the density story's marker exception once brand-markers settles

`check:markers` runs at 1920 and keeps two readings on `content-slide/density` (0.27 px, the
newline pass) through the `markers` block of `brand-elements.json`.

They are brand-markers' own: it rewrites each marked line and reads the boxes in the same task,
and the fit guard then refits the longer slide to another zoom before the shot (at 1920x900:
0.909 as served, 0.724 after the newline, 0.688 after the rewrite). Shown by control: the same
page with `ResizeObserver` removed reads 0.02 to 0.03 px on all 24 readings at 1920, and 0 of 360
off over widths 1600 to 2050.

Waits on brand (brief in the run report of 08.11.): brand-markers reads its boxes after the page
settles. Then raise the brand pin; the exception fails as stale, and this item closes with its
removal.
