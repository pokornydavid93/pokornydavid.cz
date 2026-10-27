import { expect, test } from "@playwright/test";

const ORIGINAL_PORTRAIT = process.env.HOME_HERO_PORTRAIT_VARIANT === "original";

type HeroEffectKind = "portrait" | "silk" | "unknown";

declare global {
  interface Window {
    __heroContextAttempts?: Array<{
      at: number;
      introState: string | null;
      kind: HeroEffectKind;
    }>;
    __heroDraws?: Array<{
      at: number;
      introState: string | null;
      kind: HeroEffectKind;
    }>;
    __heroReadyEvents?: Array<{
      at: number;
      mode: "static" | "webgl";
    }>;
    __heroReadyPublications?: Array<{
      at: number;
      mode: string | null;
    }>;
    __heroRevealSettledAt?: number;
  }
}

async function instrumentHeroEffects(
  page: import("@playwright/test").Page,
) {
  await page.addInitScript(() => {
    window.__heroContextAttempts = [];
    window.__heroDraws = [];
    window.__heroReadyEvents = [];
    window.__heroReadyPublications = [];

    const effectKind = (canvas: HTMLCanvasElement): HeroEffectKind => (
      canvas.closest("[data-hero-silk-host]")
        ? "silk"
        : canvas.closest("[data-hero-portrait-warp]")
          ? "portrait"
          : "unknown"
    );
    const instrumentedContexts = new WeakSet<object>();
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(
      this: HTMLCanvasElement,
      contextId: string,
      ...options: unknown[]
    ) {
      const context = Reflect.apply(originalGetContext, this, [
        contextId,
        ...options,
      ]);
      const hero = this.closest?.("[data-cinematic-home-hero]");
      if (!hero || !contextId.includes("webgl") || !context) return context;

      const kind = effectKind(this);
      window.__heroContextAttempts?.push({
        at: performance.now(),
        introState: document.documentElement.dataset.homeIntroState ?? null,
        kind,
      });

      const contextObject = context as unknown as object;
      if (instrumentedContexts.has(contextObject)) return context;
      instrumentedContexts.add(contextObject);

      const drawable = context as unknown as Record<string, unknown>;
      for (const method of ["drawArrays", "drawElements"] as const) {
        const originalDraw = drawable[method];
        if (typeof originalDraw !== "function") continue;
        try {
          Object.defineProperty(drawable, method, {
            configurable: true,
            value: function instrumentedDraw(
              this: object,
              ...args: unknown[]
            ) {
              window.__heroDraws?.push({
                at: performance.now(),
                introState:
                  document.documentElement.dataset.homeIntroState ?? null,
                kind,
              });
              return Reflect.apply(originalDraw, this, args);
            },
          });
        } catch {
          // Some browser builds expose non-configurable WebGL methods. The
          // readiness assertions still verify the production state machine.
        }
      }
      return context;
    } as typeof HTMLCanvasElement.prototype.getContext;

    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function setAttribute(
      this: Element,
      name: string,
      value: string,
    ) {
      Reflect.apply(originalSetAttribute, this, [name, value]);
      if (
        name === "data-hero-effects-ready"
        && value === "true"
        && this.matches("[data-cinematic-home-hero]")
      ) {
        window.__heroReadyPublications?.push({
          at: performance.now(),
          mode: this.getAttribute("data-hero-effects-mode"),
        });
      }
    } as typeof Element.prototype.setAttribute;

    window.addEventListener("home:hero-effects-ready", (event) => {
      const detail = (event as CustomEvent<{ mode?: "static" | "webgl" }>).detail;
      if (!detail?.mode) return;
      window.__heroReadyEvents?.push({
        at: performance.now(),
        mode: detail.mode,
      });
    });
    window.addEventListener("home:hero-reveal-settled", () => {
      window.__heroRevealSettledAt = performance.now();
    });
  });
}

async function releasePrewarm(page: import("@playwright/test").Page) {
  const hero = page.locator("[data-cinematic-home-hero]");
  await expect.poll(() => hero.getAttribute("data-hero-effects-state"))
    .not.toBe("static");
  await hero.evaluate((hero) => {
    hero.setAttribute("data-hero-effects-prewarm", "true");
    window.dispatchEvent(new CustomEvent("home:hero-effects-prewarm"));
  });
}

test.describe("homepage hero effect lifecycle", () => {
  test("runs the mobile Silk renderer without enabling the portrait warp", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await instrumentHeroEffects(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Escape");

    const hero = page.locator("[data-cinematic-home-hero]");
    await releasePrewarm(page);

    await expect(hero).toHaveAttribute("data-hero-effects-ready", "true", {
      timeout: 15_000,
    });
    await expect(hero).toHaveAttribute("data-hero-effects-mode", "webgl");
    await expect(hero).toHaveAttribute("data-hero-effects-state", "ready");
    await expect(hero).toHaveAttribute("data-hero-silk-enabled", "true");
    await expect(hero).not.toHaveAttribute(
      "data-hero-portrait-warp-enabled",
      "true",
    );
    await expect(hero.locator("[data-hero-portrait]")).toHaveCSS(
      "display",
      "none",
    );
    await expect(hero.locator("[data-react-bits-silk]")).toHaveCount(1);
    await expect(hero.locator(
      "[data-hero-silk-host] [data-react-bits-silk-canvas]",
    )).toBeVisible();

    const trace = await page.evaluate(() => ({
      contexts: window.__heroContextAttempts ?? [],
      draws: window.__heroDraws ?? [],
    }));
    expect(trace.contexts.some(({ kind }) => kind === "silk")).toBe(true);
    expect(trace.contexts.some(({ kind }) => kind === "portrait")).toBe(false);
    expect(trace.draws.some(({ kind }) => kind === "silk")).toBe(true);
    expect(trace.draws.some(({ kind }) => kind === "portrait")).toBe(false);
  });

  test("publishes readiness after Silk draws and only starts portrait WebGL in the original variant", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await instrumentHeroEffects(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Escape");

    const hero = page.locator("[data-cinematic-home-hero]");
    await expect(hero).toBeVisible();
    await releasePrewarm(page);

    await expect(hero).toHaveAttribute("data-hero-effects-ready", "true", {
      timeout: 15_000,
    });
    await expect(hero).toHaveAttribute("data-hero-effects-mode", "webgl");
    await expect(hero).toHaveAttribute("data-hero-silk-ready", "true");
    await expect(hero.locator(
      '[data-react-bits-silk][data-silk-source="react-bits"]',
    )).toHaveCount(1);
    const criticalTrace = await page.evaluate(() => ({
      contexts: window.__heroContextAttempts ?? [],
      draws: window.__heroDraws ?? [],
      publications: window.__heroReadyPublications ?? [],
      readyEvents: window.__heroReadyEvents ?? [],
    }));
    expect(criticalTrace.contexts.some(({ kind }) => kind === "silk")).toBe(true);
    expect(criticalTrace.draws.some(({ kind }) => kind === "silk")).toBe(true);

    const firstSilkDraw = criticalTrace.draws.find(({ kind }) => (
      kind === "silk"
    ))?.at;
    const aggregateReady = criticalTrace.publications.at(-1)?.at;
    expect(firstSilkDraw).toBeDefined();
    expect(aggregateReady).toBeGreaterThanOrEqual(firstSilkDraw!);
    expect(criticalTrace.readyEvents.at(-1)?.mode).toBe("webgl");
    expect(criticalTrace.contexts.every(({ introState }) =>
      !["fallback-exit", "pending"].includes(introState ?? "")
    )).toBe(true);

    await expect(hero).toHaveAttribute(
      "data-hero-reveal-settled",
      "true",
      { timeout: 15_000 },
    );
    const enhancementTrace = await page.evaluate(() => ({
      contexts: window.__heroContextAttempts ?? [],
      revealSettledAt: window.__heroRevealSettledAt,
    }));
    expect(enhancementTrace.revealSettledAt).toBeDefined();
    if (ORIGINAL_PORTRAIT) {
      await expect(hero).toHaveAttribute(
        "data-hero-portrait-warp-ready",
        "true",
        { timeout: 15_000 },
      );
      const firstPortraitContext = enhancementTrace.contexts.find(({ kind }) => (
        kind === "portrait"
      ))?.at;
      expect(firstPortraitContext).toBeDefined();
      expect(firstPortraitContext).toBeGreaterThanOrEqual(
        enhancementTrace.revealSettledAt!,
      );
    } else {
      await expect(hero).toHaveAttribute("data-hero-portrait-variant",
        process.env.HOME_HERO_PORTRAIT_VARIANT === "cutout" ? "cutout" : "scene");
      await expect(hero.locator("[data-hero-portrait-warp]")).toHaveCount(0);
      await expect(hero).not.toHaveAttribute("data-hero-portrait-warp-ready", "true");
      await expect(hero).not.toHaveAttribute("data-hero-portrait-warp-enabled", "true");
      expect(enhancementTrace.contexts.some(({ kind }) => kind === "portrait"))
        .toBe(false);
      const portraitRuntimeRequests = await page.evaluate(() => performance
        .getEntriesByType("resource")
        .filter(({ name }) => name.includes("HeroPortraitEdgeWarp_client_tsx"))
        .map(({ name }) => name));
      expect(portraitRuntimeRequests).toEqual([]);
    }
  });

  test("pauses the initialized Silk renderer during an owned handoff", async ({
    page,
  }) => {
    await instrumentHeroEffects(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Escape");

    const hero = page.locator("[data-cinematic-home-hero]");
    await releasePrewarm(page);
    await expect(hero).toHaveAttribute("data-hero-effects-mode", "webgl", {
      timeout: 15_000,
    });
    await page.waitForFunction(() =>
      document.documentElement.dataset.homeIntroState === "complete"
    );
    await hero.evaluate((node) => {
      node.setAttribute("data-hero-handoff-frozen", "");
    });
    await expect(
      hero.locator("[data-silk-backdrop]:not([data-hero-effect-placeholder])"),
    ).toHaveAttribute("data-silk-paused", "");
    const draws = await page.evaluate(() => window.__heroDraws ?? []);
    expect(draws.some(({ kind }) => kind === "silk")).toBe(true);
  });

  test("timeout unmounts loading canvases before publishing static readiness", async ({
    page,
  }) => {
    await instrumentHeroEffects(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Escape");

    const hero = page.locator("[data-cinematic-home-hero]");
    await releasePrewarm(page);
    await expect(hero).toHaveAttribute("data-hero-silk-enabled", "true");
    await expect(hero).not.toHaveAttribute(
      "data-hero-portrait-warp-enabled",
      "true",
    );
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("home:hero-effects-timeout"));
    });

    await expect(hero).toHaveAttribute("data-hero-effects-ready", "true");
    await expect(hero).toHaveAttribute("data-hero-effects-mode", "static");
    await expect(hero).toHaveAttribute(
      "data-hero-effects-state",
      "webgl-timeout",
    );
    await expect(hero).not.toHaveAttribute("data-hero-silk-enabled", "true");
    await expect(hero).not.toHaveAttribute(
      "data-hero-portrait-warp-enabled",
      "true",
    );
    await expect(
      hero.locator("[data-silk-backdrop]:not([data-hero-effect-placeholder])"),
    ).toHaveCount(0);
    await expect(hero.locator(
      "[data-hero-silk-host] [data-silk-static]",
    )).toBeVisible();
    await expect(
      hero.locator("[data-hero-portrait-warp]:not([data-hero-effect-placeholder])"),
    ).toHaveCount(0);
    expect((await page.evaluate(() => window.__heroReadyEvents ?? [])).at(-1))
      .toMatchObject({ mode: "static" });
  });

  test("retains an explicit handoff-ready static hero for reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await instrumentHeroEffects(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const hero = page.locator("[data-cinematic-home-hero]");
    await expect(hero).toHaveAttribute(
      "data-hero-effects-state",
      "reduced-motion",
    );
    await expect(hero).toHaveAttribute("data-hero-effects-ready", "true");
    await expect(hero).toHaveAttribute("data-hero-effects-mode", "static");
    await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(hero.locator("[data-hero-portrait] img")).toBeVisible();
    await expect(hero).not.toHaveAttribute("data-hero-silk-enabled", "true");
    await expect(hero).not.toHaveAttribute(
      "data-hero-portrait-warp-enabled",
      "true",
    );
    await expect(hero.locator("[data-react-bits-silk]")).toHaveCount(0);
    await expect(hero.locator(
      "[data-hero-silk-host] [data-silk-static]",
    )).toBeVisible();
    expect(await page.evaluate(() => window.__heroContextAttempts)).toEqual([]);
    expect((await page.evaluate(() => window.__heroReadyEvents ?? [])).at(-1))
      .toMatchObject({ mode: "static" });
  });
});
