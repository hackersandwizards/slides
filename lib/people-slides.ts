import type { TeamTopologySlide } from "../types/slide";

/** The accent of the nth person on a slide, by position and never by who it is: teal first, then
 *  purple, alternating, in the order of the logo ("hackers" teal, "wizards" purple). */
export function personAccent(index: number): "primary" | "secondary" {
  return index % 2 === 0 ? "primary" : "secondary";
}

/** The types of team a team-topology slide draws, in the order drawn: its legend's rows. */
export const teamTypesDrawn = (slide: TeamTopologySlide) =>
  (
    [
      ["enabling", slide.enabling],
      ["stream", slide.streamAligned],
      ["subsystem", slide.complicatedSubsystem ?? []],
      ["platform", slide.platform],
    ] as const
  )
    .filter(([, teams]) => teams.length > 0)
    .map(([type]) => type);
