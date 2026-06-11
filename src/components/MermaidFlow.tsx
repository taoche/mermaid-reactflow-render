import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type ReactFlowProps,
} from "@xyflow/react";
import { convertMermaidToReactFlow } from "../converter/index.js";
import type { FlowDirection } from "../converter/index.js";
import { CustomNode } from "./CustomNode.js";
import { DiamondNode } from "./DiamondNode.js";
import { GroupNode } from "./GroupNode.js";
import { DagreEdge } from "./DagreEdge.js";

const NODE_TYPES = {
  custom: CustomNode,
  diamond: DiamondNode,
  group: GroupNode,
};

const EDGE_TYPES = {
  dagre: DagreEdge,
};

export interface MermaidFlowProps
  extends Omit<ReactFlowProps, "nodes" | "edges" | "nodeTypes"> {
  /** Mermaid flowchart source. Ignored if `nodes`/`edges` are provided directly. */
  code?: string;
  /** Pre-computed React Flow nodes (overrides `code`). */
  nodes?: Node[];
  /** Pre-computed React Flow edges (overrides `code`). */
  edges?: Edge[];
  /** Show the bottom-left zoom/fit controls. Default true. */
  showControls?: boolean;
  /** Show the dotted background grid. Default true. */
  showBackground?: boolean;
  /**
   * Force the layout direction, overriding the direction declared in `code`.
   * `"LR"`/`"RL"` lay the flow out horizontally; `"TB"`/`"BT"` vertically.
   */
  direction?: FlowDirection;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Render a Mermaid flowchart as an interactive, read-only React Flow diagram.
 *
 * Pass `code` to convert Mermaid source, or pass `nodes`/`edges` directly when
 * you have already called {@link convertMermaidToReactFlow}.
 */
export function MermaidFlow({
  code,
  nodes: nodesProp,
  edges: edgesProp,
  showControls = true,
  showBackground = true,
  direction,
  className,
  style,
  fitView = true,
  // Read-only defaults: pulled out of `rest` so callers can still override them.
  nodesDraggable = false,
  nodesConnectable = false,
  elementsSelectable = true,
  minZoom = 0.05,
  proOptions,
  ...rest
}: MermaidFlowProps) {
  const computed = useMemo(() => {
    if (nodesProp && edgesProp) {
      return { nodes: nodesProp, edges: edgesProp };
    }
    return convertMermaidToReactFlow(code ?? "", { direction });
  }, [code, nodesProp, edgesProp, direction]);

  return (
    <div className={`mrf-flow ${className ?? ""}`.trim()} style={{ width: "100%", height: "100%", ...style }}>
      <ReactFlow
        {...rest}
        nodes={computed.nodes}
        edges={computed.edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        fitView={fitView}
        proOptions={proOptions ?? { hideAttribution: true }}
        nodesDraggable={nodesDraggable}
        nodesConnectable={nodesConnectable}
        elementsSelectable={elementsSelectable}
        minZoom={minZoom}
      >
        {showBackground ? <Background variant={BackgroundVariant.Dots} gap={16} size={1} /> : null}
        {showControls ? <Controls showInteractive={false} /> : null}
      </ReactFlow>
    </div>
  );
}
