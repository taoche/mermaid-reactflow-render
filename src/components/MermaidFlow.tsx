import { useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type Node,
  type ReactFlowProps,
} from "reactflow";
import { convertMermaidToReactFlow } from "../converter/index.js";
import { CustomNode } from "./CustomNode.js";
import { DiamondNode } from "./DiamondNode.js";
import { GroupNode } from "./GroupNode.js";

const NODE_TYPES = {
  custom: CustomNode,
  diamond: DiamondNode,
  group: GroupNode,
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
  className,
  style,
  fitView = true,
  ...rest
}: MermaidFlowProps) {
  const computed = useMemo(() => {
    if (nodesProp && edgesProp) {
      return { nodes: nodesProp, edges: edgesProp };
    }
    return convertMermaidToReactFlow(code ?? "");
  }, [code, nodesProp, edgesProp]);

  return (
    <div className={`mrf-flow ${className ?? ""}`.trim()} style={{ width: "100%", height: "100%", ...style }}>
      <ReactFlow
        nodes={computed.nodes}
        edges={computed.edges}
        nodeTypes={NODE_TYPES}
        fitView={fitView}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={rest.nodesDraggable ?? false}
        nodesConnectable={rest.nodesConnectable ?? false}
        elementsSelectable={rest.elementsSelectable ?? true}
        minZoom={0.05}
        {...rest}
      >
        {showBackground ? <Background variant={BackgroundVariant.Dots} gap={16} size={1} /> : null}
        {showControls ? <Controls showInteractive={false} /> : null}
      </ReactFlow>
    </div>
  );
}
