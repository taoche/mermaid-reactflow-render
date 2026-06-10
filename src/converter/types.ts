export type NodeShape = "rect" | "round" | "stadium" | "circle" | "diamond";

export type FlowDirection = "TB" | "BT" | "LR" | "RL";

export interface ParsedNode {
  id: string;
  label: string;
  shape: NodeShape;
  subgraph?: string;
}

export interface ParsedEdge {
  source: string;
  target: string;
  label: string;
  /** Raw connector operator, e.g. "-->", "---", "-.->", "==>". */
  type: string;
  isSourceSubgraph?: boolean;
  isTargetSubgraph?: boolean;
}

export interface ParsedSubgraph {
  id: string;
  title: string;
  nodes: string[];
  parentId?: string;
  childrenIds: string[];
  direction?: FlowDirection;
}

export interface ParseResult {
  nodes: ParsedNode[];
  edges: ParsedEdge[];
  subgraphs: ParsedSubgraph[];
  direction: FlowDirection;
}
