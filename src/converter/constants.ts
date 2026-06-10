import type { NodeShape } from "./types.js";

export const LAYOUT_SPACING = {
  SUBGRAPH_HEADER_HEIGHT: 35,
  SUBGRAPH_PADDING: 8,
  SUBGRAPH_CONTENT_TOP_MARGIN: 10,
  NODE_SEPARATION_HORIZONTAL: 80,
  NODE_SEPARATION_VERTICAL: 100,
  CONTAINER_SEPARATION_HORIZONTAL: 120,
  CONTAINER_SEPARATION_VERTICAL: 160,
  NESTED_SUBGRAPH_SEPARATION_HORIZONTAL: 120,
  NESTED_SUBGRAPH_SEPARATION_VERTICAL: 140,
  META_GRAPH_MARGIN: 100,
  NESTED_CONTENT_MARGIN: 40,
  MIXED_CONTENT_VERTICAL_SPACING: 100,
  MIXED_CONTENT_HORIZONTAL_SPACING: 120,
} as const;

export const DAGRE_RANKER = "tight-tree" as const;

/** Fill / border color pairs keyed by node shape, matching the reference palette. */
export const SHAPE_COLORS: Record<NodeShape, [fill: string, border: string]> = {
  rect: ["#E3F2FD", "#1976D2"], // blue
  diamond: ["#FFF3E0", "#F57C00"], // orange
  circle: ["#E8F5E8", "#388E3C"], // green
  stadium: ["#F3E5F5", "#7B1FA2"], // purple
  round: ["#FCE4EC", "#C2185B"], // pink
};

export const SUBGRAPH_COLORS: ReadonlyArray<{ bg: string; border: string }> = [
  { bg: "rgba(227, 242, 253, 0.4)", border: "#1976D2" },
  { bg: "rgba(232, 245, 233, 0.4)", border: "#388E3C" },
  { bg: "rgba(243, 229, 245, 0.4)", border: "#7B1FA2" },
  { bg: "rgba(255, 243, 224, 0.4)", border: "#F57C00" },
  { bg: "rgba(252, 228, 236, 0.4)", border: "#C2185B" },
];

export const EDGE_COLORS: ReadonlyArray<string> = [
  "#1976D2",
  "#388E3C",
  "#F57C00",
  "#7B1FA2",
  "#C2185B",
];
