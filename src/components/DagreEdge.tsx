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

/** Build a smooth SVG path through the given points using Catmull-Rom-ish curves. */
function buildPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) {
    return "";
  }
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }

  // Quadratic curves through midpoints give a smooth, dagre-following line.
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mid = {
      x: (points[i].x + points[i + 1].x) / 2,
      y: (points[i].y + points[i + 1].y) / 2,
    };
    d += ` Q${points[i].x},${points[i].y} ${mid.x},${mid.y}`;
  }
  const last = points[points.length - 1];
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

  // Fall back to a straight line if waypoints are missing.
  const path =
    points && points.length >= 2
      ? buildPath(points)
      : `M${sourceX},${sourceY} L${targetX},${targetY}`;

  // Place the label near the middle waypoint for stable positioning.
  let labelX = (sourceX + targetX) / 2;
  let labelY = (sourceY + targetY) / 2;
  if (points && points.length > 0) {
    const mid = points[Math.floor(points.length / 2)];
    labelX = mid.x;
    labelY = mid.y;
  }

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
              pointerEvents: "all",
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
