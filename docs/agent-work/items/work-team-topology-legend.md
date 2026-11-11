---
kind: work
status: open
priority: 3
order: 1964
owner: Ada
area: software-engineering
evidence: "the orchestrator's brief of 10.11.2026 (pin wave 2): every reviewer of that day's deck asked for a legend of the team-topology slide's box colours; types/slide.ts and TeamTopologySlide.tsx on v3.2.1"
---

# The team-topology slide's box colours carry no legend unless a deck asks for one

Decide how a team-topology slide shows what its colours and shapes mean, then build it.

The reviewers of the 10.11. deck asked for a legend of the box colours: a reader who does not know
Team Topologies cannot tell an enabling team from a platform team by colour alone. That point comes
from the orchestrator's brief; the reviews themselves are not in this repository.

The engine already draws one, off by default: `legend?: boolean` on `TeamTopologySlide`
(53e5632, 10.11.), shown in the specimen's `team-topology-slide/legend` state. So the work is the
default, not the drawing:

- turn the legend on by default (a deck sets `legend: false` to drop it), a release whose commit
  tells the consumers, or
- leave the default and have `slides-usage` lint a team-topology slide without `legend`, or
- leave both and have the consumer set `legend: true` on the deck the reviewers saw.

Before deciding, measure what the legend costs a dense slide: run `slides-density` over the
specimen with the legend on every team-topology slide, and build the chosen variant against a blind
review per `blind-review` with readers new to Team Topologies.
