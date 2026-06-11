import { memo } from "react";
import type { Node, NodeProps } from "@xyflow/react";

export interface GroupNodeData extends Record<string, unknown> {
  label: string;
  isSubgraph?: boolean;
}

export type GroupFlowNode = Node<GroupNodeData, "group">;

function GroupNodeInner({ data }: NodeProps<GroupFlowNode>) {
  return (
    <div className="mrf-group-node">
      {data.label ? <div className="mrf-group-label">{data.label}</div> : null}
    </div>
  );
}

export const GroupNode = memo(GroupNodeInner);
