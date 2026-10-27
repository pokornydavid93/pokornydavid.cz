import { expect, test, type Page } from "@playwright/test";

type HeroStartupDraw = {
  atMs: number;
  time: number;
  interiorReady: number;
  displacement: [number, number];
  introState: string;
  frozen: boolean;
  revealSettled: boolean;
};

type HeroStartupAudit = {
  draws: HeroStartupDraw[];
  contexts: number;
  errors: string[];
  introComplete: { atMs: number; skipped: boolean; fallback: boolean } | null;
  revealSettledAtMs: number | null;
};

type StartupWindow = Window & { __heroStartupAudit?: HeroStartupAudit };

async function installDrawAudit(page: Page) {
  await page.addInitScript(() => {
    const audit: HeroStartupAudit = {
      draws: [],
      contexts: 0,
      errors: [],
      introComplete: null,
      revealSettledAtMs: null,
    };
    (window as StartupWindow).__heroStartupAudit = audit;
    const contexts = new WeakSet<WebGLRenderingContext | WebGL2RenderingContext>();
    const locations = new WeakMap<WebGLProgram, {
      time: WebGLUniformLocation;
      ready: WebGLUniformLocation;
      displacement: WebGLUniformLocation;
    }>();

    const recordDraw = (gl: WebGLRenderingContext | WebGL2RenderingContext) => {
      const canvas = gl.canvas;
      if (!(canvas instanceof HTMLCanvasElement)
        || !canvas.matches("[data-react-bits-silk-canvas]")
        || audit.draws.length >= 512) return;
      const hero = canvas.closest<HTMLElement>("[data-cinematic-home-hero]");
      if (!hero || gl.getParameter(gl.FRAMEBUFFER_BINDING) !== null) return;
      try {
        const program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
        if (!program) return;
        let uniforms = locations.get(program);
        if (!uniforms) {
          const time = gl.getUniformLocation(program, "uTime");
          const ready = gl.getUniformLocation(program, "uInteriorReady");
          const displacement = gl.getUniformLocation(program, "uInteriorDisplacementPixels");
          if (!time || !ready || !displacement) return;
          uniforms = { time, ready, displacement };
          locations.set(program, uniforms);
        }
        if (!contexts.has(gl)) {
          contexts.add(gl);
          audit.contexts += 1;
        }
        const displacement = gl.getUniform(program, uniforms.displacement) as Float32Array;
        audit.draws.push({
          atMs: performance.now(),
          time: gl.getUniform(program, uniforms.time) as number,
          interiorReady: gl.getUniform(program, uniforms.ready) as number,
          displacement: [displacement[0], displacement[1]],
          introState: document.documentElement.dataset.homeIntroState ?? "",
          frozen: hero.hasAttribute("data-hero-handoff-frozen"),
          revealSettled: hero.hasAttribute("data-hero-reveal-settled"),
        });
      } catch (error) {
        audit.errors.push(String(error));
      }
    };

    const instrument = (prototype: WebGLRenderingContext | WebGL2RenderingContext) => {
      // Wrap only own methods. A WebGL2 implementation that inherits WebGL1
      // methods is already covered, without recording the same draw twice.
      const elementsDescriptor = Object.getOwnPropertyDescriptor(prototype, "drawElements");
      if (elementsDescriptor) {
        const nativeDraw = prototype.drawElements;
        Object.defineProperty(prototype, "drawElements", {
          ...elementsDescriptor,
          value(this: WebGLRenderingContext, ...args: Parameters<WebGLRenderingContext["drawElements"]>) {
            const result = Reflect.apply(nativeDraw, this, args);
            recordDraw(this);
            return result;
          },
        });
      }
      const arraysDescriptor = Object.getOwnPropertyDescriptor(prototype, "drawArrays");
      if (arraysDescriptor) {
        const nativeDraw = prototype.drawArrays;
        Object.defineProperty(prototype, "drawArrays", {
          ...arraysDescriptor,
          value(this: WebGLRenderingContext, ...args: Parameters<WebGLRenderingContext["drawArrays"]>) {
            const result = Reflect.apply(nativeDraw, this, args);
            recordDraw(this);
            return result;
          },
        });
      }
    };
    if (typeof WebGLRenderingContext !== "undefined") instrument(WebGLRenderingContext.prototype);
    if (typeof WebGL2RenderingContext !== "undefined") instrument(WebGL2RenderingContext.prototype);

    window.addEventListener("home:intro-complete", (event) => {
      const detail = (event as CustomEvent<{ skipped?: boolean; fallback?: boolean }>).detail;
      audit.introComplete = {
        atMs: performance.now(),
        skipped: detail?.skipped === true,
        fallback: detail?.fallback === true,
      };
    });
    window.addEventListener("home:hero-reveal-settled", () => {
      audit.revealSettledAtMs = performance.now();
    });
  });
}

test("starts interior displacement on the first live Silk draw while the hero entrance continues", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const decidedAt = Date.now();
    localStorage.setItem("cookie_consent_v1", JSON.stringify({
      choice: "rejected",
      decidedAt,
      expiresAt: decidedAt + 180 * 24 * 60 * 60 * 1_000,
      version: "2026-09-13-web-privacy-v2",
    }));
  });

  // Warm Next dev's route/chunks before observing a fresh, unmodified intro.
  // Neither visit skips the intro or writes its freeze/readiness attributes.
  await page.goto("/", { waitUntil: "networkidle" });
  await installDrawAudit(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => {
    const audit = (window as StartupWindow).__heroStartupAudit;
    return Boolean(audit?.introComplete && audit.revealSettledAtMs !== null
      && audit.draws.some(({ time, displacement }) => (
        time > 0 && displacement[0] >= 11.999 && displacement[1] >= 6.999
      )));
  }), { timeout: 30_000 }).toBe(true);

  const audit = await page.evaluate(() => (window as StartupWindow).__heroStartupAudit!);
  await testInfo.attach("natural-hero-startup-draws", {
    body: JSON.stringify(audit, null, 2),
    contentType: "application/json",
  });
  expect(audit.errors).toEqual([]);
  expect(audit.contexts).toBe(1);
  expect(audit.introComplete).toMatchObject({ skipped: false, fallback: false });
  // Enhancement may arrive during or after the aperture: its first frame is
  // still identical to the poster, and the semantic reveal never waits on it.
  expect(audit.draws.some(({ time, interiorReady, displacement }) => (
    time === 0 && interiorReady === 1 && displacement[0] === 0
    && displacement[1] === 0
  ))).toBe(true);

  const liveDraws = audit.draws.filter(({ time }) => time > 0);
  expect(liveDraws.length).toBeGreaterThanOrEqual(3);
  const firstLive = liveDraws[0];
  expect(firstLive.interiorReady).toBe(1);
  expect(firstLive.displacement[0]).toBeGreaterThan(0);
  expect(firstLive.displacement[1]).toBeGreaterThan(0);
  expect(firstLive.frozen).toBe(false);
  expect(firstLive.revealSettled).toBe(false);
  expect(firstLive.atMs).toBeGreaterThanOrEqual(audit.introComplete!.atMs);

  const growingBeforeSettle = liveDraws.filter(({ revealSettled, displacement }, index, draws) => (
    !revealSettled && displacement[0] < 12
    && (index === 0 || displacement[0] > draws[index - 1].displacement[0])
  ));
  expect(growingBeforeSettle.length).toBeGreaterThanOrEqual(3);
  let previousTime = 0;
  for (const draw of growingBeforeSettle) {
    expect(draw.interiorReady).toBe(1);
    expect(draw.time).toBeGreaterThan(previousTime);
    previousTime = draw.time;
    expect(draw.displacement[0] / 12).toBeCloseTo(draw.displacement[1] / 7, 5);
    expect(draw.atMs).toBeLessThan(audit.revealSettledAtMs!);
  }
  const fullStrength = liveDraws.find(({ displacement }) => displacement[0] >= 11.999)!;
  expect(fullStrength.displacement[0]).toBeCloseTo(12, 3);
  expect(fullStrength.displacement[1]).toBeCloseTo(7, 3);
});
