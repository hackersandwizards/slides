---
kind: work
status: open
priority: 3
order: 640
owner: Agent (slides session)
area: software-engineering
evidence: "scripts/render-pptx.ts at v3.0.0: `process` draws an empty square per step (loop) or the step's `label` (loop false, through `evolution`); components/slides/Visuals.tsx numbers each step whose `numbered` is not false while no label holds a digit"
---

# The PowerPoint export numbers no process step, the web does

Number the export's process tiles as `FlowSteps` does, `numbered: false` included.

The web decides (settled default `slides-web-pptx-drift`), so the export follows it: the same
count rule, an empty tile where a step sets `numbered: false` or a label holds a digit. The
specimen's slide "A request through three teams" shows the web's result.
