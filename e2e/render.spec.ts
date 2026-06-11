import { expect, test } from "@playwright/test";

test.describe("MermaidFlow render", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".react-flow__node");
  });

  test("renders every node from the sample flowchart", async ({ page }) => {
    const count = await page.locator(".react-flow__node").count();
    expect(count).toBe(26);
  });

  test("renders animated colored edges with arrow markers", async ({ page }) => {
    const edges = page.locator(".react-flow__edge");
    expect(await edges.count()).toBeGreaterThan(20);
    const animated = page.locator(".react-flow__edge.animated");
    expect(await animated.count()).toBeGreaterThan(0);
    expect(await page.locator("marker path, marker polyline, defs marker").count()).toBeGreaterThan(0);
  });

  test("colors nodes by shape", async ({ page }) => {
    const startBg = await page
      .locator('[data-id="Start"] .mrf-node')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(startBg).toBe("rgb(243, 229, 245)"); // stadium -> purple

    const rectBg = await page
      .locator('[data-id="Discard"] .mrf-node')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(rectBg).toBe("rgb(227, 242, 253)"); // rect -> blue

    const diamondFill = await page
      .locator('[data-id="Empty"] polygon')
      .getAttribute("fill");
    expect(diamondFill).toBe("#FFF3E0"); // diamond -> orange
  });

  test("renders diamonds as SVG polygons", async ({ page }) => {
    // Empty, Freight, Compliant, AnyFlagged, Contact -> 5 decision diamonds.
    const polygons = page.locator(".react-flow__node-diamond polygon");
    expect(await polygons.count()).toBe(5);
  });

  test("renders edge labels", async ({ page }) => {
    await expect(page.locator(".react-flow__edge-textwrapper", { hasText: "Yes" }).first()).toBeVisible();
    await expect(page.locator(".react-flow__edge-textwrapper", { hasText: "No" }).first()).toBeVisible();
  });

  test("lays the diagram out top-to-bottom", async ({ page }) => {
    const start = await page.locator('[data-id="Start"]').boundingBox();
    const report = await page.locator('[data-id="Report"]').boundingBox();
    expect(start).not.toBeNull();
    expect(report).not.toBeNull();
    // Report is near the end of the flow, so it should be well below Start.
    expect(report!.y).toBeGreaterThan(start!.y);
  });

  test("supports horizontal (LR) layout via the direction selector", async ({ page }) => {
    await page.selectOption('[data-testid="direction"]', "LR");
    await page.waitForTimeout(600);
    const start = await page.locator('[data-id="Start"]').boundingBox();
    const announce = await page.locator('[data-id="Announce"]').boundingBox();
    const report = await page.locator('[data-id="Report"]').boundingBox();
    expect(start).not.toBeNull();
    // In LR the flow runs left-to-right, so later nodes sit to the right.
    expect(announce!.x).toBeGreaterThan(start!.x);
    expect(report!.x).toBeGreaterThan(announce!.x);
  });

  test("matches the reference render visually", async ({ page }) => {
    // Fit and settle the diagram before snapshotting.
    await page.locator(".react-flow__controls-fitview").click();
    await page.waitForTimeout(600);
    await expect(page.locator('[data-testid="canvas"]')).toHaveScreenshot("sample-flowchart.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
