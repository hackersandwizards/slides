import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TitleSlide } from "../components/slides/TitleSlide";

describe("title slide opening", () => {
  it("draws kicker, name, title, speakers, event and the QR code with its link", () => {
    const { container, getByText, getByAltText } = render(
      <TitleSlide
        slide={{
          type: "title",
          kicker: "Field report",
          name: "Lumen Harness",
          title: "One harness",
          speakers: ["Mara Lindqvist", "Jonas Okafor"],
          event: "Delivery Days 2026 · Rotterdam",
          qr: { src: "/qr.svg", href: "https://example.com/harness/" },
        }}
      />,
    );
    const text = container.textContent ?? "";
    const order = ["Field report", "Lumen Harness", "One harness", "Mara Lindqvist & Jonas Okafor"];
    expect(order.map((t) => text.indexOf(t))).toEqual(
      order.map((t) => text.indexOf(t)).sort((a, b) => a - b),
    );
    expect(getByText("Delivery Days 2026 · Rotterdam")).toBeTruthy();
    expect(getByAltText("QR code: example.com/harness").getAttribute("src")).toContain("qr.svg");
    expect(getByText("example.com/harness").closest("a")?.getAttribute("href")).toBe(
      "https://example.com/harness/",
    );
    expect(container.querySelector(".text-center")).toBeNull();
  });

  it("keeps a title with only a subtitle centred", () => {
    const { container } = render(
      <TitleSlide slide={{ type: "title", title: "Agentic Coding", subtitle: "Two days" }} />,
    );
    expect(container.querySelector(".slide-content.text-center")).not.toBeNull();
  });
});
