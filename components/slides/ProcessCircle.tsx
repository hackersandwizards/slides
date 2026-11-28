"use client";

import { iconMap, type LucideIcon } from "../../lib/icons";
import { isHighlightPhase } from "../../lib/process-layout";
import type { ProcessNode } from "../../types/slide";
import { processCircleGeometry } from "./process-circle-geometry";

const defaultIcons: LucideIcon[] = [
  iconMap.bot,
  iconMap.code,
  iconMap["shield-check"],
  iconMap.refresh,
];

type CircleGeometry = ReturnType<typeof processCircleGeometry>;
type CyclePosition = CircleGeometry["positions"][number];

const CONNECTOR = {
  visible: {
    stroke: "stroke-teal",
    width: 2.5,
    dash: "none",
    marker: "url(#arrowhead)",
    opacity: 0.8,
  },
  hidden: {
    stroke: "stroke-primary-border",
    width: 1.5,
    dash: "6 4",
    marker: "url(#arrowhead-dim)",
    opacity: 0.15,
  },
};

function CycleConnector({ path, visible }: { path: string; visible: boolean }) {
  const appearance = visible ? CONNECTOR.visible : CONNECTOR.hidden;
  return (
    <path
      d={path}
      className={`transition-all duration-500 ${appearance.stroke}`}
      strokeWidth={appearance.width}
      strokeDasharray={appearance.dash}
      markerEnd={appearance.marker}
      opacity={appearance.opacity}
    />
  );
}

function CycleArrows({
  geometry,
  revealedCount,
}: {
  geometry: CircleGeometry;
  revealedCount: number;
}) {
  const { width, height, connectors } = geometry;
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
          <polygon points="0 0, 10 4, 0 8" className="fill-teal" />
        </marker>
        <marker
          id="arrowhead-dim"
          markerWidth="10"
          markerHeight="8"
          refX="9"
          refY="4"
          orient="auto"
        >
          <polygon points="0 0, 10 4, 0 8" className="fill-primary-border" />
        </marker>
      </defs>

      {connectors.map((path, index) => {
        const visible =
          index < connectors.length - 1
            ? revealedCount > index + 1
            : revealedCount >= connectors.length;
        return <CycleConnector key={index} path={path} visible={visible} />;
      })}
    </svg>
  );
}

const NODE_VISIBILITY = {
  visible: {
    wrapper: "scale-100 opacity-100",
    scale: "scale(1)",
    title: "text-text",
    description: "text-text-muted",
  },
  hidden: {
    wrapper: "pointer-events-none scale-90 opacity-0",
    scale: "scale(0.9)",
    title: "text-text-subtle",
    description: "text-text-subtle/70",
  },
};

const NODE_APPEARANCE = {
  highlighted: {
    border: "scale-105 border-teal",
    paper: "opacity-0",
    tint: "opacity-100",
    iconPaper: "opacity-0",
    iconInk: "text-white",
  },
  revealed: {
    border: "border-border",
    paper: "opacity-100",
    tint: "opacity-0",
    iconPaper: "bg-teal/7 opacity-100",
    iconInk: "text-teal",
  },
  hidden: {
    border: "border-primary-border/40",
    paper: "opacity-70",
    tint: "opacity-0",
    iconPaper: "bg-primary/7 opacity-40",
    iconInk: "text-text-subtle",
  },
};

function CycleNodeIcon({
  icon: Icon,
  state,
}: {
  icon: LucideIcon;
  state: keyof typeof NODE_APPEARANCE;
}) {
  const appearance = NODE_APPEARANCE[state];
  return (
    <div className="relative z-10 h-12 w-12 overflow-hidden rounded-brand-sm">
      <div className={`absolute inset-0 transition-opacity duration-500 ${appearance.iconPaper}`} />
      <div
        className={`absolute inset-0 bg-teal transition-opacity duration-500 ${appearance.tint}`}
      />
      <div className="relative z-10 flex h-full w-full items-center justify-center">
        <Icon className={`h-6 w-6 transition-colors duration-500 ${appearance.iconInk}`} />
      </div>
    </div>
  );
}

function CycleNode({
  node,
  position,
  index,
  isRevealed,
  highlighted,
}: {
  node: ProcessNode;
  position: CyclePosition;
  index: number;
  isRevealed: boolean;
  highlighted: boolean;
}) {
  const Icon = (node.icon ? iconMap[node.icon] : null) ?? defaultIcons[index] ?? iconMap.bot;
  const reveal = isRevealed ? "visible" : "hidden";
  const state = highlighted ? "highlighted" : isRevealed ? "revealed" : "hidden";
  const visibility = NODE_VISIBILITY[reveal];
  const appearance = NODE_APPEARANCE[state];
  return (
    <div
      inert={!isRevealed}
      className={`absolute transition-all duration-500 ${visibility.wrapper}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `translate(-50%, -50%) ${visibility.scale}`,
      }}
    >
      <div
        className={`relative flex w-56 flex-col items-center rounded-brand border p-5 text-center transition-all duration-500 ${
          appearance.border
        }`}
      >
        <div
          className={`absolute inset-0 rounded-brand bg-white transition-opacity duration-500 ${
            appearance.paper
          }`}
        />
        <div
          className={`absolute inset-0 rounded-brand bg-teal/7 transition-opacity duration-500 ${
            appearance.tint
          }`}
        />

        <CycleNodeIcon icon={Icon} state={state} />
        <CycleNodeText node={node} reveal={reveal} />
      </div>
    </div>
  );
}

function CycleNodeText({
  node,
  reveal,
}: {
  node: ProcessNode;
  reveal: keyof typeof NODE_VISIBILITY;
}) {
  const visibility = NODE_VISIBILITY[reveal];
  return (
    <>
      <h2
        className={`relative z-10 mt-3 font-heading text-lg font-bold transition-colors duration-500 ${
          visibility.title
        }`}
      >
        {node.title}
      </h2>
      <p
        className={`card-text-base relative z-10 mt-1.5 leading-snug transition-colors duration-500 ${
          visibility.description
        }`}
      >
        {node.description}
      </p>
    </>
  );
}

export function ProcessCircle({
  nodes,
  highlightPhase,
  activeIndex,
  revealedCount,
}: {
  nodes: ProcessNode[];
  highlightPhase?: string;
  activeIndex: number;
  revealedCount: number;
}) {
  const geometry = processCircleGeometry(nodes.length);
  return (
    <div
      className="process-canvas relative max-md:[zoom:0.44]"
      style={{ width: `${geometry.width / 16}rem`, height: `${geometry.height / 16}rem` }}
      data-hw-repeat={nodes.length > 1 ? "" : undefined}
    >
      <CycleArrows geometry={geometry} revealedCount={revealedCount} />
      {nodes.map((node, index) => (
        // Only a step a press revealed is lit: a phone or print shows them all neutral.
        <CycleNode
          key={index}
          node={node}
          position={geometry.positions[index]}
          index={index}
          isRevealed={index < revealedCount}
          highlighted={index === activeIndex || isHighlightPhase(node.title, highlightPhase)}
        />
      ))}
    </div>
  );
}
