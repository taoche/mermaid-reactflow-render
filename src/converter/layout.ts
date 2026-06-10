import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "reactflow";
import { MarkerType, Position } from "reactflow";
import { DAGRE_RANKER, EDGE_COLORS, LAYOUT_SPACING, SHAPE_COLORS, SUBGRAPH_COLORS } from "./constants.js";
import { calculateNodeSize } from "./sizing.js";
import type { FlowDirection, ParseResult, ParsedEdge, ParsedNode, ParsedSubgraph } from "./types.js";

const S = LAYOUT_SPACING;

interface XYWH {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SubgraphLayout {
  id: string;
  title: string;
  /** node id -> top-left position relative to subgraph origin + size */
  nodes: Map<string, XYWH>;
  width: number;
  height: number;
  parentId?: string;
}

interface XY {
  x: number;
  y: number;
}

export interface ReactFlowData {
  nodes: Node[];
  edges: Edge[];
}

function orderHierarchically(subgraphs: ParsedSubgraph[]): ParsedSubgraph[] {
  const result: ParsedSubgraph[] = [];
  const processed = new Set<string>();

  for (const sg of subgraphs) {
    if (!sg.parentId) {
      result.push(sg);
      processed.add(sg.id);
    }
  }
  let lastCount = -1;
  while (processed.size < subgraphs.length && lastCount !== processed.size) {
    lastCount = processed.size;
    for (const sg of subgraphs) {
      if (!processed.has(sg.id) && sg.parentId && processed.has(sg.parentId)) {
        result.push(sg);
        processed.add(sg.id);
      }
    }
  }
  for (const sg of subgraphs) {
    if (!processed.has(sg.id)) {
      result.push(sg);
    }
  }
  return result;
}

function layoutSubgraphs(
  nodes: ParsedNode[],
  edges: ParsedEdge[],
  subgraphs: ParsedSubgraph[],
  direction: FlowDirection,
): Map<string, SubgraphLayout> {
  const layouts = new Map<string, SubgraphLayout>();
  const ordered = orderHierarchically(subgraphs);

  for (const subgraph of ordered) {
    const sgNodes = nodes.filter((n) => n.subgraph === subgraph.id);
    const sgEdges = edges.filter((e) => {
      const s = nodes.find((n) => n.id === e.source);
      const t = nodes.find((n) => n.id === e.target);
      return s?.subgraph === subgraph.id && t?.subgraph === subgraph.id;
    });

    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: subgraph.direction || direction,
      nodesep: S.NODE_SEPARATION_HORIZONTAL,
      ranksep: S.NODE_SEPARATION_VERTICAL,
      marginx: S.SUBGRAPH_PADDING,
      marginy: S.SUBGRAPH_PADDING + S.SUBGRAPH_HEADER_HEIGHT + S.SUBGRAPH_CONTENT_TOP_MARGIN,
      ranker: DAGRE_RANKER,
    });
    g.setDefaultEdgeLabel(() => ({}));

    for (const node of sgNodes) {
      const size = calculateNodeSize(node.label, node.shape);
      g.setNode(node.id, { width: size.width, height: size.height });
    }
    for (const edge of sgEdges) {
      g.setEdge(edge.source, edge.target);
    }
    dagre.layout(g);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const positions = new Map<string, XYWH>();

    for (const node of sgNodes) {
      const nl = g.node(node.id);
      if (!nl) {
        continue;
      }
      const size = calculateNodeSize(node.label, node.shape);
      positions.set(node.id, { x: nl.x, y: nl.y, width: size.width, height: size.height });
      minX = Math.min(minX, nl.x - size.width / 2);
      maxX = Math.max(maxX, nl.x + size.width / 2);
      minY = Math.min(minY, nl.y - size.height / 2);
      maxY = Math.max(maxY, nl.y + size.height / 2);
    }

    if (sgNodes.length === 0 || minX === Infinity) {
      minX = 0;
      minY = 0;
      maxX = 200;
      maxY = 100;
    }

    const offsetX = -minX + S.SUBGRAPH_PADDING;
    const offsetY = -minY + S.SUBGRAPH_PADDING + S.SUBGRAPH_HEADER_HEIGHT + S.SUBGRAPH_CONTENT_TOP_MARGIN;
    positions.forEach((pos, id) => {
      positions.set(id, { ...pos, x: pos.x + offsetX, y: pos.y + offsetY });
    });

    const baseWidth = maxX - minX + S.SUBGRAPH_PADDING * 2;
    const baseHeight =
      maxY - minY + S.SUBGRAPH_PADDING * 2 + S.SUBGRAPH_HEADER_HEIGHT + S.SUBGRAPH_CONTENT_TOP_MARGIN;

    layouts.set(subgraph.id, {
      id: subgraph.id,
      title: subgraph.title,
      nodes: positions,
      width: baseWidth + 4,
      height: baseHeight + 4,
      parentId: subgraph.parentId,
    });
  }

  return layouts;
}

function connectionWeights(
  nodes: ParsedNode[],
  edges: ParsedEdge[],
): Map<string, Map<string, number>> {
  const weights = new Map<string, Map<string, number>>();
  for (const edge of edges) {
    const s = nodes.find((n) => n.id === edge.source);
    const t = nodes.find((n) => n.id === edge.target);
    if (!s || !t) {
      continue;
    }
    const sc = s.subgraph || s.id;
    const tc = t.subgraph || t.id;
    if (sc === tc) {
      continue;
    }
    if (!weights.has(sc)) {
      weights.set(sc, new Map());
    }
    const inner = weights.get(sc)!;
    inner.set(tc, (inner.get(tc) || 0) + 1);
  }
  return weights;
}

function layoutMetaGraph(
  nodes: ParsedNode[],
  edges: ParsedEdge[],
  layouts: Map<string, SubgraphLayout>,
  direction: FlowDirection,
): { subgraphPositions: Map<string, XY>; standalonePositions: Map<string, XY> } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: S.CONTAINER_SEPARATION_HORIZONTAL,
    ranksep: S.CONTAINER_SEPARATION_VERTICAL,
    marginx: S.META_GRAPH_MARGIN,
    marginy: S.META_GRAPH_MARGIN,
    ranker: DAGRE_RANKER,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const weights = connectionWeights(nodes, edges);

  layouts.forEach((layout, id) => {
    if (!layout.parentId) {
      g.setNode(id, { width: layout.width, height: layout.height });
    }
  });

  const standalone = nodes.filter((n) => !n.subgraph);
  for (const node of standalone) {
    const size = calculateNodeSize(node.label, node.shape);
    g.setNode(node.id, { width: size.width, height: size.height });
  }

  weights.forEach((targets, sourceId) => {
    targets.forEach((weight, targetId) => {
      const sl = layouts.get(sourceId);
      const tl = layouts.get(targetId);
      if ((sl && sl.parentId === targetId) || (tl && tl.parentId === sourceId)) {
        return;
      }
      const sourceTop = !sl || !sl.parentId;
      const targetTop = !tl || !tl.parentId;
      if (sourceTop && targetTop && g.hasNode(sourceId) && g.hasNode(targetId) && !g.hasEdge(sourceId, targetId)) {
        g.setEdge(sourceId, targetId, { weight });
      }
    });
  });

  dagre.layout(g);

  const subgraphPositions = new Map<string, XY>();
  const standalonePositions = new Map<string, XY>();

  layouts.forEach((layout, id) => {
    if (!layout.parentId) {
      const n = g.node(id);
      if (n) {
        subgraphPositions.set(id, { x: n.x - layout.width / 2, y: n.y - layout.height / 2 });
      }
    }
  });

  // Position nested subgraphs relative to their parents (simple stacked flow).
  const placeChildren = (parentId: string): boolean => {
    const parentPos = subgraphPositions.get(parentId);
    const parentLayout = layouts.get(parentId);
    if (!parentPos || !parentLayout) {
      return false;
    }
    const childIds: string[] = [];
    layouts.forEach((l, id) => {
      if (l.parentId === parentId) {
        childIds.push(id);
      }
    });
    if (childIds.length === 0) {
      return false;
    }

    const cg = new dagre.graphlib.Graph();
    cg.setGraph({
      rankdir: direction,
      nodesep: S.NESTED_SUBGRAPH_SEPARATION_HORIZONTAL,
      ranksep: S.NESTED_SUBGRAPH_SEPARATION_VERTICAL,
      marginx: S.NESTED_CONTENT_MARGIN,
      marginy: S.NESTED_CONTENT_MARGIN,
      ranker: DAGRE_RANKER,
    });
    cg.setDefaultEdgeLabel(() => ({}));
    for (const cid of childIds) {
      const cl = layouts.get(cid)!;
      cg.setNode(cid, { width: cl.width, height: cl.height });
    }
    let hasEdges = false;
    for (const sId of childIds) {
      const targets = weights.get(sId);
      if (!targets) {
        continue;
      }
      targets.forEach((weight, tId) => {
        if (childIds.includes(tId) && !cg.hasEdge(sId, tId)) {
          cg.setEdge(sId, tId, { weight });
          hasEdges = true;
        }
      });
    }
    if (!hasEdges && childIds.length > 1) {
      for (let i = 0; i < childIds.length - 1; i++) {
        cg.setEdge(childIds[i], childIds[i + 1], { weight: 1 });
      }
    }
    dagre.layout(cg);

    let minLeft = Infinity;
    let minTop = Infinity;
    let maxRight = -Infinity;
    let maxBottom = -Infinity;
    const topLefts = new Map<string, XY>();
    for (const cid of childIds) {
      const n = cg.node(cid);
      const cl = layouts.get(cid)!;
      const left = n.x - cl.width / 2;
      const top = n.y - cl.height / 2;
      topLefts.set(cid, { x: left, y: top });
      minLeft = Math.min(minLeft, left);
      minTop = Math.min(minTop, top);
      maxRight = Math.max(maxRight, n.x + cl.width / 2);
      maxBottom = Math.max(maxBottom, n.y + cl.height / 2);
    }

    let originY = parentPos.y + S.SUBGRAPH_HEADER_HEIGHT + S.SUBGRAPH_CONTENT_TOP_MARGIN + S.SUBGRAPH_PADDING;
    let maxNodeBottom = 0;
    parentLayout.nodes.forEach((np) => {
      maxNodeBottom = Math.max(maxNodeBottom, np.y + np.height / 2);
    });
    if (maxNodeBottom > 0) {
      originY = Math.max(originY, parentPos.y + maxNodeBottom + S.MIXED_CONTENT_VERTICAL_SPACING);
    }
    const originX = parentPos.x + S.SUBGRAPH_PADDING;

    for (const cid of childIds) {
      const tl = topLefts.get(cid)!;
      subgraphPositions.set(cid, {
        x: originX + (tl.x - minLeft),
        y: originY + (tl.y - minTop),
      });
    }

    const contentWidth = maxRight - minLeft;
    const childrenBottom = originY + (maxBottom - minTop) - parentPos.y;
    parentLayout.width = Math.max(parentLayout.width, contentWidth + S.SUBGRAPH_PADDING * 6, 400);
    parentLayout.height = Math.max(parentLayout.height, childrenBottom + S.SUBGRAPH_PADDING * 4, 300);
    return true;
  };

  const processedParents = new Set<string>();
  let progressing = true;
  let guard = 0;
  while (progressing && guard < 100) {
    guard++;
    progressing = false;
    layouts.forEach((_, id) => {
      if (subgraphPositions.has(id) && !processedParents.has(id)) {
        if (placeChildren(id)) {
          progressing = true;
        }
        processedParents.add(id);
      }
    });
  }

  for (const node of standalone) {
    const n = g.node(node.id);
    if (n) {
      const size = calculateNodeSize(node.label, node.shape);
      standalonePositions.set(node.id, { x: n.x - size.width / 2, y: n.y - size.height / 2 });
    }
  }

  return { subgraphPositions, standalonePositions };
}

function createElements(
  parse: ParseResult,
  layouts: Map<string, SubgraphLayout>,
  subgraphPositions: Map<string, XY>,
  standalonePositions: Map<string, XY>,
): ReactFlowData {
  const { nodes, edges, subgraphs, direction } = parse;
  const rfNodes: Node[] = [];
  const isHorizontal = direction === "LR" || direction === "RL";
  const sourcePos = isHorizontal ? Position.Right : Position.Bottom;
  const targetPos = isHorizontal ? Position.Left : Position.Top;

  const ordered = orderHierarchically(subgraphs);
  ordered.forEach((subgraph, index) => {
    const layout = layouts.get(subgraph.id);
    const position = subgraphPositions.get(subgraph.id);
    if (!layout || !position) {
      return;
    }
    const colors = SUBGRAPH_COLORS[index % SUBGRAPH_COLORS.length];
    let finalPosition = position;
    if (layout.parentId) {
      const parentPos = subgraphPositions.get(layout.parentId);
      if (parentPos) {
        finalPosition = { x: position.x - parentPos.x, y: position.y - parentPos.y };
      }
    }
    rfNodes.push({
      id: `subgraph-${subgraph.id}`,
      type: "group",
      position: finalPosition,
      data: { label: subgraph.title, isSubgraph: true },
      style: {
        backgroundColor: colors.bg,
        border: `3px solid ${colors.border}`,
        borderRadius: "12px",
        width: layout.width,
        height: layout.height,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      },
      parentNode: layout.parentId ? `subgraph-${layout.parentId}` : undefined,
      extent: layout.parentId ? "parent" : undefined,
      zIndex: layout.parentId ? 1 : 0,
    });
  });

  for (const node of nodes) {
    const [fill, border] = SHAPE_COLORS[node.shape];
    let position: XY = { x: 0, y: 0 };
    let parentNode: string | undefined;
    let wrapperWidth = 150;
    let wrapperHeight = 60;

    if (node.subgraph) {
      const layout = layouts.get(node.subgraph);
      const nl = layout?.nodes.get(node.id);
      if (nl) {
        position = { x: nl.x - nl.width / 2, y: nl.y - nl.height / 2 };
        wrapperWidth = Math.max(20, Math.round(nl.width));
        wrapperHeight = Math.max(20, Math.round(nl.height));
        parentNode = `subgraph-${node.subgraph}`;
      }
    } else {
      const standalone = standalonePositions.get(node.id);
      if (standalone) {
        position = standalone;
      }
      const size = calculateNodeSize(node.label, node.shape);
      wrapperWidth = Math.max(20, Math.round(size.width));
      wrapperHeight = Math.max(20, Math.round(size.height));
    }

    rfNodes.push({
      id: node.id,
      type: node.shape === "diamond" ? "diamond" : "custom",
      position,
      data: {
        label: node.label,
        shape: node.shape,
        style: { backgroundColor: fill, borderColor: border },
      },
      style: { width: wrapperWidth, height: wrapperHeight },
      sourcePosition: sourcePos,
      targetPosition: targetPos,
      parentNode,
      extent: parentNode ? "parent" : undefined,
      zIndex: 1,
    });
  }

  const rfEdges: Edge[] = edges.map((edge, index) => {
    const color = EDGE_COLORS[index % EDGE_COLORS.length];
    const style: Record<string, unknown> = { stroke: color, strokeWidth: 2.5 };
    if (edge.type === "---") {
      style.strokeDasharray = "8,4";
    } else if (edge.type === "-.-" || edge.type === "-.->") {
      style.strokeDasharray = "4,4";
    } else if (edge.type === "==>" || edge.type === "===>") {
      style.strokeWidth = 4;
    }
    const sourceId = edge.isSourceSubgraph ? `subgraph-${edge.source}` : edge.source;
    const targetId = edge.isTargetSubgraph ? `subgraph-${edge.target}` : edge.target;
    return {
      id: `edge-${edge.source}-${edge.target}-${index}`,
      source: sourceId,
      target: targetId,
      label: edge.label || undefined,
      type: "smoothstep",
      animated: true,
      style,
      labelStyle: {
        fontSize: "12px",
        fontWeight: 500,
        fill: color,
      },
      labelBgStyle: { fill: "white" },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color },
      sourceHandle: isHorizontal ? "right-source" : "bottom-source",
      targetHandle: isHorizontal ? "left-target" : "top-target",
      zIndex: 0,
    };
  });

  return { nodes: rfNodes, edges: rfEdges };
}

export function layoutGraph(parse: ParseResult): ReactFlowData {
  const layouts = layoutSubgraphs(parse.nodes, parse.edges, parse.subgraphs, parse.direction);
  const { subgraphPositions, standalonePositions } = layoutMetaGraph(
    parse.nodes,
    parse.edges,
    layouts,
    parse.direction,
  );
  return createElements(parse, layouts, subgraphPositions, standalonePositions);
}
