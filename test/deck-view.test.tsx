import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeckTile } from "../components/deck/DeckTile";
import { DeckView } from "../components/deck/DeckView";
import { slideCatalog } from "../specimen/slide-catalog";

const press = (key: string) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });

/** Steps through the slide's reveals until the deck moves on. */
function advance() {
  const from = location.pathname;
  for (let i = 0; i < 20 && location.pathname === from; i++) press("ArrowRight");
}

describe("DeckView", () => {
  it("changes slides inside the island, without loading a document", () => {
    history.replaceState(null, "", "/specimen/0");
    render(<DeckView presentation={slideCatalog} index={0} basePath="/specimen" />);
    expect(screen.getByText("Slide Catalog")).toBeInTheDocument();
    advance();
    expect(location.pathname).toBe("/specimen/1");
    expect(screen.queryByText("Slide Catalog")).not.toBeInTheDocument();
  });

  it("follows the browser's back button", async () => {
    history.replaceState(null, "", "/specimen/0");
    render(<DeckView presentation={slideCatalog} index={0} basePath="/specimen" />);
    advance();
    act(() => history.back());
    expect(await screen.findByText("Slide Catalog")).toBeInTheDocument();
  });

  it("keeps the document's title on the slide where asked, and leaves it otherwise", () => {
    history.replaceState(null, "", "/specimen/0");
    document.title = "Talks";
    const { unmount } = render(
      <DeckView presentation={slideCatalog} index={0} basePath="/specimen" />,
    );
    advance();
    expect(document.title).toBe("Talks");
    unmount();
    history.replaceState(null, "", "/specimen/0");
    render(<DeckView presentation={slideCatalog} index={0} basePath="/specimen" documentTitle />);
    advance();
    expect(document.title).toBe(`${slideCatalog.name} - 2`);
  });
});

describe("DeckTile", () => {
  it("opens the deck from the title and prints from a link of its own", () => {
    render(
      <DeckTile
        href="/decks/a/3"
        printHref="/decks/a/print"
        title="A deck"
        blurb="What it is for"
        slideCount={12}
        family={{ label: "Talk", hue: ["var(--color-teal)", "var(--color-teal-night)"] }}
      />,
    );
    expect(screen.getByRole("link", { name: "A deck" })).toHaveAttribute("href", "/decks/a/3");
    expect(screen.getByRole("link", { name: "Print view" })).toHaveAttribute(
      "href",
      "/decks/a/print",
    );
    expect(screen.getByText("Talk")).not.toHaveAttribute("data-tone");
    expect(screen.getByText("12 slides")).toBeInTheDocument();
  });

  it("takes the neutral pill without a hue and leaves out what it is not given", () => {
    const { container } = render(
      <DeckTile href="/x/0" title="Draft" slideCount={3} family={{ label: "Unsorted" }} />,
    );
    expect(screen.getByText("Unsorted")).toHaveAttribute("data-tone", "neutral");
    expect(container.querySelector("p")).toBeNull();
    expect(screen.queryByRole("link", { name: "Print view" })).toBeNull();
  });
});
