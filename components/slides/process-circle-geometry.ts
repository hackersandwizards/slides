const CENTER_X = 50;
const CENTER_Y = 50;
const RADIUS_X = 32;
const RADIUS_Y = 32;

// Canvas units are sixteenths of a rem, so the canvas scales with the slide.
const CANVAS_W = 960;
const CANVAS_H = 520;
const NODE_HALF_W = 120;
const NODE_HALF_H = 80;
function nodePositions(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (-90 + (360 / count) * i) * (Math.PI / 180);
    return {
      x: CENTER_X + RADIUS_X * Math.cos(angle),
      y: CENTER_Y + RADIUS_Y * Math.sin(angle),
    };
  });
}

type CyclePosition = ReturnType<typeof nodePositions>[number];

function processConnectorPath(from: CyclePosition, to: CyclePosition) {
  const fx = (from.x / 100) * CANVAS_W;
  const fy = (from.y / 100) * CANVAS_H;
  const tx = (to.x / 100) * CANVAS_W;
  const ty = (to.y / 100) * CANVAS_H;

  const dx = tx - fx;
  const dy = ty - fy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Where the line leaves a card: the half-card box (a w-56 card, 224 units wide,
  // plus a gap) hit along the line's direction, so arrows start at the card edge
  // whatever the angle.
  const edge = Math.min(
    NODE_HALF_W / Math.abs(dx / dist || 1e-6),
    NODE_HALF_H / Math.abs(dy / dist || 1e-6),
  );
  const sx = fx + (dx / dist) * edge;
  const sy = fy + (dy / dist) * edge;
  const ex = tx - (dx / dist) * edge;
  const ey = ty - (dy / dist) * edge;

  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const perpX = -(ey - sy) * 0.15;
  const perpY = (ex - sx) * 0.15;
  const cx = mx + perpX;
  const cy = my + perpY;
  return `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
}

export function processCircleGeometry(count: number) {
  const positions = nodePositions(count);
  const connectors = positions.map((from, index) =>
    processConnectorPath(from, positions[(index + 1) % positions.length]),
  );
  return { width: CANVAS_W, height: CANVAS_H, positions, connectors };
}
