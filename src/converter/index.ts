import { layoutGraph, type ReactFlowData } from "./layout.js";
import { parseMermaid } from "./parser.js";
import type { FlowDirection } from "./types.js";

export { parseMermaid } from "./parser.js";
export { layoutGraph } from "./layout.js";
export type { ReactFlowData } from "./layout.js";
export type {
  FlowDirection,
  NodeShape,
  ParseResult,
  ParsedEdge,
  ParsedNode,
  ParsedSubgraph,
} from "./types.js";

export interface ConvertOptions {
  /**
   * Force the layout direction, overriding any `flowchart`/`graph` direction in
   * the source. Use `"LR"`/`"RL"` for a horizontal flow, `"TB"`/`"BT"` for
   * vertical. When omitted, the direction declared in the Mermaid source is
   * used (defaulting to `"TB"`).
   */
  direction?: FlowDirection;
}

/** Parse a Mermaid flowchart and lay it out into React Flow nodes and edges. */
export function convertMermaidToReactFlow(
  mermaidCode: string,
  options: ConvertOptions = {},
): ReactFlowData {
  const parse = parseMermaid(mermaidCode);
  if (parse.nodes.length === 0) {
    return { nodes: [], edges: [] };
  }
  if (options.direction) {
    parse.direction = options.direction;
  }
  return layoutGraph(parse);
}
