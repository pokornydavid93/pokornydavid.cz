import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { SERVICE_CONFIG } from "../../app/content/service-labels";
import { featuredTestimonials } from "../../app/content/testimonials";

async function primeRejectedConsent(page: Page) {
  await page.addInitScript(() => {
    const decidedAt = Date.now();
    localStorage.setItem(
      "cookie_consent_v1",
      JSON.stringify({
        choice: "rejected",
        decidedAt,
        expiresAt: decidedAt + 180 * 24 * 60 * 60 * 1_000,
        version: "2026-05-05-ga4-v1",
      }),
    );
  });
}

async function dismissHomepageIntro(page: Page) {
  await page.locator("[data-home-intro]").waitFor({ state: "attached" });
  await expect.poll(async () => {
    await page.keyboard.press("Escape");
    return page.locator("[data-home-intro]").evaluate(
      (element) => getComputedStyle(element).display === "none",
    );
  }, { timeout: 20_000 }).toBe(true);
}

async function openHomepage(page: Page, approachReferences = true) {
  await primeRejectedConsent(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("[data-reference-carousel]").waitFor();
  await dismissHomepageIntro(page);
  if (approachReferences) await approachReferenceMotion(page);
}

async function scrollImmediately(page: Page, top: number) {
  await page.evaluate((scrollTop) => {
    const lenis = (window as Window & {
      __lenis?: {
        scrollTo?: (
          target: number,
          options?: { force?: boolean; immediate?: boolean },
        ) => void;
      };
    }).__lenis;

    if (lenis?.scrollTo) {
      lenis.scrollTo(scrollTop, { force: true, immediate: true });
    } else {
      window.scrollTo(0, scrollTop);
    }
  }, top);
}

type ReferenceMotion = "natural-editorial" | "reduced" | "static";

async function approachReferenceMotion(page: Page) {
  const root = page.locator("[data-reference-carousel]");
  const target = await root.evaluate((element) =>
    element.getBoundingClientRect().top + window.scrollY - window.innerHeight * 1.2
  );
  await scrollImmediately(page, target);
  const expectedMotion = await page.evaluate(() =>
    matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "reduced"
      : matchMedia("(forced-colors: active)").matches
        ? "static"
        : "natural-editorial"
  );
  await expect(root).toHaveAttribute("data-motion", expectedMotion);
}

async function expectNaturalReferenceFlow(
  page: Page,
  expectedMotion: ReferenceMotion = "natural-editorial",
) {
  const root = page.locator("[data-reference-carousel]");
  const stage = page.locator("[data-reference-reader-stage]");
  const cards = page.locator("[data-reference-card]");
  const links = page.locator(
    "[data-reference-card] [data-testimonial-source]",
  );

  await expect(root).toHaveAttribute("data-motion", expectedMotion);
  await expect(root).toHaveAttribute("data-layout", "list");
  await expect(root).toHaveAttribute("data-scroll-control", "natural");
  await expect(root).toHaveAttribute(
    "data-playback-state",
    expectedMotion === "natural-editorial" ? "scroll" : "static",
  );
  await expect(root).toHaveAttribute("data-scene-active", "false");
  expect(
    await stage.evaluate(
      (element) => element.parentElement?.classList.contains("pin-spacer") ?? false,
    ),
  ).toBe(false);
  await expect(cards).toHaveCount(featuredTestimonials.length);

  const cardStates = await cards.evaluateAll((items) => items.map((item) => ({
    bodyTransform: (item.querySelector<HTMLElement>(
      "[data-reference-card-body]",
    )?.style.transform ?? ""),
    opacity: Number.parseFloat(getComputedStyle(item).opacity),
    position: getComputedStyle(item).position,
    toplineTransform: (item.querySelector<HTMLElement>(
      "[data-reference-card-topline]",
    )?.style.transform ?? ""),
    visibility: getComputedStyle(item).visibility,
  })));
  if (expectedMotion === "natural-editorial") {
    expect(cardStates.every((card) =>
      card.bodyTransform !== ""
      && card.position === "relative"
      && card.toplineTransform !== ""
      && card.visibility === "visible"
    )).toBe(true);
  } else {
    expect(cardStates.every((card) =>
      card.bodyTransform === ""
      && card.opacity === 1
      && card.position === "relative"
      && card.toplineTransform === ""
      && card.visibility === "visible"
    )).toBe(true);
  }

  expect(
    await links.evaluateAll((items) =>
      items.every((item) => item.getAttribute("tabindex") !== "-1")
    ),
  ).toBe(true);

  const sectionTop = await root.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  await scrollImmediately(page, sectionTop + 40);
  const beforeWheel = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 320);
  await expect.poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(beforeWheel + 20);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
}

async function revealReference(page: Page, expectedIndex: number) {
  const root = page.locator("[data-reference-carousel]");
  const card = root.locator("[data-reference-card]").nth(expectedIndex);
  const target = await card.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.bottom + window.scrollY - window.innerHeight * 0.46;
  });
  await scrollImmediately(page, target);
  await expect.poll(() => card.locator("[data-reference-card-body]").evaluate(
    (element) => Math.abs(new DOMMatrix(getComputedStyle(element).transform).m42),
  )).toBeLessThan(0.5);
}

test.describe("homepage editorial reference reader", () => {
  test("leaves offscreen references static until approach and supports reverse scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHomepage(page, false);
    const root = page.locator("[data-reference-carousel]");
    await expect(root).toHaveAttribute("data-motion", "static");
    expect(await root.locator("[data-reference-card-body]").evaluateAll(
      (items) => items.every((item) => (item as HTMLElement).style.transform === ""),
    )).toBe(true);
    expect(await root.locator("[data-testimonial-source]").evaluateAll(
      (items) => items.every((item) => item.getAttribute("tabindex") !== "-1"),
    )).toBe(true);

    await approachReferenceMotion(page);
    await revealReference(page, 2);
    await scrollImmediately(page, 0);
    await expect.poll(() => root.locator("[data-reference-card-body]").last().evaluate(
      (element) => new DOMMatrix(getComputedStyle(element).transform).m42,
    )).toBeGreaterThan(19);
  });

  test("reveals a conversion focused before asynchronous motion setup", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openHomepage(page, false);
    const root = page.locator("[data-reference-carousel]");
    const conversion = root.locator("[data-references-conversion]");
    const action = conversion.getByRole("link", { name: "Získat přehled" });
    await expect(root).toHaveAttribute("data-motion", "static");
    await action.evaluate((element) => (element as HTMLElement).focus({ preventScroll: true }));
    await expect(root).toHaveAttribute("data-motion", "natural-editorial");
    await expect(action).toBeFocused();
    await expect(conversion).toHaveAttribute("data-references-conversion-motion-state", "complete");
    await expect(conversion.locator("[data-references-conversion-action-rail]"))
      .toHaveCSS("opacity", "1");
  });

  test("responds to preference changes before approach and restores a reference anchor", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openHomepage(page, false);
    const root = page.locator("[data-reference-carousel]");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(root).toHaveAttribute("data-motion", "reduced");
    await page.evaluate(() => { location.hash = "zkusenosti-klientu"; });
    await expect(root).toHaveAttribute("data-motion", "reduced");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(root).toHaveAttribute("data-motion", "natural-editorial");
    await revealReference(page, 1);
    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });
    await expect(root.locator("[data-reference-card-body]").nth(1))
      .toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    await expect(root.locator(".pin-spacer")).toHaveCount(0);
  });

  test("initializes direct section and heading anchors at the current scroll position", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await primeRejectedConsent(page);
    for (const hash of ["zkusenosti-klientu", "home-references-title"]) {
      await page.goto(`/#${hash}`, { waitUntil: "domcontentloaded" });
      await dismissHomepageIntro(page);
      const root = page.locator("[data-reference-carousel]");
      await expect(root).toHaveAttribute("data-motion", "natural-editorial");
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await expect.poll(() => root.locator("[data-reference-title-ink]").evaluateAll(
        (items) => Math.min(...items.map((item) => Number(getComputedStyle(item).opacity))),
      )).toBeGreaterThan(0.95);
      await expect(root.locator("[data-testimonial-source]").first()).not.toHaveAttribute("tabindex", "-1");
    }
  });

  test("keeps three photographed reviews, source links and business context", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openHomepage(page);

    const section = page.locator('[data-home-module="references"]');
    const cards = section.locator("[data-reference-card]");

    await expect(section.getByRole("heading", {
      level: 2,
      name: "Teď slovo těm, kteří to zažili.",
    })).toBeVisible();
    await expect(section.locator("[data-reference-intro-description]")).toHaveText(
      "Tři zkušenosti mých klientů ukazují, jak spolupráce vypadá v praxi — od srozumitelného vysvětlení přes hledání souvislostí až po dlouhodobou pomoc.",
    );
    await expect(cards).toHaveCount(featuredTestimonials.length);
    await expect(section.locator("[data-reference-theme]")).toHaveText([
      "DLOUHODOBÝ POHLED",
      "JASNÉ VYSVĚTLENÍ",
      "POMOC V PRAXI",
    ]);
    await expect(section.locator("[data-reference-carousel]"))
      .toHaveAttribute("data-motion", "natural-editorial");
    await expect(section.locator("[data-reference-current]")).toHaveCount(0);
    await expect(section.getByText("Tři důvody důvěry")).toHaveCount(0);
    await expect(cards.nth(2)).toContainText("Pavla Kučerová");
    await expect(cards.nth(2)).not.toContainText("Pavla Kucerova");
    await expect(section.locator("[data-testimonial-avatar-image]")).toHaveCount(3);
    expect(await cards.evaluateAll((items) => items.map((item) => ({
      id: item.getAttribute("data-testimonial-id"),
      photo: item.querySelector("[data-testimonial-avatar]")
        ?.getAttribute("data-testimonial-avatar"),
    })))).toEqual([
      {
        id: "denisa-reznickova",
        photo: "/images/testimonials/denisa-reznickova-avatar.webp",
      },
      {
        id: "stanislav-dvorak",
        photo: "/images/testimonials/stanislav-dvorak-avatar.webp",
      },
      {
        id: "pavla-kucerova",
        photo: "/images/testimonials/pavla-kucerova-avatar.webp",
      },
    ]);

    const composition = await section
      .locator("[data-reference-gallery]")
      .evaluate((gallery) => {
        const collection = gallery.querySelector<HTMLElement>(
          "[data-reference-card-collection]",
        )!;
        const galleryRect = gallery.getBoundingClientRect();
        const collectionRect = collection.getBoundingClientRect();
        const centerOf = (rect: DOMRect) => rect.left + rect.width / 2;
        const surfaces = Array.from(
          gallery.querySelectorAll<HTMLElement>("[data-reference-card-surface]"),
          (surface) => {
            const style = getComputedStyle(surface);
            return {
              background: style.backgroundColor,
              borderRadius: style.borderRadius,
            };
          },
        );
        return {
          cardCenterDelta: Math.abs(centerOf(collectionRect) - centerOf(galleryRect)),
          cardWidthRatio: collectionRect.width / galleryRect.width,
          surfaces,
        };
      });

    expect(composition.cardCenterDelta).toBeLessThanOrEqual(1);
    expect(composition.cardWidthRatio).toBeGreaterThanOrEqual(0.99);
    expect(composition.cardWidthRatio).toBeLessThanOrEqual(1.01);
    expect(composition.surfaces.every((surface) =>
      surface.background === "rgba(0, 0, 0, 0)"
      && surface.borderRadius === "0px"
    )).toBe(true);

    const renderedCards = await cards.evaluateAll((items) => items.map((item) => ({
      href: item.querySelector<HTMLAnchorElement>("[data-testimonial-source]")
        ?.getAttribute("href") ?? "",
      id: item.getAttribute("data-testimonial-id") ?? "",
      position: item.getAttribute("data-position") ?? "",
      ratingStars: item.querySelectorAll("[data-rating-star]").length,
      services: item.querySelector("[data-testimonial-services]")?.textContent ?? "",
      theme: item.querySelector("[data-reference-theme]")?.textContent ?? "",
      text: item.textContent ?? "",
    })));

    for (const [index, testimonial] of featuredTestimonials.entries()) {
      const expectedServices = testimonial.client.serviceKeys
        .slice(0, 2)
        .map((serviceKey) => SERVICE_CONFIG[serviceKey].shortLabel)
        .join(" · ");
      const renderedCard = renderedCards[index];
      expect(renderedCard?.id).toBe(testimonial.id);
      expect(renderedCard?.position).toBe(String(index + 1));
      expect(renderedCard?.text).toContain(testimonial.excerpt);
      expect(renderedCard?.text).toContain(testimonial.client.name);
      expect(renderedCard?.services).toContain(`Řešili jsme: ${expectedServices}`);
      expect(renderedCard?.theme).toBe(testimonial.theme);
      expect(renderedCard?.ratingStars).toBe(testimonial.rating ?? 5);
      expect(renderedCard?.href).toBe(testimonial.sourceUrl);
      expect(renderedCard?.text).toContain("Google recenze");
    }

    const conversion = section.locator("[data-references-conversion]");
    await expect(conversion).toHaveAttribute("data-surface-tone", "action");
    await expect(conversion.getByRole("heading", { level: 3 })).toHaveText(
      "Vaše zkušenost může začít stejně.",
    );
    await expect(conversion.getByRole("link", {
      name: "Získat přehled",
    })).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=homepage&cta=home-references",
    );
  });

  test("reveals every reference in natural document flow without pinning", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openHomepage(page);
    const root = page.locator("[data-reference-carousel]");
    const readerStage = root.locator("[data-reference-reader-stage]");
    const cards = root.locator("[data-reference-card]");

    await expectNaturalReferenceFlow(page);
    await expect(root).toHaveAttribute("data-scene-phase", "natural");
    await expect(readerStage).toHaveCSS("position", "relative");
    await expect(root.locator(".pin-spacer, [data-pin-spacer]")).toHaveCount(0);

    const documentFlow = await cards.evaluateAll((items) => items.map((item) => {
      const element = item as HTMLElement;
      return {
        position: getComputedStyle(element).position,
        top: element.offsetTop,
        visualPosition: element.getAttribute("data-visual-position"),
      };
    }));
    expect(documentFlow.every((card) =>
      card.position === "relative" && card.visualPosition === null
    )).toBe(true);
    for (let index = 1; index < documentFlow.length; index += 1) {
      expect(documentFlow[index]?.top ?? 0)
        .toBeGreaterThan(documentFlow[index - 1]?.top ?? 0);
    }

    for (let index = 0; index < featuredTestimonials.length; index += 1) {
      await revealReference(page, index);
      await expect(cards.nth(index).locator("[data-reference-quote-ink]"))
        .toBeVisible();
    }

    await expect(root).toHaveAttribute("data-scene-active", "false");
    await expect(root).toHaveAttribute("data-scroll-control", "natural");
  });

  test("reverses the shared scrub reveal with native scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openHomepage(page);
    const root = page.locator("[data-reference-carousel]");
    const cards = root.locator("[data-reference-card]");
    const finalIndex = featuredTestimonials.length - 1;

    await revealReference(page, finalIndex);
    const forwardScroll = await page.evaluate(() => window.scrollY);
    const forwardIndex = Number.parseInt(
      await root.getAttribute("data-active-index") ?? "0",
      10,
    );
    expect(forwardIndex).toBeGreaterThanOrEqual(finalIndex);

    const firstCardTop = await cards.first().evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY,
    );
    await scrollImmediately(page, firstCardTop - 900 * 0.94);
    await expect.poll(() => page.evaluate(() => window.scrollY))
      .toBeLessThan(forwardScroll - 40);
    await expect.poll(async () => Number.parseInt(
      await root.getAttribute("data-active-index") ?? "0",
      10,
    )).toBeLessThan(forwardIndex);
    await expect.poll(() => cards.nth(finalIndex)
      .locator("[data-reference-card-body]")
      .evaluate((element) => new DOMMatrix(
        getComputedStyle(element).transform,
      ).m42))
      .toBeGreaterThan(25);

    const activeSource = cards.first().locator("[data-testimonial-source]");
    await activeSource.focus();
    await expect(activeSource).toBeFocused();
  });

  test("uses one natural editorial reading flow at every major viewport", async ({
    page,
  }) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      await openHomepage(page);
      await expectNaturalReferenceFlow(page);
      expect(await page.evaluate(
        () => document.documentElement.scrollWidth
          <= document.documentElement.clientWidth,
      )).toBe(true);
    }
  });

  test("keeps the mobile Google review action clear of the client identity", async ({
    page,
  }) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 515, height: 682 },
    ]) {
      await page.setViewportSize(viewport);
      await openHomepage(page);

      const cards = page.locator("[data-reference-card]");
      const geometry = await cards.evaluateAll((items) => items.map((item) => {
        const identity = item.querySelector<HTMLElement>(
          "[data-testimonial-services]",
        )!;
        const source = item.querySelector<HTMLElement>(
          "[data-testimonial-source]",
        )!;
        const identityRect = identity.getBoundingClientRect();
        const sourceRect = source.getBoundingClientRect();

        return {
          gap: sourceRect.top - identityRect.bottom,
          sourceHeight: sourceRect.height,
        };
      }));

      expect(geometry.every(({ gap }) => gap >= 31)).toBe(true);
      expect(geometry.every(({ sourceHeight }) => sourceHeight >= 44)).toBe(true);
    }
  });

  test("reverses the post-reference action with the shared scroll reveal", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHomepage(page);

    const conversion = page.locator("[data-references-conversion]");
    await expect(conversion).toHaveAttribute(
      "data-references-conversion-motion-state",
      "waiting",
    );
    await expect(conversion.locator("[data-references-conversion-rule]"))
      .toHaveCount(2);
    await expect(conversion.locator("[data-references-conversion-word-ink]"))
      .toHaveCount(5);

    const conversionEnd = await conversion.evaluate(
      (element) => element.getBoundingClientRect().bottom
        + window.scrollY
        - window.innerHeight * 0.46,
    );
    await scrollImmediately(page, conversionEnd);
    await expect(conversion).toHaveAttribute(
      "data-references-conversion-motion-state",
      "complete",
    );

    await scrollImmediately(page, 0);
    await expect(conversion).toHaveAttribute(
      "data-references-conversion-motion-state",
      "waiting",
    );
  });

  test("stays natural for reduced motion and forced colors", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openHomepage(page);
    await expectNaturalReferenceFlow(page, "reduced");
    await expect(page.locator("[data-references-conversion]")).toHaveAttribute(
      "data-references-conversion-motion-state",
      "complete",
    );

    await page.emulateMedia({
      forcedColors: "active",
      reducedMotion: "no-preference",
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("[data-reference-carousel]").waitFor();
    await dismissHomepageIntro(page);
    await expectNaturalReferenceFlow(page, "static");
  });

  test("has no automated accessibility violations", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openHomepage(page);

    const results = await new AxeBuilder({ page })
      .include('[data-home-module="references"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
