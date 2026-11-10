---
kind: decision
status: open
priority: 3
order: 610
owner: Benedikt
area: software-engineering
evidence: "slides-usage since v2.18.0; slides-usage takes an array of decks since v2.21.0; hycle-private commits its counts at talks/slides-usage.json (00f4ba9)"
recommended: consumer-file-local-overlay
options:
  - key: consumer-file-local-overlay
    label: Each consumer commits its counts; the engine's print page shows them only locally
    detail: "Every consumer writes slides-usage.json beside its decks in its own gate. The engine's print page shows the count per entry only when started locally with those files; the Pages build never reads them, so no figure from a client deck reaches the public site."
  - key: consumer-file-only
    label: Each consumer commits its counts; the engine shows none
    detail: The same files, read only by people opening them in the consumer. The print page stays as it is. Nothing to build in the engine.
  - key: public-aggregate
    label: The summed counts appear on the public print page
    detail: A consumer's gate hands its counts to the engine (a release of the engine per change, since a consumer writes into no other repository), and the Pages site shows how often each slide type appears across all decks, client decks included. This publishes usage figures derived from client work.
---

# Where do the slide-usage counts live, and may the public print page show them?

Decide where the slide-usage counts live and whether the public print page may show them.

Blocks the rest of `work-catalog-entry-guidance` (the count per catalogue entry). Nothing else
waits on it.

`slides-usage` counts a consumer's deck slides per catalogue entry. The engine is public and reads
no client deck, so the counts can only come from the consumers. Since v2.21.0 a consumer whose
decks are code pipes them in one call: `slides-usage -` reads a JSON array of decks from
standard input.

The question is direction: whether figures derived from client decks may appear on the public
Pages site. The recommended option keeps them inside the company and still shows them on the print
page to whoever runs the catalog locally.

Where the files sit under the first option: talks and trainer-hub at the repository root, hycle-private at `talks/slides-usage.json`, where it already is. The catalog reads them when started with `SLIDES_USAGE=<path>[,<path>] bun run dev`.
