import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

export interface DagreEdgeData extends Record<string, unknown> {
  /** Routed waypoints from dagre, in flow coordinate space. */
  points?: Array<{ x: number; y: number }>;
}

export type DagreFlowEdge = Edge<DagreEdgeData, "dagre">;

type Point = { x: number; y: number };

/** Build a smooth SVG path through the given waypoints (>= 2 points). */
function buildPath(points: readonly Point[]): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) {
    return "";
  }
  if (points.length === 2) {
    return `M${first.x},${first.y} L${last.x},${last.y}`;
  }

  // Quadratic curves through midpoints give a smooth, dagre-following line.
  let d = `M${first.x},${first.y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const cur = points[i];
    const next = points[i + 1];
    if (!cur || !next) {
      continue;
    }
    const midX = (cur.x + next.x) / 2;
    const midY = (cur.y + next.y) / 2;
    d += ` Q${cur.x},${cur.y} ${midX},${midY}`;
  }
  d += ` L${last.x},${last.y}`;
  return d;
}

function DagreEdgeInner({
  data,
  style,
  markerEnd,
  label,
  labelStyle,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps<DagreFlowEdge>) {
  const points = data?.points;
  const hasPoints = !!points && points.length >= 2;

  // Fall back to a straight line if waypoints are missing.
  const path = hasPoints ? buildPath(points) : `M${sourceX},${sourceY} L${targetX},${targetY}`;

  // Place the label near the middle waypoint for stable positioning.
  const mid = hasPoints ? points[Math.floor(points.length / 2)] : undefined;
  const labelX = mid?.x ?? (sourceX + targetX) / 2;
  const labelY = mid?.y ?? (sourceY + targetY) / 2;

  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} style={style} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="mrf-edge-label"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
              ...labelStyle,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const DagreEdge = memo(DagreEdgeInner);
