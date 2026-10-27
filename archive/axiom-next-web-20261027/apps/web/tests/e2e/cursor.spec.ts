import { expect, test, type Locator, type Page } from "@playwright/test";

const cursorFor = (page: Page) => page.locator("[data-custom-cursor]");

async function primeRejectedConsent(page: Page) {
  await page.addInitScript(() => {
    const decidedAt = Date.now();
    localStorage.setItem("cookie_consent_v1", JSON.stringify({
      choice: "rejected",
      decidedAt,
      expiresAt: decidedAt + 180 * 24 * 60 * 60 * 1_000,
      version: "2026-09-13-web-privacy-v2",
    }));
  });
}

async function dismissHomepageIntro(page: Page) {
  const intro = page.locator("[data-home-intro]");
  await intro.waitFor({ state: "attached" });
  await expect.poll(async () => {
    await page.keyboard.press("Escape");
    return intro.evaluate(
      (element) => getComputedStyle(element).display === "none",
    );
  }, { timeout: 20_000 }).toBe(true);
}

async function dismissCookieBanner(page: Page) {
  const banner = page.getByRole("region", { name: "Nastavení cookies" });
  if (!await banner.isVisible()) return;

  await banner.getByRole("button", { name: "Nesouhlasím" }).click();
  await expect(banner).toBeHidden();
}

async function openHomepage(page: Page) {
  await primeRejectedConsent(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await dismissCookieBanner(page);
  await dismissHomepageIntro(page);
}

async function expectCursorState(
  cursor: Locator,
  variant: string,
  surface?: string,
) {
  await expect(cursor).toHaveAttribute("data-cursor-variant", variant);
  if (surface) await expect(cursor).toHaveAttribute("data-cursor-surface", surface);
}

async function readCursorPosition(cursor: Locator, selector: string) {
  return cursor.evaluate((element, targetSelector) => {
    const target = element.querySelector<HTMLElement>(targetSelector);
    const matrix = new DOMMatrixReadOnly(
      target ? getComputedStyle(target).transform : "none",
    );
    return { x: matrix.m41, y: matrix.m42 };
  }, selector);
}

async function readTransformScale(cursor: Locator, selector: string) {
  return cursor.evaluate((element, targetSelector) => {
    const target = element.querySelector<HTMLElement>(targetSelector);
    const matrix = new DOMMatrixReadOnly(
      target ? getComputedStyle(target).transform : "none",
    );
    return { x: matrix.a, y: matrix.d };
  }, selector);
}

async function measureReticleRotationTravel(cursor: Locator, duration = 520) {
  return cursor.evaluate(async (element, sampleDuration) => {
    const shape = element.querySelector<HTMLElement>("[data-cursor-reticle]");
    if (!shape) return Number.POSITIVE_INFINITY;

    const readAngle = () => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(shape).transform);
      return Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
    };
    const shortestDelta = (current: number, next: number) =>
      ((next - current + 540) % 360) - 180;

    return new Promise<number>((resolve) => {
      const startedAt = performance.now();
      let previousAngle = readAngle();
      let totalTravel = 0;

      const sample = (now: number) => {
        const angle = readAngle();
        totalTravel += Math.abs(shortestDelta(previousAngle, angle));
        previousAngle = angle;
        if (now - startedAt < sampleDuration) {
          requestAnimationFrame(sample);
          return;
        }
        resolve(totalTravel);
      };

      requestAnimationFrame(sample);
    });
  }, duration);
}

async function readFieldEnvelope(cursor: Locator) {
  return cursor.evaluate((element) => {
    const rectangles = Array.from(
      element.querySelectorAll<HTMLElement>("[data-cursor-field-segment]"),
    ).map((segment) => segment.getBoundingClientRect());
    return {
      bottom: Math.max(...rectangles.map((rectangle) => rectangle.bottom)),
      left: Math.min(...rectangles.map((rectangle) => rectangle.left)),
      right: Math.max(...rectangles.map((rectangle) => rectangle.right)),
      top: Math.min(...rectangles.map((rectangle) => rectangle.top)),
    };
  });
}

async function expectFieldAroundTarget(cursor: Locator, target: Locator) {
  await expect.poll(async () => {
    const targetBox = await target.boundingBox();
    if (!targetBox) return Number.POSITIVE_INFINITY;
    const field = await readFieldEnvelope(cursor);
    return Math.max(
      Math.abs(field.left - (targetBox.x - 10)),
      Math.abs(field.top - (targetBox.y - 10)),
      Math.abs(field.right - (targetBox.x + targetBox.width + 10)),
      Math.abs(field.bottom - (targetBox.y + targetBox.height + 10)),
    );
  }).toBeLessThanOrEqual(1.25);
}

async function centerInViewport(target: Locator) {
  await target.evaluate((element) => {
    const rectangle = element.getBoundingClientRect();
    const scrollTop = window.scrollY + rectangle.top -
      (window.innerHeight - rectangle.height) / 2;
    if (window.__lenis?.scrollTo) {
      window.__lenis.scrollTo(scrollTop, { force: true, immediate: true });
    } else {
      window.scrollTo({ behavior: "instant", top: scrollTop });
    }
  });
}

async function waitForStableBox(target: Locator) {
  let previous: { height: number; width: number; x: number; y: number } | null = null;
  let stableSamples = 0;

  await expect.poll(async () => {
    const box = await target.boundingBox();
    if (!box) return 0;

    const drift = previous
      ? Math.max(
        Math.abs(box.x - previous.x),
        Math.abs(box.y - previous.y),
        Math.abs(box.width - previous.width),
        Math.abs(box.height - previous.height),
      )
      : Number.POSITIVE_INFINITY;
    stableSamples = drift <= 0.25 ? stableSamples + 1 : 0;
    previous = box;
    return stableSamples;
  }, { intervals: [100, 100, 100, 100], timeout: 10_000 })
    .toBeGreaterThanOrEqual(3);
}

async function movePointerToCenter(page: Page, target: Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error("Pointer target did not have a layout box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe("magnetic editorial cursor", () => {
  test("keeps all header navigation links stationary under pointer movement", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await primeRejectedConsent(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/clanky/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const navigation = page.locator("#public-site-navigation-panel");
    const links = navigation.locator("[data-navigation-drawer-link]");
    await expect(links).toHaveText(["Služby", "Jak pracuji", "Reference", "Kdo jsem", "Články"]);
    await waitForStableBox(navigation);
    await page.mouse.move(30, 300);
    const cursor = cursorFor(page);
    await expect(cursor).toHaveAttribute("data-cursor-visible", "true");
    const baseline = await links.evaluateAll((elements) => elements.map((element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    }));

    for (const [index, link] of (await links.all()).entries()) {
      await expect(link).toHaveAttribute("data-cursor-no-magnetic");
      const box = baseline[index];
      for (const fraction of [0.15, 0.5, 0.85]) {
        const [observed] = await Promise.all([
          navigation.evaluate(async (panel, initial) => {
            const targets = Array.from(panel.querySelectorAll<HTMLElement>("[data-navigation-drawer-link]"));
            let frames = 0;
            let maximumDrift = 0;
            let magneticWrites = 0;
            const startedAt = performance.now();
            return new Promise<{ frames: number; maximumDrift: number; magneticWrites: number }>((resolve) => {
              const sample = (now: number) => {
                frames += 1;
                targets.forEach((target, targetIndex) => {
                  const rect = target.getBoundingClientRect();
                  const original = initial[targetIndex];
                  maximumDrift = Math.max(maximumDrift,
                    Math.abs(rect.x - original.x), Math.abs(rect.y - original.y),
                    Math.abs(rect.width - original.width), Math.abs(rect.height - original.height));
                  if (target.dataset.cursorMagneticActive === "true" ||
                    target.style.getPropertyValue("--cursor-magnetic-x") !== "" ||
                    target.style.getPropertyValue("--cursor-magnetic-y") !== "") magneticWrites += 1;
                });
                if (now - startedAt < 240) requestAnimationFrame(sample);
                else resolve({ frames, maximumDrift, magneticWrites });
              };
              requestAnimationFrame(sample);
            });
          }, baseline),
          page.mouse.move(box.x + box.width * fraction, box.y + box.height / 2, { steps: 6 }),
        ]);
        expect(observed.frames).toBeGreaterThan(2);
        expect(observed.maximumDrift).toBeLessThanOrEqual(0.25);
        expect(observed.magneticWrites).toBe(0);
        expect(await link.evaluate((element) => element.matches(":hover"))).toBe(true);
      }
    }

    const action = page.locator("[data-header-overview]");
    await expect(action).not.toHaveAttribute("data-cursor-no-magnetic");
    expect(errors).toEqual([]);
  });

  test("hides the reticle without changing the magnetic CTA or click hand", async ({
    page,
  }) => {
    await openHomepage(page);

    const cursor = cursorFor(page);
    const reticle = cursor.locator("[data-cursor-reticle]");
    await expect(cursor).toHaveAttribute("data-cursor-reticle-enabled", "false");

    await page.mouse.move(1_000, 500);
    await expect(cursor).toHaveAttribute("data-cursor-icon", "arrow");
    await expect(reticle).toHaveCSS("visibility", "hidden");

    const action = page.locator('[data-analytics-placement="hero"]');
    await action.hover();
    await expect(cursor).toHaveAttribute("data-cursor-icon", "hand");
    await expect(cursor.locator("[data-cursor-click-hand]")).toBeVisible();
    await expect(reticle).toHaveCSS("visibility", "hidden");
    await expect(action).toHaveAttribute("data-cursor-magnetic-active", "true");

    const box = await action.boundingBox();
    if (!box) throw new Error("Hero CTA did not have a layout box");
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2);
    await expect.poll(async () => action.evaluate((element) => {
      const x = Number.parseFloat(
        (element as HTMLElement).style.getPropertyValue("--cursor-magnetic-x"),
      ) || 0;
      const y = Number.parseFloat(
        (element as HTMLElement).style.getPropertyValue("--cursor-magnetic-y"),
      ) || 0;
      return Math.hypot(x, y);
    })).toBeGreaterThan(0.5);
    await expect(reticle).toHaveCSS("visibility", "hidden");
  });

  test("morphs the precision arrow into a click hand through link, CTA and press states", async ({
    page,
  }) => {
    await openHomepage(page);

    const cursor = cursorFor(page);
    await expect(cursor).toHaveCount(1);
    await expect(cursor).toHaveAttribute("aria-hidden", "true");
    await expect(cursor).toHaveCSS("pointer-events", "none");

    await page.mouse.move(1_000, 500);
    await expectCursorState(cursor, "default", "dark");
    await expect(cursor).toHaveAttribute("data-cursor-visible", "true");
    await expect(page.locator("html")).toHaveClass(/custom-cursor-ready/u);

    const core = cursor.locator("[data-cursor-precision-core]");
    const field = cursor.locator("[data-cursor-field]");
    await expect(core).toHaveCSS("width", "52px");
    await expect(core).toHaveCSS("height", "52px");
    await expect(core).toHaveCSS("filter", "none");
    await expect(cursor.locator("[data-cursor-dot]")).toHaveCSS("opacity", "1");
    await expect(field).toHaveCSS("width", "0px");
    await expect(field).toHaveCSS("height", "0px");
    await expect(cursor).toHaveAttribute("data-cursor-icon", "arrow");
    await expect(cursor.locator("[data-cursor-arrow]")).toHaveCount(1);
    await expect(cursor.locator("[data-cursor-arrow-glint]")).toHaveCount(1);
    await expect(cursor.locator("[data-cursor-click-hand]")).toHaveCount(1);
    await expect(cursor.locator("[data-cursor-icon-content]")).toHaveCSS(
      "opacity",
      "0",
    );
    await expect(cursor.locator("[data-cursor-field-segment]")).toHaveCount(4);
    await expect(
      cursor.locator('[data-cursor-field-segment="north-west"]'),
    ).toHaveCSS("border-top-width", "2px");
    const passiveField = await readFieldEnvelope(cursor);
    expect(passiveField.right - passiveField.left).toBeCloseTo(66, 1);
    expect(passiveField.bottom - passiveField.top).toBeCloseTo(66, 1);
    await expect(core).toHaveCSS("opacity", "1");
    await expect(cursor.locator("[data-cursor-arrow]")).toHaveAttribute(
      "d",
      /^M13 13 /u,
    );
    const arrowTip = await core.evaluate((element) => {
      const matrix = (element as SVGSVGElement).getScreenCTM();
      if (!matrix) return null;
      const point = new DOMPoint(13, 13).matrixTransform(matrix);
      return { x: point.x, y: point.y };
    });
    expect(arrowTip).not.toBeNull();
    expect(Math.abs((arrowTip?.x ?? 0) - 1_000)).toBeLessThanOrEqual(0.75);
    expect(Math.abs((arrowTip?.y ?? 0) - 500)).toBeLessThanOrEqual(0.75);
    await expect(cursor.locator("[data-cursor-circular-text]")).toHaveCount(0);
    await expect(cursor.locator("[data-cursor-badge-layer]")).toHaveCount(0);

    const link = page.locator("[data-hero-secondary]");
    await link.hover();
    await expectCursorState(cursor, "action", "dark");
    await expect(cursor).toHaveAttribute("data-cursor-icon", "hand");
    await expect(cursor).toHaveAttribute(
      "data-cursor-shows-core-icon",
      "true",
    );
    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    await expect(cursor).toHaveAttribute("data-cursor-locked", "true");
    await expect(cursor).toHaveAttribute("data-cursor-split", "true");
    await expect(
      cursor.locator('[data-cursor-field-segment="north-west"]'),
    ).toHaveCSS("border-top-width", "2px");
    await expect(link).toHaveAttribute("data-cursor-magnetic-active", "true");
    await expect(core).toHaveCSS("opacity", "0");
    await expect(cursor.locator("[data-cursor-target-frame]")).toHaveCount(0);
    await expect(cursor.locator("[data-cursor-reticle]")).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(cursor.locator("[data-cursor-icon-content]")).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(cursor.locator("[data-cursor-icon-content]")).toHaveCSS(
      "scale",
      "1",
    );
    await expect(cursor.locator("[data-cursor-icon-content] svg"))
      .toHaveCount(1);
    await expect(cursor.locator("[data-cursor-click-hand]")).toBeVisible();
    await expect.poll(async () => {
      const corePosition = await readCursorPosition(cursor, "[data-cursor-dot]");
      const hand = await cursor.locator("[data-cursor-click-hand]").boundingBox();
      if (!hand) return Number.POSITIVE_INFINITY;
      return Math.max(
        Math.abs(hand.x + 14.7 - corePosition.x),
        Math.abs(hand.y + 3 - corePosition.y),
      );
    }).toBeLessThanOrEqual(0.75);
    const activeCoreScale = await readTransformScale(
      cursor,
      "[data-cursor-precision-core]",
    );
    expect(activeCoreScale.x).toBeCloseTo(1, 2);
    expect(activeCoreScale.y).toBeCloseTo(1, 2);
    const linkScale = await readTransformScale(cursor, "[data-cursor-field]");
    expect(linkScale.x).toBeCloseTo(1, 2);
    expect(linkScale.y).toBeCloseTo(1, 2);
    await expectFieldAroundTarget(cursor, link);

    const action = page.locator('[data-analytics-placement="hero"]');
    await action.hover();
    await expectCursorState(cursor, "action", "dark");
    await expect(cursor).toHaveAttribute("data-cursor-core-surface", "action");
    await expect(cursor).toHaveAttribute("data-cursor-icon", "hand");
    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    await expect(cursor).toHaveAttribute("data-cursor-locked", "true");
    await expect(cursor).toHaveAttribute("data-cursor-split", "true");
    await expect(cursor.locator("[data-cursor-click-hand]")).toBeVisible();
    await expect(cursor.locator("[data-cursor-field-segment]")).toHaveCount(4);
    await expect(cursor.locator("[data-cursor-reticle]")).toHaveCSS(
      "opacity",
      "1",
    );
    await expectFieldAroundTarget(cursor, action);

    await page.mouse.down();
    await expect(cursor).toHaveAttribute("data-cursor-pressed", "true");
    await expect.poll(() => field.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).scale),
    )).toBeCloseTo(0.975, 2);
    await page.mouse.move(1_000, 500);
    await page.mouse.up();
    await page.mouse.move(1_001, 501);
    await expect(cursor).toHaveAttribute("data-cursor-pressed", "false");
    await expect(cursor).toHaveAttribute("data-cursor-framed", "false");
    await expect(core).toHaveCSS("opacity", "1");
    await expect(cursor).toHaveAttribute("data-cursor-icon", "arrow");
    await expect(link).not.toHaveAttribute("data-cursor-magnetic-active", "true");
  });

  test("couples every interactive target while keeping the precision point exact", async ({
    page,
  }) => {
    await openHomepage(page);
    const cursor = cursorFor(page);
    const action = page.locator('[data-analytics-placement="hero"]');
    const box = await action.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const pointerX = box.x + box.width * 0.76;
    const pointerY = box.y + box.height * 0.68;
    await page.mouse.move(pointerX, pointerY);
    await expectCursorState(cursor, "action", "dark");
    await expect(cursor).toHaveAttribute("data-cursor-core-surface", "action");
    await expect(cursor).toHaveAttribute("data-cursor-locked", "true");

    const targetOffset = await action.evaluate((element) => ({
      x: Number.parseFloat(
        element.style.getPropertyValue("--cursor-magnetic-x") || "0",
      ),
      y: Number.parseFloat(
        element.style.getPropertyValue("--cursor-magnetic-y") || "0",
      ),
    }));
    const corePosition = await readCursorPosition(cursor, "[data-cursor-dot]");

    expect(targetOffset.x).toBeGreaterThan(0);
    expect(targetOffset.y).toBeGreaterThan(0);
    expect(Math.abs(targetOffset.x)).toBeLessThanOrEqual(3.5);
    expect(Math.abs(targetOffset.y)).toBeLessThanOrEqual(3.5);
    expect(Math.abs(corePosition.x - pointerX)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(corePosition.y - pointerY)).toBeLessThanOrEqual(0.5);

    const secondaryAction = page.locator("[data-hero-secondary]");
    await secondaryAction.hover();
    await expect(cursor).toHaveAttribute("data-cursor-locked", "true");
    await expect(secondaryAction)
      .toHaveAttribute("data-cursor-magnetic-active", "true");
    await expect.poll(() => action.evaluate(
      (element) => element.style.getPropertyValue("--cursor-magnetic-x"),
    )).toBe("");
  });

  test("keeps magnetic motion clear of clipping boundaries", async ({ page }) => {
    await openHomepage(page);
    await page.evaluate(() => {
      const clip = document.createElement("div");
      clip.id = "cursor-magnetic-clip-fixture";
      clip.style.cssText = [
        "position:fixed",
        "left:64px",
        "top:112px",
        "z-index:20000",
        "width:220px",
        "height:84px",
        "overflow:hidden",
        "background:var(--brand-ivory)",
      ].join(";");

      const target = document.createElement("button");
      target.id = "cursor-magnetic-clipped-target";
      target.dataset.cursor = "action";
      target.dataset.cursorMagnetic = "true";
      target.style.cssText = [
        "position:absolute",
        "left:0",
        "top:0",
        "width:172px",
        "height:52px",
      ].join(";");
      target.textContent = "Magnetic boundary";
      clip.append(target);
      document.body.append(clip);
    });

    const clip = page.locator("#cursor-magnetic-clip-fixture");
    const target = page.locator("#cursor-magnetic-clipped-target");
    await target.hover({ position: { x: 2, y: 2 } });
    await expect(target).toHaveAttribute("data-cursor-magnetic-active", "true");
    await expect.poll(() => target.evaluate((element) => ({
      x: Number.parseFloat(
        element.style.getPropertyValue("--cursor-magnetic-x") || "0",
      ),
      y: Number.parseFloat(
        element.style.getPropertyValue("--cursor-magnetic-y") || "0",
      ),
    }))).toEqual({ x: 0, y: 0 });

    await page.waitForTimeout(150);
    const clippedEdge = await Promise.all([
      clip.boundingBox(),
      target.boundingBox(),
    ]);
    expect(clippedEdge[0]).not.toBeNull();
    expect(clippedEdge[1]).not.toBeNull();
    if (!clippedEdge[0] || !clippedEdge[1]) return;
    expect(clippedEdge[1].x).toBeGreaterThanOrEqual(clippedEdge[0].x);
    expect(clippedEdge[1].y).toBeGreaterThanOrEqual(clippedEdge[0].y);

    await target.hover({ position: { x: 170, y: 50 } });
    await expect.poll(() => target.evaluate((element) => ({
      x: Number.parseFloat(
        element.style.getPropertyValue("--cursor-magnetic-x") || "0",
      ),
      y: Number.parseFloat(
        element.style.getPropertyValue("--cursor-magnetic-y") || "0",
      ),
    }))).toMatchObject({ x: 3.5, y: 1.44 });

    const processCta = page.locator("[data-process-cta]");
    const processActionRail = page.locator("[data-process-action-rail]");
    await centerInViewport(processCta);
    await processCta.hover({ position: { x: 2, y: 25 } });
    await expect(processActionRail).toHaveCSS("overflow", "visible");
    await expect.poll(() => processCta.evaluate((element) =>
      Number.parseFloat(
        element.style.getPropertyValue("--cursor-magnetic-x") || "0",
      )
    )).toBeLessThanOrEqual(0);
  });

  test("keeps every landing-page CTA magnetic after its scroll reveal", async ({
    page,
  }) => {
    await openHomepage(page);

    const ctas = [
      page.locator("[data-process-cta]"),
      page.locator("[data-references-conversion-action-rail]"),
      page.locator(
        '[data-home-module="final-action"] [data-cursor-magnetic]',
      ),
    ];

    for (const cta of ctas) {
      await centerInViewport(cta);
      await expect(cta).toBeVisible();
      const box = await cta.boundingBox();
      expect(box).not.toBeNull();
      if (!box) continue;

      await page.mouse.move(
        box.x + box.width - 8,
        box.y + box.height / 2,
      );

      await expect(cta).toHaveAttribute(
        "data-cursor-magnetic-active",
        "true",
      );
      await expect.poll(() => cta.evaluate((element) => {
        const [x = "0"] = getComputedStyle(element).translate.split(/\s+/u);
        return Number.parseFloat(x) || 0;
      })).toBeGreaterThan(0);
    }
  });

  test("keeps the click hand while the service cursor moves from disclosure to CTA", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await openHomepage(page);

    const cursor = cursorFor(page);
    const serviceItem = page.locator(
      '[data-situation-row="new-housing"]',
    );
    const serviceTrigger = page.locator(
      '[data-situation-choice="new-housing"]',
    );
    const serviceMarker = serviceItem.locator(
      "[data-situation-choice-marker]",
    );
    const serviceCta = serviceItem.locator(
      "[data-situation-panel-action]",
    );

    await serviceTrigger.scrollIntoViewIfNeeded();
    await serviceTrigger.hover({ position: { x: 420, y: 54 } });

    await expectCursorState(cursor, "link", "light");
    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    await expect(cursor).toHaveAttribute("data-cursor-locked", "true");
    await expect(cursor).toHaveAttribute("data-cursor-split", "true");
    await expect(serviceMarker).toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expect(cursor.locator("[data-cursor-precision-core]")).toHaveCSS(
      "opacity",
      "0",
    );
    await expect(cursor.locator("[data-cursor-icon-content]")).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(cursor.locator("[data-cursor-click-hand]")).toHaveCount(1);
    await expect(serviceItem).not.toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expect(serviceTrigger).not.toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expectFieldAroundTarget(cursor, serviceMarker);

    await serviceCta.evaluate((element) => {
      document.documentElement.dataset.serviceCtaTestClicks = "0";
      element.addEventListener("click", (event) => {
        event.preventDefault();
        const previousClicks = Number.parseInt(
          document.documentElement.dataset.serviceCtaTestClicks ?? "0",
          10,
        );
        document.documentElement.dataset.serviceCtaTestClicks = String(
          previousClicks + 1,
        );
      });
    });

    await serviceTrigger.click({ position: { x: 420, y: 54 } });
    await expect(serviceTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("html")).toHaveAttribute(
      "data-service-cta-test-clicks",
      "0",
    );
    await serviceTrigger.scrollIntoViewIfNeeded();
    await serviceTrigger.hover({ position: { x: 420, y: 54 } });
    await expectCursorState(cursor, "link", "light");
    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    await expect(cursor).toHaveAttribute("data-cursor-locked", "true");
    await expect(cursor).toHaveAttribute("data-cursor-split", "true");
    await expect(serviceMarker).toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expect(serviceCta).not.toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expect(cursor.locator("[data-cursor-precision-core]")).toHaveCSS(
      "opacity",
      "0",
    );
    await expectFieldAroundTarget(cursor, serviceMarker);

    await serviceTrigger.click({ position: { x: 420, y: 54 } });
    await expect(serviceTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("html")).toHaveAttribute(
      "data-service-cta-test-clicks",
      "0",
    );

    await serviceTrigger.click({ position: { x: 420, y: 54 } });
    await expect(serviceTrigger).toHaveAttribute("aria-expanded", "true");

    const firstTopic = serviceItem.locator("[data-situation-topic-ink]").first();
    await waitForStableBox(serviceItem);
    await centerInViewport(serviceItem);
    await firstTopic.hover();
    await expectCursorState(cursor, "action", "light");
    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    await expect(cursor).toHaveAttribute("data-cursor-locked", "true");
    await expect(serviceCta).toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expect(serviceMarker).not.toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expectFieldAroundTarget(cursor, serviceCta);

    await firstTopic.click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-service-cta-test-clicks",
      "1",
    );

    await serviceTrigger.focus();
    await page.keyboard.press("Enter");
    await expect(serviceTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("html")).toHaveAttribute(
      "data-service-cta-test-clicks",
      "1",
    );
  });

  test("keeps link framing through a calm exit zone before releasing", async ({
    page,
  }) => {
    await openHomepage(page);

    const cursor = cursorFor(page);
    const link = page.locator("[data-hero-secondary]");
    const box = await link.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    await link.evaluate((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        const clickCount = Number(element.dataset.cursorTestClicks ?? "0");
        element.dataset.cursorTestClicks = String(clickCount + 1);
      });
    });

    await page.mouse.move(
      box.x + box.width / 2,
      box.y + box.height / 2,
    );
    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    await expect(link.locator("[data-cursor-interaction-zone]")).toHaveCount(1);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(link).toHaveAttribute("data-cursor-test-clicks", "1");

    await page.mouse.move(box.x + box.width + 12, box.y + box.height / 2);
    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    await expect(link).toHaveAttribute("data-cursor-magnetic-active", "true");
    await expect.poll(() => link.evaluate((element) => ({
      hovered: element.matches(":hover"),
      underlined: getComputedStyle(element).textDecorationLine.includes(
        "underline",
      ),
      variant: element.dataset.variant,
    }))).toEqual({
      hovered: true,
      underlined: false,
      variant: "secondary-action",
    });
    await page.mouse.click(box.x + box.width + 12, box.y + box.height / 2);
    await expect(link).toHaveAttribute("data-cursor-test-clicks", "2");
    await expect(link).toBeFocused();

    await page.mouse.move(box.x + box.width + 24, box.y + box.height / 2);
    await expect(cursor).toHaveAttribute("data-cursor-framed", "false");
    await expect(link.locator("[data-cursor-interaction-zone]")).toHaveCount(0);
    await page.mouse.click(box.x + box.width + 24, box.y + box.height / 2);
    await expect(link).toHaveAttribute("data-cursor-test-clicks", "2");
    await expect(link).not.toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
  });

  test("eases the frame onto a new hover target revealed by scrolling", async ({
    page,
  }) => {
    await openHomepage(page);

    await page.evaluate(() => {
      const initialTop = window.scrollY + 260;
      const createScrollTarget = (
        id: string,
        top: number,
        markerSide: "left" | "right",
      ) => {
        const owner = document.createElement("button");
        owner.id = id;
        owner.dataset.cursor = "link";
        owner.dataset.cursorFrameTarget = "[data-scroll-cursor-marker]";
        owner.dataset.cursorSplitCore = "";
        owner.dataset.cursorSurface = "light";
        owner.style.cssText = [
          "position:absolute",
          "left:80px",
          `top:${top}px`,
          "z-index:20000",
          "width:calc(100vw - 160px)",
          "height:100px",
          "border:0",
          "background:var(--brand-ivory)",
        ].join(";");

        const marker = document.createElement("span");
        marker.dataset.scrollCursorMarker = "";
        marker.style.cssText = [
          "position:absolute",
          "top:32px",
          `${markerSide}:24px`,
          "width:36px",
          "height:36px",
        ].join(";");
        owner.append(marker);
        document.body.append(owner);
      };

      createScrollTarget("scroll-cursor-target-a", initialTop, "right");
      createScrollTarget("scroll-cursor-target-b", initialTop + 220, "left");
    });

    const cursor = cursorFor(page);
    const firstOwner = page.locator("#scroll-cursor-target-a");
    const firstMarker = firstOwner.locator("[data-scroll-cursor-marker]");
    const secondOwner = page.locator("#scroll-cursor-target-b");
    const secondMarker = secondOwner.locator("[data-scroll-cursor-marker]");

    await page.mouse.move(700, 310);
    await expect(firstMarker).toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expectFieldAroundTarget(cursor, firstMarker);

    const transition = await page.evaluate(async () => {
      const cursorElement = document.querySelector<HTMLElement>(
        "[data-custom-cursor]",
      );
      const follower = cursorElement?.querySelector<HTMLElement>(
        "[data-cursor-follower]",
      );
      const first = document.querySelector<HTMLElement>(
        "#scroll-cursor-target-a [data-scroll-cursor-marker]",
      );
      const second = document.querySelector<HTMLElement>(
        "#scroll-cursor-target-b [data-scroll-cursor-marker]",
      );
      if (!follower || !first || !second) {
        throw new Error("Scroll cursor fixtures did not mount");
      }

      const readX = () => new DOMMatrixReadOnly(
        getComputedStyle(follower).transform,
      ).m41;
      const startX = readX();
      const scrollTop = window.scrollY + 220;
      if (window.__lenis?.scrollTo) {
        window.__lenis.scrollTo(scrollTop, { force: true, immediate: true });
      } else {
        window.scrollTo({ behavior: "instant", top: scrollTop });
      }

      type TransitionSample = {
        active: boolean;
        at: number;
        targetX: number;
        x: number;
      };
      return new Promise<{
        samples: TransitionSample[];
        startX: number;
      }>((resolve) => {
        const samples: TransitionSample[] = [];
        const startedAt = performance.now();
        const sample = (now: number) => {
          const targetRect = second.getBoundingClientRect();
          samples.push({
            active: second.dataset.cursorMagneticActive === "true",
            at: now - startedAt,
            targetX: targetRect.left + targetRect.width / 2,
            x: readX(),
          });
          if (now - startedAt < 700) {
            requestAnimationFrame(sample);
            return;
          }
          resolve({ samples, startX });
        };
        requestAnimationFrame(sample);
      });
    });

    const activeSamples = transition.samples.filter((sample) => sample.active);
    expect(activeSamples.length).toBeGreaterThan(5);
    const targetX = activeSamples.at(-1)?.targetX ?? 0;
    const totalTravel = Math.abs(targetX - transition.startX);
    expect(totalTravel).toBeGreaterThan(500);
    expect(Math.abs(activeSamples[0].x - targetX))
      .toBeGreaterThan(totalTravel * 0.2);

    const frameSteps = transition.samples.slice(1).map((sample, index) =>
      Math.abs(sample.x - transition.samples[index].x)
    );
    expect(Math.max(...frameSteps)).toBeLessThan(totalTravel * 0.6);
    expect(Math.abs((activeSamples.at(-1)?.x ?? 0) - targetX))
      .toBeLessThanOrEqual(1.5);
    await expect(secondMarker).toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expect(firstMarker).not.toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expectFieldAroundTarget(cursor, secondMarker);
  });

  test("waits to frame an offscreen target until it is fully inside the viewport", async ({
    page,
  }) => {
    await openHomepage(page);

    await page.evaluate(() => {
      const owner = document.createElement("button");
      owner.id = "offscreen-cursor-owner";
      owner.dataset.cursor = "action";
      owner.dataset.cursorFrameTarget = "[data-offscreen-cursor-target]";
      owner.dataset.cursorSplitCore = "";
      owner.dataset.cursorSurface = "light";
      owner.style.cssText = [
        "position:absolute",
        "left:0",
        `top:${window.scrollY + 80}px`,
        "z-index:20000",
        "width:100vw",
        `height:${window.innerHeight * 2 + 600}px`,
        "border:0",
        "background:rgba(255,255,255,0.01)",
      ].join(";");

      const target = document.createElement("span");
      target.dataset.offscreenCursorTarget = "";
      target.style.cssText = [
        "position:absolute",
        "left:70vw",
        `top:${window.innerHeight + 260}px`,
        "width:220px",
        "height:56px",
      ].join(";");
      owner.append(target);
      document.body.append(owner);
    });

    const cursor = cursorFor(page);
    const target = page.locator("[data-offscreen-cursor-target]");
    const pointer = { x: 320, y: 260 };
    await page.mouse.move(pointer.x, pointer.y);

    await expectCursorState(cursor, "action", "light");
    await expect(cursor).toHaveAttribute("data-cursor-visible", "true");
    await expect(cursor).toHaveAttribute("data-cursor-framed", "false");
    await expect(target).not.toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );

    await page.evaluate(() => {
      const scrollTop = window.innerHeight;
      if (window.__lenis?.scrollTo) {
        window.__lenis.scrollTo(scrollTop, { force: true, immediate: true });
      } else {
        window.scrollTo({ behavior: "instant", top: scrollTop });
      }
    });

    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    await expect(target).toHaveAttribute("data-cursor-magnetic-active", "true");
    await expectFieldAroundTarget(cursor, target);

    await page.evaluate(() => {
      if (window.__lenis?.scrollTo) {
        window.__lenis.scrollTo(0, { force: true, immediate: true });
      } else {
        window.scrollTo({ behavior: "instant", top: 0 });
      }
    });

    await expect(cursor).toHaveAttribute("data-cursor-framed", "false");
    await expect(target).not.toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expect.poll(async () => {
      const position = await readCursorPosition(
        cursor,
        "[data-cursor-follower]",
      );
      return Math.hypot(position.x - pointer.x, position.y - pointer.y);
    }).toBeLessThanOrEqual(1.5);
  });

  test("keeps a crisp contrast pair across semantic surfaces", async ({
    page,
  }) => {
    await openHomepage(page);
    await page.evaluate(() => {
      const surfaces = ["dark", "light", "action"] as const;
      surfaces.forEach((surface, index) => {
        const owner = document.createElement("div");
        owner.id = `cursor-surface-owner-${surface}`;
        owner.dataset.cursorSurface = surface;
        owner.style.cssText = [
          "position:fixed",
          `left:${20 + index * 120}px`,
          "top:120px",
          "z-index:20000",
          "box-sizing:border-box",
          "width:104px",
          "height:104px",
          "padding:10px",
          `background:${surface === "light"
            ? "var(--brand-ivory)"
            : surface === "action"
              ? "var(--brand-lime)"
              : "var(--brand-jet)"}`,
        ].join(";");
        const button = document.createElement("button");
        button.id = `cursor-surface-${surface}`;
        button.dataset.cursor = "link";
        button.style.cssText = "width:84px;height:48px";
        button.textContent = surface;
        owner.append(button);
        document.body.append(owner);
      });

      const unannotated = document.createElement("button");
      unannotated.id = "cursor-surface-unannotated";
      unannotated.dataset.cursor = "link";
      unannotated.style.cssText = [
        "position:fixed",
        "left:390px",
        "top:120px",
        "z-index:20000",
        "width:110px",
        "height:48px",
        "background:white",
      ].join(";");
      unannotated.textContent = "fallback";
      document.body.append(unannotated);
    });

    const cursor = cursorFor(page);
    const expectedContrastPairs = {
      action: {
        ink: "rgb(2, 44, 18)",
        keyline: "rgb(203, 236, 16)",
      },
      dark: {
        ink: "rgb(203, 236, 16)",
        keyline: "rgb(2, 44, 18)",
      },
      light: {
        ink: "rgb(17, 110, 28)",
        keyline: "rgb(246, 244, 232)",
      },
    } as const;

    for (const surface of ["dark", "light", "action"] as const) {
      await page.locator(`#cursor-surface-${surface}`).hover();
      await expectCursorState(cursor, "link", surface);
      await expect(cursor).toHaveAttribute("data-cursor-core-surface", surface);
      await expect.poll(() => cursor.evaluate((element) => ({
        ink: getComputedStyle(
          element.querySelector<SVGPathElement>(
            "[data-cursor-click-hand] path:first-child",
          )!,
        ).stroke,
        keyline: getComputedStyle(
          element.querySelector<SVGPathElement>(
            "[data-cursor-click-hand] path:first-child",
          )!,
        ).fill,
      }))).toEqual(expectedContrastPairs[surface]);
    }

    const lightButton = page.locator("#cursor-surface-light");
    await lightButton.hover();
    const primaryCorner = cursor.locator(
      '[data-cursor-field-segment="north-west"]',
    );
    await expect(primaryCorner).toHaveCSS("opacity", "1");
    await expect(primaryCorner).toHaveCSS("border-top-width", "2px");

    const adaptiveComposition = await cursor.evaluate((element) => ({
      core: getComputedStyle(
        element.querySelector<HTMLElement>("[data-cursor-precision-core]")!,
      ).filter,
      handStroke: getComputedStyle(
        element.querySelector<SVGPathElement>(
          "[data-cursor-click-hand] path:first-child",
        )!,
      ).strokeWidth,
      handStrokeBlend: getComputedStyle(
        element.querySelector<SVGPathElement>(
          "[data-cursor-click-hand] path:first-child",
        )!,
      ).mixBlendMode,
      field: getComputedStyle(
        element.querySelector<HTMLElement>(
          '[data-cursor-field-segment="north-west"]',
        )!,
      ).filter,
      rootBlend: getComputedStyle(element).mixBlendMode,
    }));
    expect(adaptiveComposition).toMatchObject({
      core: "none",
      handStroke: "1.8px",
      handStrokeBlend: "normal",
      field: "none",
      rootBlend: "normal",
    });

    const actionButton = page.locator("#cursor-surface-action");
    await actionButton.hover();
    await expectCursorState(cursor, "link", "action");
    await expect(cursor).toHaveAttribute("data-cursor-core-surface", "action");
    await expect(cursor).toHaveCSS("mix-blend-mode", "normal");

    const lightOwnerBox = await page
      .locator("#cursor-surface-owner-light")
      .boundingBox();
    expect(lightOwnerBox).not.toBeNull();
    if (lightOwnerBox) {
      await page.mouse.move(
        lightOwnerBox.x + 3,
        lightOwnerBox.y + lightOwnerBox.height - 3,
      );
      await expectCursorState(cursor, "default", "light");
      await expect(cursor.locator("[data-cursor-reticle]")).toHaveCSS(
        "opacity",
        "1",
      );
      await expect.poll(() => cursor.evaluate((element) => {
        const anchor = element.querySelector<SVGElement>(
          "[data-cursor-core-anchor]",
        );
        return {
          fill: anchor ? getComputedStyle(anchor).fill : "",
          mixBlendMode: anchor
            ? getComputedStyle(anchor).mixBlendMode
            : "",
        };
      })).toMatchObject({
        fill: "rgb(17, 110, 28)",
        mixBlendMode: "normal",
      });
    }

    await page.locator("#cursor-surface-unannotated").hover();
    await expectCursorState(cursor, "link", "dark");
  });

  test("frames only the explicit homepage article CTA", async ({
    page,
  }) => {
    await openHomepage(page);

    const cursor = cursorFor(page);
    const article = page.locator('[data-home-article-role="primary"]');
    const articleLink = article.locator('[data-cursor-no-frame="true"]');
    const articleMedia = article.locator("[data-cursor-media]");
    const articleCopy = article.locator("[data-home-article-copy-reveal]");
    const articleAction = article.locator("[data-home-article-action]");
    await articleLink.scrollIntoViewIfNeeded();
    await centerInViewport(articleMedia);
    await articleMedia.hover();

    await expectCursorState(cursor, "article", "dark");
    await expect(cursor).toHaveAttribute("data-cursor-icon", "hand");
    await expect(cursor).toHaveAttribute("data-cursor-framed", "false");
    await expect(cursor).toHaveAttribute("data-cursor-locked", "false");
    await expect(articleMedia).not.toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );

    await centerInViewport(articleAction);
    await articleAction.hover();
    await expectCursorState(cursor, "article", "dark");
    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    await expect(cursor).toHaveAttribute("data-cursor-locked", "true");
    await expect(articleAction).toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expectFieldAroundTarget(cursor, articleAction);
    await expect(articleAction).toContainText("Číst článek");
    const actionBox = await articleAction.boundingBox();
    expect(actionBox?.height).toBeGreaterThanOrEqual(44);

    await articleCopy.locator("h3").hover();
    await expect(cursor).toHaveAttribute("data-cursor-framed", "false");
    await expect(cursor).toHaveAttribute("data-cursor-locked", "false");
    await expect(articleAction).not.toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );

    await expect(articleLink).toHaveAttribute("data-cursor-no-frame", "true");
    await expect(articleLink).toHaveAttribute(
      "data-cursor-no-magnetic",
      "true",
    );
    await expect(articleLink).not.toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expect(page.locator("[data-home-article-action]")).toHaveCount(3);
  });

  test("uses the click hand over interactive evidence cards", async ({
    page,
  }) => {
    await openHomepage(page);

    const cursor = cursorFor(page);
    const evidence = page.locator('[data-home-module="evidence"]');
    const cnbCard = evidence.locator('[data-evidence-row-link]').first();
    const examsCard = evidence.locator('[data-evidence-row="exams"]');
    const examsHeading = examsCard.getByRole("heading", { level: 3 });
    const certificate = evidence.locator('[data-evidence-certificate]').first();
    const precisionCore = cursor.locator("[data-cursor-precision-core]");
    const hand = cursor.locator("[data-cursor-click-hand]");
    const icon = cursor.locator("[data-cursor-icon-content]");

    await centerInViewport(cnbCard);
    await cnbCard.hover();
    await expectCursorState(cursor, "external", "light");
    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    await expect(cursor).toHaveAttribute("data-cursor-split", "true");
    await expect(cursor).toHaveAttribute(
      "data-cursor-shows-core-icon",
      "true",
    );
    await expect(precisionCore).toHaveCSS("opacity", "0");
    await expect(icon).toHaveCSS("opacity", "1");
    await expect(hand).toBeVisible();
    await expectFieldAroundTarget(cursor, cnbCard);

    await examsHeading.hover();
    await expectCursorState(cursor, "default", "light");
    await expect(cursor).toHaveAttribute("data-cursor-framed", "false");
    await expect(cursor).toHaveAttribute("data-cursor-split", "false");
    await expect(precisionCore).toHaveCSS("opacity", "1");
    await expect(cursor).toHaveAttribute("data-cursor-icon", "arrow");
    await expect(icon).toHaveCSS("opacity", "0");

    await centerInViewport(certificate);
    await certificate.hover();
    await expectCursorState(cursor, "external", "light");
    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    await expect(cursor).toHaveAttribute("data-cursor-split", "true");
    await expect(precisionCore).toHaveCSS("opacity", "0");
    await expect(icon).toHaveCSS("opacity", "1");
    await expect(hand).toBeVisible();
    await expectFieldAroundTarget(cursor, certificate);
  });

  test("keeps the click hand visible while framing the Google CTA", async ({
    page,
  }) => {
    await openHomepage(page);

    const cursor = cursorFor(page);
    const card = page.locator("[data-reference-card]").first();
    const quote = card.locator("blockquote");
    const sourceLink = card.locator("[data-testimonial-source]");

    await centerInViewport(quote);
    await page.waitForTimeout(700);
    await quote.hover();
    await expectCursorState(cursor, "external", "light");
    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    await expect(cursor).toHaveAttribute("data-cursor-split", "true");
    await expect(cursor).toHaveAttribute(
      "data-cursor-shows-core-icon",
      "true",
    );
    await expect(cursor.locator("[data-cursor-precision-core]")).toHaveCSS(
      "opacity",
      "0",
    );
    await expect(cursor.locator("[data-cursor-icon-content]")).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(cursor.locator("[data-cursor-icon-content]")).not.toHaveAttribute(
      "data-cursor-icon-kind",
      /.+/u,
    );
    await expect(cursor.locator("[data-cursor-icon-content] [data-cursor-icon-source]"))
      .toHaveCount(0);
    await expect(cursor.locator("[data-cursor-click-hand]")).toBeVisible();
    await expect.poll(async () => {
      const corePosition = await readCursorPosition(cursor, "[data-cursor-dot]");
      const iconBox = await cursor.locator(
        "[data-cursor-click-hand]",
      ).boundingBox();
      if (!iconBox) return Number.POSITIVE_INFINITY;

      return Math.max(
        Math.abs(iconBox.x + 14.7 - corePosition.x),
        Math.abs(iconBox.y + 3 - corePosition.y),
      );
    }).toBeLessThanOrEqual(0.75);
    await expect(sourceLink).toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expect(card).not.toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expectFieldAroundTarget(cursor, sourceLink);
    await expect(sourceLink.locator("[data-google-review-logo] img"))
      .toHaveCount(1);
    const sourceLinkBox = await sourceLink.boundingBox();
    expect(sourceLinkBox?.height).toBeGreaterThanOrEqual(44);
    await expect(sourceLink).not.toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );

    await sourceLink.evaluate((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        document.documentElement.dataset.referenceCardTestClick = "true";
      }, { once: true });
    });
    await quote.click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-reference-card-test-click",
      "true",
    );
  });

  test("keeps the entire expanded FAQ item active while framing only its indicator", async ({
    page,
  }) => {
    await openHomepage(page);

    const cursor = cursorFor(page);
    const trigger = page.getByRole("button", {
      name: "Je první kontakt nezávazný?",
    });
    const item = trigger.locator("..");
    const question = trigger.locator("[data-home-faq-question]");
    const indicator = trigger.locator("[data-home-faq-indicator]");
    const answer = item.locator("[data-home-faq-answer]");

    await page.mouse.move(1_000, 500);
    await expect(cursor).toHaveCount(1);
    await centerInViewport(trigger);
    await question.hover();

    await expectCursorState(cursor, "link", "light");
    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    await expect(cursor).toHaveAttribute("data-cursor-locked", "true");
    await expect(cursor).toHaveAttribute("data-cursor-split", "true");
    await expect(indicator).toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expect(trigger).not.toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expectFieldAroundTarget(cursor, indicator);

    await question.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(answer).toBeVisible();
    await page.waitForTimeout(260);
    await movePointerToCenter(page, answer);

    await expectCursorState(cursor, "link", "light");
    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    await expect(cursor).toHaveAttribute("data-cursor-locked", "true");
    await expect(cursor).toHaveAttribute("data-cursor-split", "true");
    await expect(cursor.locator("[data-cursor-precision-core]")).toHaveCSS(
      "opacity",
      "0",
    );
    await expect(cursor.locator("[data-cursor-icon-content]")).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(indicator).toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expect(item).not.toHaveAttribute(
      "data-cursor-magnetic-active",
      "true",
    );
    await expectFieldAroundTarget(cursor, indicator);
    const answerBox = await answer.boundingBox();
    const corePosition = await readCursorPosition(cursor, "[data-cursor-dot]");
    expect(answerBox).not.toBeNull();
    if (!answerBox) throw new Error("FAQ answer did not have a layout box");
    expect(corePosition.x).toBeCloseTo(answerBox.x + answerBox.width / 2, 0);
    expect(corePosition.y).toBeCloseTo(answerBox.y + answerBox.height / 2, 0);

    await answer.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(answer).not.toBeVisible();
  });

  test("keeps the frame attached to the bottom FAQ indicator while it collapses", async ({
    page,
  }) => {
    await openHomepage(page);

    const cursor = cursorFor(page);
    const trigger = page.getByRole("button", {
      name: "Může první kontakt proběhnout online nebo osobně?",
    });
    const item = trigger.locator("..");
    const indicator = trigger.locator("[data-home-faq-indicator]");
    const answer = item.locator("[data-home-faq-answer]");

    await centerInViewport(trigger);
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(answer).toBeVisible();
    await page.waitForTimeout(260);
    await movePointerToCenter(page, answer);
    await expectFieldAroundTarget(cursor, indicator);

    await page.evaluate(() => {
      type FrameSample = { error: number; framed: boolean };
      const samples: FrameSample[] = [];
      const cursorElement = document.querySelector<HTMLElement>(
        "[data-custom-cursor]",
      );
      const target = document.querySelector<HTMLElement>(
        '[data-home-faq-item="online"] [data-home-faq-indicator]',
      );
      const startedAt = performance.now();

      const sample = (now: number) => {
        if (!cursorElement || !target) return;
        const segments = Array.from(
          cursorElement.querySelectorAll<HTMLElement>(
            "[data-cursor-field-segment]",
          ),
        ).map((segment) => segment.getBoundingClientRect());
        const targetRect = target.getBoundingClientRect();
        const framed = cursorElement.dataset.cursorFramed === "true";
        const field = {
          bottom: Math.max(...segments.map((rect) => rect.bottom)),
          left: Math.min(...segments.map((rect) => rect.left)),
          right: Math.max(...segments.map((rect) => rect.right)),
          top: Math.min(...segments.map((rect) => rect.top)),
        };
        samples.push({
          error: Math.max(
            Math.abs(field.left - (targetRect.left - 10)),
            Math.abs(field.top - (targetRect.top - 10)),
            Math.abs(field.right - (targetRect.right + 10)),
            Math.abs(field.bottom - (targetRect.bottom + 10)),
          ),
          framed,
        });

        if (now - startedAt < 650) requestAnimationFrame(sample);
      };

      (window as typeof window & { __faqCollapseSamples?: FrameSample[] })
        .__faqCollapseSamples = samples;
      requestAnimationFrame(sample);
    });

    await answer.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await page.waitForTimeout(100);
    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    await expectFieldAroundTarget(cursor, indicator);
    await page.waitForTimeout(700);

    const samples = await page.evaluate(() =>
      (window as typeof window & {
        __faqCollapseSamples?: Array<{ error: number; framed: boolean }>;
      }).__faqCollapseSamples ?? []
    );
    const framedSamples = samples.filter((sample) => sample.framed);
    expect(framedSamples.length).toBeGreaterThan(3);
    expect(Math.max(...framedSamples.map((sample) => sample.error)))
      .toBeLessThanOrEqual(1.5);
  });

  test("coordinates the editorial state with article media and direction cues", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.goto("/clanky/", { waitUntil: "networkidle" });

    const card = page.locator("[data-article-slug]").first();
    await card.scrollIntoViewIfNeeded();
    await card.locator("h3").hover();

    const cursor = cursorFor(page);
    await expectCursorState(cursor, "article", "light");
    await expect(cursor).toHaveAttribute("data-cursor-icon", "hand");
    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    await expect(cursor).toHaveAttribute("data-cursor-locked", "true");
    await expect(card).toHaveAttribute("data-cursor-magnetic", "true");
    await expect(card.locator("[data-cursor-media]")).toHaveCount(1);
    await expect(card.locator("[data-cursor-direction]")).toHaveCount(1);

    await expect(cursor.locator("[data-cursor-target-frame]")).toHaveCount(0);
    await expect(cursor.locator("[data-cursor-reticle]")).toHaveCSS(
      "opacity",
      "1",
    );
    await expectFieldAroundTarget(
      cursor,
      card.locator("[data-cursor-direction]"),
    );
  });

  test("switches with the visual profile reveal before the handoff completes", async ({
    page,
  }) => {
    await openHomepage(page);
    const cursor = cursorFor(page);
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    if (!viewport) return;

    const pointerX = viewport.width / 2;
    const pointerY = viewport.height / 2;
    await page.mouse.move(pointerX, pointerY);
    await expectCursorState(cursor, "default", "dark");

    const heroHeight = await page.locator("[data-cinematic-home-hero]")
      .evaluate((element) => (element as HTMLElement).offsetHeight);
    await page.evaluate((scrollY) => {
      const lenis = window.__lenis;
      if (lenis?.scrollTo) {
        lenis.scrollTo(scrollY, { force: true, immediate: true });
      } else {
        window.scrollTo(0, scrollY);
      }
    }, heroHeight * 0.2);

    await expect(cursor).toHaveAttribute("data-cursor-surface", "light");
    const handoffProgress = await page
      .locator("[data-hero-transition-target]")
      .getAttribute("data-profile-handoff-progress");
    expect(Number(handoffProgress)).toBeGreaterThan(0);
    expect(Number(handoffProgress)).toBeLessThan(1);

    await page.evaluate(() => {
      const lenis = window.__lenis;
      if (lenis?.scrollTo) {
        lenis.scrollTo(0, { force: true, immediate: true });
      } else {
        window.scrollTo(0, 0);
      }
    });
    await expect(cursor).toHaveAttribute("data-cursor-surface", "dark");
  });

  test("turns velocity into restrained field deformation and then settles", async ({
    page,
  }) => {
    await openHomepage(page);
    const cursor = cursorFor(page);
    await page.mouse.move(260, 350);
    await page.mouse.move(960, 620, { steps: 2 });

    await expect.poll(async () => {
      const scale = await cursor.evaluate((element) => {
        const field = element.querySelector<HTMLElement>("[data-cursor-follower]");
        return Number.parseFloat(
          field?.style.getPropertyValue("--cursor-field-scale-x") || "1",
        );
      });
      return scale;
    }).toBeGreaterThan(1.01);

    const movingShape = await cursor.evaluate((element) => {
      const follower = element.querySelector<HTMLElement>("[data-cursor-follower]");
      return {
        angle: follower?.style.getPropertyValue("--cursor-field-angle") ?? "",
        x: Number.parseFloat(
          follower?.style.getPropertyValue("--cursor-field-scale-x") || "1",
        ),
        y: Number.parseFloat(
          follower?.style.getPropertyValue("--cursor-field-scale-y") || "1",
        ),
      };
    });
    expect(movingShape.angle).not.toBe("0deg");
    expect(movingShape.x).toBeLessThanOrEqual(1.075);
    expect(movingShape.y).toBeGreaterThanOrEqual(0.972);

    await expect(cursor).toHaveAttribute("data-cursor-animation", "idle", {
      timeout: 4_000,
    });
    await expect.poll(() => cursor.evaluate((element) => {
      const follower = element.querySelector<HTMLElement>("[data-cursor-follower]");
      return follower?.style.getPropertyValue("--cursor-field-scale-x");
    })).toBe("1");
  });

  test("takes the shortest rotation path when the reticle morphs onto a target", async ({
    page,
  }) => {
    await openHomepage(page);
    const cursor = cursorFor(page);

    await page.mouse.move(700, 500);
    await expect(cursor).toHaveAttribute("data-cursor-animation", "idle", {
      timeout: 4_000,
    });
    await page.evaluate(() => {
      const button = document.createElement("button");
      button.id = "cursor-rotation-target";
      button.dataset.cursor = "link";
      button.dataset.cursorSurface = "dark";
      button.style.cssText = [
        "position:fixed",
        "left:860px",
        "top:500px",
        "z-index:20000",
        "width:140px",
        "height:52px",
      ].join(";");
      button.textContent = "Rotation target";
      document.body.append(button);
    });
    await cursor.evaluate((element) => {
      const follower = element.querySelector<HTMLElement>(
        "[data-cursor-follower]",
      );
      follower?.style.setProperty("--cursor-field-angle", "990deg");
    });
    await page.waitForTimeout(120);

    const target = page.locator("#cursor-rotation-target");
    await target.hover();
    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    const rotationTravel = await measureReticleRotationTravel(cursor);

    expect(rotationTravel).toBeLessThan(200);
    await expectFieldAroundTarget(cursor, target);
  });

  test("keeps semantic states but removes lag, deformation and magnetism for reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openHomepage(page);

    const action = page.locator('[data-analytics-placement="hero"]');
    await action.hover();
    const cursor = cursorFor(page);
    await expectCursorState(cursor, "action", "dark");
    await expect(cursor).toHaveAttribute("data-cursor-core-surface", "action");
    await expect(cursor).toHaveAttribute("data-reduced-motion", "true");
    await expect(cursor).toHaveAttribute("data-cursor-framed", "true");
    await expect(cursor).toHaveAttribute("data-cursor-locked", "false");
    await expect(action).toHaveCSS("translate", "none");
    const reducedReticleScale = await readTransformScale(
      cursor,
      "[data-cursor-reticle]",
    );
    expect(reducedReticleScale.x).toBeCloseTo(1, 3);
    expect(reducedReticleScale.y).toBeCloseTo(1, 3);

    const corePosition = await readCursorPosition(cursor, "[data-cursor-dot]");
    const followerPosition = await readCursorPosition(
      cursor,
      "[data-cursor-follower]",
    );
    expect(Math.abs(followerPosition.x - corePosition.x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(followerPosition.y - corePosition.y)).toBeLessThanOrEqual(0.5);
  });

  test("restores the native cursor for text controls and when custom rendering is unsafe", async ({
    browser,
    page,
  }, testInfo) => {
    await primeRejectedConsent(page);
    await page.goto("/clanky/", { waitUntil: "networkidle" });

    const input = page.locator("#article-library-search");
    await input.hover();
    await expect(cursorFor(page)).toHaveAttribute("data-cursor-visible", "false");
    await expect(page.locator("html")).not.toHaveClass(/custom-cursor-ready/u);
    await expect(input).toHaveCSS("cursor", "text");

    await page.emulateMedia({ forcedColors: "active" });
    await expect(cursorFor(page)).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveClass(/custom-cursor-ready/u);

    const hybridContext = await browser.newContext({
      baseURL: String(testInfo.project.use.baseURL),
      hasTouch: true,
      isMobile: false,
      viewport: { width: 1440, height: 900 },
    });
    try {
      const hybridPage = await hybridContext.newPage();
      await hybridPage.goto("/clanky/", { waitUntil: "networkidle" });
      await expect(hybridPage.locator("[data-custom-cursor]")).toHaveCount(0);
      await hybridPage.mouse.move(800, 240);
      await hybridPage.mouse.move(820, 260);
      await expect(hybridPage.locator("[data-custom-cursor]")).toHaveCount(1);
      await expect(hybridPage.locator("[data-custom-cursor]")).toHaveAttribute(
        "data-cursor-visible",
        "true",
      );
    } finally {
      await hybridContext.close();
    }

    const touchContext = await browser.newContext({
      baseURL: String(testInfo.project.use.baseURL),
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    try {
      const touchPage = await touchContext.newPage();
      await touchPage.goto("/clanky/");
      await expect(touchPage.locator("[data-custom-cursor]")).toHaveCount(0);
      await expect(touchPage.locator("html")).not.toHaveClass(
        /custom-cursor-ready/u,
      );
    } finally {
      await touchContext.close();
    }
  });

  test("mounts on compact fine-pointer layouts without causing horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await primeRejectedConsent(page);
    await page.goto("/clanky/", { waitUntil: "networkidle" });
    await expect(cursorFor(page)).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(768);
  });
});
