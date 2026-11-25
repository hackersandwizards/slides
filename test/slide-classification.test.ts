import { assert, describe, expect, expectTypeOf, it } from "vitest";
import {
  bulletsAsStatement,
  centeredAsStatement,
  hasPlainSplitFrame,
  listColumnAsComparisonSide,
  parseStatementBlocks,
  statementText,
  twoColumnAsSplit,
} from "../lib/content-redraw";
import { regularAsContent, titledSectionsAsBlocks } from "../lib/regular-sections";
import { replacedBy } from "../lib/slide-utils";
import { variantOf } from "../lib/catalog-classification";
import type {
  ContentBlock,
  ContentSection,
  ContentSlide,
  RegularSlide,
  Slide,
} from "../types/slide";

describe("centeredAsStatement", () => {
  const base: ContentSlide = {
    type: "content",
    layout: "centered",
    headline: "Main claim",
    content: [],
  };

  it("maps a centered content slide's metadata, paragraphs and linked image to a statement", () => {
    const slide: ContentSlide = {
      ...base,
      ground: "accent",
      sectionLabel: "Chapter",
      content: [
        { type: "paragraph", text: "Lead" },
        { type: "linked-image", src: "/pic.png", alt: "Pic", href: "https://example.com" },
        { type: "callout", text: "Takeaway" },
      ],
    };
    expect(centeredAsStatement(slide)).toEqual({
      type: "statement",
      ground: "accent",
      background: undefined,
      kicker: "Chapter",
      lines: ["Main claim"],
      subtitle: "Lead",
      closing: "Takeaway",
      linkedImage: { src: "/pic.png", alt: "Pic", href: "https://example.com" },
    });
  });

  it.each([
    [
      "two paragraphs",
      {
        content: [
          { type: "paragraph", text: "First" },
          { type: "paragraph", text: "Second" },
        ],
      },
      { subtitle: "First", closing: "Second" },
    ],
    [
      "slide subtitle with one paragraph",
      { subtitle: "Sub", content: [{ type: "paragraph", text: "End" }] },
      { subtitle: "Sub", closing: "End" },
    ],
    [
      "one paragraph only",
      { content: [{ type: "paragraph", text: "Only" }] },
      { subtitle: "Only", closing: undefined },
    ],
    [
      "callout only",
      { content: [{ type: "callout", text: "Note" }] },
      { subtitle: undefined, closing: "Note" },
    ],
  ] as [string, Partial<ContentSlide>, Record<string, unknown>][])(
    "maps %s to subtitle and closing",
    (_, override, expected) => {
      expect(centeredAsStatement({ ...base, ...override })).toMatchObject(expected);
    },
  );

  it.each([
    ["default layout", { layout: "default" }],
    ["a footer", { footer: "Footnote" }],
    ["deepdive sectionTheme", { sectionTheme: "deepdive" }],
    ["markdown in headline", { headline: "Ship **fast**" }],
    [
      "three paragraphs",
      {
        content: [
          { type: "paragraph", text: "1" },
          { type: "paragraph", text: "2" },
          { type: "paragraph", text: "3" },
        ],
      },
    ],
    [
      "slide subtitle and two paragraphs",
      {
        subtitle: "Sub",
        content: [
          { type: "paragraph", text: "1" },
          { type: "paragraph", text: "2" },
        ],
      },
    ],
    [
      "two callouts",
      {
        content: [
          { type: "callout", text: "" },
          { type: "callout", text: "Second" },
        ],
      },
    ],
    [
      "two linked images",
      {
        content: [
          { type: "linked-image", src: "/a.png" },
          { type: "linked-image", src: "/b.png" },
        ],
      },
    ],
    ["a bullets block", { content: [{ type: "bullets", items: ["a"] }] }],
  ] as const)("returns undefined for %s", (_, override) => {
    expect(centeredAsStatement({ ...base, ...override } as ContentSlide)).toBeUndefined();
  });
});

describe("twoColumnAsSplit edge cases", () => {
  const base: ContentSlide = {
    type: "content",
    headline: "Compare",
    content: [
      {
        type: "two-column",
        variant: "neutral",
        left: { title: "Left", items: ["a"] },
        right: { title: "Right", items: ["b"] },
      },
    ],
  };

  it("omits punchline when there is no footer and accepts explicit neutral variant", () => {
    const result = twoColumnAsSplit(base);
    expect(result).toEqual({
      type: "comparison",
      variant: "split",
      headline: "Compare",
      left: { label: "Left", items: ["a"] },
      right: { label: "Right", items: ["b"] },
    });
    expect(Object.hasOwn(result as object, "punchline")).toBe(false);
  });

  it.each([
    ["sectionTheme", { sectionTheme: "primary" }],
    ["subtitle", { subtitle: "Sub" }],
    ["principle", { principle: "P" }],
    ["badge", { badge: "New" }],
    ["stageMarker", { stageMarker: ["Plan"] }],
    ["stagePrefix", { stagePrefix: "Stage" }],
    ["background", { background: "bg-section-primary" }],
    ["centered layout", { layout: "centered" }],
    ["empty content", { content: [] }],
    [
      "empty items",
      {
        content: [
          {
            type: "two-column",
            left: { title: "Left", items: [] },
            right: { title: "Right", items: ["b"] },
          },
        ],
      },
    ],
    [
      "untitled column",
      {
        content: [
          {
            type: "two-column",
            left: { items: ["a"] },
            right: { title: "Right", items: ["b"] },
          },
        ],
      },
    ],
  ] as const)("returns undefined when %s is set", (_, override) => {
    expect(twoColumnAsSplit({ ...base, ...override } as ContentSlide)).toBeUndefined();
  });
});

describe("bulletsAsStatement edge cases", () => {
  const base: ContentSlide = {
    type: "content",
    headline: "Point",
    content: [{ type: "bullets", items: ["One."] }],
  };

  it("accepts a non-deepdive section theme and carries over ground", () => {
    expect(
      bulletsAsStatement({
        ...base,
        ground: "primary",
        sectionTheme: "accent",
        sectionLabel: "Part",
      }),
    ).toEqual({
      type: "statement",
      ground: "primary",
      background: undefined,
      kicker: "Part",
      lines: ["Point"],
      subtitle: "One.",
      closing: undefined,
    });
  });

  it.each([
    ["footer", { footer: "F" }],
    ["principle", { principle: "P" }],
    ["stageMarker", { stageMarker: ["A"] }],
  ] as const)("returns undefined when %s is set", (_, override) => {
    expect(bulletsAsStatement({ ...base, ...override } as ContentSlide)).toBeUndefined();
  });
});

describe("regularAsContent", () => {
  it("converts a cards layout to an agenda with links and joined items", () => {
    const slide: RegularSlide = {
      type: "regular",
      headline: "Plan",
      layout: "cards",
      sections: [
        { title: "One", text: "Read", link: { label: "docs", url: "https://example.com" } },
        { title: "Two", items: ["a", "b"] },
        { text: "Untitled card" },
      ],
    };
    expect(regularAsContent(slide)).toEqual({
      type: "agenda",
      headline: "Plan",
      items: [
        { title: "One", text: "Read [docs](https://example.com)" },
        { title: "Two", text: "a, b" },
        { title: "Untitled card", text: undefined },
      ],
    });
  });

  it("converts one titled section and surrounding untitled sections with trailing callout", () => {
    const slide: RegularSlide = {
      type: "regular",
      headline: "Topic",
      sections: [
        { text: "Opening line" },
        { title: "Core", text: "Details", items: ["x", "y"] },
        { text: "Closing takeaway", items: ["z"] },
      ],
    };
    expect(regularAsContent(slide)).toEqual({
      type: "content",
      headline: "Topic",
      content: [
        { type: "paragraph", text: "Opening line" },
        { type: "paragraph", text: "**Core** Details" },
        { type: "bullets", items: ["x", "y"] },
        { type: "callout", text: "Closing takeaway" },
        { type: "bullets", items: ["z"] },
      ],
    });
  });
});

describe("variantOf", () => {
  it.each([
    [
      "grid quotes with all portraits",
      {
        type: "grid",
        variant: "quotes",
        headline: "H",
        cards: [{ title: "A", imageSrc: "/a.png" }],
      },
      "quotes with portraits",
    ],
    [
      "grid quotes without portraits",
      { type: "grid", variant: "quotes", headline: "H", cards: [{ title: "A" }] },
      "quotes",
    ],
    ["grid stats", { type: "grid", variant: "stats", headline: "H", cards: [] }, "stats"],
    ["plain grid", { type: "grid", headline: "H", cards: [] }, ""],
    [
      "comparison with variant and strike false",
      {
        type: "comparison",
        variant: "before-after",
        strike: false,
        left: { label: "L", items: [] },
        right: { label: "R", items: [] },
      },
      "before-after",
    ],
    [
      "comparison without variant and strike false",
      {
        type: "comparison",
        strike: false,
        left: { label: "L", items: [] },
        right: { label: "R", items: [] },
      },
      "without strike",
    ],
    [
      "comparison without variant and strike true",
      {
        type: "comparison",
        strike: true,
        left: { label: "L", items: [] },
        right: { label: "R", items: [] },
      },
      "",
    ],
    ["chart variant", { type: "chart", variant: "trend" }, "trend"],
    ["closing variant", { type: "closing", variant: "discussion" }, "discussion"],
    ["plain closing", { type: "closing" }, ""],
    [
      "content layout",
      { type: "content", headline: "H", layout: "centered", content: [] },
      "centered",
    ],
    ["regular layout", { type: "regular", headline: "H", layout: "cards", sections: [] }, "cards"],
    ["media layout", { type: "media", layout: "row", sources: [] }, "row"],
    ["activity kind", { type: "activity", kind: "demo", headline: "H", items: [] }, "demo"],
    [
      "statement quotation over qr",
      {
        type: "statement",
        lines: ["A"],
        attribution: "Author",
        qr: { src: "/q.png", href: "https://example.com" },
      },
      "quotation",
    ],
    [
      "statement qr",
      { type: "statement", lines: ["A"], qr: { src: "/q.png", href: "https://example.com" } },
      "qr",
    ],
    ["plain statement", { type: "statement", lines: ["A"] }, ""],
    ["opening title", { type: "title", title: "Talk", kicker: "Keynote" }, "opening"],
    ["plain title", { type: "title", title: "Talk" }, ""],
    ["plain agenda", { type: "agenda", headline: "A", items: [] }, ""],
  ] as [string, Slide, string][])("classifies %s as %j", (_, slide, expected) => {
    expect(variantOf(slide)).toBe(expected);
  });
});

describe("replacedBy", () => {
  it.each([
    ["evolution", { type: "evolution", headline: "H", stages: [] }, { to: "process" }],
    [
      "dual-pill-overview",
      {
        type: "dual-pill-overview",
        headline: "H",
        left: { label: "L", title: "T", accent: "ingredients", phases: [] },
        right: { label: "R", title: "T", accent: "deepdive", phases: [] },
      },
      { to: "roadmap" },
    ],
    ["guidance", { type: "guidance", examples: [] }, { to: "comparison guidance" }],
    ["deep-dive-divider", { type: "deep-dive-divider", headline: "H" }, { to: "transition night" }],
    ["overview", { type: "overview", foundations: [], pipeline: [] }, { to: "phased-pills" }],
    ["grid stats", { type: "grid", variant: "stats", headline: "H", cards: [] }, { to: "numbers" }],
    ["grid pillars", { type: "grid", headline: "H", cards: [] }, { to: "cards" }],
    ["grid quotes", { type: "grid", variant: "quotes", headline: "H", cards: [] }, undefined],
    [
      "regular with profile",
      { type: "regular", headline: "H", profile: { name: "A", title: "B" }, sections: [] },
      undefined,
    ],
    [
      "regular cards",
      { type: "regular", headline: "H", layout: "cards", sections: [] },
      { to: "agenda" },
    ],
    [
      "regular content",
      { type: "regular", headline: "H", sections: [{ text: "Body" }] },
      { to: "content" },
    ],
    [
      "content centered",
      {
        type: "content",
        layout: "centered",
        headline: "H",
        content: [{ type: "paragraph", text: "P" }],
      },
      { to: "statement", form: "content, centered" },
    ],
    [
      "content four-column",
      { type: "content", headline: "H", content: [{ type: "four-column", columns: [] }] },
      { to: "cards", form: "four-column" },
    ],
    [
      "content labeled-grid",
      { type: "content", headline: "H", content: [{ type: "labeled-grid", items: [] }] },
      { to: "cards", form: "labeled-grid" },
    ],
    [
      "content positions",
      {
        type: "content",
        headline: "H",
        content: [
          {
            type: "positions",
            left: { name: "A", stance: "S", quote: "Q" },
            right: { name: "B", stance: "S", quote: "Q" },
            resolution: "R",
          },
        ],
      },
      { to: "comparison positions", form: "positions" },
    ],
    [
      "content transform ahead of pipeline",
      {
        type: "content",
        headline: "H",
        content: [
          { type: "pipeline", stages: [] },
          {
            type: "transform",
            before: { label: "B", items: [] },
            after: { label: "A", items: [] },
          },
        ],
      },
      { to: "comparison before-after", form: "transform" },
    ],
    [
      "content pipeline alone",
      { type: "content", headline: "H", content: [{ type: "pipeline", stages: [] }] },
      { to: "flow", form: "pipeline" },
    ],
    [
      "plain content",
      { type: "content", headline: "H", content: [{ type: "paragraph", text: "Body" }] },
      undefined,
    ],
    ["current slide type", { type: "agenda", headline: "H", items: [] }, undefined],
  ] as [string, Slide, { to: string; form?: string } | undefined][])(
    "reports replacement for %s",
    (_, slide, expected) => {
      expect(replacedBy(slide)).toEqual(expected);
    },
  );
});

describe("listColumnAsComparisonSide", () => {
  it("converts a titled bullet column without prose into a comparison side", () => {
    expect(listColumnAsComparisonSide({ title: "Pros", items: ["Fast", "Small"] })).toEqual({
      label: "Pros",
      items: ["Fast", "Small"],
    });
  });

  it.each([
    ["missing title", { items: ["a"] }],
    ["missing items", { title: "Pros" }],
    ["empty items", { title: "Pros", items: [] }],
    ["prose text alongside items", { title: "Pros", items: ["a"], text: "Notes" }],
  ] as [string, { title?: string; items?: string[]; text?: string }][])(
    "returns undefined for %s",
    (_, column) => {
      expect(listColumnAsComparisonSide(column)).toBeUndefined();
    },
  );
});

describe("parseStatementBlocks", () => {
  it("extracts paragraphs, optional callout and optional linked image", () => {
    const blocks: ContentBlock[] = [
      { type: "paragraph", text: "First" },
      { type: "linked-image", src: "/img.png", alt: "Alt", href: "https://example.com" },
      { type: "callout", text: "Closing" },
      { type: "paragraph", text: "Second" },
    ];
    expect(parseStatementBlocks(blocks)).toEqual({
      paragraphs: ["First", "Second"],
      callout: "Closing",
      linkedImage: { src: "/img.png", alt: "Alt", href: "https://example.com" },
    });
  });

  it.each([
    ["unsupported block type", [{ type: "bullets", items: ["a"] }]],
    [
      "duplicate callouts",
      [
        { type: "callout", text: "One" },
        { type: "callout", text: "Two" },
      ],
    ],
    [
      "duplicate linked images",
      [
        { type: "linked-image", src: "/a.png" },
        { type: "linked-image", src: "/b.png" },
      ],
    ],
  ] as [string, ContentBlock[]][])("returns undefined for %s", (_, blocks) => {
    expect(parseStatementBlocks(blocks)).toBeUndefined();
  });
});

describe("hasPlainSplitFrame", () => {
  const plain: ContentSlide = { type: "content", headline: "Compare", content: [] };

  it.each([
    ["accepts plain headline and footer", { footer: "Takeaway" }, true],
    ["rejects centered layout", { layout: "centered" }, false],
    ["rejects a section label", { sectionLabel: "Chapter" }, false],
    ["rejects a formatted headline", { headline: "**Compare**" }, false],
    ["rejects a formatted footer", { footer: "**Takeaway**" }, false],
  ] as const)("%s", (_, fields, expected) => {
    expect(hasPlainSplitFrame({ ...plain, ...fields })).toBe(expected);
  });
});

describe("statementText", () => {
  it.each([
    {
      label: "uses two paragraphs",
      parsed: { paragraphs: ["Lead", "End"] },
      subtitle: undefined,
      expected: { subtitle: "Lead", closing: "End", linkedImage: undefined },
    },
    {
      label: "honors an explicit empty subtitle",
      parsed: { paragraphs: ["End"] },
      subtitle: "",
      expected: { subtitle: "", closing: "End", linkedImage: undefined },
    },
    {
      label: "honors a callout",
      parsed: { paragraphs: ["Lead"], callout: "End" },
      subtitle: undefined,
      expected: { subtitle: "Lead", closing: "End", linkedImage: undefined },
    },
    {
      label: "rejects a paragraph competing with a callout",
      parsed: { paragraphs: ["Extra"], callout: "End" },
      subtitle: "Lead",
      expected: undefined,
    },
    {
      label: "rejects excess paragraphs",
      parsed: { paragraphs: ["Lead", "Extra", "End"] },
      subtitle: undefined,
      expected: undefined,
    },
  ])("$label", ({ parsed, subtitle, expected }) => {
    expect(statementText(parsed, subtitle)).toEqual(expected);
  });

  it("leaves the parsed paragraphs available for another read", () => {
    const parsed = { paragraphs: ["Lead", "End"] };
    statementText(parsed, undefined);
    expect(parsed.paragraphs).toEqual(["Lead", "End"]);
  });
});

describe("titledSectionsAsBlocks", () => {
  it("returns an empty list for zero sections", () => {
    expect(titledSectionsAsBlocks([])).toEqual([]);
  });

  it.each([
    {
      section: { title: "Focus", text: "Keep it small", items: ["a"] },
      expected: [
        { type: "paragraph", text: "**Focus** Keep it small" },
        { type: "bullets", items: ["a"] },
      ],
    },
    {
      section: { title: "Only" },
      expected: [{ type: "paragraph", text: "**Only**" }],
    },
  ])("draws $section.title as a lead paragraph with any bullets", ({ section, expected }) => {
    expect(titledSectionsAsBlocks([section])).toEqual(expected);
  });

  it("maps two titled sections to a two-column block", () => {
    const sections: ContentSection[] = [
      { title: "Before", text: "Manual", items: ["a"] },
      { title: "After", items: ["b"] },
    ];
    expect(titledSectionsAsBlocks(sections)).toEqual([
      {
        type: "two-column",
        left: { title: "Before", items: ["a"], text: "Manual" },
        right: { title: "After", items: ["b"], text: undefined },
      },
    ]);
  });

  it("carries titled section text, links and lists into the card items", () => {
    const sections: ContentSection[] = [
      { title: "One", text: "A", items: ["1"] },
      { title: "Two", text: "B" },
      { title: "Three", link: { label: "spec", url: "https://example.com" } },
    ];
    const [cards] = titledSectionsAsBlocks(sections);
    expect(cards).toHaveProperty("items", [
      { title: "One", text: "A", icon: undefined, items: ["1"] },
      { title: "Two", text: "B", icon: undefined, items: undefined },
      {
        title: "Three",
        text: "[spec](https://example.com)",
        icon: undefined,
        items: undefined,
      },
    ]);
  });

  it.each([
    [3, 3],
    [4, 4],
    [5, 3],
    [6, 3],
    [7, 4],
  ] as const)("draws %i titled sections as dense cards in %i columns", (count, expectedColumns) => {
    const sections = Array.from({ length: count }, (_, i) => ({ title: `T${i}`, text: `D${i}` }));
    expect(titledSectionsAsBlocks(sections)).toMatchObject([
      { type: "cards", columns: expectedColumns, dense: true },
    ]);
  });
});

describe("classification of legacy slide data", () => {
  it("returns only the baseline literal variant types", () => {
    expectTypeOf<ReturnType<typeof variantOf>>().toEqualTypeOf<
      | ""
      | "quotes with portraits"
      | "pillars"
      | "quotes"
      | "stats"
      | "vs"
      | "before-after"
      | "split"
      | "guidance"
      | "positions"
      | "cycle"
      | "graph"
      | "trend"
      | "bar"
      | "contact"
      | "discussion"
      | "default"
      | "centered"
      | "cards"
      | "grid"
      | "row"
      | "exercise"
      | "demo"
      | "debrief"
      | "without strike"
      | "quotation"
      | "qr"
      | "opening"
    >();
  });

  it.each([
    [{ variant: "custom", layout: "cards", kind: "exercise", strike: false }, "custom"],
    [{ variant: "", layout: "cards", kind: "exercise", strike: false }, "cards"],
    [{ layout: "", kind: "exercise", strike: false }, "exercise"],
    [{ kind: "", strike: false }, "without strike"],
  ])("resolves title-slide fields %j to %s in field order", (fields, expected) => {
    const slide = { ...fields, type: "title", title: "Talk", kicker: "Opening" } as const;
    expect(variantOf(slide)).toBe(expected);
  });

  it.each([
    [{ type: "evolution", headline: "H", stages: [] }, "process"],
    [{ type: "dual-pill-overview" }, "roadmap"],
    [{ type: "guidance" }, "comparison guidance"],
    [{ type: "deep-dive-divider" }, "transition night"],
    [{ type: "overview" }, "phased-pills"],
  ])("returns a fresh replacement for %j", (slide, destination) => {
    const input = slide as Slide;
    const first = replacedBy(input);
    assert(first, "the deprecated slide should have a replacement");
    first.to = "changed";
    expect(replacedBy(input)).toEqual({ to: destination });
  });

  it.each(["constructor", "toString", "__proto__"])(
    "classifies an unknown slide type %s as plain",
    (type) => {
      const slide = { type } as Slide;
      expect(variantOf(slide)).toBe("");
    },
  );

  it.each(["constructor", "toString", "__proto__"])(
    "offers no replacement for unknown slide type %s",
    (type) => {
      expect(replacedBy({ type } as Slide)).toBeUndefined();
    },
  );

  it.each(["constructor", "toString", "__proto__"])(
    "ignores unknown block type %s when classifying replacements",
    (type) => {
      const slide = {
        type: "content",
        headline: "H",
        content: [{ type }],
      } as ContentSlide;
      expect(replacedBy(slide)).toBeUndefined();
    },
  );
});

describe("redrawing content with missing values", () => {
  const splitBlock = {
    type: "two-column",
    left: { title: "Left", items: ["A"] },
    right: { title: "Right", items: ["B"] },
  } as const;

  it.each([
    ["split rejects a sparse block", twoColumnAsSplit, Array<ContentBlock>(1)],
    ["split rejects a null block", twoColumnAsSplit, [null] as unknown as ContentBlock[]],
    ["bullets reject a sparse block", bulletsAsStatement, Array<ContentBlock>(1)],
    ["bullets reject a null block", bulletsAsStatement, [null] as unknown as ContentBlock[]],
  ] as const)("%s", (_, redraw, content) => {
    expect(redraw({ type: "content", headline: "H", content })).toBeUndefined();
  });

  it("treats a null split variant as neutral", () => {
    const slide = {
      type: "content",
      headline: "H",
      content: [{ ...splitBlock, variant: null }],
    } as unknown as ContentSlide;
    expect(twoColumnAsSplit(slide)).toEqual({
      type: "comparison",
      variant: "split",
      headline: "H",
      left: { label: "Left", items: ["A"] },
      right: { label: "Right", items: ["B"] },
    });
  });

  it("raises a TypeError for a split with a missing headline", () => {
    const slide = { type: "content", content: [splitBlock] } as unknown as ContentSlide;
    expect(() => twoColumnAsSplit(slide)).toThrow(TypeError);
  });

  it("preserves null as the statement closing", () => {
    const slide = {
      type: "content",
      layout: "centered",
      headline: "H",
      content: [
        { type: "paragraph", text: "Lead" },
        { type: "callout", text: null },
      ],
    } as unknown as ContentSlide;
    expect(centeredAsStatement(slide)).toMatchObject({ subtitle: "Lead", closing: null });
  });

  it("allows a statement callout after one with undefined text", () => {
    const slide = {
      type: "content",
      layout: "centered",
      headline: "H",
      content: [{ type: "callout" }, { type: "callout", text: "Close" }],
    } as ContentSlide;
    expect(centeredAsStatement(slide)).toMatchObject({ closing: "Close" });
  });

  it("raises a TypeError for a sparse centered statement sequence", () => {
    const slide: ContentSlide = {
      type: "content",
      layout: "centered",
      headline: "H",
      content: Array<ContentBlock>(1),
    };
    expect(() => centeredAsStatement(slide)).toThrow(TypeError);
  });
});
