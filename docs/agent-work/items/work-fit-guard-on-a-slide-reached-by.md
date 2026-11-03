---
kind: work
status: open
priority: 3
order: 500
owner: Agent (slides session)
evidence: "trainer-hub `docs/agent-work/2026-11-01-performance.md`, section on the engine"
---

# Fit guard on a slide reached by navigation: `useFitToSlide` measures while `BlurFade` still holds its entrance offset (6 px up), so the …

Fit guard on a slide reached by navigation: `useFitToSlide` measures while `BlurFade` still holds its entrance offset (6 px up), so the bottom block reads 6 px short and the slide keeps a scale up to 0.013 larger than the same slide opened by a page load, which since v0.22.0 renders without the entrance (control in trainer-hub: v0.21.1 with `OFFSET = 0` gives exactly v0.22.0's scales, 0.9238 and 0.9235). Measure again after the entrance, or measure without the offset
