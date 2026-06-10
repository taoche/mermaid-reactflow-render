import { layoutGraph, type ReactFlowData } from "./layout.js";
import { parseMermaid } from "./parser.js";

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

/** Parse a Mermaid flowchart and lay it out into React Flow nodes and edges. */
export function convertMermaidToReactFlow(mermaidCode: string): ReactFlowData {
  const parse = parseMermaid(mermaidCode);
  if (parse.nodes.length === 0) {
    return { nodes: [], edges: [] };
  }
  return layoutGraph(parse);
}
