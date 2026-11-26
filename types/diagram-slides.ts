export interface ChartSegment {
  label: string;
  percentage: number;
}

export interface ChartDataPoint {
  name: string;
  // The trend variant draws `value` as the primary line and, where the point
  // carries one, `value2` as a second line beside it.
  value: number;
  value2?: number;
}

export interface ChartSlide {
  type: "chart";
  sectionLabel?: string;
  headline?: string;
  variant: "cycle" | "graph" | "trend" | "bar";
  segments?: ChartSegment[];
  currentSegmentIndex?: number;
  data?: ChartDataPoint[];
  xLabel?: string;
  yLabel?: string;
  // The graph variant writes `currentMarker` at a point on its curve; the trend variant marks the
  // data point of that `name` and draws the lines after it dashed, as planned. `futureNote` is a
  // note on what lies ahead: inside the graph, above the trend plot on the right.
  currentMarker?: string;
  futureNote?: string;
  annotation?: string;
  // Legend labels for the trend variant's two series.
  seriesLabel?: string;
  series2Label?: string;
}

// Team Topologies' visual grammar: stream-aligned teams as horizontal bars, platform teams
// underneath them, enabling teams as vertical bars beside them, complicated-subsystem teams as
// their own blocks the stream teams consume.
export interface TeamTopologySlide {
  type: "team-topology";
  sectionLabel?: string;
  headline: string;
  subtitle?: string;
  streamAligned: { name: string; roles: string[] }[];
  // `roles` are chips, e.g. "Factory Engineers, ca. 1 je Stream-Team"
  platform: { name: string; description?: string; roles?: string[] }[];
  // one enabling team per topic
  enabling: { name: string; experts: string[] }[];
  complicatedSubsystem?: { name: string; description?: string }[];
  /** Names what each box's colour and shape stand for, in the deck's language, unless `false`:
   *  readers new to Team Topologies could not tell the types apart by colour alone. */
  legend?: boolean;
  caption?: string;
}

// Areas around a central disc: six in practice, four or five still lay out.
export interface WheelSlide {
  type: "wheel";
  sectionLabel?: string;
  headline: string;
  subtitle?: string;
  center: string;
  segments: { title: string; text: string }[];
  caption?: string;
}

export type DecisionTeam = "platform" | "enabling" | "complicated-subsystem";

export interface DecisionBranch {
  label: string;
  title: string;
  text: string;
  team: DecisionTeam;
}

// Where a stream team's need goes: need, question, a yes branch up and a no branch down, both
// joining on the outcome.
export interface DecisionSlide {
  type: "decision";
  sectionLabel?: string;
  headline: string;
  subtitle?: string;
  need: string;
  question: string;
  yes: DecisionBranch;
  no: DecisionBranch;
  outcome: string;
  caption?: string;
}
