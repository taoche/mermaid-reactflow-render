import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { NodeShape } from "../converter/types.js";

export interface CustomNodeData extends Record<string, unknown> {
  label: string;
  shape?: NodeShape;
  style?: { backgroundColor?: string; borderColor?: string };
}

export type CustomFlowNode = Node<CustomNodeData, "custom">;

const HANDLE_POSITIONS = [Position.Top, Position.Bottom, Position.Left, Position.Right] as const;

function renderLabel(label: string) {
  if (!label.includes("\n")) {
    return label;
  }
  return label.split("\n").map((line, i) => <div key={`${i}-${line}`}>{line}</div>);
}

function CustomNodeInner({ data, isConnectable }: NodeProps<CustomFlowNode>) {
  const shape = data.shape ?? "rect";
  const className = `mrf-node mrf-shape-${shape}`;
  const style: React.CSSProperties = {
    backgroundColor: data.style?.backgroundColor,
    borderColor: data.style?.borderColor,
  };

  return (
    <div className={className} style={style}>
      {HANDLE_POSITIONS.map((position) => {
        const side = position.toLowerCase();
        return (
          <span key={side}>
            <Handle
              type="target"
              position={position}
              id={`${side}-target`}
              isConnectable={isConnectable}
              className="mrf-handle"
            />
            <Handle
              type="source"
              position={position}
              id={`${side}-source`}
              isConnectable={isConnectable}
              className="mrf-handle"
            />
          </span>
        );
      })}
      <div className="mrf-node-content">
        <div className="mrf-node-label">{renderLabel(data.label)}</div>
      </div>
    </div>
  );
}

export const CustomNode = memo(CustomNodeInner);
