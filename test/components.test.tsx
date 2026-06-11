import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { CustomNode } from "../src/components/CustomNode.js";
import { DiamondNode } from "../src/components/DiamondNode.js";
import { GroupNode } from "../src/components/GroupNode.js";
import { MermaidFlow } from "../src/components/MermaidFlow.js";

function renderNode(ui: React.ReactElement) {
  return render(<ReactFlowProvider>{ui}</ReactFlowProvider>);
}

// Minimal NodeProps fixture; the components only read `data`, `selected`, and
// `isConnectable`, so the rest just satisfies the v12 NodeProps shape loosely.
const baseNodeProps: Record<string, unknown> = {
  id: "n1",
  selected: false,
  zIndex: 1,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  dragging: false,
  deletable: true,
  draggable: false,
  selectable: true,
  width: 120,
  height: 48,
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const CustomNodeAny = CustomNode as any;
const DiamondNodeAny = DiamondNode as any;
const GroupNodeAny = GroupNode as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

describe("CustomNode", () => {
  it("renders the label", () => {
    renderNode(
      <CustomNodeAny {...baseNodeProps} data={{ label: "Hello", shape: "rect" }} />,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders multi-line labels split on newline", () => {
    renderNode(
      <CustomNodeAny {...baseNodeProps} data={{ label: "Line A\nLine B", shape: "rect" }} />,
    );
    expect(screen.getByText("Line A")).toBeInTheDocument();
    expect(screen.getByText("Line B")).toBeInTheDocument();
  });

  it("applies the shape class", () => {
    const { container } = renderNode(
      <CustomNodeAny {...baseNodeProps} data={{ label: "x", shape: "stadium" }} />,
    );
    expect(container.querySelector(".mrf-shape-stadium")).toBeTruthy();
  });
});

describe("DiamondNode", () => {
  it("renders an SVG polygon and the label", () => {
    const { container } = renderNode(
      <DiamondNodeAny {...baseNodeProps} type="diamond" data={{ label: "Go?", shape: "diamond" }} />,
    );
    expect(container.querySelector("polygon")).toBeTruthy();
    expect(screen.getByText("Go?")).toBeInTheDocument();
  });
});

describe("GroupNode", () => {
  it("renders the subgraph title", () => {
    renderNode(
      <GroupNodeAny {...baseNodeProps} type="group" data={{ label: "My Group" }} />,
    );
    expect(screen.getByText("My Group")).toBeInTheDocument();
  });
});

describe("MermaidFlow", () => {
  it("renders nodes derived from code", () => {
    const { container } = render(
      <div style={{ width: 800, height: 600 }}>
        <MermaidFlow code={"flowchart TD\n A[Alpha] --> B[Beta]"} />
      </div>,
    );
    expect(container.querySelector(".react-flow")).toBeTruthy();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("renders nothing problematic for empty code", () => {
    const { container } = render(
      <div style={{ width: 400, height: 300 }}>
        <MermaidFlow code="" />
      </div>,
    );
    expect(container.querySelector(".react-flow")).toBeTruthy();
  });
});
