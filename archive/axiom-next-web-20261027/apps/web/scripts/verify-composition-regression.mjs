import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl =
  process.env.DESIGN_LANGUAGE_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";
const routeUrl = `${baseUrl}/design-language/compositions/`;
const artifactDir =
  process.env.COMPOSITION_REGRESSION_ARTIFACT_DIR ??
  "/tmp/axiom-composition-regression";

const viewports = [
  { name: "compact", width: 390, height: 1200 },
  { name: "medium", width: 1024, height: 1100 },
  { name: "desktop", width: 1440, height: 1200 },
  { name: "wide", width: 1728, height: 1200 },
];

const expected = {
  compositionCards: 45,
  coverageRows: 16,
  coverageSourceCells: 16,
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertCount(page, selector, count, label) {
  const actual = await page.locator(selector).count();
  assert(actual === count, `${label}: expected ${count}, got ${actual}`);
}

async function waitForServer() {
  try {
    const response = await fetch(routeUrl, { signal: AbortSignal.timeout(8000) });
    assert(
      response.ok,
      `Compositions route returned ${response.status} ${response.statusText}`
    );
  } catch (error) {
    throw new Error(
      `Cannot reach ${routeUrl}. Start the Next dev server first. ${error.message}`
    );
  }
}

async function selectComposition(page, compositionId) {
  const detailButton = page.locator(
    `[data-testid="composition-detail-button"][data-composition-id="${compositionId}"]`
  );
  await detailButton.scrollIntoViewIfNeeded();
  await detailButton.click();

  const shell = page.locator(
    `[data-testid="composition-specimen-preview-shell"][data-composition-id="${compositionId}"]`
  );
  await shell.waitFor({ state: "visible" });
  await shell.scrollIntoViewIfNeeded();

  return shell;
}

async function selectSpecimen(page, kind) {
  const button = page
    .locator(`[data-testid="composition-specimen-button"][data-specimen-kind="${kind}"]`)
    .first();
  const count = await button.count();
  assert(count > 0, `Missing specimen button for ${kind}`);
  await button.click();
}

async function selectVisualContext(page, contextId) {
  const button = page
    .locator(
      `[data-testid="composition-visual-context-button"][data-visual-context-id="${contextId}"]`
    )
    .first();
  const count = await button.count();
  assert(count > 0, `Missing visual context button for ${contextId}`);
  await button.click();
}

async function verifyPageHero(page, viewportName) {
  const shell = await selectComposition(page, "composition.entry.pageHero");
  await selectSpecimen(page, "long-czech");
  await selectVisualContext(page, "paper");

  await page
    .locator(
      '[data-testid="composition-specimen-preview-shell"][data-specimen-context="paper"][data-specimen-mode="wide"]'
    )
    .waitFor({ state: "visible" });
  await page
    .locator(
      '[data-testid="composition-specimen-frame"][data-specimen-profile="long"]'
    )
    .waitFor({ state: "visible" });
  assert(
    (await page.locator('[data-testid="composition-specimen-slot"]').count()) > 0,
    "Page Hero specimen rendered no slots"
  );

  await shell.screenshot({
    path: path.join(artifactDir, `${viewportName}-page-hero-long-paper.png`),
  });
}

async function verifyLeadCaptureState(page, viewportName) {
  const shell = await selectComposition(page, "composition.conversion.leadCapture");
  await selectSpecimen(page, "state-success");

  await page
    .locator(
      '[data-testid="composition-specimen-frame"][data-specimen-mode="medium"]'
    )
    .waitFor({ state: "visible" });
  await page.getByText("Formulář byl odeslán.").waitFor({ state: "visible" });

  await shell.screenshot({
    path: path.join(artifactDir, `${viewportName}-lead-capture-success.png`),
  });
}

async function verifyMinimalHeader(page, viewportName) {
  const shell = await selectComposition(page, "composition.navigation.siteHeader");
  await selectSpecimen(page, "minimal");

  await page
    .locator(
      '[data-testid="composition-specimen-frame"][data-specimen-profile="minimal"]'
    )
    .waitFor({ state: "visible" });
  await page
    .locator('[data-testid="composition-specimen-frame"]')
    .getByText("PD", { exact: true })
    .waitFor({ state: "visible" });

  await shell.screenshot({
    path: path.join(artifactDir, `${viewportName}-site-header-minimal.png`),
  });
}

async function verifyDeepLink(page) {
  await page.goto(`${routeUrl}#composition.editorial.articleHeader`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle");
  await page
    .locator(
      '[data-testid="composition-specimen-preview-shell"][data-composition-id="composition.editorial.articleHeader"]'
    )
    .waitFor({ state: "visible" });
}

async function verifyViewport(browser, viewport) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const pageErrors = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(routeUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.getByRole("heading", { name: "Kompozice a patterny" }).waitFor({
    state: "visible",
  });
  await page.getByText("Live specimen renderer").waitFor({ state: "visible" });

  await assertCount(
    page,
    '[data-testid="composition-card"]',
    expected.compositionCards,
    `${viewport.name} composition cards`
  );
  await assertCount(
    page,
    '[data-testid="composition-coverage-row"]',
    expected.coverageRows,
    `${viewport.name} coverage rows`
  );
  await assertCount(
    page,
    '[data-testid="composition-coverage-source"]',
    expected.coverageSourceCells,
    `${viewport.name} coverage source manifests`
  );

  await page.screenshot({
    path: path.join(artifactDir, `${viewport.name}-overview.png`),
    fullPage: true,
  });

  await verifyDeepLink(page);
  await verifyPageHero(page, viewport.name);
  await verifyLeadCaptureState(page, viewport.name);
  await verifyMinimalHeader(page, viewport.name);

  assert(
    pageErrors.length === 0,
    `${viewport.name} page errors:\n${pageErrors.join("\n")}`
  );

  await page.close();
}

mkdirSync(artifactDir, { recursive: true });
await waitForServer();

const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    await verifyViewport(browser, viewport);
  }
} finally {
  await browser.close();
}

console.log("Composition regression matrix");
console.log(`Base URL: ${baseUrl}`);
console.log(`Viewports: ${viewports.length}`);
console.log(`Composition cards: ${expected.compositionCards}`);
console.log(`Coverage rows: ${expected.coverageRows}`);
console.log(`Source manifest cells: ${expected.coverageSourceCells}`);
console.log(`Artifacts: ${artifactDir}`);
