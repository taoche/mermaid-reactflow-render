import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// React Flow relies on these browser APIs, which jsdom does not implement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as never);

if (!globalThis.DOMMatrixReadOnly) {
  class DOMMatrixReadOnlyStub {
    m22 = 1;
    constructor(transform?: string) {
      const scale = transform?.match(/scale\(([\d.]+)\)/);
      if (scale) {
        this.m22 = Number(scale[1]);
      }
    }
  }
  globalThis.DOMMatrixReadOnly = DOMMatrixReadOnlyStub as never;
}

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = vi.fn();
}

// jsdom has no 2D canvas; force the heuristic text-measurement fallback.
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;

// React Flow measures node bounds via getBoundingClientRect.
Element.prototype.getBoundingClientRect =
  Element.prototype.getBoundingClientRect ||
  (() => ({ x: 0, y: 0, width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600, toJSON: () => ({}) }) as DOMRect);

afterEach(() => {
  cleanup();
});
