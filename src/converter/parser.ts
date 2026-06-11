import type {
  FlowDirection,
  NodeShape,
  ParseResult,
  ParsedEdge,
  ParsedNode,
  ParsedSubgraph,
} from "./types.js";

const ARROW_HEADS = ["-.->", "-->", "==>", "->>", "<->", "-<>", "<-", "->"];
const LEGACY_OPERATORS = ["===", "---", "-.-", ":-:", "...", "::", "~"];

function normalizeDirection(raw: string): FlowDirection {
  const d = raw.toUpperCase();
  if (d === "TD") {
    return "TB";
  }
  return d as FlowDirection;
}

function detectShape(definition: string): NodeShape {
  if (definition.includes("{") && definition.includes("}")) {
    return "diamond";
  }
  if (definition.includes("((") && definition.includes("))")) {
    return "circle";
  }
  if (definition.includes("([") && definition.includes("])")) {
    return "stadium";
  }
  if (definition.includes("[") && definition.includes("]")) {
    return "rect";
  }
  if (definition.includes("(") && definition.includes(")")) {
    return "round";
  }
  return "rect";
}

export function cleanLabel(label: string): string {
  return label
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\\u([0-9a-fA-F]{4})/g, (match, code: string) => {
      try {
        return String.fromCharCode(parseInt(code, 16));
      } catch {
        return match;
      }
    })
    .replace(/\\n/g, "\n")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function slugify(title: string, fallback: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}

/** Join lines whose bracketed node label spans multiple physical lines. */
function stitchMultilineDefinitions(lines: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = (lines[i] ?? "").trim();
    const open = (line.match(/[[({]/g) || []).length;
    const close = (line.match(/[\])}]/g) || []).length;
    if (open > close && i < lines.length - 1) {
      let combined = line;
      let j = i + 1;
      let openCount = open;
      let closeCount = close;
      while (j < lines.length && openCount > closeCount) {
        const next = (lines[j] ?? "").trim();
        combined += " " + next;
        openCount += (next.match(/[[({]/g) || []).length;
        closeCount += (next.match(/[\])}]/g) || []).length;
        j++;
      }
      out.push(combined);
      i = j;
    } else {
      out.push(line);
      i++;
    }
  }
  return out;
}

interface NodeDefinition {
  label: string;
  shape: NodeShape;
}

function scanNodeDefinitions(lines: string[]): Map<string, NodeDefinition> {
  const defs = new Map<string, NodeDefinition>();
  const pattern = /(^|[\s\->]|\|[^|]*\|)([A-Za-z0-9_]+)([[({])/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed.startsWith("subgraph") ||
      trimmed === "end" ||
      trimmed.startsWith("%%")
    ) {
      continue;
    }

    pattern.lastIndex = 0;
    const seen = new Set<number>();
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(trimmed)) !== null) {
      const prefix = match[1];
      const nodeId = match[2];
      const openChar = match[3];
      if (prefix === undefined || nodeId === undefined || openChar === undefined) {
        continue;
      }
      const start = match.index + prefix.length;
      if (seen.has(start) || defs.has(nodeId)) {
        continue;
      }
      seen.add(start);

      const openIndex = start + nodeId.length;
      const closeChar = openChar === "[" ? "]" : openChar === "(" ? ")" : "}";

      let closeIndex = -1;
      let depth = 0;
      for (let k = openIndex; k < trimmed.length; k++) {
        const ch = trimmed[k];
        if (ch === openChar) {
          depth++;
        } else if (ch === closeChar) {
          depth--;
          if (depth === 0) {
            closeIndex = k;
            break;
          }
        }
      }

      let fullDef = nodeId;
      let shapeDef = "";
      if (closeIndex !== -1) {
        fullDef = trimmed.slice(start, closeIndex + 1);
        shapeDef = trimmed.slice(openIndex, closeIndex + 1);
      }

      if (shapeDef) {
        const shape = detectShape(fullDef);
        let rawLabel = nodeId;
        const inner = shapeDef.match(/^[[({](.*)[\])}]$/s);
        if (inner?.[1] !== undefined) {
          rawLabel = inner[1]
            .replace(/^"(.*)"$/, "$1")
            .replace(/^'(.*)'$/, "$1");
        }
        defs.set(nodeId, { label: cleanLabel(rawLabel), shape });
      }
    }
  }
  return defs;
}

interface SubgraphHeader {
  id: string;
  title: string;
}

function parseSubgraphHeader(line: string, index: number): SubgraphHeader | null {
  const rest = line.slice("subgraph".length).trim();
  if (!rest) {
    return { id: `sg-${index}`, title: `sg-${index}` };
  }

  const quoteMatch = rest.match(/^(["'])(.*?)\1/);
  if (quoteMatch?.[2] !== undefined) {
    const title = quoteMatch[2];
    return { id: slugify(title, `sg-${index}`), title };
  }

  const bracketMatch = rest.match(/^([^\s[]+)(?:\s*\[(.+?)\])?/);
  const idToken = bracketMatch?.[1];
  if (idToken) {
    const bracketTitle = bracketMatch?.[2];
    if (bracketTitle) {
      return { id: idToken, title: bracketTitle };
    }
    const altQuote = rest.match(/^\S+\s+(["'])(.*?)\1/);
    if (altQuote?.[2] !== undefined) {
      return { id: idToken, title: altQuote[2] };
    }
    if (rest.indexOf(" ") !== -1) {
      return { id: slugify(rest, `sg-${index}`), title: rest };
    }
    return { id: idToken, title: idToken };
  }
  return null;
}

interface EdgeToken {
  id: string;
  endIndex: number;
}

function extractToken(str: string, startIndex: number): EdgeToken | null {
  const idMatch = str.slice(startIndex).match(/^\s*([A-Za-z0-9_]+)/);
  const id = idMatch?.[1];
  if (!idMatch || id === undefined) {
    return null;
  }
  let idx = startIndex + idMatch[0].length;

  const rest = str.slice(idx);
  const openMatch = rest.match(/^\s*([[({])/);
  if (openMatch?.[1]) {
    const openChar = openMatch[1];
    const openPos = idx + rest.indexOf(openChar);
    const closeChar = openChar === "[" ? "]" : openChar === "(" ? ")" : "}";
    const closePos = str.indexOf(closeChar, openPos + 1);
    if (closePos !== -1) {
      idx = closePos + 1;
    }
  }
  return { id, endIndex: idx };
}

interface ParsedEdgeRaw {
  sourceId: string;
  targetId: string;
  edgeType: string;
  edgeLabel: string;
  /** Index in the line right after the parsed target — used for chained edges. */
  endIndex: number;
}

/** Advance past run of whitespace starting at `from`. Index-safe. */
function skipWhitespace(str: string, from: number): number {
  let i = from;
  while (i < str.length && /\s/.test(str.charAt(i))) {
    i++;
  }
  return i;
}

function parseEdge(str: string): ParsedEdgeRaw | null {
  const src = extractToken(str, 0);
  if (!src) {
    return null;
  }
  let i = skipWhitespace(str, src.endIndex);

  let foundArrowIndex = -1;
  let foundArrow = "";
  for (const ah of ARROW_HEADS) {
    const idx = str.indexOf(ah, i);
    if (idx !== -1 && (foundArrowIndex === -1 || idx < foundArrowIndex)) {
      foundArrowIndex = idx;
      foundArrow = ah;
    }
  }

  let op: string | null = null;
  let edgeLabel = "";

  if (foundArrowIndex !== -1) {
    const between = str.slice(i, foundArrowIndex);
    const prePipe = between.match(/\|(.*?)\|/);
    if (prePipe?.[1] !== undefined) {
      edgeLabel = prePipe[1];
    } else {
      const inline = between
        .replace(/^\s*[-.=:~]+\s*/g, "")
        .replace(/\s*[-.=:~]+\s*$/g, "")
        .trim();
      if (inline) {
        edgeLabel = inline;
      }
    }
    op = foundArrow;
    i = foundArrowIndex + foundArrow.length;
    i = skipWhitespace(str, i);
    if (str.charAt(i) === "|") {
      const next = str.indexOf("|", i + 1);
      if (next !== -1) {
        edgeLabel = str.slice(i + 1, next);
        i = next + 1;
      }
    }
  } else {
    for (const o of [...LEGACY_OPERATORS].sort((a, b) => b.length - a.length)) {
      if (str.startsWith(o, i)) {
        op = o;
        i += o.length;
        break;
      }
    }
    if (!op) {
      return null;
    }
    i = skipWhitespace(str, i);
    if (str.charAt(i) === "|") {
      const next = str.indexOf("|", i + 1);
      if (next !== -1) {
        edgeLabel = str.slice(i + 1, next);
        i = next + 1;
      }
    }
  }

  i = skipWhitespace(str, i);
  const tgt = extractToken(str, i);
  if (!tgt) {
    return null;
  }

  return {
    sourceId: src.id,
    targetId: tgt.id,
    edgeType: op,
    edgeLabel,
    endIndex: tgt.endIndex,
  };
}

export function parseMermaid(code: string): ParseResult {
  const nodes: ParsedNode[] = [];
  const edges: ParsedEdge[] = [];
  const subgraphs: ParsedSubgraph[] = [];
  const nodeMap = new Map<string, ParsedNode>();
  const subgraphMap = new Map<string, ParsedSubgraph>();

  const stripped = code
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("%%"));
  const lines = stitchMultilineDefinitions(stripped);

  let direction: FlowDirection = "TB";
  const dirMatch = code.match(/(?:flowchart|graph)\s+(TB|TD|BT|RL|LR)/i);
  if (dirMatch?.[1]) {
    direction = normalizeDirection(dirMatch[1]);
  }

  const nodeDefinitions = scanNodeDefinitions(lines);

  // Pass 1: identify subgraph hierarchy.
  const stack: string[] = [];
  lines.forEach((line, index) => {
    if (line.startsWith("subgraph")) {
      const header = parseSubgraphHeader(line, index);
      if (header) {
        const parentId = stack.length > 0 ? stack[stack.length - 1] : undefined;
        const sg: ParsedSubgraph = {
          id: header.id,
          title: cleanLabel(header.title),
          nodes: [],
          parentId,
          childrenIds: [],
        };
        subgraphMap.set(header.id, sg);
        if (parentId) {
          subgraphMap.get(parentId)?.childrenIds.push(header.id);
        }
        subgraphs.push(sg);
        stack.push(header.id);
      }
    } else if (/^direction\s+(TB|TD|BT|RL|LR)$/i.test(line)) {
      const dir = line.match(/^direction\s+(TB|TD|BT|RL|LR)$/i)?.[1];
      const top = stack[stack.length - 1];
      if (dir && top) {
        const sg = subgraphMap.get(top);
        if (sg) {
          sg.direction = normalizeDirection(dir);
        }
      }
    } else if (line === "end" && stack.length > 0) {
      stack.pop();
    }
  });

  const createOrGetNode = (id: string, currentSubgraph?: string): ParsedNode => {
    const existing = nodeMap.get(id);
    if (existing) {
      if (currentSubgraph && !existing.subgraph) {
        existing.subgraph = currentSubgraph;
        const sg = subgraphMap.get(currentSubgraph);
        if (sg && !sg.nodes.includes(id)) {
          sg.nodes.push(id);
        }
      }
      return existing;
    }
    const def = nodeDefinitions.get(id);
    const node: ParsedNode = {
      id,
      label: def?.label ?? id,
      shape: def?.shape ?? "rect",
      subgraph: currentSubgraph,
    };
    nodes.push(node);
    nodeMap.set(id, node);
    if (currentSubgraph) {
      subgraphMap.get(currentSubgraph)?.nodes.push(id);
    }
    return node;
  };

  // Pass 2: nodes and edges, with subgraph context tracking.
  stack.length = 0;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line === undefined) {
      continue;
    }

    if (line.startsWith("subgraph")) {
      const header = parseSubgraphHeader(line, index);
      if (header) {
        stack.push(header.id);
      }
      continue;
    }
    if (line === "end") {
      stack.pop();
      continue;
    }
    if (
      line.startsWith("direction ") ||
      line.startsWith("flowchart ") ||
      line.startsWith("graph ") ||
      line.startsWith("%%")
    ) {
      continue;
    }

    const currentSubgraph = stack.length > 0 ? stack[stack.length - 1] : undefined;

    // Support chained edges on one line: A --> B --> C
    let segment = line;
    let parsedAny = false;
    for (;;) {
      const parsed = parseEdge(segment);
      if (!parsed) {
        break;
      }
      parsedAny = true;
      const { sourceId, targetId, edgeType, edgeLabel } = parsed;
      const isSourceSubgraph = subgraphMap.has(sourceId);
      const isTargetSubgraph = subgraphMap.has(targetId);

      if (!isSourceSubgraph) {
        createOrGetNode(sourceId, currentSubgraph);
      }
      if (!isTargetSubgraph) {
        createOrGetNode(targetId, currentSubgraph);
      }

      edges.push({
        source: sourceId,
        target: targetId,
        label: cleanLabel(edgeLabel),
        type: edgeType,
        isSourceSubgraph,
        isTargetSubgraph,
      });

      // Continue from the target token so "B --> C" in "A --> B --> C" is parsed.
      const remainder = segment.slice(parsed.endIndex);
      if (!/^\s*(-|=|<|~|:|\.)/.test(remainder)) {
        break;
      }
      // Re-anchor the next segment on the just-parsed target id.
      segment = `${parsed.targetId} ${remainder}`;
    }

    if (!parsedAny) {
      const nodeMatch =
        line.match(/^([A-Za-z0-9_]+)([[({][^\])}]*[\])}])/) ||
        line.match(/^([A-Za-z0-9_]+)$/);
      const nodeId = nodeMatch?.[1];
      if (nodeId && !nodeMap.has(nodeId) && !subgraphMap.has(nodeId)) {
        createOrGetNode(nodeId, currentSubgraph);
      }
    }
  }

  return { nodes, edges, subgraphs, direction };
}
