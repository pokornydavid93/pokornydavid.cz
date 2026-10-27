import { expect, test, type Page } from "@playwright/test";

type RevealStyle = {
  clipPath: string;
  display: string;
  opacity: number;
  transform: string;
  visibility: string;
  x: number;
};

type RevealSnapshot = {
  actions: RevealStyle | null;
  heading: RevealStyle | null;
  header: RevealStyle | null;
  headerInnerInert: boolean | null;
  lead: RevealStyle | null;
  portrait: RevealStyle | null;
};

type RevealProbe = {
  aperture: RevealSnapshot | null;
  handoff: RevealSnapshot | null;
  phases: string[];
  prepared: RevealSnapshot | null;
};

type WindowWithRevealProbe = Window & { __heroIntroProbe?: RevealProbe };

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

test.describe("homepage hero intro reveal", () => {
  test("reveals the portrait, then copy from the left, then navigation", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    // Next dev may spend the intro's entire safety window compiling a cold
    // route. Warm its client chunks, then measure the authored entrance.
    await page.goto("/", { waitUntil: "networkidle" });
    await page.addInitScript(() => {
      const probe: RevealProbe = {
        aperture: null,
        handoff: null,
        phases: [],
        prepared: null,
      };
      (window as WindowWithRevealProbe).__heroIntroProbe = probe;

      const readStyle = (element: HTMLElement | null): RevealStyle | null => {
        if (!element) return null;
        const style = getComputedStyle(element);
        return {
          clipPath: style.clipPath,
          display: style.display,
          opacity: Number.parseFloat(style.opacity),
          transform: style.transform,
          visibility: style.visibility,
          x: style.transform === "none"
            ? 0
            : new DOMMatrixReadOnly(style.transform).m41,
        };
      };
      const capture = (): RevealSnapshot | null => {
        const hero = document.querySelector<HTMLElement>(
          "[data-cinematic-home-hero]",
        );
        if (!hero) return null;
        const header = hero.querySelector<HTMLElement>(
          '[data-header-instance="hero"]',
        );
        return {
          actions: readStyle(hero.querySelector("[data-hero-actions]")),
          heading: readStyle(hero.querySelector("[data-hero-heading-line-inner]")),
          header: readStyle(header),
          headerInnerInert: header?.querySelector<HTMLElement>(
            "[data-header-motion-inner]",
          )?.inert ?? null,
          lead: readStyle(hero.querySelector("[data-hero-lead]")),
          portrait: readStyle(hero.querySelector("[data-hero-portrait]")),
        };
      };

      const recordAperture = () => {
        if (
          !probe.aperture
          && document.querySelector<HTMLElement>("[data-home-intro]")
            ?.dataset.homeIntroPhase === "hero-reveal"
        ) {
          probe.aperture = capture();
        }
      };
      new MutationObserver(recordAperture).observe(document, {
        attributeFilter: ["data-home-intro-phase"],
        attributes: true,
        childList: true,
        subtree: true,
      });

      window.addEventListener("home:hero-reveal-start", () => {
        const controller = document.querySelector<HTMLElement>(
          "[data-hero-intro-reveal]",
        );
        if (controller) {
          const appendPhase = (phase: string | null | undefined) => {
            if (phase && probe.phases.at(-1) !== phase) probe.phases.push(phase);
          };
          appendPhase(controller.dataset.phase);
          new MutationObserver((records) => {
            for (const record of records) appendPhase(record.oldValue);
            appendPhase(controller.dataset.phase);
          }).observe(controller, {
            attributeFilter: ["data-phase"],
            attributeOldValue: true,
            attributes: true,
          });
        }
        // Runs after HeroIntroReveal's event listener, before the next paint.
        queueMicrotask(() => { probe.prepared = capture(); });
      }, { once: true });
      window.addEventListener("home:intro-complete", () => {
        probe.handoff = capture();
      }, { once: true });
    });
    await page.reload({ waitUntil: "commit" });

    const controller = page.locator("[data-hero-intro-reveal]");
    await expect(controller).toBeAttached();

    await expect(controller).toHaveAttribute("data-state", "complete", {
      timeout: 15_000,
    });

    const hero = page.locator("[data-cinematic-home-hero]");
    await expect(hero).toHaveAttribute("data-hero-reveal-settled", "true");
    const result = await hero.evaluate((element) => {
      const readStyle = (selector: string) => {
        const target = element.querySelector<HTMLElement>(selector);
        if (!target) return null;
        const style = getComputedStyle(target);
        return {
          clipPath: style.clipPath,
          opacity: style.opacity,
          transform: style.transform,
          visibility: style.visibility,
        };
      };

      return {
        actions: readStyle("[data-hero-actions]"),
        heading: readStyle("[data-hero-heading-line-inner]"),
        header: readStyle('[data-header-instance="hero"]'),
        headerInnerInert: element.querySelector<HTMLElement>(
          '[data-header-instance="hero"] [data-header-motion-inner]',
        )?.inert ?? null,
        lead: readStyle("[data-hero-lead]"),
        portrait: readStyle("[data-hero-portrait]"),
        motion: element.dataset.heroIntroMotion,
        probe: (window as WindowWithRevealProbe).__heroIntroProbe ?? null,
      };
    });

    expect(result.probe?.aperture).not.toBeNull();
    for (const style of [
      result.probe?.aperture?.heading,
      result.probe?.aperture?.lead,
      result.probe?.aperture?.actions,
    ]) {
      expect(style?.opacity).toBe(0);
      expect(style?.visibility).toBe("hidden");
    }
    // The portrait entrance now runs through the opening aperture. The same
    // authored copy/navigation order continues without a second blank scene.
    expect(result.probe?.aperture?.portrait?.opacity).toBeGreaterThan(0);
    expect(result.probe?.aperture?.portrait?.visibility).toBe("visible");
    expect(result.probe?.aperture?.header?.clipPath).toContain("100%");
    expect(result.probe?.aperture?.headerInnerInert).toBe(true);

    const prepared = result.probe?.prepared;
    expect(prepared).not.toBeNull();
    expect(prepared?.heading?.opacity).toBe(0);
    expect(prepared?.heading?.x).toBeLessThan(-50);
    expect(prepared?.lead?.x).toBeLessThan(-30);
    expect(prepared?.actions?.x).toBeLessThan(-20);
    expect(prepared?.portrait?.opacity).toBe(0);
    expect(prepared?.portrait?.x).toBeGreaterThan(50);
    expect(prepared?.header?.clipPath).toContain("100%");
    expect(prepared?.headerInnerInert).toBe(true);
    expect(result.probe?.handoff?.heading?.opacity).toBeGreaterThan(0);
    expect(result.probe?.handoff?.portrait?.opacity).toBe(1);

    expect(result.probe?.phases).toEqual(expect.arrayContaining([
      "portrait",
      "promise",
      "action",
      "navigation",
      "complete",
    ]));
    expect(result.probe?.phases.indexOf("portrait"))
      .toBeLessThan(result.probe?.phases.indexOf("promise") ?? -1);
    expect(result.probe?.phases.indexOf("navigation"))
      .toBeGreaterThan(result.probe?.phases.indexOf("action") ?? -1);
    await expect(controller).toHaveAttribute(
      "data-sequence",
      "portrait,promise,context,action,navigation",
    );
    expect(result.motion).toBe("complete");
    for (const style of [
      result.heading,
      result.lead,
      result.actions,
    ]) {
      expect(style).toEqual({
        clipPath: "none",
        opacity: "1",
        transform: "none",
        visibility: "visible",
      });
    }
    expect(result.portrait?.opacity).toBe("1");
    expect(result.portrait?.transform).toBe("none");
    expect(result.portrait?.visibility).toBe("visible");
    expect(result.header?.clipPath).toBe("none");
    expect(result.header?.opacity).toBe("1");
    expect(result.header?.visibility).toBe("visible");
    expect(result.headerInnerInert).toBe(false);
  });

  test("keeps the complete hero static with reduced motion", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const controller = page.locator("[data-hero-intro-reveal]");
    await expect(controller).toHaveAttribute("data-state", "reduced-motion");
    await expect(page.locator("html")).toHaveAttribute(
      "data-home-intro-state", "complete",
    );

    const hero = page.locator("[data-cinematic-home-hero]");
    await expect(hero).toHaveAttribute("data-hero-reveal-settled", "true");
    await expect(hero.locator("[data-hero-heading-line-inner]").first())
      .toHaveCSS("transform", "none");
    await expect(hero.locator("[data-hero-actions]")).toBeVisible();
    await expect(hero.locator("[data-hero-portrait]")).toBeVisible();
    await expect(hero.locator('[data-header-instance="hero"]'))
      .toHaveCSS("clip-path", "none");
    await expect(hero.locator('[data-header-instance="hero"] [data-header-motion-inner]'))
      .not.toHaveAttribute("inert");
    await expect(hero.locator("[data-hero-trust]")).toHaveCount(0);
    await expect(hero.locator("[data-hero-eyebrow]")).toHaveCount(0);
    await expect(hero).not.toHaveAttribute("data-hero-intro-motion");
  });

  test("shows the complete hero immediately when the intro is skipped", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.addInitScript(() => {
      const skipWindow = window as Window & {
        __introSkipDispatched?: boolean;
        __introSkippedEvent?: boolean;
      };
      window.addEventListener("home:intro-complete", (event) => {
        skipWindow.__introSkippedEvent = Boolean(
          (event as CustomEvent<{ skipped?: boolean }>).detail?.skipped,
        );
      });
      const skipWhenReady = () => {
        if (
          skipWindow.__introSkipDispatched
          || !["pending", "active"].includes(
            document.documentElement?.dataset.homeIntroState ?? "",
          )
        ) return;
        skipWindow.__introSkipDispatched = true;
        queueMicrotask(() => {
          window.dispatchEvent(new KeyboardEvent("keydown", {
            bubbles: true,
            key: "Escape",
          }));
        });
      };
      new MutationObserver(skipWhenReady).observe(document, {
        attributeFilter: ["data-home-intro-state"],
        attributes: true,
        childList: true,
        subtree: true,
      });
      skipWhenReady();
    });
    await page.goto("/", { waitUntil: "commit" });
    await expect.poll(() => page.evaluate(() => (
      window as Window & { __introSkipDispatched?: boolean }
    ).__introSkipDispatched)).toBe(true);
    await expect.poll(() => page.evaluate(() => (
      window as Window & { __introSkippedEvent?: boolean }
    ).__introSkippedEvent)).toBe(true);

    const controller = page.locator("[data-hero-intro-reveal]");
    await expect(controller).toHaveAttribute("data-state", /^(skipped|fallback)$/);
    const hero = page.locator("[data-cinematic-home-hero]");
    await expect(hero).toHaveAttribute("data-hero-reveal-settled", "true");
    await expect(hero.locator("[data-hero-heading-line-inner]").first())
      .toBeVisible();
    await expect(hero.locator("[data-hero-lead]")).toBeVisible();
    await expect(hero.locator("[data-hero-actions]")).toBeVisible();
    await expect(hero.locator("[data-hero-portrait]")).toBeVisible();
    await expect(hero.locator('[data-header-instance="hero"]'))
      .toHaveCSS("clip-path", "none");
    await expect(hero.locator('[data-header-instance="hero"] [data-header-motion-inner]'))
      .not.toHaveAttribute("inert");
    await expect(hero).not.toHaveAttribute("data-hero-intro-motion");
  });
});
