import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CustomFlowNode } from "./CustomNode.js";

const HANDLE_POSITIONS = [Position.Top, Position.Bottom, Position.Left, Position.Right] as const;

function DiamondNodeInner({ data, isConnectable }: NodeProps<CustomFlowNode>) {
  const fill = data.style?.backgroundColor ?? "#FFF3E0";
  const border = data.style?.borderColor ?? "#F57C00";

  return (
    <div className="mrf-diamond-node">
      <svg
        className="mrf-diamond-svg"
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <polygon points="50,2 98,50 50,98 2,50" fill={fill} stroke={border} strokeWidth={2} />
      </svg>
      <div className="mrf-diamond-content">
        <div className="mrf-node-label" title={data.label}>
          {data.label}
        </div>
      </div>
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
    </div>
  );
}

export const DiamondNode = memo(DiamondNodeInner);
