import type { NodeShape } from "./types.js";

export interface Size {
  width: number;
  height: number;
}

const FONT = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function measureLineWidth(text: string): number {
  if (typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = FONT;
        const w = ctx.measureText(text).width;
        if (w > 0) {
          return w;
        }
      }
    } catch {
      // fall through to heuristic
    }
  }
  return text.length * 8;
}

/** Compute a React-Flow node size from its label and shape. */
export function calculateNodeSize(label: string, shape: NodeShape): Size {
  const lines = label.split("\n");
  const maxLineWidth = Math.max(
    0,
    ...lines.map((line) => Math.ceil(measureLineWidth(line))),
  );

  const baseWidth = maxLineWidth + 30;
  const baseHeight = lines.length * 18 + 20;

  const width = Math.max(80, baseWidth + 30);
  const height = Math.max(40, baseHeight + 20);

  if (shape === "diamond") {
    return {
      width: Math.max(90, Math.ceil(width * 1.05)),
      height: Math.max(90, Math.ceil(height * 1.05)),
    };
  }
  if (shape === "circle") {
    const size = Math.max(width, height) + 10;
    return { width: size, height: size };
  }
  return { width, height };
}
