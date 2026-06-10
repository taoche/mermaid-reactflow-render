import { describe, expect, it } from "vitest";
import { cleanLabel } from "../src/converter/parser.js";
import { parseMermaid } from "../src/converter/index.js";

describe("parseMermaid: direction", () => {
  it("defaults to TB", () => {
    expect(parseMermaid("flowchart\n A --> B").direction).toBe("TB");
  });

  it("normalizes TD to TB", () => {
    expect(parseMermaid("flowchart TD\n A --> B").direction).toBe("TB");
  });

  it.each(["LR", "RL", "BT"] as const)("reads %s direction", (dir) => {
    expect(parseMermaid(`flowchart ${dir}\n A --> B`).direction).toBe(dir);
  });

  it("reads direction from `graph` keyword", () => {
    expect(parseMermaid("graph LR\n A --> B").direction).toBe("LR");
  });
});

describe("parseMermaid: shapes", () => {
  const cases: Array<[string, string]> = [
    ["A[rect]", "rect"],
    ["A(round)", "round"],
    ["A([stadium])", "stadium"],
    ["A((circle))", "circle"],
    ["A{diamond}", "diamond"],
  ];

  it.each(cases)("detects shape of %s", (def, shape) => {
    const { nodes } = parseMermaid(`flowchart TD\n ${def} --> B`);
    expect(nodes.find((n) => n.id === "A")?.shape).toBe(shape);
  });

  it("falls back to rect for bare ids", () => {
    const { nodes } = parseMermaid("flowchart TD\n A --> B");
    expect(nodes.find((n) => n.id === "B")?.shape).toBe("rect");
  });
});

describe("parseMermaid: labels", () => {
  it("extracts bracket label", () => {
    const { nodes } = parseMermaid("flowchart TD\n A[Hello World] --> B");
    expect(nodes.find((n) => n.id === "A")?.label).toBe("Hello World");
  });

  it("converts <br/> to newline", () => {
    const { nodes } = parseMermaid("flowchart TD\n A[Line one<br/>Line two] --> B");
    expect(nodes.find((n) => n.id === "A")?.label).toBe("Line one\nLine two");
  });

  it("strips surrounding quotes", () => {
    const { nodes } = parseMermaid('flowchart TD\n A["Quoted label"] --> B');
    expect(nodes.find((n) => n.id === "A")?.label).toBe("Quoted label");
  });

  it("uses node id as label when no shape is given", () => {
    const { nodes } = parseMermaid("flowchart TD\n A --> B");
    expect(nodes.find((n) => n.id === "B")?.label).toBe("B");
  });
});

describe("parseMermaid: edges", () => {
  it("captures pipe label", () => {
    const { edges } = parseMermaid("flowchart TD\n A -->|Yes| B");
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: "A", target: "B", label: "Yes", type: "-->" });
  });

  it("captures inline label", () => {
    const { edges } = parseMermaid("flowchart TD\n A -- No --> B");
    expect(edges[0]).toMatchObject({ source: "A", target: "B", label: "No" });
  });

  it("parses chained edges on one line", () => {
    const { edges } = parseMermaid("flowchart TD\n A --> B --> C");
    expect(edges.map((e) => [e.source, e.target])).toEqual([
      ["A", "B"],
      ["B", "C"],
    ]);
  });

  it("records dotted and thick edge operators", () => {
    const { edges } = parseMermaid("flowchart TD\n A -.-> B\n B ==> C\n C --- D");
    expect(edges.map((e) => e.type)).toEqual(["-.->", "==>", "---"]);
  });

  it("does not duplicate nodes referenced multiple times", () => {
    const { nodes } = parseMermaid("flowchart TD\n A --> B\n A --> C\n B --> C");
    expect(nodes.map((n) => n.id).sort()).toEqual(["A", "B", "C"]);
  });
});

describe("parseMermaid: subgraphs", () => {
  it("assigns nodes to their subgraph", () => {
    const code = `flowchart TD
      subgraph Group A
        A1 --> A2
      end
      A2 --> B`;
    const { subgraphs, nodes } = parseMermaid(code);
    expect(subgraphs).toHaveLength(1);
    expect(nodes.find((n) => n.id === "A1")?.subgraph).toBe(subgraphs[0].id);
    expect(nodes.find((n) => n.id === "B")?.subgraph).toBeUndefined();
  });

  it("tracks nested subgraph parentage", () => {
    const code = `flowchart TD
      subgraph Outer
        subgraph Inner
          X --> Y
        end
      end`;
    const { subgraphs } = parseMermaid(code);
    const inner = subgraphs.find((s) => s.title === "Inner");
    const outer = subgraphs.find((s) => s.title === "Outer");
    expect(inner?.parentId).toBe(outer?.id);
    expect(outer?.childrenIds).toContain(inner?.id);
  });

  it("reads per-subgraph direction", () => {
    const code = `flowchart TD
      subgraph G
        direction LR
        A --> B
      end`;
    const { subgraphs } = parseMermaid(code);
    expect(subgraphs[0].direction).toBe("LR");
  });
});

describe("cleanLabel", () => {
  it("trims and collapses whitespace around newlines", () => {
    expect(cleanLabel("a <br/>  b")).toBe("a\nb");
  });

  it("decodes unicode escapes", () => {
    expect(cleanLabel("\\u00e9")).toBe("é");
  });
});
