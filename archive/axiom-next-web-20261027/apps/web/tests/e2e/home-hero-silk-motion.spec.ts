import { expect, test, type Locator, type Page } from "@playwright/test";

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const HERO_SELECTOR = "[data-cinematic-home-hero]";
const REACT_BITS_SILK_SELECTOR =
  '[data-react-bits-silk][data-silk-source="react-bits"]';
const HERO_SILK_SELECTOR =
  `[data-hero-silk-host] ${REACT_BITS_SILK_SELECTOR}`;
const HERO_PORTRAIT_WARP_SELECTOR = "[data-hero-portrait-warp]";
const HERO_SILK_MOTION_CHANNEL = "homepage-hero";
const ORIGINAL_PORTRAIT = process.env.HOME_HERO_PORTRAIT_VARIANT === "original";
const SPATIAL_SCENE = !ORIGINAL_PORTRAIT
  && process.env.HOME_HERO_PORTRAIT_VARIANT !== "cutout";

test.beforeEach(async ({ page }) => {
  // These visual probes read pixels after presentation, including while the
  // scene is paused. Production correctly discards its drawing buffer; retain
  // it only in this instrumented shader suite as Next dev already did. No
  // timing or Lighthouse measurements use this diagnostic context option.
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement, kind: string, options?: unknown,
    ) {
      const diagnostics = kind.includes("webgl") && this.matches(
        "[data-react-bits-silk-canvas], [data-hero-portrait-warp-canvas]",
      );
      return Reflect.apply(getContext, this, [kind, diagnostics
        ? { ...(options as object | undefined), preserveDrawingBuffer: true }
        : options]);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
});

type FrameFingerprint = {
  hash: number;
  height: number;
  sampledPixels: number;
  visiblePixels: number;
  width: number;
};

type MotionRegion = {
  changedRatio: number;
  luminanceSpread: number;
  meanAbsoluteDifference: number;
  sampledPixels: number;
};

type MotionEnergy = {
  height: number;
  timeDelta: number;
  width: number;
  zones: MotionRegion[];
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

async function openHomepageHero(
  page: Page,
  reducedMotion: "no-preference" | "reduce" = "no-preference",
) {
  await primeRejectedConsent(page);
  await page.emulateMedia({ reducedMotion });
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() =>
    document.documentElement.dataset.homeIntroState === "complete"
  );
  await page.evaluate(() => window.scrollTo({ behavior: "instant", top: 0 }));

  const hero = page.locator(HERO_SELECTOR);
  const silk = page.locator(HERO_SILK_SELECTOR);
  const canvas = silk.locator("canvas[data-react-bits-silk-canvas]");
  const portraitWarp = hero.locator(HERO_PORTRAIT_WARP_SELECTOR);
  const portraitCanvas = portraitWarp.locator("canvas");

  await expect(hero).toBeVisible();
  await hero.evaluate((element) => {
    element.removeAttribute("data-hero-handoff-frozen");
  });
  await expect(silk).toHaveAttribute("data-state", "ready");
  await expect(silk).toHaveAttribute("data-silk-source", "react-bits");
  expect(await silk.getAttribute("data-silk-material")).toBeNull();
  await expect(silk).toHaveAttribute(
    "data-silk-motion-channel",
    HERO_SILK_MOTION_CHANNEL,
  );
  await expect(hero).toHaveAttribute("data-hero-silk-ready", "true");
  await expect(silk).not.toHaveAttribute("data-silk-paused", "");
  await expect(canvas).toHaveCount(1);
  if (ORIGINAL_PORTRAIT) {
    await expect(hero).toHaveAttribute("data-hero-portrait-warp-ready", "true");
    await expect(portraitWarp).toHaveAttribute("data-state", "ready");
    await expect(portraitWarp).toHaveAttribute(
      "data-portrait-warp-source",
      "react-bits-silk",
    );
    await expect(portraitWarp).toHaveAttribute(
      "data-silk-motion-channel",
      HERO_SILK_MOTION_CHANNEL,
    );
    await expect(portraitWarp).not.toHaveAttribute("data-portrait-warp-paused", "");
    await expect(portraitCanvas).toHaveCount(1);
  } else {
    await expect(hero).toHaveAttribute(
      "data-hero-portrait-variant",
      SPATIAL_SCENE ? "scene" : "cutout",
    );
    await expect(hero).not.toHaveAttribute("data-hero-portrait-warp-ready", "true");
    await expect(portraitWarp).toHaveCount(0);
    await expect(portraitCanvas).toHaveCount(0);
  }
  await page.evaluate(() => document.fonts.ready);

  return { canvas, hero, portraitCanvas, portraitWarp, silk };
}

async function readWebGlUniform(canvas: Locator, uniformName: string) {
  return canvas.evaluate((element, name) => {
    const node = element as HTMLCanvasElement;
    const gl = node.getContext("webgl2") ?? node.getContext("webgl");
    if (!gl) return null;

    const program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
    if (!program) return null;

    const location = gl.getUniformLocation(program, name);
    if (location === null) return null;

    const value = gl.getUniform(program, location);
    return typeof value === "number" ? value : null;
  }, uniformName);
}

async function readSharedSilkUniforms(hero: Locator) {
  return hero.evaluate((element) => {
    const readUniforms = (selector: string) => {
      const canvas = element.querySelector<HTMLCanvasElement>(selector);
      if (!canvas) return null;
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      if (!gl) return null;
      const program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
      if (!program) return null;

      const readNumber = (name: string) => {
        const location = gl.getUniformLocation(program, name);
        if (location === null) return null;
        const value = gl.getUniform(program, location);
        return typeof value === "number" ? value : null;
      };

      return {
        noiseIntensity: readNumber("uNoiseIntensity"),
        rotation: readNumber("uRotation"),
        scale: readNumber("uScale"),
        speed: readNumber("uSpeed"),
        time: readNumber("uTime"),
      };
    };

    return {
      portrait: readUniforms("canvas[data-hero-portrait-warp-canvas]"),
      silk: readUniforms("canvas[data-react-bits-silk-canvas]"),
    };
  });
}

async function readPortraitSilkUvMapping(hero: Locator) {
  return hero.evaluate((element) => {
    const canvas = element.querySelector<HTMLCanvasElement>(
      "canvas[data-hero-portrait-warp-canvas]",
    );
    const portraitWarp = element.querySelector<HTMLElement>(
      "[data-hero-portrait-warp]",
    );
    const silkHost = element.querySelector<HTMLElement>("[data-hero-silk-host]");
    if (!canvas || !portraitWarp || !silkHost) return null;

    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    const program = gl?.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
    if (!gl || !program) return null;
    const readVec2 = (name: string) => {
      const location = gl.getUniformLocation(program, name);
      if (location === null) return null;
      const value = gl.getUniform(program, location);
      return value && typeof value !== "number"
        ? Array.from(value as Float32Array)
        : null;
    };
    const portraitRect = portraitWarp.getBoundingClientRect();
    const silkRect = silkHost.getBoundingClientRect();

    return {
      actualOffset: readVec2("uSilkUvOffset"),
      actualScale: readVec2("uSilkUvScale"),
      expectedOffset: [
        (portraitRect.left - silkRect.left) / silkRect.width,
        (portraitRect.top - silkRect.top) / silkRect.height,
      ],
      expectedScale: [
        portraitRect.width / silkRect.width,
        portraitRect.height / silkRect.height,
      ],
    };
  });
}

async function requireWebGlTime(canvas: Locator) {
  await expect.poll(() => readWebGlUniform(canvas, "uTime")).not.toBeNull();
  return (await readWebGlUniform(canvas, "uTime"))!;
}

async function requireWebGlTimeSnapshot(canvas: Locator) {
  await expect.poll(() => readWebGlUniform(canvas, "uTime")).not.toBeNull();
  return canvas.evaluate((element) => {
    const node = element as HTMLCanvasElement;
    const gl = node.getContext("webgl2") ?? node.getContext("webgl");
    if (!gl) return null;

    const program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
    if (!program) return null;

    const location = gl.getUniformLocation(program, "uTime");
    if (location === null) return null;

    const value = gl.getUniform(program, location);
    if (typeof value !== "number") return null;
    return { sampledAt: performance.now(), value };
  }).then((snapshot) => {
    expect(snapshot).not.toBeNull();
    return snapshot!;
  });
}

async function readFramebufferFingerprint(
  canvas: Locator,
): Promise<FrameFingerprint | null> {
  return canvas.evaluate((element) => {
    const node = element as HTMLCanvasElement;
    const gl = node.getContext("webgl2") ?? node.getContext("webgl");
    if (!gl) return null;

    gl.finish();
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(
      0,
      0,
      width,
      height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );

    const strideX = Math.max(1, Math.floor(width / 192));
    const strideY = Math.max(1, Math.floor(height / 128));
    let hash = 2166136261;
    let sampledPixels = 0;
    let visiblePixels = 0;

    for (let y = 0; y < height; y += strideY) {
      for (let x = 0; x < width; x += strideX) {
        const index = (y * width + x) * 4;
        const alpha = pixels[index + 3];
        sampledPixels += 1;
        if (alpha > 4) visiblePixels += 1;

        hash ^= pixels[index];
        hash = Math.imul(hash, 16777619);
        hash ^= pixels[index + 1];
        hash = Math.imul(hash, 16777619);
        hash ^= pixels[index + 2];
        hash = Math.imul(hash, 16777619);
        hash ^= alpha;
        hash = Math.imul(hash, 16777619);
      }
    }

    return {
      hash: hash >>> 0,
      height,
      sampledPixels,
      visiblePixels,
      width,
    };
  });
}

async function readFramebufferAlphaCoverage(
  canvas: Locator,
  minXRatio: number,
  maxXRatio: number,
) {
  return canvas.evaluate((element, range) => {
    const node = element as HTMLCanvasElement;
    const gl = node.getContext("webgl2") ?? node.getContext("webgl");
    if (!gl) return null;

    gl.finish();
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    const minX = Math.floor(width * range.min);
    const maxX = Math.floor(width * range.max);
    const strideX = Math.max(1, Math.floor(width / 220));
    const strideY = Math.max(1, Math.floor(height / 140));
    let opaquePixels = 0;
    let sampledPixels = 0;
    let visiblePixels = 0;

    for (let y = 0; y < height; y += strideY) {
      for (let x = minX; x < maxX; x += strideX) {
        sampledPixels += 1;
        const alpha = pixels[(y * width + x) * 4 + 3];
        if (alpha > 4) visiblePixels += 1;
        if (alpha > 248) opaquePixels += 1;
      }
    }

    return {
      opaquePixels,
      opaqueRatio: sampledPixels > 0 ? opaquePixels / sampledPixels : 0,
      ratio: sampledPixels > 0 ? visiblePixels / sampledPixels : 0,
      sampledPixels,
      visiblePixels,
    };
  }, { max: maxXRatio, min: minXRatio });
}

async function readFramebufferMotionEnergy(
  canvas: Locator,
  delayMs = 1_000,
): Promise<MotionEnergy | null> {
  return canvas.evaluate(async (element, delay) => {
    const node = element as HTMLCanvasElement;
    const gl = node.getContext("webgl2") ?? node.getContext("webgl");
    if (!gl) return null;

    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const readFrame = () => {
      gl.finish();
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(
        0,
        0,
        width,
        height,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels,
      );
      return pixels;
    };
    const waitForPaint = () => new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });

    await waitForPaint();
    const firstProgram = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
    const firstTimeLocation = firstProgram
      ? gl.getUniformLocation(firstProgram, "uTime")
      : null;
    const firstTime = firstTimeLocation === null
      ? 0
      : Number(gl.getUniform(firstProgram!, firstTimeLocation));
    const first = readFrame();
    await new Promise<void>((resolve) => window.setTimeout(resolve, delay));
    await waitForPaint();
    const secondProgram = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
    const secondTimeLocation = secondProgram
      ? gl.getUniformLocation(secondProgram, "uTime")
      : null;
    const secondTime = secondTimeLocation === null
      ? firstTime
      : Number(gl.getUniform(secondProgram!, secondTimeLocation));
    const second = readFrame();
    const strideX = Math.max(1, Math.floor(width / 240));
    const strideY = Math.max(1, Math.floor(height / 140));
    const minY = Math.floor(height * 0.15);
    const maxY = Math.floor(height * 0.85);

    const readRegion = (minXRatio: number, maxXRatio: number): MotionRegion => {
      const minX = Math.floor(width * minXRatio);
      const maxX = Math.floor(width * maxXRatio);
      let changedPixels = 0;
      let differenceSum = 0;
      const luminances: number[] = [];
      let sampledPixels = 0;

      for (let y = minY; y < maxY; y += strideY) {
        for (let x = minX; x < maxX; x += strideX) {
          const index = (y * width + x) * 4;
          if (first[index + 3] <= 4 || second[index + 3] <= 4) continue;

          const difference = (
            Math.abs(first[index] - second[index])
            + Math.abs(first[index + 1] - second[index + 1])
            + Math.abs(first[index + 2] - second[index + 2])
          ) / 3;
          luminances.push(
            first[index] * 0.2126
              + first[index + 1] * 0.7152
              + first[index + 2] * 0.0722,
          );
          differenceSum += difference;
          sampledPixels += 1;
          if (difference >= 2) changedPixels += 1;
        }
      }

      luminances.sort((a, b) => a - b);
      const percentile = (ratio: number) => luminances.length > 0
        ? luminances[Math.min(
          luminances.length - 1,
          Math.floor((luminances.length - 1) * ratio),
        )]!
        : 0;

      return {
        changedRatio: sampledPixels > 0 ? changedPixels / sampledPixels : 0,
        luminanceSpread: percentile(0.9) - percentile(0.1),
        meanAbsoluteDifference:
          sampledPixels > 0 ? differenceSum / sampledPixels : 0,
        sampledPixels,
      };
    };

    return {
      height,
      timeDelta: Math.abs(secondTime - firstTime),
      width,
      // Four equal evidence zones ensure that stronger depth remains visible
      // across the full hero instead of passing through one isolated band.
      zones: [
        readRegion(0.04, 0.25),
        readRegion(0.27, 0.48),
        readRegion(0.52, 0.73),
        readRegion(0.75, 0.96),
      ],
    };
  }, delayMs);
}

test.describe("homepage hero React Bits silk", () => {
  test.describe.configure({ mode: "serial" });

  test("uses the shared React Bits silk across every silk scene", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const { hero, silk } = await openHomepageHero(page);
    await expect(silk).toHaveAttribute("data-silk-source", "react-bits");
    const homepageUniforms = await readSharedSilkUniforms(hero);
    expect(homepageUniforms.silk?.noiseIntensity).toBeCloseTo(0.55, 5);
    const edgeMask = await silk.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        maskImage: styles.maskImage,
        webkitMaskImage: styles.webkitMaskImage,
      };
    });
    expect(edgeMask).toEqual({
      maskImage: "none",
      webkitMaskImage: "none",
    });
    const coverage = await page.locator(HERO_SELECTOR).evaluate((element) => {
      const heroRect = element.getBoundingClientRect();
      const silkRect = element.querySelector<HTMLElement>(
        "[data-hero-silk-host]",
      )!.getBoundingClientRect();
      return {
        bottom: Math.abs(silkRect.bottom - heroRect.bottom),
        left: Math.abs(silkRect.left - heroRect.left),
        right: Math.abs(silkRect.right - heroRect.right),
        top: Math.abs(silkRect.top - heroRect.top),
      };
    });
    expect(Math.max(...Object.values(coverage))).toBeLessThanOrEqual(1);
    await expect(page.locator(`${HERO_SELECTOR} canvas`))
      .toHaveCount(ORIGINAL_PORTRAIT ? 2 : 1);

    await expect(page.locator("[data-process-silk-host]")).toHaveCount(0);
    await expect(page.locator(
      '[data-home-module="process"] canvas',
    )).toHaveCount(0);

    for (const path of [
      "/kdo-jsem/",
      "/sluzby/",
      "/jak-pracuji/",
      "/reference/",
      "/refixace-hypoteky/",
    ]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const routeSilk = page.locator(REACT_BITS_SILK_SELECTOR);
      await expect(routeSilk).toHaveCount(1);
      await expect(routeSilk).toHaveAttribute("data-state", "ready", {
        timeout: 15_000,
      });
      await expect(routeSilk.locator("canvas[data-react-bits-silk-canvas]")).toHaveCount(1);
      await expect(page.locator("[data-refixation-silk]")).toHaveCount(0);
    }
  });

  test("drives the protected photographic edge from the same React Bits field", async ({
    page,
  }) => {
    test.skip(!ORIGINAL_PORTRAIT, "The cutout variant removes the photographic edge renderer.");
    test.slow();
    const { canvas, hero, portraitCanvas, silk } = await openHomepageHero(page);
    expect(await silk.getAttribute("data-silk-motion-duration-ms")).toBeNull();
    const sharedUniforms = await readSharedSilkUniforms(hero);
    expect(sharedUniforms.silk).not.toBeNull();
    expect(sharedUniforms.portrait).not.toBeNull();
    expect(sharedUniforms.silk!.time).not.toBeNull();
    expect(sharedUniforms.portrait!.time).not.toBeNull();
    expect(Math.abs(
      sharedUniforms.silk!.time! - sharedUniforms.portrait!.time!,
    )).toBeLessThanOrEqual(0.000001);
    expect(sharedUniforms.silk!.noiseIntensity!).toBeCloseTo(0.55, 5);
    expect(sharedUniforms.silk!.speed!).toBeCloseTo(5, 5);
    expect(sharedUniforms.portrait!.speed!).toBeCloseTo(5, 5);
    expect(sharedUniforms.silk!.scale!).toBeCloseTo(1, 5);
    expect(sharedUniforms.portrait!.scale!).toBeCloseTo(1, 5);
    expect(sharedUniforms.silk!.rotation!).toBeCloseTo(0, 5);
    expect(sharedUniforms.portrait!.rotation!).toBeCloseTo(0, 5);
    const uvMapping = await readPortraitSilkUvMapping(hero);
    expect(uvMapping).not.toBeNull();
    expect(uvMapping!.actualOffset).not.toBeNull();
    expect(uvMapping!.actualScale).not.toBeNull();
    for (const axis of [0, 1]) {
      expect(uvMapping!.actualOffset![axis]).toBeCloseTo(
        uvMapping!.expectedOffset[axis]!,
        4,
      );
      expect(uvMapping!.actualScale![axis]).toBeCloseTo(
        uvMapping!.expectedScale[axis]!,
        4,
      );
    }
    const motion = await readFramebufferMotionEnergy(canvas);
    const portraitStartTime = await requireWebGlTime(portraitCanvas);
    const portraitStartFrame = await readFramebufferFingerprint(portraitCanvas);
    const animatedPhotoEdge = await readFramebufferAlphaCoverage(
      portraitCanvas,
      0.02,
      0.32,
    );
    const replacementPhotoEdge = await readFramebufferAlphaCoverage(
      portraitCanvas,
      0.38,
      0.49,
    );
    const protectedPortrait = await readFramebufferAlphaCoverage(
      portraitCanvas,
      0.5,
      0.9,
    );
    await page.waitForTimeout(1_000);
    const portraitEndTime = await requireWebGlTime(portraitCanvas);
    const portraitEndFrame = await readFramebufferFingerprint(portraitCanvas);

    expect(motion).not.toBeNull();
    expect(motion!.zones).toHaveLength(4);
    const changedRatios = motion!.zones
      .map((zone) => zone.changedRatio)
      .sort((a, b) => a - b);
    const luminanceSpreads = motion!.zones
      .map((zone) => zone.luminanceSpread)
      .sort((a, b) => a - b);
    const normalizedMotion = motion!.zones
      .map((zone) => zone.meanAbsoluteDifference / motion!.timeDelta)
      .sort((a, b) => a - b);
    for (const zone of motion!.zones) {
      expect(zone.sampledPixels).toBeGreaterThan(1_000);
    }
    expect(luminanceSpreads[0]).toBeGreaterThanOrEqual(2);
    expect(luminanceSpreads[2]).toBeGreaterThanOrEqual(4);
    expect(motion!.timeDelta).toBeGreaterThan(0.001);
    expect(changedRatios[0]).toBeGreaterThanOrEqual(0.02);
    expect(changedRatios[2]).toBeGreaterThanOrEqual(0.08);
    expect(normalizedMotion[2]).toBeGreaterThanOrEqual(0.3);
    expect(portraitStartFrame).not.toBeNull();
    expect(portraitEndFrame).not.toBeNull();
    expect(animatedPhotoEdge).not.toBeNull();
    expect(replacementPhotoEdge).not.toBeNull();
    expect(protectedPortrait).not.toBeNull();
    expect(animatedPhotoEdge!.visiblePixels).toBeGreaterThan(500);
    expect(replacementPhotoEdge!.opaqueRatio).toBeGreaterThan(0.35);
    expect(protectedPortrait!.visiblePixels).toBe(0);
    expect(portraitStartFrame!.visiblePixels).toBeGreaterThan(500);
    expect(portraitEndTime - portraitStartTime).toBeGreaterThan(0.001);
    expect(portraitEndFrame!.hash).not.toBe(portraitStartFrame!.hash);
  });

  test("uses the static silk fallback without WebGL for reduced motion", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const hero = page.locator(HERO_SELECTOR);
    const placeholder = hero.locator(
      "[data-hero-silk-host] [data-hero-effect-placeholder][data-silk-backdrop]",
    );
    await expect(hero).toHaveAttribute("data-hero-effects-mode", "static");
    await expect(hero).toHaveAttribute(
      "data-hero-effects-state",
      "reduced-motion",
    );
    await expect(hero.locator(REACT_BITS_SILK_SELECTOR)).toHaveCount(0);
    await expect(hero.locator(
      `${HERO_PORTRAIT_WARP_SELECTOR}:not([data-hero-effect-placeholder])`,
    )).toHaveCount(0);
    await expect(hero.locator(SPATIAL_SCENE
      ? "[data-hero-scene-foreground] img"
      : "[data-hero-portrait] img")).toBeVisible();
    if (SPATIAL_SCENE) {
      await expect(hero.locator("[data-hero-interior-image]")).toBeVisible();
      await expect(hero.locator("[data-hero-scene-foreground]"))
        .toHaveCSS("transform", "none");
    }
    await expect(placeholder.locator("[data-silk-static]")).toBeVisible();
  });

  test("freezes and resumes the shared continuous timeline", async ({
    page,
  }) => {
    const { canvas, hero, portraitCanvas, portraitWarp, silk } =
      await openHomepageHero(page);
    const initialTime = await requireWebGlTime(canvas);
    await expect.poll(async () => {
      const time = await readWebGlUniform(canvas, "uTime");
      return typeof time === "number" && time > initialTime + 0.01;
    }).toBe(true);

    await hero.evaluate((element) => {
      element.setAttribute("data-hero-handoff-frozen", "");
    });
    await expect(silk).toHaveAttribute("data-silk-paused", "");
    if (ORIGINAL_PORTRAIT) {
      await expect(portraitWarp).toHaveAttribute("data-portrait-warp-paused", "");
    } else {
      await expect(portraitWarp).toHaveCount(0);
    }

    const frozenTime = await requireWebGlTime(canvas);
    const frozenFrame = await readFramebufferFingerprint(canvas);
    expect(frozenFrame).not.toBeNull();
    expect(frozenFrame!.visiblePixels).toBeGreaterThan(500);
    let frozenPortraitTime: number | null = null;
    let frozenPortraitFrame: FrameFingerprint | null = null;
    if (ORIGINAL_PORTRAIT) {
      frozenPortraitTime = await requireWebGlTime(portraitCanvas);
      frozenPortraitFrame = await readFramebufferFingerprint(portraitCanvas);
      expect(frozenPortraitFrame).not.toBeNull();
      expect(Math.abs(frozenPortraitTime - frozenTime)).toBeLessThanOrEqual(
        0.000001,
      );
      expect(frozenPortraitFrame!.visiblePixels).toBeGreaterThan(500);
    }

    await page.waitForTimeout(600);

    const stillFrozenTime = await requireWebGlTime(canvas);
    const stillFrozenFrame = await readFramebufferFingerprint(canvas);
    expect(Math.abs(stillFrozenTime - frozenTime)).toBeLessThanOrEqual(0.002);
    expect(stillFrozenFrame).toEqual(frozenFrame);
    if (ORIGINAL_PORTRAIT) {
      const stillFrozenPortraitTime = await requireWebGlTime(portraitCanvas);
      const stillFrozenPortraitFrame = await readFramebufferFingerprint(portraitCanvas);
      expect(Math.abs(stillFrozenPortraitTime - frozenPortraitTime!))
        .toBeLessThanOrEqual(0.002);
      expect(Math.abs(stillFrozenPortraitTime - stillFrozenTime))
        .toBeLessThanOrEqual(0.000001);
      expect(stillFrozenPortraitFrame).toEqual(frozenPortraitFrame);
    }

    const resumeStartedAt = await hero.evaluate((element) => {
      element.removeAttribute("data-hero-handoff-frozen");
      return performance.now();
    });
    await expect(silk).not.toHaveAttribute("data-silk-paused", "");
    if (ORIGINAL_PORTRAIT) {
      await expect(portraitWarp).not.toHaveAttribute("data-portrait-warp-paused", "");
    }

    const resumed = await requireWebGlTimeSnapshot(canvas);
    const elapsedSinceResume = Math.max(
      0,
      resumed.sampledAt - resumeStartedAt,
    ) * 0.0001;
    expect(resumed.value).toBeGreaterThanOrEqual(stillFrozenTime - 0.002);
    expect(Math.abs(resumed.value - stillFrozenTime)).toBeLessThanOrEqual(
      elapsedSinceResume + 0.08,
    );
    await expect.poll(async () => {
      const time = await readWebGlUniform(canvas, "uTime");
      return typeof time === "number" && time > resumed.value + 0.01;
    }).toBe(true);
    if (ORIGINAL_PORTRAIT) {
      await expect.poll(async () => {
        const uniforms = await readSharedSilkUniforms(hero);
        const silkTime = uniforms.silk?.time;
        const portraitTime = uniforms.portrait?.time;
        if (typeof silkTime !== "number" || typeof portraitTime !== "number") {
          return Number.POSITIVE_INFINITY;
        }
        return Math.abs(silkTime - portraitTime);
      }).toBeLessThanOrEqual(0.000001);
    } else {
      const uniforms = await readSharedSilkUniforms(hero);
      expect(uniforms.silk).not.toBeNull();
      expect(uniforms.portrait).toBeNull();
    }

    const runningUniforms = await readSharedSilkUniforms(hero);
    await page.waitForTimeout(350);
    const progressedUniforms = await readSharedSilkUniforms(hero);
    expect(progressedUniforms.silk!.time!).toBeGreaterThan(
      runningUniforms.silk!.time!,
    );
    if (ORIGINAL_PORTRAIT) {
      expect(progressedUniforms.portrait!.time!).toBeGreaterThan(
        runningUniforms.portrait!.time!,
      );
    }
  });
});

async function readInteriorScene(canvas: Locator) {
  return canvas.evaluate((element) => {
    const node = element as HTMLCanvasElement;
    const gl = node.getContext("webgl2") ?? node.getContext("webgl");
    const program = gl?.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
    if (!gl || !program) return null;
    const read = (name: string) => {
      const location = gl.getUniformLocation(program, name);
      if (location === null) return null;
      const value = gl.getUniform(program, location);
      return typeof value === "number" ? value : Array.from(value as Float32Array);
    };
    return {
      crop: read("uInteriorCrop"),
      displacement: read("uInteriorDisplacementPixels"),
      parallax: read("uInteriorParallaxPixels"),
      pointer: read("uScenePointer"),
      ready: read("uInteriorReady"),
      rect: read("uInteriorRect"),
      viewport: read("uViewportSize"),
    };
  });
}

async function readSceneGeometry(hero: Locator) {
  return hero.evaluate((element) => {
    const box = (selector: string) => {
      const node = element.querySelector(selector)!;
      const rect = node.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    };
    const foreground = element.querySelector<HTMLElement>(
      "[data-hero-scene-foreground]",
    )!;
    const matrix = new DOMMatrixReadOnly(getComputedStyle(foreground).transform);
    return {
      foreground: { x: matrix.m41, y: matrix.m42 },
      ui: ["#home-hero-title", "[data-hero-lead]", "[data-hero-actions]", "[data-hero-review-proof]"].map(box),
    };
  });
}

async function readRoomRasterProof(hero: Locator) {
  return hero.evaluate((element) => {
    const image = element.querySelector<HTMLImageElement>("[data-hero-interior-image]")!;
    const canvas = element.querySelector<HTMLCanvasElement>("[data-react-bits-silk-canvas]")!;
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    const program = gl?.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
    if (!gl || !program) return null;
    const number = (name: string) => Number(gl.getUniform(program, gl.getUniformLocation(program, name)!));
    const vector = (name: string) => Array.from(gl.getUniform(program, gl.getUniformLocation(program, name)!) as Float32Array);
    const rect = vector("uInteriorRect");
    const crop = vector("uInteriorCrop");
    const viewport = vector("uViewportSize");
    const displacement = vector("uInteriorDisplacementPixels");
    const pointer = vector("uScenePointer");
    const parallax = vector("uInteriorParallaxPixels");
    const rasterViewport = Array.from(gl.getParameter(gl.VIEWPORT) as Int32Array);
    const time = number("uTime");
    const speed = number("uSpeed");
    const scale = number("uScale");
    const rotation = number("uRotation");
    const color = vector("uColor");
    const noiseIntensity = number("uNoiseIntensity");
    const reference = document.createElement("canvas");
    reference.width = image.naturalWidth;
    reference.height = image.naturalHeight;
    const context = reference.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const source = context.getImageData(0, 0, reference.width, reference.height).data;
    const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.finish();
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const sampleSource = (u: number, v: number) => {
      const x = Math.min(reference.width - 1, Math.max(0, u * reference.width - 0.5));
      const y = Math.min(reference.height - 1, Math.max(0, v * reference.height - 0.5));
      const left = Math.floor(x); const top = Math.floor(y);
      const right = Math.min(reference.width - 1, left + 1);
      const bottom = Math.min(reference.height - 1, top + 1);
      const tx = x - left; const ty = y - top;
      return [0, 1, 2].map(channel => {
        const color = (sx: number, sy: number) => source[(sy * reference.width + sx) * 4 + channel]!;
        return color(left, top) * (1 - tx) * (1 - ty) + color(right, top) * tx * (1 - ty)
          + color(left, bottom) * (1 - tx) * ty + color(right, bottom) * tx * ty;
      });
    };
    // Independent raster oracle for the published React Bits spatial/time
    // equation: compare its predicted photo texels with pixels actually drawn.
    // A separate floating-photo animation cannot satisfy this correspondence.
    const sample = (localX: number, localY: number) => {
      const px = Math.floor((rect[0]! + localX * rect[2]!) * gl.drawingBufferWidth);
      const py = Math.floor((1 - rect[1]! - localY * rect[3]!) * gl.drawingBufferHeight);
      if (px < 0 || py < 0 || px >= gl.drawingBufferWidth || py >= gl.drawingBufferHeight) return null;
      const gx = (px + 0.5 - rasterViewport[0]!) / rasterViewport[2]!;
      const gy = (py + 0.5 - rasterViewport[1]!) / rasterViewport[3]!;
      const c = Math.cos(rotation); const s = Math.sin(rotation);
      const tx = (c * gx + s * gy) * scale ** 2;
      let ty = (-s * gx + c * gy) * scale ** 2;
      const offset = speed * time;
      ty += 0.03 * Math.sin(8 * tx - offset);
      const phase = 5 * (tx + ty + Math.cos(3 * tx + 5 * ty) + 0.02 * offset)
        + Math.sin(20 * (tx + ty - 0.1 * offset));
      const height = Math.sin(phase);
      const pattern = 0.6 + 0.4 * height;
      const dx = height * displacement[0]!;
      const dy = height * displacement[1]!;
      const lx = (gx - rect[0]!) / rect[2]!;
      const ly = (1 - gy - rect[1]!) / rect[3]!;
      const clamp = (value: number) => Math.min(0.9999, Math.max(0.0001, value));
      const roomX = lx - pointer[0]! * parallax[0]! / (rect[2]! * viewport[0]!);
      const roomY = ly - pointer[1]! * parallax[1]! / (rect[3]! * viewport[1]!);
      const sourceUv = [
        clamp(crop[0]! + (roomX + dx / (rect[2]! * viewport[0]!)) * crop[2]!),
        clamp(crop[1]! + (roomY + dy / (rect[3]! * viewport[1]!)) * crop[3]!),
      ];
      const expected = sampleSource(sourceUv[0]!, sourceUv[1]!);
      const rigid = sampleSource(clamp(crop[0]! + roomX * crop[2]!), clamp(crop[1]! + roomY * crop[3]!));
      const index = (py * gl.drawingBufferWidth + px) * 4;
      const rendered = Array.from(pixels.slice(index, index + 3));
      const error = (reference: number[]) => rendered.reduce((sum, value, channel) => sum + Math.abs(value - reference[channel]!), 0) / 3;
      const maskPosition = Math.min(1, Math.max(0, lx / 0.38));
      const mask = lx >= 0 && lx <= 1 ? maskPosition ** 2 * (3 - 2 * maskPosition) : 0;
      // Grain is monochrome and cancels in R-G. Exclude possible output
      // clipping, then compare both materials and their actual feather seam
      // with the same global height value, independently of grain's PRNG.
      const unclipped = [0, 1].every(channel => {
        const low = (1 - mask) * (color[channel]! * pattern - noiseIntensity / 15)
          + mask * expected[channel]! / 255;
        const high = (1 - mask) * color[channel]! * pattern + mask * expected[channel]! / 255;
        return low > 0.01 && high < 0.99;
      });
      const materialDifference = (1 - mask) * (color[0]! - color[1]!) * pattern
        + mask * (expected[0]! - expected[1]!) / 255;
      const materialError = Math.abs((rendered[0]! - rendered[1]!) / 255 - materialDifference) * 255;
      return { dx, dy, mask, materialError, unclipped, rendered, expected, sourceUv, px, py, localX, localY, warpedError: error(expected), rigidError: error(rigid) };
    };
    const grid: NonNullable<ReturnType<typeof sample>>[] = [];
    let hash = 2166136261;
    for (let y = 0; y < 20; y += 1) {
      for (let x = 0; x < 26; x += 1) {
        const point = sample(0.42 + x / 25 * 0.55, 0.03 + y / 19 * 0.94);
        if (!point) continue;
        grid.push(point);
        for (const value of point.rendered) { hash ^= value; hash = Math.imul(hash, 16777619); }
      }
    }
    const edgeSamples = [0.82, 0.9, 0.97].flatMap(x => [0.004, 0.996].map(y => sample(x, y)!));
    const edgeColorErrors = edgeSamples.map(point => point.warpedError);
    const seam: NonNullable<ReturnType<typeof sample>>[] = [];
    for (let y = 0; y < 24; y += 1) {
      const localY = 0.03 + y / 23 * 0.94;
      for (let x = 0; x < 18; x += 1) {
        const localX = 0.015 + x / 17 * 0.35;
        const point = sample(localX, localY);
        if (point?.unclipped) seam.push(point);
      }
    }
    const silk: NonNullable<ReturnType<typeof sample>>[] = [];
    for (let y = 0; y < 24; y += 1) {
      const localY = 0.03 + y / 23 * 0.94;
      for (let x = 0; x < 24; x += 1) {
        const globalX = 0.03 + x / 23 * (rect[0]! - 0.06);
        const point = sample((globalX - rect[0]!) / rect[2]!, localY);
        if (point?.unclipped) silk.push(point);
      }
    }
    const materialProof = (points: typeof grid) => ({
      samples: points.length,
      meanDifferenceError: points.reduce((sum, point) => sum + point.materialError, 0) / points.length,
    });
    const average = (name: "warpedError" | "rigidError") => grid.reduce((sum, point) => sum + point[name], 0) / grid.length;
    return {
      edgeColorErrors,
      edgeSamples,
      uniforms: { crop, rect, viewport, displacement, pointer, parallax, time, speed, scale, rotation },
      rasterViewport,
      drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
      sourceSize: [reference.width, reference.height],
      silkPattern: materialProof(silk),
      featherSeam: materialProof(seam),
      hash: hash >>> 0,
      horizontalSpan: Math.max(...grid.map(point => point.dx)) - Math.min(...grid.map(point => point.dx)),
      verticalSpan: Math.max(...grid.map(point => point.dy)) - Math.min(...grid.map(point => point.dy)),
      warpedError: average("warpedError"), rigidError: average("rigidError"), sampledPixels: grid.length, time,
    };
  });
}

test.describe("homepage interior and portrait depth", () => {
  test.skip(!SPATIAL_SCENE, "Spatial scene is disabled by the legacy portrait override.");
  test.describe.configure({ mode: "serial" });

  test("registers the room in the single silk renderer and preserves photographic color", async ({ page }) => {
    const { canvas, hero } = await openHomepageHero(page);
    await expect(hero).toHaveAttribute("data-hero-interior-ready", "true");
    await expect(hero.locator("canvas")).toHaveCount(1);
    await expect(hero.locator("[data-hero-portrait-warp]")).toHaveCount(0);
    const renderBudget = await canvas.evaluate(element => {
      const canvas = element as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const previousRatio = Math.min(window.devicePixelRatio, 1.35);
      return {
        pixels: canvas.width * canvas.height,
        previousPixels: rect.width * rect.height * previousRatio ** 2,
      };
    });
    // Extra photograph sampling stays within a smaller background budget;
    // semantic text and the DOM portrait retain their native resolution.
    expect(renderBudget.pixels).toBeLessThanOrEqual(renderBudget.previousPixels * 0.6);
    await expect.poll(async () => {
      const displacement = (await readInteriorScene(canvas))?.displacement as number[] | null;
      return displacement?.[0] ?? 0;
    }).toBeGreaterThan(11.99);
    const scene = await readInteriorScene(canvas);
    expect(scene).not.toBeNull();
    expect(scene!.ready).toBe(1);
    expect(scene!.displacement).toEqual([expect.any(Number), expect.any(Number)]);
    expect(Math.max(...scene!.displacement as number[])).toBeLessThanOrEqual(13);
    expect(Math.min(...scene!.displacement as number[])).toBeGreaterThan(0);

    const mapping = await hero.evaluate((element) => {
      const image = element.querySelector<HTMLImageElement>("[data-hero-interior-image]")!;
      const rect = image.getBoundingClientRect();
      const host = element.querySelector("[data-hero-silk-host]")!.getBoundingClientRect();
      const scale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      return {
        rect: [
          (rect.left - host.left) / host.width,
          (rect.top - host.top) / host.height,
          rect.width / host.width,
          rect.height / host.height,
        ],
        crop: [1 - rect.width / width, 1 - rect.height / height, rect.width / width, rect.height / height],
        roomCoversHeight: Math.abs(rect.top - host.top) <= 1 && Math.abs(rect.bottom - host.bottom) <= 1,
      };
    });
    for (const axis of [0, 1, 2, 3]) {
      expect((scene!.rect as number[])[axis]).toBeCloseTo(mapping.rect[axis]!, 4);
      expect((scene!.crop as number[])[axis]).toBeCloseTo(mapping.crop[axis]!, 4);
    }
    expect(mapping.roomCoversHeight).toBe(true);

    // Sample the room itself in the framebuffer, behind the independent DOM
    // portrait. Warm neutral wall colors must not inherit the green silk tint.
    const proof = await readRoomRasterProof(hero);
    expect(proof).not.toBeNull();
    await test.info().attach("photograph-raster-proof", {
      body: JSON.stringify(proof, null, 2), contentType: "application/json",
    });
    expect(proof!.edgeColorErrors).toHaveLength(6);
    for (const error of proof!.edgeColorErrors) expect(error).toBeLessThan(3);
    expect(proof!.silkPattern.samples).toBeGreaterThan(25);
    expect(proof!.silkPattern.meanDifferenceError).toBeLessThan(1.2);
    expect(proof!.featherSeam.samples).toBeGreaterThan(100);
    expect(proof!.featherSeam.meanDifferenceError).toBeLessThan(1.2);
    expect(proof!.sampledPixels).toBeGreaterThan(250);
    expect(proof!.warpedError).toBeLessThan(2);
    expect(proof!.warpedError).toBeLessThan(proof!.rigidError * 0.65);

  });

  test("deforms the photograph locally with the running silk field while David stays still", async ({ page }) => {
    const { hero } = await openHomepageHero(page);
    await expect(hero).toHaveAttribute("data-hero-interior-ready", "true");
    await page.waitForTimeout(2_000);
    const initial = await readSceneGeometry(hero);
    const frames = [];
    for (let index = 0; index < 3; index += 1) {
      const frame = await readRoomRasterProof(hero);
      expect(frame).not.toBeNull();
      expect(frame!.silkPattern.samples).toBeGreaterThan(25);
      expect(frame!.silkPattern.meanDifferenceError).toBeLessThan(1.2);
      expect(frame!.featherSeam.samples).toBeGreaterThan(100);
      expect(frame!.featherSeam.meanDifferenceError).toBeLessThan(1.2);
      expect(frame!.warpedError).toBeLessThan(2);
      expect(frame!.warpedError).toBeLessThan(frame!.rigidError * 0.65);
      expect(frame!.horizontalSpan).toBeGreaterThan(15);
      expect(frame!.verticalSpan).toBeGreaterThan(9);
      frames.push(frame!);
      if (index < 2) await page.waitForTimeout(1_200);
    }
    expect(frames[2]!.time - frames[0]!.time).toBeGreaterThan(0.03);
    expect(new Set(frames.map(frame => frame.hash)).size).toBe(3);
    expect((await readSceneGeometry(hero)).foreground).toEqual(initial.foreground);
    await test.info().attach("shared-field-raster-proof", {
      body: JSON.stringify(frames, null, 2), contentType: "application/json",
    });
  });

  test("keeps parallax subtle, leaves UI still, and freezes the complete scene", async ({ page }) => {
    const { canvas, hero, silk } = await openHomepageHero(page);
    await expect(hero).toHaveAttribute("data-hero-interior-ready", "true");
    await page.waitForTimeout(2_000);
    const initial = await readSceneGeometry(hero);
    await page.mouse.move(10, 100);
    await expect.poll(async () => Math.abs((await readSceneGeometry(hero)).foreground.x))
      .toBeGreaterThan(1);
    await page.waitForTimeout(500);
    const left = await readSceneGeometry(hero);
    expect(Math.abs(left.foreground.x)).toBeLessThanOrEqual(20.1);
    expect(Math.abs(left.foreground.x)).toBeGreaterThan(8);
    expect(Math.abs(left.foreground.y)).toBeLessThanOrEqual(12.1);
    const uniforms = await readInteriorScene(canvas);
    expect(uniforms!.parallax).toEqual([expect.any(Number), expect.any(Number)]);
    expect((uniforms!.parallax as number[])[0]).toBeLessThan(20);
    expect((uniforms!.parallax as number[])[1]).toBeLessThan(12);
    const leftPhoto = await readRoomRasterProof(hero);
    for (const error of leftPhoto!.edgeColorErrors) expect(error).toBeLessThan(3);
    for (const [index, box] of left.ui.entries()) {
      expect(Math.abs(box.left - initial.ui[index]!.left)).toBeLessThan(0.1);
      expect(Math.abs(box.top - initial.ui[index]!.top)).toBeLessThan(0.1);
    }

    await hero.evaluate(element => element.setAttribute("data-hero-handoff-frozen", ""));
    await expect(silk).toHaveAttribute("data-silk-paused", "");
    const frozen = await readSceneGeometry(hero);
    const frozenUniforms = await readInteriorScene(canvas);
    await page.mouse.move(1430, 880);
    await page.waitForTimeout(500);
    expect((await readSceneGeometry(hero)).foreground).toEqual(frozen.foreground);
    expect((await readInteriorScene(canvas))!.pointer).toEqual(frozenUniforms!.pointer);
    await hero.evaluate(element => element.removeAttribute("data-hero-handoff-frozen"));
    await expect(silk).not.toHaveAttribute("data-silk-paused", "");
    // Pointer input during the frozen handoff is deliberately ignored.
    // A fresh event after resume starts the next interaction.
    await page.mouse.move(1429, 879);
    await expect.poll(async () => (await readSceneGeometry(hero)).foreground.x)
      .toBeGreaterThan(8);
    await page.waitForTimeout(500);
    const rightPhoto = await readRoomRasterProof(hero);
    for (const error of rightPhoto!.edgeColorErrors) expect(error).toBeLessThan(3);
  });

  test("keeps the registered room and clean portrait when WebGL is unavailable", async ({ page }) => {
    await primeRejectedConsent(page);
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
        if (type === "webgl" || type === "webgl2") return null;
        return original.apply(this, [type, ...args] as Parameters<typeof original>);
      } as typeof original;
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Escape");
    const hero = page.locator(HERO_SELECTOR);
    await expect(hero).toHaveAttribute("data-hero-effects-mode", "static");
    await expect(hero.locator("[data-hero-interior-image]")).toBeVisible();
    await expect(hero.locator("[data-hero-scene-foreground] img")).toBeVisible();
    await expect(hero).not.toHaveAttribute("data-hero-interior-ready", "true");
    await expect(hero.locator("[data-hero-scene-foreground]"))
      .toHaveCSS("transform", "none");
    await expect(hero.locator("[data-hero-actions] a").first()).toBeVisible();
  });

  test("does not block the silk timeline while the room image is delayed", async ({ page }) => {
    let releaseImage!: () => void;
    const imageGate = new Promise<void>(resolve => { releaseImage = resolve; });
    let intercepted = false;
    await page.route("**/bckgv1-hero.avif", async route => {
      intercepted = true;
      await imageGate;
      await route.continue();
    });
    try {
      const { canvas, hero, silk } = await openHomepageHero(page);
      expect(intercepted).toBe(true);
      await expect(silk).toHaveAttribute("data-state", "ready");
      await expect(hero).not.toHaveAttribute("data-hero-interior-ready", "true");
      await expect(hero.locator("[data-hero-actions] a").first()).toBeVisible();
      await expect(hero.locator("[data-hero-scene-foreground] img")).toBeVisible();
      const time = await requireWebGlTime(canvas);
      await expect.poll(async () => (await readWebGlUniform(canvas, "uTime")) ?? 0)
        .toBeGreaterThan(time + 0.01);
      releaseImage();
      await expect(hero).toHaveAttribute("data-hero-interior-ready", "true");
      expect((await readInteriorScene(canvas))!.ready).toBe(1);
    } finally {
      releaseImage();
    }
  });

  test("restores the DOM room after context loss without leaving portrait parallax running", async ({ page }) => {
    const { canvas, hero } = await openHomepageHero(page);
    await expect(hero).toHaveAttribute("data-hero-interior-ready", "true");
    await page.mouse.move(10, 100);
    await expect.poll(async () => Math.abs((await readSceneGeometry(hero)).foreground.x))
      .toBeGreaterThan(1);
    const contextLost = await canvas.evaluate(element => {
      const canvas = element as HTMLCanvasElement;
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      const extension = gl?.getExtension("WEBGL_lose_context");
      if (!extension) return false;
      extension.loseContext();
      return true;
    });
    expect(contextLost).toBe(true);
    await expect(hero).not.toHaveAttribute("data-hero-interior-ready", "true");
    await expect(hero.locator("[data-hero-interior-image]")).toBeVisible();
    await expect(hero.locator("[data-hero-scene-foreground]"))
      .toHaveCSS("transform", "none");
    await expect(hero.locator("[data-hero-actions] a").first()).toBeVisible();
  });
});
