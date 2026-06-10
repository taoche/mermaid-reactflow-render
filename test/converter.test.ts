import { describe, expect, it } from "vitest";
import { convertMermaidToReactFlow } from "../src/converter/index.js";

const SAMPLE = `flowchart TD
  Start([Start]) --> Decide{Go?}
  Decide -->|Yes| Work[Do work]
  Decide -->|No| Stop([Stop])
  Work --> Done((Done))`;

describe("convertMermaidToReactFlow", () => {
  it("returns empty data for empty input", () => {
    expect(convertMermaidToReactFlow("")).toEqual({ nodes: [], edges: [] });
  });

  it("produces a node per parsed node", () => {
    const { nodes } = convertMermaidToReactFlow(SAMPLE);
    const ids = nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["Decide", "Done", "Start", "Stop", "Work"]);
  });

  it("maps diamond nodes to the diamond node type", () => {
    const { nodes } = convertMermaidToReactFlow(SAMPLE);
    expect(nodes.find((n) => n.id === "Decide")?.type).toBe("diamond");
  });

  it("maps non-diamond nodes to the custom node type", () => {
    const { nodes } = convertMermaidToReactFlow(SAMPLE);
    expect(nodes.find((n) => n.id === "Start")?.type).toBe("custom");
  });

  it("assigns positive sizes and finite positions to every node", () => {
    const { nodes } = convertMermaidToReactFlow(SAMPLE);
    for (const node of nodes) {
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
      expect(Number(node.style?.width)).toBeGreaterThan(0);
      expect(Number(node.style?.height)).toBeGreaterThan(0);
    }
  });

  it("creates one edge per connection with smoothstep + arrow markers", () => {
    const { edges } = convertMermaidToReactFlow(SAMPLE);
    expect(edges).toHaveLength(4);
    for (const edge of edges) {
      expect(edge.type).toBe("smoothstep");
      expect(edge.animated).toBe(true);
      expect(edge.markerEnd).toBeTruthy();
    }
  });

  it("preserves edge labels", () => {
    const { edges } = convertMermaidToReactFlow(SAMPLE);
    const labels = edges.map((e) => e.label).filter(Boolean);
    expect(labels).toEqual(expect.arrayContaining(["Yes", "No"]));
  });

  it("colors nodes by shape", () => {
    const { nodes } = convertMermaidToReactFlow(SAMPLE);
    const diamond = nodes.find((n) => n.id === "Decide");
    expect(diamond?.data.style.backgroundColor).toBe("#FFF3E0");
    const rect = nodes.find((n) => n.id === "Work");
    expect(rect?.data.style.backgroundColor).toBe("#E3F2FD");
  });

  it("emits group container nodes for subgraphs and parents children", () => {
    const code = `flowchart TD
      subgraph Pipeline
        Ingest[Ingest] --> Transform[Transform]
      end
      Transform --> Sink[Sink]`;
    const { nodes } = convertMermaidToReactFlow(code);
    const group = nodes.find((n) => n.type === "group");
    expect(group).toBeTruthy();
    const ingest = nodes.find((n) => n.id === "Ingest");
    expect(ingest?.parentNode).toBe(group?.id);
    expect(ingest?.extent).toBe("parent");
  });

  it("handles the full pre-departure flowchart without throwing", () => {
    const big = `flowchart TD
      Start([User runs the pre-departure document check]) --> Announce[Tell user the departure window:<br/>today through tomorrow]
      Announce --> Fetch[Step 1: Run find-air-export-missing-docs]
      Fetch --> Empty{Any shipments<br/>returned?}
      Empty -->|No| NoneMsg[Tell user: no air exports] --> Stop([Stop])
      Empty -->|Yes| PerShip[For each shipment]
      PerShip --> Freight{Flexport<br/>freight?}
      Freight -->|true| Slots[Evaluate 4 document slots]
      Slots --> Compliant{All 4 slots<br/>satisfied?}
      Compliant -->|No| Flag[Add to flagged list]
      Flag --> Done1((next))`;
    const { nodes, edges } = convertMermaidToReactFlow(big);
    expect(nodes.length).toBeGreaterThan(8);
    expect(edges.length).toBeGreaterThan(8);
  });
});
