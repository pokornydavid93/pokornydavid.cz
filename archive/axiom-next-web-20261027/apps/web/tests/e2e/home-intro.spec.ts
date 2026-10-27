import { expect, test, type Page } from "@playwright/test";

type IntroSample = {
  apertureAnchorX: number | null;
  apertureBorderOpacity: number | null;
  apertureBorderScale: number | null;
  apertureOpacity: number | null;
  apertureScale: number | null;
  at: number;
  frozen: boolean;
  heroReady: boolean;
  headOffset: number | null;
  headOpacity: number | null;
  logoOffset: number | null;
  markOpacity: number | null;
  ambientOpacity: number | null;
  cuttingHeadOpacity: number | null;
  phase: string;
  sparkOpacity: number | null;
  state: string;
  visualMode: string | null;
  viewportCenterX: number;
};

async function primeRejectedConsent(page: Page) {
  await page.addInitScript(() => {
    const decidedAt = Date.now();
    localStorage.setItem("cookie_consent_v1", JSON.stringify({
      choice: "rejected",
      decidedAt,
      expiresAt: decidedAt + 180 * 24 * 60 * 60 * 1_000,
      version: "2026-05-05-ga4-v1",
    }));
  });
}

async function installIntroTrace(page: Page) {
  await page.addInitScript(() => {
    const introWindow = window as Window & {
      __homeIntroApertureTrace?: IntroSample[];
    };
    introWindow.__homeIntroApertureTrace = [];

    const readScale = (value: string | null) => {
      const match = value?.match(/^scale\(([-\d.]+)\)$/u);
      if (!match) return null;
      const parsed = Number.parseFloat(match[1]);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const readTranslateX = (value: string | null) => {
      const match = value?.match(/^translate\(([-\d.]+)(?:[ ,]|\))/u);
      if (!match) return null;
      const parsed = Number.parseFloat(match[1]);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const readNumber = (value: string | undefined) => {
      const parsed = Number.parseFloat(value ?? "");
      return Number.isFinite(parsed) ? parsed : null;
    };
    const sample = () => {
      const intro = document.querySelector<HTMLElement>("[data-home-intro]");
      const aperture = document.querySelector<SVGGElement>(
        "[data-home-intro-aperture]",
      );
      const aperturePosition = document.querySelector<SVGGElement>(
        "[data-home-intro-aperture-position]",
      );
      const apertureBorder = document.querySelector<SVGGElement>(
        "[data-home-intro-aperture-border]",
      );
      const guide = document.querySelector<SVGPathElement>(
        "[data-home-intro-logo-guide]",
      );
      const headGuide = document.querySelector<SVGPathElement>(
        "[data-home-intro-logo-head-guide]",
      );
      const head = document.querySelector<SVGPathElement>(
        "[data-home-intro-logo-head]",
      );
      const ambient = document.querySelector<HTMLElement>(
        "[data-home-intro-ambient]",
      );
      const cuttingHead = document.querySelector<SVGGElement>(
        "[data-home-intro-cutting-head]",
      );
      const sparks = Array.from(document.querySelectorAll<SVGGElement>(
        "[data-home-intro-spark]",
      ));
      const mark = document.querySelector<SVGSVGElement>(
        "[data-home-intro-mark]",
      );
      const hero = document.querySelector<HTMLElement>(
        "[data-cinematic-home-hero]",
      );
      const apertureStyle = aperture ? getComputedStyle(aperture) : null;
      const apertureBorderStyle = apertureBorder
        ? getComputedStyle(apertureBorder)
        : null;
      const guideStyle = guide ? getComputedStyle(guide) : null;
      const headGuideStyle = headGuide ? getComputedStyle(headGuide) : null;
      const headStyle = head ? getComputedStyle(head) : null;
      const ambientStyle = ambient ? getComputedStyle(ambient) : null;
      const cuttingHeadStyle = cuttingHead
        ? getComputedStyle(cuttingHead)
        : null;
      const markStyle = mark ? getComputedStyle(mark) : null;
      const introBounds = intro?.getBoundingClientRect();

      if (intro || guide || aperture) {
        introWindow.__homeIntroApertureTrace?.push({
          apertureAnchorX: readTranslateX(
            aperturePosition?.getAttribute("transform") ?? null,
          ),
          apertureBorderOpacity: readNumber(apertureBorderStyle?.opacity),
          apertureBorderScale: readScale(
            apertureBorder?.getAttribute("transform") ?? null,
          ),
          apertureOpacity: readNumber(apertureStyle?.opacity),
          apertureScale: readScale(aperture?.getAttribute("transform") ?? null),
          at: performance.now(),
          ambientOpacity: readNumber(ambientStyle?.opacity),
          cuttingHeadOpacity: readNumber(cuttingHeadStyle?.opacity),
          frozen: hero?.hasAttribute("data-hero-handoff-frozen") ?? false,
          headOffset: readNumber(headGuideStyle?.strokeDashoffset),
          headOpacity: readNumber(headStyle?.opacity),
          heroReady: hero?.getAttribute("data-hero-effects-ready") === "true",
          logoOffset: readNumber(guideStyle?.strokeDashoffset),
          markOpacity: readNumber(markStyle?.opacity),
          phase: intro?.dataset.homeIntroPhase ?? "",
          sparkOpacity: sparks.length > 0
            ? Math.max(...sparks.map((spark) => (
              Number.parseFloat(getComputedStyle(spark).opacity) || 0
            )))
            : null,
          state: document.documentElement.dataset.homeIntroState ?? "",
          visualMode: document.documentElement.getAttribute(
            "data-home-intro-visual-mode",
          ),
          viewportCenterX: introBounds
            ? (introBounds.left + introBounds.right) / 2
            : window.innerWidth / 2,
        });
      }

      if (
        document.documentElement.dataset.homeIntroState !== "complete"
        && (introWindow.__homeIntroApertureTrace?.length ?? 0) < 1_000
      ) {
        requestAnimationFrame(sample);
      }
    };

    requestAnimationFrame(sample);
  });
}

async function expectIntroHidden(page: Page) {
  await expect.poll(async () => page.locator("[data-home-intro]").evaluate(
    (element) => {
      const style = getComputedStyle(element);
      return style.display === "none"
        || style.visibility === "hidden"
        || Number(style.opacity) === 0;
    },
  ), { timeout: 20_000 }).toBe(true);
}

test.describe("homepage logo aperture intro", () => {
  test.describe.configure({ mode: "serial" });

  test("does not insert executable scripts when navigating back to the homepage", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const scriptErrors: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error"
        && message.text().includes(
          "Encountered a script tag while rendering React component",
        )
      ) {
        scriptErrors.push(message.text());
      }
    });

    await page.goto("/kdo-jsem/", { waitUntil: "networkidle" });
    await page.getByRole("link", {
      name: "David Pokorný – úvod",
    }).first().click();
    await expect(page).toHaveURL(/\/$/u);
    await expect(page.locator("[data-home-intro]")).toBeAttached();
    await expectIntroHidden(page);

    await expect(page.locator("script[data-home-intro-bootstrap]"))
      .toHaveCount(0);
    await expect(page.locator("script[data-home-intro-compositor]"))
      .toHaveCount(0);
    await expect(page.locator("script[data-home-intro-runtime]"))
      .toHaveCount(1);
    expect(scriptErrors).toEqual([]);
  });

  test("keeps first paint stable until hydration can start the draw", async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await primeRejectedConsent(page);
    await page.route("**/*.js", (route) => route.abort());
    await page.goto("/", { waitUntil: "commit" });

    const intro = page.locator("[data-home-intro]");
    const guide = page.locator("[data-home-intro-logo-guide]");

    await expect(intro).toHaveAttribute("data-home-intro-play", "pending");
    await expect(intro).not.toHaveAttribute("data-home-intro-managed", "");
    await expect(page.locator("[data-home-intro-mark-ghost]")).toHaveCSS(
      "opacity",
      "0.24",
    );
    const introSurface = page.locator("[data-home-intro-veil-surface]");
    await expect(introSurface).not.toHaveAttribute("href", /.+/u);
    await expect.poll(() => introSurface.evaluate((element) => element.tagName))
      .toBe("rect");
    await expect(page.locator(
      "[data-hero-silk-host] [data-silk-static]",
    )).toHaveCSS(
      "background-image",
      /hero-silk-home-frame-zero\.avif/u,
    );
    await expect(page.locator("[data-cinematic-home-hero]")).toHaveCSS(
      "background-color",
      "rgb(4, 19, 12)",
    );
    await expect(page.locator("[data-cinematic-home-hero]")).toHaveCSS(
      "background-image",
      /hero-silk-home-frame-zero\.avif/u,
    );
    await expect.poll(() => guide.evaluate((element) => (
      getComputedStyle(element).animationName
    ))).toBe("none");
    await expect(intro).not.toHaveAttribute("data-home-intro-managed", "");
  });

  test("draws the exact DP path, turns it into the only reveal, and exposes a ready hero", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await primeRejectedConsent(page);
    await installIntroTrace(page);
    await page.goto("/", { waitUntil: "commit" });

    const intro = page.locator("[data-home-intro]");
    const mark = page.locator("[data-home-intro-mark]");
    const aperture = page.locator("[data-home-intro-aperture]");
    const apertureBorder = page.locator(
      "[data-home-intro-aperture-border]",
    );
    const hero = page.locator("[data-cinematic-home-hero]");

    await expect(intro).toBeAttached();
    await expect(intro).toHaveAttribute("data-home-intro-play", "true");
    await expect(intro).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator("[data-home-intro-veil]")).toHaveAttribute(
      "data-home-intro-reveal",
      "logo-aperture",
    );
    await expect(mark).toHaveAttribute("viewBox", "0 0 175.60001 186.3");
    await expect(mark.locator("[data-home-intro-logo-guide]")).toHaveCount(1);
    await expect(page.locator("[data-home-intro-logo-head-guide]")).toHaveCount(1);
    await expect(page.locator("[data-home-intro-logo-head]")).toHaveCount(1);
    await expect(page.locator("[data-home-intro-logo-afterglow]")).toHaveCount(1);
    await expect(page.locator("[data-home-intro-cutting-head]")).toHaveCount(1);
    await expect(page.locator("[data-home-intro-spark]")).toHaveCount(60);
    await expect(page.locator("[data-home-intro-spark] circle")).toHaveCount(60);
    await expect(page.locator("[data-home-intro-ambient]")).toHaveCount(1);
    await expect(aperture).toHaveCount(1);
    await expect(apertureBorder).toHaveCount(1);
    await expect(page.locator("[data-home-intro-signature]")).toHaveCount(0);
    await expect(page.locator("[data-home-intro-identity]")).toHaveCount(0);
    await expect(page.locator("[data-home-intro-skip]")).toHaveCount(0);

    const geometry = await page.evaluate(() => {
      const markPath = document.querySelector<SVGPathElement>(
        "[data-home-intro-mark] > g > path",
      );
      const aperturePath = document.querySelector<SVGPathElement>(
        "[data-home-intro-aperture-shape]",
      );
      const apertureBorderPath = document.querySelector<SVGPathElement>(
        "[data-home-intro-aperture-border-shape]",
      );
      const headerPath = document.querySelector<SVGPathElement>(
        '[data-component="site-header"] svg g > path',
      );
      const guide = document.querySelector<SVGPathElement>(
        "[data-home-intro-logo-guide]",
      );
      const headGuide = document.querySelector<SVGPathElement>(
        "[data-home-intro-logo-head-guide]",
      );
      const veil = document.querySelector<SVGSVGElement>(
        "[data-home-intro-veil]",
      );
      const surface = document.querySelector<SVGRectElement>(
        "[data-home-intro-veil-surface]",
      );

      return {
        apertureMatchesMark:
          aperturePath?.getAttribute("d") === markPath?.getAttribute("d"),
        borderMatchesMark:
          apertureBorderPath?.getAttribute("d") === markPath?.getAttribute("d"),
        borderVectorEffect:
          apertureBorderPath?.getAttribute("vector-effect") ?? "",
        guideCap: guide ? getComputedStyle(guide).strokeLinecap : "",
        guideJoin: guide ? getComputedStyle(guide).strokeLinejoin : "",
        guideMoveCount: (guide?.getAttribute("d")?.match(/[Mm]/gu) ?? []).length,
        headGuideMatches: headGuide?.getAttribute("d")
          === guide?.getAttribute("d"),
        headerMatchesMark:
          headerPath?.getAttribute("d") === markPath?.getAttribute("d"),
        surfaceMask: surface ? getComputedStyle(surface).mask : "",
        veilMaskImage: veil ? getComputedStyle(veil).maskImage : "",
      };
    });
    expect(geometry.apertureMatchesMark).toBe(true);
    expect(geometry.borderMatchesMark).toBe(true);
    expect(geometry.borderVectorEffect).toBe("non-scaling-stroke");
    expect(geometry.headerMatchesMark).toBe(true);
    expect(geometry.guideCap).toBe("butt");
    expect(geometry.guideJoin).toBe("miter");
    expect(geometry.guideMoveCount).toBe(1);
    expect(geometry.headGuideMatches).toBe(true);
    expect(geometry.surfaceMask).toContain("home-intro-aperture-mask");
    expect(geometry.veilMaskImage).toBe("none");

    await page.mouse.wheel(0, 900);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expectIntroHidden(page);

    const trace = await page.evaluate(() => (
      window as Window & { __homeIntroApertureTrace?: IntroSample[] }
    ).__homeIntroApertureTrace ?? []);
    const handoff = trace.filter(({ phase }) => (
      phase === "logo-cutout" || phase === "hero-reveal"
    ));
    expect(handoff.length).toBeGreaterThanOrEqual(3);
    expect(handoff.every(({ heroReady, visualMode }) => (
      visualMode === "static"
      || (visualMode === "webgl" && heroReady)
    ))).toBe(true);
    expect(handoff.every(({ frozen }) => frozen)).toBe(true);
    expect(handoff.every(({ logoOffset }) => (
      logoOffset !== null && logoOffset <= 0.02
    ))).toBe(true);
    expect(handoff.every(({ headOpacity }) => (
      headOpacity !== null && headOpacity <= 0.02
    ))).toBe(true);

    const activation = trace.filter(({ phase }) => (
      phase === "draw-begin" || phase === "draw-active"
    ));
    expect(activation.length).toBeGreaterThanOrEqual(8);
    expect(activation.some(({ headOpacity }) => (
      headOpacity !== null && headOpacity >= 0.5
    ))).toBe(true);
    expect(activation.some(({ cuttingHeadOpacity }) => (
      cuttingHeadOpacity !== null && cuttingHeadOpacity >= 0.5
    ))).toBe(true);
    expect(activation.some(({ sparkOpacity }) => (
      sparkOpacity !== null && sparkOpacity >= 0.5
    ))).toBe(true);
    const movingHead = activation
      .map(({ headOffset }) => headOffset)
      .filter((offset): offset is number => offset !== null);
    expect(Math.min(...movingHead)).toBeLessThan(-0.45);
    const ambientPeak = Math.max(...activation.map(
      ({ ambientOpacity }) => ambientOpacity ?? 0,
    ));
    expect(ambientPeak).toBeGreaterThan(0.8);
    const settle = trace.filter(({ phase }) => phase === "settle");
    expect(settle.length).toBeGreaterThanOrEqual(3);
    expect(settle.at(-1)?.ambientOpacity ?? 1).toBeLessThan(0.5);
    expect(handoff.every(({ apertureAnchorX, viewportCenterX }) => (
      apertureAnchorX !== null
      && Math.abs(apertureAnchorX - viewportCenterX) < 1
    ))).toBe(true);

    const scales = handoff
      .map(({ apertureScale }) => apertureScale)
      .filter((scale): scale is number => scale !== null);
    expect(scales.length).toBeGreaterThanOrEqual(3);
    expect(scales[0]).toBeLessThan(1);
    expect(Math.max(...scales)).toBeGreaterThan(80);
    for (let index = 1; index < scales.length; index += 1) {
      expect(scales[index]).toBeGreaterThanOrEqual(scales[index - 1] - 0.01);
    }

    const outlinedHandoff = handoff.filter(({ apertureBorderOpacity }) => (
      apertureBorderOpacity !== null && apertureBorderOpacity > 0.5
    ));
    expect(outlinedHandoff.length).toBeGreaterThanOrEqual(2);
    expect(outlinedHandoff.every((sample) => (
      sample.apertureBorderScale !== null
      && sample.apertureScale !== null
      && Math.abs(sample.apertureBorderScale - sample.apertureScale) < 0.02
    ))).toBe(true);
    expect(handoff.some(({ apertureBorderOpacity }) => (
      apertureBorderOpacity !== null && apertureBorderOpacity < 0.05
    ))).toBe(true);

    const cutout = handoff.find(({ phase }) => phase === "logo-cutout");
    expect(cutout?.apertureOpacity).toBe(1);
    expect(cutout?.markOpacity).not.toBeNull();
    const heroReveal = handoff.filter(({ phase }) => phase === "hero-reveal");
    expect(heroReveal.some(({ markOpacity }) => (
      markOpacity !== null && markOpacity <= 0.02
    ))).toBe(true);

    await expect(hero).toHaveAttribute("data-hero-effects-ready", "true");
    await expect(hero).not.toHaveAttribute("data-hero-handoff-frozen", "");
    await expect.poll(() => page.evaluate(() => ({
      mainInert: document.querySelector("main")?.inert ?? false,
      overflowX: Math.max(
        0,
        document.documentElement.scrollWidth
          - document.documentElement.clientWidth,
      ),
    }))).toEqual({ mainInert: false, overflowX: 0 });
  });

  test("replays on a hard reload and keeps the mark centered on mobile", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await primeRejectedConsent(page);
    await page.addInitScript(() => {
      const introWindow = window as Window & {
        __hiddenIntroGeometryReads?: number;
      };
      introWindow.__hiddenIntroGeometryReads = 0;
      const getBBox = SVGGraphicsElement.prototype.getBBox;
      SVGGraphicsElement.prototype.getBBox = function (...args) {
        const intro = this.closest<HTMLElement>("[data-home-intro]");
        if (intro?.style.display === "none") {
          introWindow.__hiddenIntroGeometryReads =
            (introWindow.__hiddenIntroGeometryReads ?? 0) + 1;
        }
        return getBBox.apply(this, args);
      };
    });
    const expectNoHiddenGeometryReads = async () => {
      expect(await page.evaluate(() => (window as Window & {
        __hiddenIntroGeometryReads?: number;
      }).__hiddenIntroGeometryReads)).toBe(0);
      await expect(page.locator("[data-home-intro-spark][transform]"))
        .toHaveCount(0);
    };
    await page.goto("/", { waitUntil: "commit" });

    await expect.poll(() => page.locator("[data-home-intro]").evaluate(
      (element) => getComputedStyle(element).display !== "none",
    )).toBe(true);
    await expect(page.locator("[data-home-intro]")).toHaveAttribute(
      "data-home-intro-play",
      "true",
      { timeout: 15_000 },
    );
    const centerOffset = await page.locator("[data-home-intro-mark-stage]")
      .evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const stageRect = element
          .closest<HTMLElement>("[data-home-intro]")
          ?.getBoundingClientRect();
        if (!stageRect) return Number.POSITIVE_INFINITY;
        return Math.abs(
          (rect.left + rect.right) / 2
          - (stageRect.left + stageRect.right) / 2,
        );
      });
    expect(centerOffset).toBeLessThan(1);
    await expectIntroHidden(page);
    await expectNoHiddenGeometryReads();

    await page.reload({ waitUntil: "commit" });
    await expect.poll(() => page.locator("[data-home-intro]").evaluate(
      (element) => getComputedStyle(element).display !== "none",
    )).toBe(true);
    await expect(page.locator("[data-home-intro-signature]")).toHaveCount(0);
    await expectIntroHidden(page);
    await expectNoHiddenGeometryReads();
  });

  test("uses a short static exit for reduced motion", async ({ page }) => {
    test.setTimeout(30_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await primeRejectedConsent(page);
    await installIntroTrace(page);
    await page.goto("/", { waitUntil: "commit" });

    await expect(page.locator("[data-home-intro]")).toBeAttached();
    await expectIntroHidden(page);

    const trace = await page.evaluate(() => (
      window as Window & { __homeIntroApertureTrace?: IntroSample[] }
    ).__homeIntroApertureTrace ?? []);
    expect(trace.some(({ phase }) => phase === "hero-reveal")).toBe(false);
    expect(trace.some(({ apertureScale }) => (
      apertureScale !== null && apertureScale > 1
    ))).toBe(false);
    await expect(page.locator("[data-cinematic-home-hero]")).not
      .toHaveAttribute("data-hero-handoff-frozen", "");
  });
});
