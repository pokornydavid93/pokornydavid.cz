import { expect, test, type Page } from "@playwright/test";

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

type HandoffSnapshot = {
  active: string | null;
  driver: string | null;
  heroHeight: number;
  heroInert: boolean;
  heroVisibility: string;
  playbackState: string | null;
  profileInert: boolean;
  profileTop: number;
  progress: number;
  scrollY: number;
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

async function enableLenisInBrowserTest(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", {
      configurable: true,
      get: () => false,
    });
  });
}

async function waitForLenis(page: Page) {
  await page.waitForFunction(() => {
    const lenisWindow = window as Window & {
      __lenis?: { scrollTo?: (target: number) => void };
    };

    return typeof lenisWindow.__lenis?.scrollTo === "function";
  });
}

async function openDesktopHandoff(page: Page) {
  await primeRejectedConsent(page);
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto("/", { waitUntil: "networkidle" });

  const controller = page.locator("[data-hero-profile-handoff]");
  await expect(controller).toHaveAttribute("data-state", "ready");
  await expect(controller).toHaveAttribute(
    "data-playback-state",
    "idle-hero",
  );
  await expect(controller).toHaveAttribute(
    "data-drive",
    "intent-autoplay",
  );
  await expect.poll(() => page.locator("[data-cinematic-home-hero]").evaluate(
    (element) => !element.hasAttribute("data-home-intro-active"),
  )).toBe(true);

  expect(await page.evaluate(() => {
    return Boolean((window as Window & { __lenis?: unknown }).__lenis);
  })).toBe(false);

  return controller;
}

async function readHandoffSnapshot(page: Page): Promise<HandoffSnapshot> {
  return page.evaluate(() => {
    const controller = document.querySelector<HTMLElement>(
      "[data-hero-profile-handoff]",
    )!;
    const hero = document.querySelector<HTMLElement>(
      "[data-cinematic-home-hero]",
    )!;
    const profile = document.querySelector<HTMLElement>(
      '[data-home-module="profile"]',
    )!;

    return {
      active: controller.dataset.active ?? null,
      driver: controller.dataset.autoplayDriver ?? null,
      heroHeight: hero.offsetHeight,
      heroInert: hero.inert,
      heroVisibility: getComputedStyle(hero).visibility,
      playbackState: controller.dataset.playbackState ?? null,
      profileInert: profile.inert,
      profileTop: profile.getBoundingClientRect().top,
      progress: Number(controller.dataset.sceneProgress ?? "0"),
      scrollY: window.scrollY,
    };
  });
}

async function expectForwardLanding(page: Page) {
  const controller = page.locator("[data-hero-profile-handoff]");
  const profile = page.locator('[data-home-module="profile"]');

  await expect(controller).toHaveAttribute(
    "data-playback-state",
    "idle-profile",
  );
  await expect(controller).toHaveAttribute("data-scene-progress", "1.000");
  await expect(controller).toHaveAttribute("data-active", "false");
  await expect(profile).toHaveAttribute(
    "data-profile-handoff-phase",
    "complete",
  );
  await expect(profile.locator("[data-profile-heading]")).toBeVisible();
  await expect(profile.locator("[data-profile-introduction]")).toBeVisible();
  await expect(profile.locator("[data-profile-approach]")).toHaveCount(0);
  await expect(profile.locator("[data-profile-quote]")).toBeVisible();
  await expect(profile.locator("[data-profile-detail]")).toBeVisible();
  await expect(profile.locator("[data-profile-portrait-frame]")).toBeVisible();
  await expect(profile.locator("[data-profile-about-link]")).toBeVisible();
  await expect(profile.locator("[data-profile-cta]")).toHaveCount(0);
  await expect(profile.locator("[data-profile-next]")).toHaveCount(0);
  await expect(profile.locator("[data-profile-actions]")).toHaveCount(0);

  const snapshot = await readHandoffSnapshot(page);
  expect(Math.abs(snapshot.scrollY - snapshot.heroHeight)).toBeLessThanOrEqual(5);
  expect(Math.abs(snapshot.profileTop)).toBeLessThanOrEqual(5);
  expect(snapshot.heroInert).toBe(true);
  expect(snapshot.heroVisibility).toBe("hidden");
  expect(snapshot.profileInert).toBe(false);
}

async function observeNativeForwardStart(
  page: Page,
  gesture: () => Promise<void>,
) {
  const forwardStarted = page.waitForFunction(() => {
    const controller = document.querySelector<HTMLElement>(
      "[data-hero-profile-handoff]",
    );
    return (
      controller?.dataset.playbackState === "autoplay-forward"
      && controller.dataset.autoplayDriver === "native"
    );
  });

  await gesture();
  await forwardStarted;
}

for (const [label, deltas] of [
  ["slow trackpad gesture", [3, 3, 3, 3, 3]],
  ["fast wheel flick", [1_400]],
] as const) {
  test(`self-completes a native forward landing after a ${label}`, async ({
    page,
  }) => {
    await openDesktopHandoff(page);

    await observeNativeForwardStart(page, async () => {
      for (const deltaY of deltas) {
        await page.mouse.wheel(0, deltaY);
        await page.waitForTimeout(24);
      }
    });
    await expectForwardLanding(page);
  });
}

test("reverses from the current frame when opposite intent arrives mid-flight", async ({
  page,
}) => {
  const controller = await openDesktopHandoff(page);
  const hero = page.locator("[data-cinematic-home-hero]");

  await page.mouse.wheel(0, 180);
  await expect(controller).toHaveAttribute(
    "data-playback-state",
    "autoplay-forward",
  );
  await expect.poll(async () => {
    return Number(await controller.getAttribute("data-scene-progress"));
  }).toBeGreaterThan(0.06);

  await page.mouse.wheel(0, -180);
  await expect(controller).toHaveAttribute(
    "data-playback-state",
    "autoplay-reverse",
  );
  await expect(controller).toHaveAttribute(
    "data-autoplay-driver",
    "native",
  );
  await expect(controller).toHaveAttribute("data-playback-state", "idle-hero");
  await expect(controller).toHaveAttribute("data-scene-progress", "0.000");
  await expect(controller).toHaveAttribute("data-active", "false");
  await expect(hero).not.toHaveAttribute("data-hero-handoff-frozen");

  const snapshot = await readHandoffSnapshot(page);
  expect(snapshot.scrollY).toBeLessThanOrEqual(1);
  expect(snapshot.heroInert).toBe(false);
  expect(snapshot.heroVisibility).toBe("visible");
  expect(snapshot.profileInert).toBe(true);
});

test("supports keyboard intent in both directions", async ({ page }) => {
  const controller = await openDesktopHandoff(page);

  await page.keyboard.press("PageDown");
  await expect(controller).toHaveAttribute(
    "data-playback-state",
    "autoplay-forward",
  );
  await expectForwardLanding(page);

  await page.keyboard.press("ArrowUp");
  await expect(controller).toHaveAttribute(
    "data-playback-state",
    "autoplay-reverse",
  );
  await expect(controller).toHaveAttribute("data-playback-state", "idle-hero");
  await expect(controller).toHaveAttribute("data-scene-progress", "0.000");

  const snapshot = await readHandoffSnapshot(page);
  expect(snapshot.scrollY).toBeLessThanOrEqual(1);
  expect(snapshot.heroVisibility).toBe("visible");
});

test("keeps the profile surface flush with the viewport in both scrub directions", async ({
  page,
}) => {
  const controller = await openDesktopHandoff(page);
  const heroHeight = await page.locator("[data-cinematic-home-hero]").evaluate(
    (element) => (element as HTMLElement).offsetHeight,
  );
  const assertAnchoredAt = async (ratio: number) => {
    await page.evaluate(
      ({ height, progress }) => window.scrollTo(0, height * progress),
      { height: heroHeight, progress: ratio },
    );
    await expect.poll(async () => {
      const progress = Number(
        await controller.getAttribute("data-scene-progress"),
      );
      return Math.abs(progress - ratio);
    }).toBeLessThan(0.01);

    const snapshot = await readHandoffSnapshot(page);
    expect(Math.abs(snapshot.profileTop)).toBeLessThanOrEqual(1);
  };

  for (const ratio of [0.1, 0.25, 0.5, 0.75, 0.9]) {
    await assertAnchoredAt(ratio);
  }
  for (const ratio of [0.75, 0.5, 0.25, 0.1]) {
    await assertAnchoredAt(ratio);
  }
});

test("releases directly into the natural situations scroll after the profile landing", async ({
  page,
}) => {
  const controller = await openDesktopHandoff(page);
  const situationsController = page.locator(
    "[data-profile-situations-handoff]",
  );

  await page.mouse.wheel(0, 220);
  await expectForwardLanding(page);

  const landingY = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 360);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(
    landingY + 40,
  );
  await expect(situationsController).toHaveAttribute(
    "data-playback-state",
    "bypassed",
  );
  await expect(situationsController).toHaveAttribute(
    "data-drive",
    "natural-scroll",
  );
  await expect(situationsController).toHaveAttribute(
    "data-entry-state",
    /revealing|complete/u,
  );
  await expect(controller).toHaveAttribute(
    "data-playback-state",
    "idle-profile",
  );
});

test("lands exactly and releases the following wheel with real Lenis", async ({
  page,
}) => {
  await primeRejectedConsent(page);
  await enableLenisInBrowserTest(page);
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto("/", { waitUntil: "networkidle" });
  await waitForLenis(page);

  const controller = page.locator("[data-hero-profile-handoff]");
  const situationsController = page.locator(
    "[data-profile-situations-handoff]",
  );
  await expect(controller).toHaveAttribute("data-state", "ready");
  await expect(controller).toHaveAttribute(
    "data-playback-state",
    "idle-hero",
  );

  const lenisForwardStarted = page.waitForFunction(() => {
    const handoff = document.querySelector<HTMLElement>(
      "[data-hero-profile-handoff]",
    );
    return (
      handoff?.dataset.playbackState === "autoplay-forward"
      && handoff.dataset.autoplayDriver === "lenis"
    );
  });

  await page.mouse.wheel(0, 1_400);
  await lenisForwardStarted;
  await expectForwardLanding(page);

  const landing = await page.evaluate(() => {
    const lenisWindow = window as Window & {
      __lenis?: {
        actualScroll: number;
        isLocked: boolean;
        targetScroll: number;
      };
    };
    const hero = document.querySelector<HTMLElement>(
      "[data-cinematic-home-hero]",
    )!;
    const lenis = lenisWindow.__lenis!;

    return {
      actualScroll: lenis.actualScroll,
      heroHeight: hero.offsetHeight,
      isLocked: lenis.isLocked,
      scrollY: window.scrollY,
      targetScroll: lenis.targetScroll,
    };
  });

  expect(landing.isLocked).toBe(false);
  expect(Math.abs(landing.scrollY - landing.heroHeight)).toBeLessThanOrEqual(3);
  expect(Math.abs(landing.actualScroll - landing.scrollY)).toBeLessThanOrEqual(1);
  expect(Math.abs(landing.targetScroll - landing.scrollY)).toBeLessThanOrEqual(1);
  await expect(page.locator("html")).not.toHaveClass(/(?:^|\s)lenis-locked(?:\s|$)/u);

  const profileLandingY = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 360);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(
    profileLandingY + 40,
  );
  await expect(situationsController).toHaveAttribute(
    "data-playback-state",
    "bypassed",
  );
  await expect(situationsController).toHaveAttribute(
    "data-drive",
    "natural-scroll",
  );
  await expect(controller).toHaveAttribute(
    "data-playback-state",
    "idle-profile",
  );
  expect(await page.evaluate(() => {
    const lenisWindow = window as Window & {
      __lenis?: { isLocked: boolean };
    };
    return lenisWindow.__lenis?.isLocked;
  })).toBe(false);

  const naturalScrollY = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 360);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(
    naturalScrollY + 40,
  );
  await expect(situationsController).toHaveAttribute(
    "data-playback-state",
    "bypassed",
  );
});

test("keeps mobile in natural flow and bypasses autoplay", async ({ page }) => {
  await primeRejectedConsent(page);
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto("/", { waitUntil: "networkidle" });

  const controller = page.locator("[data-hero-profile-handoff]");
  const hero = page.locator("[data-cinematic-home-hero]");
  const profile = page.locator('[data-home-module="profile"]');

  await expect(controller).toHaveAttribute("data-state", "natural-flow");
  await expect(controller).toHaveAttribute("data-playback-state", "bypassed");
  await expect(profile).toHaveAttribute(
    "data-profile-handoff-mode",
    "natural-flow",
  );
  await expect(profile).toHaveAttribute(
    "data-profile-handoff-playback-state",
    "bypassed",
  );
  await expect(page.locator(".pin-spacer, [data-pin-spacer]")).toHaveCount(0);
  await expect(profile).toHaveCSS("clip-path", "none");
  await expect(profile).toHaveCSS("transform", "none");
  expect(await readHandoffSnapshot(page)).toMatchObject({
    heroInert: false,
    profileInert: false,
  });

  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 280);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(
    before + 20,
  );
  await expect(hero).not.toHaveAttribute("data-hero-handoff-frozen");
  await expect(controller).toHaveAttribute("data-playback-state", "bypassed");
});

test("uses the static reduced-motion fallback without trapping scroll", async ({
  page,
}) => {
  await primeRejectedConsent(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto("/", { waitUntil: "networkidle" });

  const controller = page.locator("[data-hero-profile-handoff]");
  const profile = page.locator('[data-home-module="profile"]');

  await expect(controller).toHaveAttribute("data-state", "reduced-motion");
  await expect(controller).toHaveAttribute("data-playback-state", "bypassed");
  await expect(controller).toHaveAttribute("data-scene-phase", "static");
  await expect(profile).toHaveAttribute("data-profile-handoff-mode", "static");
  await expect(profile).toHaveAttribute(
    "data-profile-handoff-playback-state",
    "bypassed",
  );
  await expect(page.locator(".pin-spacer, [data-pin-spacer]")).toHaveCount(0);
  await expect(profile).toHaveCSS("clip-path", "none");
  await expect(profile).toHaveCSS("transform", "none");
  expect(await readHandoffSnapshot(page)).toMatchObject({
    heroInert: false,
    profileInert: false,
  });

  await page.mouse.wheel(0, 280);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(
    20,
  );
  await expect(controller).toHaveAttribute("data-playback-state", "bypassed");
});

test("uses natural flow through tablet and enables cinema only above 1040px", async ({
  page,
}) => {
  await primeRejectedConsent(page);

  for (const width of [768, 1040]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    const controller = page.locator("[data-hero-profile-handoff]");
    await expect(controller).toHaveAttribute("data-state", "natural-flow");
    await expect(page.locator('[data-home-module="profile"]')).toHaveAttribute(
      "data-profile-handoff-mode",
      "natural-flow",
    );
    expect(await readHandoffSnapshot(page)).toMatchObject({
      heroInert: false,
      profileInert: false,
    });
  }

  await page.setViewportSize({ width: 1041, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("[data-hero-profile-handoff]")).toHaveAttribute(
    "data-state",
    "ready",
  );
  expect(await readHandoffSnapshot(page)).toMatchObject({
    heroInert: false,
    profileInert: true,
  });
});

test("keeps both scenes inert mid-handoff and updates media fallbacks live", async ({
  page,
}) => {
  const controller = await openDesktopHandoff(page);
  const profile = page.locator('[data-home-module="profile"]');
  const readSignatureState = () => profile.evaluate((section) => {
    const read = (selector: string) => {
      const style = getComputedStyle(
        section.querySelector<HTMLElement>(selector)!,
      );
      return {
        opacity: style.opacity,
        transform: style.transform,
        visibility: style.visibility,
      };
    };

    return {
      aboutIcon: read("[data-profile-about-icon]"),
      aboutLink: read("[data-profile-about-link]"),
      detail: read("[data-profile-detail]"),
      story: read('[data-profile-story="lead"]'),
      statement: read("[data-profile-quote]"),
    };
  });
  const expectStaticSignature = async () => {
    await expect.poll(async () => {
      const signature = await readSignatureState();
      return Object.values(signature).every((state) => (
        Number.parseFloat(state.opacity) >= 0.999
        && state.transform === "none"
        && state.visibility === "visible"
      ));
    }).toBe(true);
  };
  const heroHeight = await page.locator("[data-cinematic-home-hero]").evaluate(
    (element) => (element as HTMLElement).offsetHeight,
  );

  await page.evaluate((top) => window.scrollTo(0, top), heroHeight * 0.5);
  await expect.poll(async () => {
    return Number(await controller.getAttribute("data-scene-progress"));
  }).toBeGreaterThan(0.45);
  expect(await readHandoffSnapshot(page)).toMatchObject({
    heroInert: true,
    profileInert: true,
  });

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(controller).toHaveAttribute("data-state", "reduced-motion");
  expect(await readHandoffSnapshot(page)).toMatchObject({
    heroInert: false,
    profileInert: false,
  });
  await expectStaticSignature();

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(controller).toHaveAttribute("data-state", "ready");
  expect(await readHandoffSnapshot(page)).toMatchObject({
    heroInert: false,
    profileInert: true,
  });

  await page.emulateMedia({ forcedColors: "active" });
  await expect(controller).toHaveAttribute("data-state", "forced-colors");
  expect(await readHandoffSnapshot(page)).toMatchObject({
    heroInert: false,
    profileInert: false,
  });
  await expectStaticSignature();
});

test("recalculates an exact profile landing after a height-only resize", async ({
  page,
}) => {
  const controller = await openDesktopHandoff(page);

  await page.mouse.wheel(0, 1_400);
  await expectForwardLanding(page);
  await page.setViewportSize({ width: 1440, height: 650 });

  await expect.poll(async () => {
    const snapshot = await readHandoffSnapshot(page);
    return Math.max(
      Math.abs(snapshot.scrollY - snapshot.heroHeight),
      Math.abs(snapshot.profileTop),
    );
  }).toBeLessThanOrEqual(5);
  expect(await page.locator('[data-home-module="profile"]').evaluate(
    (element) => element.getBoundingClientRect().height,
  )).toBeGreaterThanOrEqual(650);

  await page.keyboard.press("ArrowUp");
  await expect(controller).toHaveAttribute(
    "data-playback-state",
    "autoplay-reverse",
  );
  await expect(controller).toHaveAttribute("data-playback-state", "idle-hero");
  expect(await readHandoffSnapshot(page)).toMatchObject({
    heroInert: false,
    profileInert: true,
  });
});

test("keeps a direct profile hash landing complete across height-only resizes", async ({
  page,
}) => {
  await primeRejectedConsent(page);
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto("/#david", { waitUntil: "networkidle" });

  const controller = page.locator("[data-hero-profile-handoff]");
  await expect(controller).toHaveAttribute("data-state", "ready");
  await expectForwardLanding(page);

  for (const height of [920, 650]) {
    await page.setViewportSize({ width: DESKTOP_VIEWPORT.width, height });
    await expect.poll(async () => {
      const snapshot = await readHandoffSnapshot(page);
      return Math.max(
        Math.abs(snapshot.scrollY - snapshot.heroHeight),
        Math.abs(snapshot.profileTop),
      );
    }).toBeLessThanOrEqual(5);
    await expectForwardLanding(page);
  }
});
