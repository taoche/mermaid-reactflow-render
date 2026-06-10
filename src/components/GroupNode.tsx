import { memo } from "react";
import type { NodeProps } from "reactflow";

export interface GroupNodeData {
  label: string;
  isSubgraph?: boolean;
}

function GroupNodeInner({ data }: NodeProps<GroupNodeData>) {
  return (
    <div className="mrf-group-node">
      {data.label ? <div className="mrf-group-label">{data.label}</div> : null}
    </div>
  );
}

export const GroupNode = memo(GroupNodeInner);
