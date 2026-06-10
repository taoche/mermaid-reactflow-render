import { describe, expect, it } from "vitest";
import { calculateNodeSize } from "../src/converter/sizing.js";

describe("calculateNodeSize", () => {
  it("respects minimum dimensions for short labels", () => {
    const size = calculateNodeSize("A", "rect");
    expect(size.width).toBeGreaterThanOrEqual(80);
    expect(size.height).toBeGreaterThanOrEqual(40);
  });

  it("grows taller with more label lines", () => {
    const one = calculateNodeSize("one", "rect");
    const three = calculateNodeSize("one\ntwo\nthree", "rect");
    expect(three.height).toBeGreaterThan(one.height);
  });

  it("returns a square for circles", () => {
    const size = calculateNodeSize("Done", "circle");
    expect(size.width).toBe(size.height);
  });

  it("enforces a minimum diamond footprint", () => {
    const size = calculateNodeSize("?", "diamond");
    expect(size.width).toBeGreaterThanOrEqual(90);
    expect(size.height).toBeGreaterThanOrEqual(90);
  });
});
