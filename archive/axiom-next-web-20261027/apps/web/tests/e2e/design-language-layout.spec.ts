import { expect, test, type Locator } from "@playwright/test";

const previewContexts = ["Narrow", "Medium", "Wide"] as const;
const containerSizes = ["Measure", "Content", "Wide"] as const;

async function childTopPositions(layout: Locator) {
  return layout.locator(":scope > *").evaluateAll((children) =>
    children.map((child) => Math.round(child.getBoundingClientRect().top)),
  );
}

async function containerGeometry(sandbox: Locator, container: Locator) {
  return container.evaluate((element, sandboxElement) => {
    const containerRect = element.getBoundingClientRect();
    const sandboxRect = (sandboxElement as Element).getBoundingClientRect();
    const style = getComputedStyle(element);
    const start = Number.parseFloat(style.paddingInlineStart) || 0;
    const end = Number.parseFloat(style.paddingInlineEnd) || 0;
    return {
      preview: sandboxRect.width,
      outer: containerRect.width,
      content: containerRect.width - start - end,
      gutterStart: start,
      gutterEnd: end,
      insetStart: containerRect.left - sandboxRect.left,
      insetEnd: sandboxRect.right - containerRect.right,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    };
  }, await sandbox.elementHandle());
}

async function stackGeometry(stack: Locator) {
  return stack.evaluate((element) => {
    const root = element as HTMLElement;
    const rootRect = root.getBoundingClientRect();
    const children = Array.from(root.children) as HTMLElement[];
    const first = children.at(0)?.getBoundingClientRect();
    const last = children.at(-1)?.getBoundingClientRect();
    const style = getComputedStyle(root);
    const margins = children.flatMap((child) => {
      const childStyle = getComputedStyle(child);
      return [
        Number.parseFloat(childStyle.marginBlockStart) || 0,
        Number.parseFloat(childStyle.marginBlockEnd) || 0,
      ];
    });

    return {
      align: style.alignItems,
      childHeights: children.map((child) => Math.round(child.getBoundingClientRect().height)),
      childMargins: Math.max(0, ...margins),
      childWidths: children.map((child) => Math.round(child.getBoundingClientRect().width)),
      clientWidth: root.clientWidth,
      direction: style.flexDirection,
      gap: Number.parseFloat(style.rowGap) || 0,
      order: children.map((child) => child.getAttribute("data-stack-item")),
      outerEnd: last ? rootRect.bottom - last.bottom : 0,
      outerStart: first ? first.top - rootRect.top : 0,
      scrollWidth: root.scrollWidth,
      width: rootRect.width,
    };
  });
}

async function clusterGeometry(cluster: Locator) {
  return cluster.evaluate((element) => {
    const root = element as HTMLElement;
    const children = Array.from(root.children) as HTMLElement[];
    const rows: Array<{ bottom: number; top: number }> = [];
    const rectangles = children
      .map((child) => child.getBoundingClientRect())
      .sort((first, second) => first.top - second.top);

    for (const rectangle of rectangles) {
      const row = rows.find(
        (candidate) => rectangle.top < candidate.bottom && rectangle.bottom > candidate.top,
      );
      if (row) {
        row.top = Math.min(row.top, rectangle.top);
        row.bottom = Math.max(row.bottom, rectangle.bottom);
      } else {
        rows.push({ top: rectangle.top, bottom: rectangle.bottom });
      }
    }

    const style = getComputedStyle(root);
    return {
      align: style.alignItems,
      childHeights: children.map((child) => Math.round(child.getBoundingClientRect().height)),
      clientWidth: root.clientWidth,
      gap: Number.parseFloat(style.rowGap) || 0,
      justify: style.justifyContent,
      lines: rows.length,
      order: children.map((child) => child.getAttribute("data-cluster-item")),
      scrollWidth: root.scrollWidth,
      width: root.getBoundingClientRect().width,
      wrap: style.flexWrap,
    };
  });
}

async function setRangeValue(range: Locator, value: number) {
  const box = await range.boundingBox();
  expect(box).not.toBeNull();

  const min = Number(await range.getAttribute("min"));
  const max = Number(await range.getAttribute("max"));
  const thumbInset = 8;
  const trackWidth = (box?.width ?? 0) - thumbInset * 2;
  const ratio = (value - min) / (max - min);

  await range.click({
    position: {
      x: thumbInset + trackWidth * ratio,
      y: (box?.height ?? 0) / 2,
    },
  });

  let current = Number(await range.inputValue());
  let remainingSteps = 10;
  while (current !== value && remainingSteps > 0) {
    await range.press(current < value ? "ArrowRight" : "ArrowLeft");
    current = Number(await range.inputValue());
    remainingSteps -= 1;
  }

  expect(current).toBe(value);
}

async function gridGeometry(grid: Locator) {
  return grid.evaluate((element) => {
    const root = element as HTMLElement;
    const style = getComputedStyle(root);
    const children = Array.from(root.children) as HTMLElement[];
    return {
      align: style.alignItems,
      childHeights: children.map((child) => Math.round(child.getBoundingClientRect().height)),
      childWidths: children.map((child) => Math.round(child.getBoundingClientRect().width)),
      clientWidth: root.clientWidth,
      columns: style.gridTemplateColumns.split(" ").filter(Boolean).length,
      gap: Number.parseFloat(style.columnGap) || 0,
      order: children.map((child) => child.getAttribute("data-grid-item")),
      rows: style.gridTemplateRows.split(" ").filter(Boolean).length,
      scrollWidth: root.scrollWidth,
      width: root.getBoundingClientRect().width,
    };
  });
}

async function switcherGeometry(switcher: Locator) {
  return switcher.evaluate((element) => {
    const root = element as HTMLElement;
    const children = Array.from(root.children) as HTMLElement[];
    const tops = children.map((child) => Math.round(child.getBoundingClientRect().top));
    const style = getComputedStyle(root);
    return {
      clientWidth: root.clientWidth,
      gap: Number.parseFloat(style.columnGap) || 0,
      order: children.map((child) => child.getAttribute("data-switcher-item")),
      rows: new Set(tops).size,
      scrollWidth: root.scrollWidth,
      width: root.getBoundingClientRect().width,
      wrap: style.flexWrap,
    };
  });
}

async function sidebarGeometry(sidebar: Locator) {
  return sidebar.evaluate((element) => {
    const root = element as HTMLElement;
    const children = Array.from(root.children) as HTMLElement[];
    const rectangles = children.map((child) => child.getBoundingClientRect());
    const style = getComputedStyle(root);
    return {
      align: style.alignItems,
      childWidths: rectangles.map((rectangle) => Math.round(rectangle.width)),
      clientWidth: root.clientWidth,
      gap: Number.parseFloat(style.columnGap) || 0,
      order: children.map((child) => getComputedStyle(child).order),
      roles: children.map((child) => child.getAttribute("data-sidebar-region")),
      rows: new Set(rectangles.map((rectangle) => Math.round(rectangle.top))).size,
      scrollWidth: root.scrollWidth,
      width: root.getBoundingClientRect().width,
    };
  });
}

test.describe("design language layout foundation", () => {
  test("uses real polymorphic primitives and intrinsic width changes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/design-language/components/labs/layout/");

    const foundation = page.locator("[data-layout-foundation]");
    const stage = foundation.locator("[data-layout-preview-size]");
    const contextControl = foundation.getByRole("group", { name: "Layout preview width" });

    await expect(foundation.locator("[data-layout-specimen]")).toHaveCount(9);

    for (const id of ["container"] as const) {
      await expect(
        foundation.locator(`[data-layout-specimen="layout.${id}"]`),
      ).toContainText("verified");
    }
    for (const id of ["stack", "cluster", "grid", "switcher", "sidebar", "cover", "frame", "bleed"] as const) {
      await expect(foundation.locator(`[data-layout-specimen="layout.${id}"]`)).toContainText("implemented");
    }

    await expect(foundation.locator("[data-container-interactive]")).toHaveJSProperty("tagName", "DIV");
    await expect(foundation.locator("[data-stack-interactive]")).toHaveJSProperty("tagName", "OL");
    await expect(foundation.locator("[data-cluster-interactive]")).toHaveJSProperty("tagName", "UL");
    await expect(foundation.locator("[data-grid-interactive]")).toHaveJSProperty("tagName", "UL");
    await expect(foundation.locator("[data-switcher-interactive]")).toHaveJSProperty("tagName", "OL");
    await expect(foundation.locator("[data-sidebar-interactive]")).toHaveJSProperty("tagName", "DIV");
    await expect(foundation.locator("[data-cover-interactive]")).toHaveJSProperty("tagName", "SECTION");
    await expect(foundation.locator("[data-frame-interactive]")).toHaveJSProperty("tagName", "FIGURE");
    await expect(foundation.locator("[data-bleed-interactive]")).toHaveJSProperty("tagName", "FIGURE");

    expect(
      await foundation.locator("[data-layout]").evaluateAll((layouts) =>
        layouts.every((layout) => {
          const authoredStyles = Array.from((layout as HTMLElement).style);
          return authoredStyles.length === 0 || (
            layout.matches('[data-layout="frame"][data-position="custom"]')
            && authoredStyles.every((property) => property === "--layout-frame-position")
          );
        }),
      ),
    ).toBe(true);

    await contextControl.getByRole("button", { name: "Narrow" }).click();
    await expect(stage).toHaveAttribute("data-layout-preview-size", "narrow");

    const grid = foundation.locator("[data-grid-interactive]");
    const switcher = foundation.locator("[data-switcher-interactive]");
    const sidebar = foundation.locator("[data-sidebar-interactive]");
    await expect(foundation.locator('[data-layout-specimen="layout.grid"] [data-intrinsic-metric="available"]')).toHaveText("328 px");
    const narrowGridColumns = (await gridGeometry(grid)).columns;
    const narrowSwitcherTops = await childTopPositions(switcher);
    const narrowSidebarTops = await childTopPositions(sidebar);

    expect(new Set(narrowSwitcherTops).size).toBe(3);
    expect(new Set(narrowSidebarTops).size).toBe(2);

    await contextControl.getByRole("button", { name: "Wide" }).click();
    await expect(stage).toHaveAttribute("data-layout-preview-size", "wide");

    await expect(foundation.locator('[data-layout-specimen="layout.grid"] [data-intrinsic-metric="available"]')).toHaveText("900 px");
    const wideGridColumns = (await gridGeometry(grid)).columns;
    const wideSwitcherTops = await childTopPositions(switcher);
    const wideSidebarTops = await childTopPositions(sidebar);

    expect(wideGridColumns).toBeGreaterThan(narrowGridColumns);
    expect(new Set(wideSwitcherTops).size).toBe(1);
    expect(new Set(wideSidebarTops).size).toBe(1);

    const frame = foundation.locator("[data-frame-interactive]");
    const frameBox = await frame.boundingBox();
    expect(frameBox).not.toBeNull();
    expect((frameBox?.width ?? 0) / (frameBox?.height ?? 1)).toBeCloseTo(16 / 9, 1);
    await expect(frame.locator("img")).toHaveCSS("object-fit", "cover");

    const cover = foundation.locator("[data-cover-interactive]");
    expect((await cover.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(480);

    const bleed = foundation.locator("[data-bleed-interactive]");
    const bleedWidth = (await bleed.boundingBox())?.width ?? 0;
    const readingWidth = (await bleed.locator("xpath=..").boundingBox())?.width ?? 0;
    expect(bleedWidth).toBeLessThan(readingWidth);

    const orderValues = await foundation.locator("[data-layout] > *").evaluateAll(
      (children) => children.map((child) => getComputedStyle(child).order),
    );
    expect(orderValues.every((order) => order === "0")).toBe(true);
    await expect(grid).toHaveCSS("grid-auto-flow", "row");
  });

  test("proves Stack gap, direct-child and outer-space invariants", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/design-language/components/labs/layout/");

    const foundation = page.locator("[data-layout-foundation]");
    const specimen = foundation.locator('[data-layout-specimen="layout.stack"]');
    const stack = specimen.locator("[data-stack-interactive]");
    const contextControl = foundation.getByRole("group", { name: "Layout preview width" });
    const widths: number[] = [];

    await expect(specimen.locator('[data-flow-metric="children"]')).toHaveText("3");

    for (const context of previewContexts) {
      await contextControl.getByRole("button", { name: context }).click();
      await expect(specimen.locator("[data-flow-preview-context]")).toHaveAttribute(
        "data-flow-preview-context",
        context.toLowerCase(),
      );
      await expect(stack).toHaveAttribute("data-gap", "m");
      await expect(stack).toHaveAttribute("data-align", "stretch");

      const geometry = await stackGeometry(stack);
      widths.push(geometry.width);
      expect(geometry.direction).toBe("column");
      expect(geometry.gap).toBe(24);
      expect(geometry.order).toEqual(["1", "2", "3"]);
      expect(geometry.outerStart).toBeCloseTo(0, 1);
      expect(geometry.outerEnd).toBeCloseTo(0, 1);
      expect(geometry.childMargins).toBe(0);
      expect(new Set(geometry.childHeights).size).toBeGreaterThan(1);
      expect(new Set(geometry.childWidths).size).toEqual(1);
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
    }

    expect(widths[0]).toBeLessThan(widths[1]);
    expect(widths[1]).toBeLessThan(widths[2]);

    const gapControl = specimen.getByRole("group", { name: "Stack gap" });
    for (const [label, expectedGap] of [["None", 0], ["S", 12], ["M", 24], ["L", 40]] as const) {
      await gapControl.getByRole("button", { name: label, exact: true }).click();
      expect((await stackGeometry(stack)).gap).toBe(expectedGap);
    }

    const alignControl = specimen.getByLabel("Stack align");
    for (const [value, expectedAlign] of [
      ["start", "flex-start"],
      ["center", "center"],
      ["end", "flex-end"],
      ["stretch", "stretch"],
    ] as const) {
      await alignControl.selectOption(value);
      await expect(stack).toHaveCSS("align-items", expectedAlign);
    }

    const edgeCases = specimen.locator("[data-stack-edge-cases]");
    await edgeCases.evaluate((element: HTMLDetailsElement) => { element.open = true; });
    await expect(edgeCases.locator('[data-stack-edge-case="empty"] > *')).toHaveCount(0);
    await expect(edgeCases.locator('[data-stack-edge-case="single"] > *')).toHaveCount(1);
    await expect(edgeCases.locator('[data-stack-edge-case="multiple"] > *')).toHaveCount(3);
    await expect(edgeCases.locator('[data-stack-edge-case="nested-outer"]')).toHaveCSS("row-gap", "24px");
    await expect(edgeCases.locator('[data-stack-edge-case="nested-inner"]')).toHaveCSS("row-gap", "12px");
    await expect(specimen.locator("[data-stack-composition]")).toHaveCount(2);
    await expect(specimen.locator('[data-stack-composition="form-group"] input')).toHaveCount(2);
  });

  test("proves Cluster intrinsic wrapping, DOM order and alignment variants", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/design-language/components/labs/layout/");

    const foundation = page.locator("[data-layout-foundation]");
    const specimen = foundation.locator('[data-layout-specimen="layout.cluster"]');
    const cluster = specimen.locator("[data-cluster-interactive]");
    const contextControl = foundation.getByRole("group", { name: "Layout preview width" });
    const lineCounts: number[] = [];
    const widths: number[] = [];

    await expect(specimen.locator('[data-flow-metric="dom-order"]')).toHaveText("1 → 2 → 3 → 4 → 5");

    for (const context of previewContexts) {
      await contextControl.getByRole("button", { name: context }).click();
      await expect(specimen.locator("[data-flow-preview-context]")).toHaveAttribute(
        "data-flow-preview-context",
        context.toLowerCase(),
      );
      await expect(cluster).toHaveAttribute("data-gap", "s");
      await expect(cluster).toHaveAttribute("data-align", "center");
      await expect(cluster).toHaveAttribute("data-justify", "start");

      const geometry = await clusterGeometry(cluster);
      lineCounts.push(geometry.lines);
      widths.push(geometry.width);
      expect(geometry.wrap).toBe("wrap");
      expect(geometry.gap).toBe(12);
      expect(geometry.order).toEqual(["1", "2", "3", "4", "5"]);
      expect(new Set(geometry.childHeights).size).toBeGreaterThan(1);
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
    }

    expect(lineCounts[0]).toBeGreaterThan(1);
    expect(lineCounts[2]).toBe(1);
    expect(widths[0]).toBeLessThan(widths[1]);
    expect(widths[1]).toBeLessThan(widths[2]);

    const gapControl = specimen.getByRole("group", { name: "Cluster gap" });
    for (const [label, expectedGap] of [["None", 0], ["S", 12], ["M", 24], ["L", 40]] as const) {
      await gapControl.getByRole("button", { name: label, exact: true }).click();
      expect((await clusterGeometry(cluster)).gap).toBe(expectedGap);
    }

    await specimen.getByLabel("Cluster align").selectOption("baseline");
    await expect(cluster).toHaveCSS("align-items", "baseline");
    await specimen.getByLabel("Cluster justify").selectOption("end");
    await expect(cluster).toHaveCSS("justify-content", "flex-end");

    const edgeCases = specimen.locator("[data-cluster-edge-cases]");
    await edgeCases.evaluate((element: HTMLDetailsElement) => { element.open = true; });
    await expect(edgeCases.locator('[data-cluster-edge-case="baseline"]')).toHaveCSS("align-items", "baseline");
    const rtl = edgeCases.locator('[data-cluster-edge-case="rtl"]');
    await expect(rtl).toHaveCSS("direction", "rtl");
    expect(
      await rtl.locator(":scope > *").evaluateAll((children) =>
        children.map((child) => child.getAttribute("data-cluster-item")),
      ),
    ).toEqual(["1", "2", "3", "4", "5"]);
    await expect(specimen.locator("[data-cluster-composition]")).toHaveCount(3);
  });

  test("proves Grid track count from parent width without partial-row stretching", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/design-language/components/labs/layout/");

    const specimen = page.locator('[data-layout-specimen="layout.grid"]');
    const grid = specimen.locator("[data-grid-interactive]");
    const range = specimen.getByLabel("Parent inline size");
    const itemControl = specimen.getByRole("group", { name: "Items" });

    await expect(specimen.locator('[data-intrinsic-metric="minimum"]')).toHaveText("compact · 160 px");
    await expect(specimen.locator('[data-intrinsic-metric="gap"]')).toHaveText("space-m · 24 px");

    for (const [width, columns] of [[343, 1], [344, 2], [711, 3], [712, 4], [896, 5]] as const) {
      await setRangeValue(range, width);
      await expect(specimen.locator('[data-intrinsic-metric="available"]')).toHaveText(`${width} px`);
      expect((await gridGeometry(grid)).columns).toBe(columns);
    }

    await setRangeValue(range, 420);
    await itemControl.getByRole("button", { name: "5", exact: true }).click();
    const incompleteRow = await gridGeometry(grid);
    expect(incompleteRow.columns).toBe(2);
    expect(incompleteRow.rows).toBe(3);
    expect(new Set(incompleteRow.childWidths).size).toBe(1);
    expect(incompleteRow.order).toEqual(["1", "2", "3", "4", "5"]);

    for (const [count, rows] of [[1, 1], [2, 1], [5, 3], [7, 4]] as const) {
      await itemControl.getByRole("button", { name: String(count), exact: true }).click();
      expect((await gridGeometry(grid)).rows).toBe(rows);
    }

    await setRangeValue(range, 900);
    await itemControl.getByRole("button", { name: "5", exact: true }).click();
    await specimen.getByLabel("Align").selectOption("start");
    const startAligned = await gridGeometry(grid);
    expect(startAligned.align).toBe("start");
    expect(new Set(startAligned.childHeights).size).toBeGreaterThan(1);

    const proof420 = specimen.locator('[data-parent-width="420"] [data-grid-parent-proof]');
    const proof900 = specimen.locator('[data-parent-width="900"] [data-grid-parent-proof]');
    expect((await gridGeometry(proof420)).columns).toBe(2);
    expect((await gridGeometry(proof900)).columns).toBe(5);

    const edgeCases = specimen.locator("[data-grid-edge-cases]");
    await edgeCases.evaluate((element: HTMLDetailsElement) => { element.open = true; });
    await expect(edgeCases.locator('[data-grid-edge-case="count-1"] [data-layout="grid"] > *')).toHaveCount(1);
    await expect(edgeCases.locator('[data-grid-edge-case="count-2"] [data-layout="grid"] > *')).toHaveCount(2);
    await expect(edgeCases.locator('[data-grid-edge-case="count-7"] [data-layout="grid"] > *')).toHaveCount(7);
    const rtlOrder = await edgeCases.locator('[data-grid-edge-case="rtl"] [data-layout="grid"] > *').evaluateAll(
      (children) => children.map((child) => child.getAttribute("data-grid-item")),
    );
    expect(rtlOrder).toEqual(["1", "2", "3", "4", "5"]);
  });

  test("proves Switcher all-row/all-column threshold and quantity contracts", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/design-language/components/labs/layout/");

    const specimen = page.locator('[data-layout-specimen="layout.switcher"]');
    const switcher = specimen.locator("[data-switcher-interactive]");
    const range = specimen.getByLabel("Parent inline size");

    await expect(specimen.locator('[data-intrinsic-metric="threshold"]')).toHaveText("standard · 704 px");
    await expect(switcher).toHaveCSS("flex-wrap", "wrap");

    for (const [width, rows, resolved] of [[703, 3, "column"], [704, 1, "row"], [705, 1, "row"]] as const) {
      await setRangeValue(range, width);
      await expect(specimen.locator('[data-intrinsic-metric="available"]')).toHaveText(`${width} px`);
      expect((await switcherGeometry(switcher)).rows).toBe(rows);
      await expect(specimen.locator('[data-intrinsic-metric="resolved"]')).toHaveText(resolved);
    }

    const proof420 = specimen.locator('[data-parent-width="420"] [data-switcher-parent-proof]');
    const proof900 = specimen.locator('[data-parent-width="900"] [data-switcher-parent-proof]');
    expect((await switcherGeometry(proof420)).rows).toBe(3);
    expect((await switcherGeometry(proof900)).rows).toBe(1);

    const edgeCases = specimen.locator("[data-switcher-edge-cases]");
    await edgeCases.evaluate((element: HTMLDetailsElement) => { element.open = true; });
    expect((await switcherGeometry(edgeCases.locator('[data-switcher-boundary="703"]'))).rows).toBe(3);
    expect((await switcherGeometry(edgeCases.locator('[data-switcher-boundary="704"]'))).rows).toBe(1);
    expect((await switcherGeometry(edgeCases.locator('[data-switcher-boundary="705"]'))).rows).toBe(1);
    expect((await switcherGeometry(edgeCases.locator('[data-switcher-limit="4"]'))).rows).toBe(1);
    expect((await switcherGeometry(edgeCases.locator('[data-switcher-limit="5"]'))).rows).toBe(5);

    await specimen.getByRole("group", { name: "Items" }).getByRole("button", { name: "5", exact: true }).click();
    await specimen.getByLabel("Limit").selectOption("4");
    await expect(specimen.locator('[data-intrinsic-metric="reason"]')).toHaveText("quantity limit");
    expect((await switcherGeometry(switcher)).rows).toBe(5);
  });

  test("proves Sidebar derived threshold, role order and full-row wrapping", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/design-language/components/labs/layout/");

    const specimen = page.locator('[data-layout-specimen="layout.sidebar"]');
    const sidebar = specimen.locator("[data-sidebar-interactive]");
    const range = specimen.getByLabel("Parent inline size");

    await expect(sidebar.locator(":scope > *")).toHaveCount(2);
    await expect(specimen.locator('[data-intrinsic-metric="side-target"]')).toHaveText("default · 224 px");
    await expect(specimen.locator('[data-intrinsic-metric="threshold"]')).toHaveText("≈ 496 px");

    await setRangeValue(range, 495);
    await expect(specimen.locator('[data-intrinsic-metric="state"]')).toHaveText("stacked");
    const stacked = await sidebarGeometry(sidebar);
    expect(stacked.rows).toBe(2);
    expect(stacked.childWidths.every((width) => Math.abs(width - stacked.width) <= 1)).toBe(true);

    await setRangeValue(range, 497);
    await expect(specimen.locator('[data-intrinsic-metric="state"]')).toHaveText("adjacent");
    expect((await sidebarGeometry(sidebar)).rows).toBe(1);

    await specimen.getByRole("group", { name: "Side" }).getByRole("button", { name: "end" }).click();
    const sideEnd = await sidebarGeometry(sidebar);
    expect(sideEnd.roles).toEqual(["content", "side"]);
    expect(sideEnd.order).toEqual(["0", "0"]);

    await setRangeValue(range, 600);
    await specimen.getByLabel("Content minimum").selectOption("two-thirds");
    await expect(specimen.locator('[data-intrinsic-metric="state"]')).toHaveText("stacked");
    await specimen.getByLabel("Content minimum").selectOption("half");
    await expect(specimen.locator('[data-intrinsic-metric="state"]')).toHaveText("adjacent");

    await specimen.getByLabel("Align").selectOption("start");
    await expect(sidebar).toHaveCSS("align-items", "flex-start");
    await specimen.getByLabel("Side width").selectOption("intrinsic");
    await expect(sidebar).toHaveAttribute("data-side-width", "intrinsic");

    const proof420 = specimen.locator('[data-parent-width="420"] [data-sidebar-parent-proof]');
    const proof900 = specimen.locator('[data-parent-width="900"] [data-sidebar-parent-proof]');
    expect((await sidebarGeometry(proof420)).rows).toBe(2);
    expect((await sidebarGeometry(proof900)).rows).toBe(1);

    const edgeCases = specimen.locator("[data-sidebar-edge-cases]");
    await edgeCases.evaluate((element: HTMLDetailsElement) => { element.open = true; });
    expect((await sidebarGeometry(edgeCases.locator('[data-sidebar-boundary="495"]'))).rows).toBe(2);
    expect((await sidebarGeometry(edgeCases.locator('[data-sidebar-boundary="497"]'))).rows).toBe(1);
    const rtl = edgeCases.locator('[data-sidebar-edge-case="two-thirds"] [data-layout="sidebar"]');
    await expect(rtl).toHaveCSS("direction", "rtl");
    expect((await sidebarGeometry(rtl)).roles).toEqual(["side", "content"]);
  });

  test("proves Cover positive-space centering and content-driven overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/design-language/components/labs/layout/");

    const specimen = page.locator('[data-layout-specimen="layout.cover"]');
    const cover = specimen.locator("[data-cover-interactive]");
    const metric = (id: string) => specimen.locator(`[data-media-layout-metric="${id}"]`);

    await expect(cover).toHaveAttribute("data-minimum", "standard");
    await expect(cover).toHaveAttribute("data-gap", "m");
    await expect(cover.locator(":scope > [data-cover-slot]")).toHaveCount(3);
    await expect(cover.locator(":scope > [data-cover-principal]")).toHaveCount(1);
    await expect(cover).toHaveCSS("row-gap", "24px");
    await expect(cover).toHaveCSS("padding-block-start", "16px");

    await expect(metric("minimum")).toHaveText("480 px");
    await expect(metric("used-block")).toHaveText("480 px");
    await expect(metric("slot-sizes")).toHaveText("32 / 96 / 24 px");
    await expect(metric("free-space")).toHaveText("248 px");
    await expect(metric("principal-margins")).toHaveText("124 / 124 px");
    await expect(metric("state")).toHaveText("centered");

    const blockRange = specimen.getByLabel("Available block size");
    await setRangeValue(blockRange, 640);
    await expect(metric("used-block")).toHaveText("640 px");
    await expect(metric("free-space")).toHaveText("408 px");
    await expect(metric("principal-margins")).toHaveText("204 / 204 px");

    await specimen.getByRole("button", { name: "Balanced" }).click();
    await expect(metric("state")).toHaveText("centered");

    await specimen.getByRole("button", { name: "Overflow" }).click();
    await setRangeValue(blockRange, 480);
    await expect(metric("used-block")).toHaveText("692 px");
    await expect(metric("free-space")).toHaveText("0 px");
    await expect(metric("principal-margins")).toHaveText("0 / 0 px");
    await expect(metric("state")).toHaveText("content-driven");
  });

  test("proves Frame ratio, fit and focal-point crop with one portrait source", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/design-language/components/labs/layout/");

    const specimen = page.locator('[data-layout-specimen="layout.frame"]');
    const frame = specimen.locator("[data-frame-interactive]");
    const metric = (id: string) => specimen.locator(`[data-media-layout-metric="${id}"]`);

    await setRangeValue(specimen.getByLabel("Parent target size"), 672);
    await expect(frame).toHaveAttribute("data-ratio", "wide");
    await expect(frame).toHaveAttribute("data-fit", "cover");
    await expect(frame).toHaveAttribute("data-position", "custom");
    await expect(metric("frame")).toHaveText("672 × 378 px");
    await expect(metric("ratio")).toHaveText("wide · 16:9");
    await expect(metric("source")).toHaveText("2160 × 3840 px");
    await expect(metric("position")).toHaveText("62% 38%");
    await expect(metric("crop")).toHaveText("block axis");
    await expect(frame.locator("img")).toHaveCSS("object-position", "62% 38%");

    await specimen.getByLabel("Ratio").selectOption("square");
    const squareBox = await frame.boundingBox();
    expect((squareBox?.width ?? 0) / (squareBox?.height ?? 1)).toBeCloseTo(1, 2);

    await specimen.getByRole("group", { name: "Fit" }).getByRole("button", { name: "Contain" }).click();
    await expect(metric("crop")).toHaveText("none");
    await expect(frame.locator("img")).toHaveCSS("object-fit", "contain");

    await specimen.getByRole("group", { name: "Position" }).getByRole("button", { name: "Center" }).click();
    await expect(frame).toHaveAttribute("data-position", "center");
    expect(await frame.evaluate((element) => element.style.length)).toBe(0);
    await expect(specimen.locator("[data-layout='frame']")).toHaveCount(7);

    for (const [id, expectedRatio] of [
      ["square-cover", 1],
      ["landscape-cover", 3 / 2],
      ["wide-cover", 16 / 9],
      ["wide-contain", 16 / 9],
      ["wide-focal", 16 / 9],
    ] as const) {
      const variantBox = await specimen.locator(`[data-frame-variant="${id}"]`).boundingBox();
      expect((variantBox?.width ?? 0) / (variantBox?.height ?? 1)).toBeCloseTo(expectedRatio, 2);
    }
  });

  test("proves Bleed named tracks, local full target and narrow convergence", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/design-language/components/labs/layout/");

    const specimen = page.locator('[data-layout-specimen="layout.bleed"]');
    const reading = specimen.locator("[data-bleed-context] [data-layout-context='reading']");
    const bleed = specimen.locator("[data-bleed-interactive]");
    const measure = specimen.locator("[data-reading-measure]");
    const metric = (id: string) => specimen.locator(`[data-media-layout-metric="${id}"]`);

    const columns = await reading.evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    expect(columns).toContain("[full-start]");
    expect(columns).toContain("[wide-start]");
    expect(columns).toContain("[measure-start]");

    const wideBox = await bleed.boundingBox();
    const measureBox = await measure.boundingBox();
    expect(wideBox?.width ?? 0).toBeGreaterThan(measureBox?.width ?? 0);
    await expect(metric("state")).toHaveText("capped");
    await expect(metric("root-overflow")).toHaveText("0 px");
    const startBleed = Number.parseFloat((await metric("start-bleed").textContent()) ?? "0");
    const endBleed = Number.parseFloat((await metric("end-bleed").textContent()) ?? "0");
    expect(startBleed).toBeCloseTo(endBleed, 1);

    await specimen.getByRole("group", { name: "Target" }).getByRole("button", { name: "Full" }).click();
    await expect(bleed).toHaveAttribute("data-target", "full");
    await expect(metric("state")).toHaveText("context-full");
    await expect(metric("target")).toHaveText("full · 1280 px");
    await expect(metric("root-overflow")).toHaveText("0 px");

    await specimen.getByRole("group", { name: "Target" }).getByRole("button", { name: "Wide" }).click();
    await setRangeValue(specimen.getByLabel("Context target size"), 360);
    await expect(metric("state")).toHaveText("converged");
    const narrowTarget = Number.parseFloat((await metric("target").textContent())?.split("·").at(-1) ?? "0");
    const narrowMeasure = Number.parseFloat((await metric("measure").textContent()) ?? "0");
    expect(narrowTarget).toBeCloseTo(narrowMeasure, 1);

    await specimen.getByRole("group", { name: "Direction" }).getByRole("button", { name: "RTL" }).click();
    await expect(reading).toHaveCSS("direction", "rtl");
    await expect(metric("root-overflow")).toHaveText("0 px");

    const fixedContexts = specimen.locator("[data-bleed-parent-proof] [data-bleed-fixed-context]");
    await expect(fixedContexts).toHaveCount(2);
    const fixedWidths = await fixedContexts.evaluateAll((contexts) =>
      contexts.map((context) => Math.round(context.getBoundingClientRect().width)),
    );
    expect(fixedWidths).toEqual([520, 1280]);
  });

  test("proves the complete Container 3 × 3 matrix", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/design-language/components/labs/layout/");

    const foundation = page.locator("[data-layout-foundation]");
    const contextControl = foundation.getByRole("group", { name: "Layout preview width" });
    const sizeControl = foundation.getByRole("group", { name: "Container size" });
    const sandbox = foundation.locator("[data-container-preview-context]");
    const container = foundation.locator("[data-container-interactive]");
    const matrix = new Map<string, Awaited<ReturnType<typeof containerGeometry>>>();

    await expect.poll(async () => {
      const value = await foundation.locator('[data-container-metric="preview"]').textContent();
      return Number.parseFloat(value ?? "0");
    }).toBeGreaterThan(0);

    for (const context of previewContexts) {
      await contextControl.getByRole("button", { name: context }).click();
      await expect(sandbox).toHaveAttribute("data-container-preview-context", context.toLowerCase());

      for (const size of containerSizes) {
        await sizeControl.getByRole("button", { name: size }).click();
        await expect(container).toHaveAttribute("data-size", size.toLowerCase());
        const expectedState = context === "Wide" ? "capped + centered" : "fluid";
        await expect(container).toHaveAttribute("data-container-state", expectedState);

        const geometry = await containerGeometry(sandbox, container);
        matrix.set(`${context}-${size}`, geometry);

        expect(geometry.outer).toBeLessThanOrEqual(geometry.preview + 0.5);
        expect(geometry.content).toBeGreaterThan(0);
        expect(geometry.gutterStart).toBeCloseTo(geometry.gutterEnd, 1);
        expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
        if (expectedState === "capped + centered") {
          expect(geometry.insetStart).toBeCloseTo(geometry.insetEnd, 0);
        }
      }
    }

    const narrowWidths = containerSizes.map((size) => matrix.get(`Narrow-${size}`)?.content ?? 0);
    expect(Math.max(...narrowWidths) - Math.min(...narrowWidths)).toBeLessThanOrEqual(1);

    const mediumWidths = containerSizes.map((size) => matrix.get(`Medium-${size}`)?.content ?? 0);
    expect(Math.max(...mediumWidths) - Math.min(...mediumWidths)).toBeLessThanOrEqual(1);

    const measureCap = matrix.get("Wide-Measure")?.content ?? 0;
    const contentCap = matrix.get("Wide-Content")?.content ?? 0;
    const wideCap = matrix.get("Wide-Wide")?.content ?? 0;
    expect(measureCap).toBeLessThan(contentCap);
    expect(contentCap).toBeLessThan(wideCap);

    const defaultGeometry = await containerGeometry(sandbox, container);
    await foundation.getByLabel("Default gutter").uncheck();
    await expect(container).toHaveAttribute("data-gutter", "none");
    const noGutterGeometry = await containerGeometry(sandbox, container);
    expect(noGutterGeometry.gutterStart).toBe(0);
    expect(noGutterGeometry.gutterEnd).toBe(0);
    expect(noGutterGeometry.content).toBeGreaterThan(defaultGeometry.content);
  });

  test("covers Container edge cases without changing runtime responsibility", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/design-language/components/labs/layout/");

    const foundation = page.locator("[data-layout-foundation]");
    const details = foundation.locator("[data-container-edge-cases]");
    await details.evaluate((element: HTMLDetailsElement) => { element.open = true; });
    await expect(details).toHaveJSProperty("open", true);

    const empty = details.locator('[data-container-edge-case="empty"]');
    await expect(empty).toHaveAttribute("data-size", "content");
    await expect(empty).toHaveAttribute("data-gutter", "default");
    await expect(details.locator('[data-container-edge-case="single"]')).toBeVisible();
    await expect(details.locator('[data-container-edge-case="multiple"] p')).toHaveCount(3);

    const rtl = details.locator('[data-container-edge-case="rtl"]');
    const rtlPadding = await rtl.evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.paddingInlineStart, style.paddingInlineEnd, style.containerType];
    });
    expect(rtlPadding[0]).toBe(rtlPadding[1]);
    expect(rtlPadding[2]).toBe("normal");

    const nestedOuter = details.locator('[data-container-edge-case="nested-outer"]');
    const nestedInner = details.locator('[data-container-edge-case="nested-inner"]');
    await expect(nestedInner).toHaveAttribute("data-gutter", "none");
    await expect(nestedInner).toHaveCSS("padding-inline-start", "0px");
    expect((await nestedInner.boundingBox())?.width ?? 0).toBeLessThanOrEqual(
      (await nestedOuter.boundingBox())?.width ?? 0,
    );

    for (const fixture of await details.locator("[data-container-edge-case]").all()) {
      const overflow = await fixture.evaluate((element) => ({
        client: element.clientWidth,
        scroll: element.scrollWidth,
      }));
      expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
    }

    const runtimeStyles = await empty.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundImage,
        border: style.borderTopWidth,
        containerType: style.containerType,
        paddingBlock: style.paddingBlockStart,
        radius: style.borderRadius,
        rowGap: style.rowGap,
      };
    });
    expect(runtimeStyles.background).toBe("none");
    expect(runtimeStyles.border).toBe("0px");
    expect(runtimeStyles.containerType).toBe("normal");
    expect(runtimeStyles.paddingBlock).toBe("0px");
    expect(runtimeStyles.radius).toBe("0px");
    expect(runtimeStyles.rowGap).toBe("normal");
  });

  test("keeps the layout workbench usable at 320 px and a 200% reflow equivalent", async ({ page }) => {
    for (const width of [320, 640]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/design-language/components/labs/layout/");
      const foundation = page.locator("[data-layout-foundation]");
      const container = foundation.locator("[data-container-interactive]");
      const sandbox = foundation.locator("[data-container-preview-context]");
      await expect(container).toBeVisible();
      const geometry = await containerGeometry(sandbox, container);
      expect(geometry.outer).toBeLessThanOrEqual(geometry.preview + 0.5);
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);

      for (const id of ["grid", "switcher", "sidebar"] as const) {
        const specimen = foundation.locator(`[data-layout-specimen="layout.${id}"]`);
        await expect(specimen).toBeVisible();
        const specimenGeometry = await specimen.evaluate((element) => ({
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }));
        expect(specimenGeometry.scrollWidth).toBeLessThanOrEqual(specimenGeometry.clientWidth);
      }

      const viewport = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
    }
  });

  test("uses the canonical Container on a production route", async ({ page }) => {
    const response = await page.goto("/__container-route-evidence__");
    expect(response?.status()).toBe(404);

    const routeContainer = page.locator(
      '[data-template="system"] [data-pattern="action-band"] [data-layout="container"]',
    );
    await expect(routeContainer).toBeVisible();
    await expect(routeContainer).toHaveAttribute("data-size", "wide");
    await expect(routeContainer).toHaveAttribute("data-gutter", "default");
  });
});
