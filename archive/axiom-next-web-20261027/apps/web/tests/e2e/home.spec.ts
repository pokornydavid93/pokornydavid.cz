import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { homepageContent } from "../../app/content/homepage";
import {
  featuredTestimonials,
  getHomepageReviewById,
  normalizeTestimonialWhitespace,
} from "../../app/content/testimonials";

const ORIGINAL_HERO_PORTRAIT = process.env.HOME_HERO_PORTRAIT_VARIANT === "original";

const homepageReferences = homepageContent.references.reviewIds.map(
  getHomepageReviewById,
);
const finalHomepageReference = homepageReferences.at(-1)!;

const expectedHomepageReferences = [
  {
    id: "denisa-reznickova",
    author: "Denisa Řezníčková",
    excerpt:
      "Oceňuji individuální přístup, dlouhodobé myšlení a skutečný zájem o mou finanční situaci.",
    sourceUrl: "https://share.google/w0usRR2Gu4l37n3to",
  },
  {
    id: "stanislav-dvorak",
    author: "Stanislav Dvořák",
    excerpt:
      "Skvělý finanční poradce a parťák, který mi srozumitelně vysvětlil věci, ve kterých jsem měl zmatek, a navrhl reálné řešení bez zbytečného kecání.",
    sourceUrl: "https://share.google/C1vyXNU8y4oSRQJrW",
  },
  {
    id: "pavla-kucerova",
    author: "Pavla Kučerová",
    excerpt:
      "Umí srozumitelným způsobem vše vysvětlit a s přehledem reagovat na potřeby klienta a jeho konkrétní situaci.",
    sourceUrl: "https://share.google/lRTfcLgEGJbjB2Gzo",
  },
] as const;

const modules = [
  { id: "hero", selector: '[data-template-slot="hero"] [data-component="domain-hero"]' },
  { id: "profile", selector: '[data-home-module="profile"]' },
  { id: "situations", selector: '[data-home-module="situations"]' },
  { id: "process", selector: '[data-home-module="process"]' },
  { id: "references", selector: '[data-home-module="references"]' },
  { id: "evidence", selector: '[data-home-module="evidence"]' },
  { id: "insights", selector: '[data-home-module="insights"]' },
  { id: "faq", selector: '[data-home-module="faq"]' },
  { id: "final-action", selector: '[data-template-slot="final-action"] #zacit' },
] as const;

const situations = [
  "mortgage-refixation",
  "new-housing",
  "insurance-review",
  "income-protection",
  "investing",
] as const;

const allSituationPaths = [...situations, "orientace"] as const;

const situationCtas = {
  "mortgage-refixation": "Zjistit dopad nové sazby",
  "new-housing": "Zjistit bezpečnou splátku",
  "insurance-review": "Prověřit pojistné krytí",
  "income-protection": "Prověřit ochranu příjmu",
  investing: "Srovnat rezervu a investice",
  orientace: "Získat přehled",
} as const;

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function scrollImmediately(page: Page, top: number) {
  await page.evaluate((scrollTop) => {
    const win = window as Window & {
      __lenis?: {
        scrollTo?: (
          target: number,
          options?: { force?: boolean; immediate?: boolean },
        ) => void;
      };
    };

    if (win.__lenis?.scrollTo) {
      win.__lenis.scrollTo(scrollTop, { force: true, immediate: true });
      return;
    }

    window.scrollTo(0, scrollTop);
  }, top);
}

async function scrollReferenceToActivationAxis(page: Page, id: string) {
  const article = page.locator(`[data-home-reference="${id}"]`);
  const target = await article.evaluate((articleElement) => {
    const reader = articleElement.closest<HTMLElement>("[data-reference-reader]");
    const scene = reader?.querySelector<HTMLElement>(
      "[data-reference-sticky-scene]",
    );
    const articles = reader
      ? Array.from(reader.querySelectorAll("[data-home-reference]"))
      : [];
    const index = articles.indexOf(articleElement);

    if (!reader || !scene || index < 0) return window.scrollY;

    let readerTop = 0;
    let current: HTMLElement | null = reader;
    while (current) {
      readerTop += current.offsetTop;
      current = current.offsetParent as HTMLElement | null;
    }

    const stickyTop = Number.parseFloat(getComputedStyle(scene).top);
    const start = readerTop - stickyTop;
    const distance = reader.offsetHeight - scene.offsetHeight;

    return start + distance * ((index + 0.5) / articles.length);
  });
  await scrollImmediately(page, target);
  await expect(article).toHaveAttribute("data-active", "true");
  await expect.poll(() => article.evaluate((articleElement) => {
    const style = getComputedStyle(articleElement);
    const matrix = new DOMMatrixReadOnly(style.transform);

    return {
      opacity: Number(style.opacity),
      translateY: Math.abs(matrix.m42),
      visibility: style.visibility,
    };
  })).toEqual({
    opacity: 1,
    translateY: 0,
    visibility: "visible",
  });
}

async function scrollReferenceProgress(page: Page, progress: number) {
  const target = await page.locator("[data-reference-reader]").evaluate(
    (reader, requestedProgress) => {
      const readerElement = reader as HTMLElement;
      const scene = readerElement.querySelector<HTMLElement>(
        "[data-reference-sticky-scene]",
      );
      if (!scene) return window.scrollY;

      let readerTop = 0;
      let current: HTMLElement | null = readerElement;
      while (current) {
        readerTop += current.offsetTop;
        current = current.offsetParent as HTMLElement | null;
      }

      const stickyTop = Number.parseFloat(getComputedStyle(scene).top);
      const start = readerTop - stickyTop;
      const distance = readerElement.offsetHeight - scene.offsetHeight;
      const normalized = Math.min(1, Math.max(0, requestedProgress));

      return start + distance * normalized;
    },
    progress,
  );

  await scrollImmediately(page, target);
}

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

async function waitForHeroFinalState(page: Page) {
  await page.locator("[data-cinematic-home-hero]").waitFor({ state: "visible" });
}

async function waitForHeroSilkReady(page: Page) {
  const silkLayer = page.locator(
    '[data-hero-silk-host] [data-react-bits-silk][data-silk-source="react-bits"]',
  );
  await expect(silkLayer).toHaveAttribute("data-state", "ready");
  await expect(silkLayer.locator("canvas[data-react-bits-silk-canvas]")).toHaveCount(1);
  await expect(page.locator("[data-refixation-silk]")).toHaveCount(0);
  await expect(page.locator("[data-cinematic-home-hero]")).toHaveAttribute(
    "data-hero-silk-ready",
    "true",
  );
}

async function waitForHeroSilkResize(page: Page, viewportWidth: number) {
  const canvas = page.locator(
    "[data-hero-silk-host] canvas[data-react-bits-silk-canvas]",
  );

  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(viewportWidth);
  await expect.poll(() => canvas.evaluate((canvasElement) => {
    const canvasNode = canvasElement as HTMLCanvasElement;
    const shell = canvasNode.parentElement;
    if (!shell) return false;

    const pixelRatioCap = shell.clientWidth < 768 ? 1 : 1.35;
    const expectedWidth = Math.floor(
      shell.clientWidth * Math.min(window.devicePixelRatio, pixelRatioCap),
    );

    return Math.abs(canvasNode.width - expectedWidth) <= 1;
  })).toBe(true);
}

test.describe("canonical homepage", () => {
  test("uses a paper plane for every homepage conversion CTA", async ({ page }) => {
    await primeRejectedConsent(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    for (const selector of [
      '[data-analytics-placement="header"]',
      '[data-analytics-placement="hero"]',
      "[data-orientation-path]",
      "[data-process-cta]",
      '[data-analytics-placement="final"]',
    ]) {
      const cta = page.locator(selector);
      const paperPlane = cta.locator('[data-cta-icon="paper-plane"]');
      await expect(cta).toHaveCount(1);
      await expect(cta).toHaveAttribute("data-cursor", "action");
      await expect(cta).toHaveAttribute("data-cursor-icon", "send");
      await expect(paperPlane).toHaveCount(1);
      await expect(paperPlane).toHaveAttribute("aria-hidden", "true");
      await expect(cta.locator(".lucide-arrow-right, .lucide-chevron-right")).toHaveCount(0);
    }
  });

  test("uses directional arrows that match each content action", async ({ page }) => {
    await primeRejectedConsent(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const heroSecondary = page.locator("[data-hero-secondary]");
    await expect(heroSecondary).toHaveAttribute(
      "data-variant",
      "secondary-action",
    );
    await expect(heroSecondary).toHaveAttribute("data-cursor", "action");
    await expect(heroSecondary).toHaveAttribute("data-cursor-icon", "arrow");
    await expect(heroSecondary.locator(".lucide-arrow-right")).toHaveCount(1);
    await expect(heroSecondary.locator(".lucide-arrow-up-right")).toHaveCount(0);

    const situationPanelLinks = page.locator(
      '[data-situation-panel] '
        + '[data-analytics-source="home-situations"][data-situation-id]',
    );
    await expect(situationPanelLinks).toHaveCount(situations.length);
    for (const link of await situationPanelLinks.all()) {
      await expect(link.locator('[data-cta-icon="paper-plane"]')).toHaveCount(1);
      await expect(link.locator(".lucide-arrow-right")).toHaveCount(0);
      await expect(link.locator(".lucide-arrow-up-right")).toHaveCount(0);
    }
    const orientationPath = page.locator("[data-orientation-path]");
    await expect(orientationPath.locator('[data-cta-icon="paper-plane"]'))
      .toHaveCount(1);
    await expect(orientationPath.locator(".lucide-arrow-up-right"))
      .toHaveCount(0);

    await expect(page.locator("[data-custom-situation-link] .lucide-arrow-right"))
      .toHaveCount(1);
    await expect(page.locator("[data-custom-situation-link] .lucide-arrow-up-right"))
      .toHaveCount(0);
    await expect(page.locator('[data-home-module="insights"] .lucide-arrow-up-right'))
      .toHaveCount(4);
    await expect(page.locator(
      '[data-profile-about-link][data-cta-composition="docked"] '
        + '[data-cta-icon-shell] [data-cta-icon="arrow-right"]',
    )).toHaveCount(1);
    await expect(page.locator("[data-profile-about-link] .lucide-arrow-right"))
      .toHaveCount(1);
    await expect(page.locator("[data-profile-about-link] .lucide-arrow-up-right"))
      .toHaveCount(0);
    await expect(page.locator("[data-profile-about-link] .lucide-arrow-down"))
      .toHaveCount(0);
    await expect(page.locator("[data-profile-cta]")).toHaveCount(0);
    await expect(page.locator("[data-profile-next]")).toHaveCount(0);
    await expect(page.locator("[data-profile-actions]")).toHaveCount(0);
    await expect(page.locator(
      "[data-profile-registry-link] .lucide-arrow-up-right",
    )).toHaveCount(1);
  });

  test("server-renders the exact ten-module decision flow and truthful SEO", async ({
    page,
    request,
  }) => {
    test.setTimeout(240_000);
    await primeRejectedConsent(page);
    const response = await request.get("/");
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain("Nejhorší finanční rozhodnutí");
    expect(html).toContain("je to, kterému nerozumíte.");
    expect(html).toContain(homepageContent.hero.lead);
    expect(html).toContain("Získat přehled");
    expect(html).toContain(homepageContent.finalCta.title);
    expect(html).toContain(homepageContent.finalCta.description);
    expect(html).not.toContain("Napsat Davidovi");
    expect(html).toContain(homepageContent.references.intro.eyebrow);
    for (const line of homepageContent.references.intro.title.split("\n")) {
      expect(html).toContain(line);
    }
    expect(html).toContain(homepageContent.references.intro.description);
    expect(html).toContain("JAK SPOLUPRÁCE PROBÍHÁ");
    expect(html).toContain("Řeknete mi, co právě řešíte.");
    expect(html).toContain("Dám vše do souvislostí a ukážu vám možnosti.");
    expect(html).toContain("Rozhodnete, jak chcete pokračovat.");
    expect(html).toContain(
      "Nejdřív si uděláme jasno v celé situaci. Teprve potom má smysl seřadit priority, porovnat možnosti a rozhodnout o dalším kroku.",
    );
    expect(html).toContain("Získat přehled");
    expect(html).not.toContain("Jasno už po");
    expect(html).not.toContain("prvním hovoru.");
    expect(html).toContain("CO SI ODNESETE");
    expect(html).toContain(
      "Přehled, díky kterému víte, co dál.",
    );
    expect(html).toContain(
      "Budete rozumět své situaci, prioritám i možnostem — a vědět, který další krok dává smysl právě vám.",
    );
    expect(html).not.toContain(
      "Bez rozhodování na místě. Uvidíte, co má prioritu, jaké máte možnosti a co dává smysl jako další krok.",
    );
    expect(html).not.toContain("Co má prioritu");
    expect(html).not.toContain("Jaké máte možnosti");
    expect(html).not.toContain("Co dává smysl dál");
    for (const line of homepageContent.profile.intro.titleLines) {
      expect(html).toContain(line);
    }
    expect(html).toContain(
      "Jsem David Pokorný. Nejdřív chci pochopit, co je pro vás důležité. Pak vám ukážu souvislosti a možnosti, abyste se mohli rozhodnout sami.",
    );
    expect(html).toContain("Co funguje, nechávám být.");
    expect(html).toContain('href="/kdo-jsem/"');
    expect(html).toContain("david-profile-cutout.webp");
    expect(html).not.toContain("Údaj potvrzený pro web");
    expect(html).toContain("PRAKTICKÉ OTÁZKY");
    expect(html).toContain("Z PRAXE, NE Z UČEBNICE");
    expect(html).toContain("Situace, které stojí");
    expect(html).toContain("za bližší pohled.");
    expect(html).toContain(
      "Konkrétní čísla, souvislosti a rozhodnutí, na kterých ukazuji, proč stejné řešení nemůže fungovat každému.",
    );
    expect(html).toContain("První nabídka banky není verdikt.");
    expect(html).toContain("Co se stane po odeslání?");
    expect(html).toContain("Je první kontakt nezávazný?");
    expect(html).toContain("Může první kontakt proběhnout online nebo osobně?");
    expect(html).toContain("Zásady zpracování osobních údajů");
    expect(html).not.toContain("Osobní profil, dohledatelná role");
    expect(html).not.toContain("Poznat Davida");
    expect(html).not.toContain("Jak pracujete s osobními údaji?");
    expect(html).not.toContain("Jak fungují náklady a odměňování?");
    expect(html).not.toContain("Overview Offer");
    expect(html).not.toContain("serverem potvrzeném");
    expect(html).not.toContain("podoba výstupu");
    expect(html).toContain("Bez závazku. Pro začátek stačí vybrat oblast a nechat mi číslo.");
    expect(html).not.toContain(
      "Nejdřív si uděláme jasno. Teprve potom se rozhodnete, co dál.",
    );
    expect(html).not.toContain("PO PRVNÍ ORIENTACI BUDETE VĚDĚT");
    expect(html).not.toContain("VÝSLEDEK PŘEHLEDU");
    expect(html).not.toContain("POSTUP A ODMĚŇOVÁNÍ");
    expect(html).not.toContain("ODMĚŇOVÁNÍ · BLOCKED");
    expect(html).not.toContain(
      "Veřejné shrnutí odměňování čeká na schválení odpovědnou compliance osobou.",
    );
    expect(html).not.toContain("Uvidíte, co řešit teď a co může počkat.");
    expect(html).not.toContain(
      "Konkrétní podoba veřejně slíbeného výstupu zůstává do schválení offer kontraktu blokována.",
    );
    expect(html).not.toContain(
      "Po potvrzeném odeslání následuje odpověď na žádost a domluva dalšího kroku",
    );

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForHeroFinalState(page);

    await expect(page).toHaveTitle("David Pokorný | Finanční poradce – hypotéky, pojištění a investice");
    await expect(page.locator("main#main-content")).toBeVisible();
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.getByRole("heading", {
      level: 1,
      name: "Nejhorší finanční rozhodnutí je to, kterému nerozumíte.",
    })).toBeVisible();

    const hero = page.locator('[data-component="domain-hero"]');
    await expect(hero.locator("[data-hero-heading-line]")).toHaveCount(2);
    await expect(hero.locator('[data-hero-heading-line="primary"]')).toHaveText("Nejhorší finanční rozhodnutí");
    await expect(hero.locator('[data-hero-heading-line="secondary"]')).toHaveText("je to, kterému nerozumíte.");
    await expect(hero.locator("[data-hero-fulfillment]")).toHaveCount(0);
    await expect(hero.locator("[data-hero-heading-emphasis]")).toHaveText(
      "finanční rozhodnutí",
    );
    await expect(hero.locator("[data-hero-eyebrow]")).toHaveCount(0);
    await expect(hero.locator("[data-hero-trust]")).toHaveCount(0);
    await expect(hero.locator("[data-hero-context-wave]")).toHaveCount(0);
    await expect(hero.locator("[data-hero-context-label]")).toHaveCount(0);
    await expect(hero).toHaveAttribute("data-hero-state", "portrait-silk");
    await expect(hero).toHaveAttribute(
      "data-hero-portrait-variant",
      ORIGINAL_HERO_PORTRAIT ? "original" : "cutout",
    );
    await expect(hero.locator("[data-hero-silk-host]")).toHaveCount(1);
    await expect(hero.locator("[data-hero-silk-host] canvas")).toHaveCount(1);
    await waitForHeroSilkReady(page);
    const heroPortrait = hero.locator("[data-hero-portrait]");
    await expect(heroPortrait).toHaveCount(1);
    await expect(heroPortrait).toHaveAttribute(
      "data-portrait-variant",
      ORIGINAL_HERO_PORTRAIT ? "original" : "cutout",
    );
    await expect(heroPortrait).toHaveCSS("opacity", "1");
    await expect(heroPortrait.locator("img")).toHaveAttribute(
      "alt",
      ORIGINAL_HERO_PORTRAIT
        ? "Můj portrét při poradenském rozhovoru"
        : "David Pokorný, finanční poradce",
    );
    await expect(heroPortrait.locator("img")).toHaveAttribute(
      "src",
      ORIGINAL_HERO_PORTRAIT ? /who-home\.avif/u : /whov2-hero\.avif/u,
    );
    if (!ORIGINAL_HERO_PORTRAIT) {
      await expect(hero.locator("[data-hero-portrait-warp]")).toHaveCount(0);
      await expect(hero).not.toHaveAttribute(
        "data-hero-portrait-warp-enabled",
        "true",
      );
    }

    const secondaryHeroAction = hero.getByRole("link", {
      name: "Kdo jsem",
    });
    await expect(secondaryHeroAction).toHaveAttribute(
      "data-variant",
      "secondary-action",
    );
    await expect(secondaryHeroAction).toHaveAttribute("href", "/kdo-jsem/");
    await expect(secondaryHeroAction).toHaveCSS("text-decoration-line", "none");

    const heroRegistryLink = hero.getByRole("link", {
      name: "Registrace ověřitelná u ČNB",
    });
    await expect(heroRegistryLink).toHaveAttribute(
      "href",
      "https://jerrs.cnb.cz/apljerrsdad/JERRS.WEB10.VIZITKA?p_lang=cz&p_SEQ_ID=13296729&p_VER_ID=1004&p_DATUM=06.10.2026&p_ROL_KOD=",
    );
    await expect(heroRegistryLink).toHaveAttribute("target", "_blank");
    await expect(heroRegistryLink).toHaveAttribute("rel", "noopener noreferrer");

    for (const placement of ["header", "hero", "final"] as const) {
      const primaryAction = page.locator(
        `[data-analytics-placement="${placement}"]`,
      );
      await expect(primaryAction).toHaveCount(1);
      const paperPlane = primaryAction.locator('[data-cta-icon="paper-plane"]');
      await expect(paperPlane).toHaveCount(1);
      await expect(paperPlane).toHaveAttribute("aria-hidden", "true");
      await expect(primaryAction.locator("[data-primary-cta-chevron]")).toHaveCount(0);
    }

    const brandLink = page.locator(
      'a[aria-label="David Pokorný – úvod"]:visible',
    );
    await expect(brandLink).toHaveCount(1);
    await expect(brandLink.locator("strong")).toHaveText("David Pokorný");
    await expect(brandLink).toContainText("Finanční poradenství");
    await expect(brandLink).toHaveCSS("text-decoration-line", "none");

    const situationSection = page.locator('[data-home-module="situations"]');
    const situationNav = situationSection.locator(
      "[data-situation-selector-nav] [data-situation-choice-rail]",
    );
    const situationChoices = situationNav.locator("[data-situation-choice]");
    await expect(situationSection.getByRole("heading", {
      level: 2,
      name: "Co právě potřebujete vyřešit?",
    })).toBeVisible();
    await expect(situationSection).toContainText("VÁŠ VÝCHOZÍ BOD");
    await expect(situationSection.locator("[data-situation-eyebrow]"))
      .toHaveCount(1);
    await expect(situationSection).toContainText(
      "Nemusíte znát název produktu ani mít připravené řešení. Vyberte situaci, která se nejvíc podobá té vaší. Společně pak určíme, co má smysl řešit jako první.",
    );
    await expect(situationSection).toContainText(
      "Vaše situace sem přesně nezapadá?",
    );
    await expect(situationNav).toHaveAttribute(
      "aria-label",
      "Vyberte finanční situaci",
    );
    const situationChoiceNames = [
      "Končí mi fixace",
      "Řeším nové bydlení",
      "Chci prověřit pojištění",
      "Potřebuji ochránit příjem",
      "Chci začít investovat",
    ];
    for (const [index, name] of situationChoiceNames.entries()) {
      await expect(situationChoices.nth(index)).toHaveAccessibleName(name);
    }
    await expect(situationChoices.first()).toHaveAttribute("aria-selected", "true");
    const orientationSurface = situationSection.locator(
      "[data-orientation-surface]",
    );
    const situationPanels = situationSection.locator("[data-situation-panel]");
    await expect(situationPanels).toHaveCount(situationChoiceNames.length);
    await expect(situationSection.locator("[data-situation-custom]"))
      .toHaveCount(1);
    await expect(situationSection.locator("[data-situation-panel]:visible"))
      .toHaveCount(1);
    await expect(situationSection.locator("[data-situation-custom]:visible"))
      .toHaveCount(1);
    await expect(situationSection.locator("[data-situation-custom]:visible"))
      .toContainText("Prohlédnout všechny služby");
    await expect(situationSection.locator("[data-situation-shared-microcopy]"))
      .toHaveCount(0);
    await expect(situationSection.locator('[data-situation-panel="mortgage-refixation"]'))
      .toContainText(
        "Spočítáme, co nová sazba udělá s vaší splátkou.",
      );
    await situationChoices.nth(2).click();
    await expect(situationChoices.nth(2)).toHaveAttribute("aria-selected", "true");
    await expect(situationSection.locator(
      '[data-situation-panel="insurance-review"]',
    )).toBeVisible();
    await expect(situationSection.locator('[data-situation-id="plan"]'))
      .toHaveCount(0);
    await expect(orientationSurface).toContainText(
      "Když nevíte, kde začít, začneme přehledem.",
    );
    await expect(situationSection.locator(
      "[data-situation-card], [data-situation-icon], [data-situation-index]",
    )).toHaveCount(0);

    const modulePositions: number[] = [];
    for (const section of modules) {
      const locator = page.locator(section.selector);
      await expect(locator, `missing homepage module ${section.id}`).toHaveCount(1);
      modulePositions.push(await locator.evaluate((element) => {
        const transitionLayer = element.closest<HTMLElement>("[data-hero-transition-layer]");
        const style = getComputedStyle(transitionLayer ?? element);
        const translateY = style.transform === "none"
          ? 0
          : new DOMMatrixReadOnly(style.transform).m42;
        return element.getBoundingClientRect().top + scrollY - translateY;
      }));
    }

    const insights = page.locator('[data-home-module="insights"]');
    await expect(insights.locator("article[data-home-article]")).toHaveCount(3);
    await expect(insights.locator("[data-home-article-media] img")).toHaveCount(3);
    await expect(insights.locator("input, button, output")).toHaveCount(0);
    await expect(insights.getByRole("link", {
      includeHidden: true,
      name: "Procházet všechny články",
    })).toHaveAttribute("href", "/clanky/");
    await expect(insights.locator('[data-home-article-featured="true"]')).toHaveCount(1);
    for (let index = 1; index < modulePositions.length; index += 1) {
      expect(modulePositions[index]).toBeGreaterThan(modulePositions[index - 1]);
    }

    await expect(page.locator("[data-home-release]")).toHaveCount(0);
    await expect(page.locator("main iframe, main form")).toHaveCount(0);
    await expect(page.locator("main video")).toHaveCount(1);
    await expect(page.locator(
      '[data-home-module="process"] [data-process-video-stage] video',
    )).toHaveCount(1);
    await expect(page.locator("[data-hero-silk-host] canvas")).toHaveCount(1);
    await expect(page.locator("[data-process-silk-host]")).toHaveCount(0);
    await expect(page.locator(
      '[data-home-module="process"] canvas',
    )).toHaveCount(0);
    await expect(page.locator("[data-process-webgl-terrain] canvas")).toHaveCount(0);
    await expect(page.locator('[data-story-root], [data-cinematic-hero-process]')).toHaveCount(0);

    const primaryCtas = page.locator('[data-analytics-event="home_primary_cta_click"]');
    await expect(primaryCtas).toHaveCount(3);
    await expect(primaryCtas).toHaveText([
      /Získat přehled/,
      /Získat přehled/,
      /Získat přehled/,
    ]);
    await expect(primaryCtas.nth(0)).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=header&cta=header-primary",
    );
    await expect(primaryCtas.nth(1)).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=homepage&cta=home-hero",
    );
    await expect(primaryCtas.nth(2)).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=homepage&cta=home-final",
    );
    const footerOverviewActions = page
      .getByRole("contentinfo")
      .getByRole("link", {
        name: "Získat přehled",
        exact: true,
      });
    await expect(footerOverviewActions).toHaveCount(2);
    for (const action of await footerOverviewActions.all()) {
      await expect(action).toHaveAttribute(
        "href",
        "/ziskat-prehled/?source=footer&cta=footer-primary",
      );
    }
    for (const cta of await primaryCtas.all()) {
      await expect(cta.locator('[data-cta-icon="paper-plane"]')).toHaveCount(1);
    }

    const processOverviewCta = page.locator("[data-process-cta]");
    await expect(processOverviewCta.locator('[data-cta-icon="paper-plane"]'))
      .toHaveCount(1);
    await expect(processOverviewCta.locator(".lucide-arrow-right")).toHaveCount(0);
    await expect(page.locator(
      '[data-profile-about-link][data-cta-composition="docked"] '
        + '[data-cta-icon-shell] [data-cta-icon="arrow-right"]',
    )).toHaveCount(1);
    await expect(page.locator("[data-profile-about-link] .lucide-arrow-right"))
      .toHaveCount(1);
    await expect(page.locator("[data-profile-about-link] .lucide-arrow-up-right"))
      .toHaveCount(0);
    await expect(page.locator("[data-profile-cta]")).toHaveCount(0);

    const situationLinks = page.locator(
      '[data-analytics-event="home_situation_select"][data-analytics-source="home-situations"]',
    );
    await expect(situationLinks).toHaveCount(allSituationPaths.length);
    for (const situation of allSituationPaths) {
      const link = page.locator(
        `[data-analytics-source="home-situations"][data-situation-id="${situation}"]`,
      );
      await expect(link).toHaveCount(1);
      await expect(link).toContainText(situationCtas[situation]);
      await expect(link.locator("svg")).toHaveCount(1);
      await expect(link).toHaveAttribute("data-analytics-source", "home-situations");
      await expect(link).toHaveAttribute(
        "data-analytics-destination",
        /ziskat-prehled/u,
      );
      const href = await link.getAttribute("href");
      const url = new URL(href!, "http://127.0.0.1:3000");
      expect(url.searchParams.get("source")).toBe("homepage");
      expect(url.searchParams.get("intent")).toBeTruthy();
      expect(url.searchParams.get("cta")).toBe(
        situation === "orientace"
          ? "unsure-priorities"
          : `situation-${situation}`,
      );
    }
    await expect(page.locator("[data-orientation-path]")).not.toContainText(
      "Bez výběru služby a bez přípravy podkladů.",
    );
    await expect(page.locator("[data-situation-choice]")).toHaveCount(
      situations.length,
    );
    await expect(page.locator("[data-situation-panel]:visible")).toHaveCount(1);
    await expect(page.locator("[data-custom-situation-link]:visible"))
      .toHaveAttribute("href", "/sluzby/");

    const referencesSection = page.locator('[data-home-module="references"]');
    await expect(referencesSection).toContainText("ZKUŠENOSTI KLIENTŮ");
    await expect(referencesSection.getByRole("heading", {
      includeHidden: true,
      level: 2,
      name: homepageContent.references.intro.title.replace(/\s+/gu, " "),
    })).toHaveCount(1);
    await expect(
      referencesSection.locator("[data-reference-intro-description]"),
    ).toHaveText(homepageContent.references.intro.description);
    expect(
      await referencesSection
        .locator("[data-reference-section-intro]")
        .evaluate((intro) => intro.closest("[data-home-references-grid]") === null),
    ).toBe(true);
    await expect(referencesSection.locator("article[data-home-reference]"))
      .toHaveCount(homepageReferences.length);
    await expect(referencesSection.locator("blockquote"))
      .toHaveCount(homepageReferences.length);
    await expect(referencesSection.locator("[aria-live]")).toHaveCount(1);
    await expect(
      referencesSection.locator("[data-reference-testimonials]"),
    ).toHaveCount(1);

    expect(homepageReferences.map(({ author, excerpt, id, sourceUrl }) => ({
      author,
      excerpt,
      id,
      sourceUrl,
    }))).toEqual(expectedHomepageReferences);

    for (const [index, reference] of homepageReferences.entries()) {
      const featuredTestimonial = featuredTestimonials[index];
      expect(featuredTestimonial.id).toBe(reference.id);

      const article = referencesSection.locator(
        `article[data-home-reference="${reference.id}"]`,
      );
      await expect(article).toHaveCount(1);
      expect(await article.locator("blockquote > p").textContent()).toBe(
        reference.excerpt,
      );
      expect(normalizeTestimonialWhitespace(reference.fullText)).toContain(
        normalizeTestimonialWhitespace(reference.excerpt),
      );
      expect(await article.locator("cite").textContent()).toBe(
        featuredTestimonial.client.name,
      );
      if (reference.rating !== undefined) {
        await expect(article.locator("[data-review-rating]")).toHaveAttribute(
          "data-review-rating",
          String(reference.rating),
        );
        await expect(article.locator("[data-rating-star]")).toHaveCount(5);
        expect(await article.textContent()).toContain(
          `Google recenze · ${reference.rating} z 5`,
        );
      } else {
        expect(await article.textContent()).toContain("Google recenze");
        expect(await article.textContent()).not.toContain("z 5");
      }
      await expect(
        article.locator("[data-testimonial-progress-rail]"),
      ).toHaveAttribute(
        "aria-valuenow",
        String(index + 1),
      );
      await expect(
        article.locator("[data-testimonial-progress-rail]"),
      ).toHaveAttribute("aria-valuemax", String(homepageReferences.length));
      expect(reference.sourceTarget).toBe("individual-review");

      const sourceLink = article.locator('a[target="_blank"]');
      await expect(sourceLink).toHaveAttribute(
        "aria-label",
        `Otevřít Google recenzi od ${featuredTestimonial.client.name} v nové kartě`,
      );
      expect(await sourceLink.textContent()).toContain("Google recenze");
      await expect(sourceLink).toHaveAttribute("href", reference.sourceUrl);
      await expect(sourceLink).toHaveAttribute("target", "_blank");
      await expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
    }

    await expect(referencesSection.getByRole("link", {
      name: "Přečíst všechny reference",
    })).toHaveCount(0);
    await expect(referencesSection.locator("[data-references-outro]")).toHaveCount(0);
    await expect(
      referencesSection.locator("[data-references-outro-principles]"),
    ).toHaveCount(0);
    await expect(referencesSection.locator("[data-references-cta-stage]")).toHaveCount(1);
    await expect(
      referencesSection.locator("[data-references-context-host]"),
    ).toHaveCount(0);
    await expect(referencesSection.locator("[data-references-wave-host]")).toHaveCount(0);
    await expect(referencesSection.locator("[data-references-orbit-host]")).toHaveCount(0);
    await expect(referencesSection.locator("[data-references-cta-rule]")).toHaveCount(0);
    await expect(
      referencesSection.locator("[data-references-cta-footer-surface]"),
    ).toHaveCount(0);
    await expect(referencesSection.locator("[data-references-cta-copy]")).toHaveCount(0);
    await expect(referencesSection.locator("[data-references-cta-card]")).toHaveCount(0);
    await expect(
      referencesSection.locator('[data-analytics-placement="references"]'),
    ).toHaveAccessibleName("Získat přehled");

    const processSection = page.locator('[data-home-module="process"]');
    const processRail = processSection.locator("ol[data-process-rail]");
    const processSteps = processRail.locator(":scope > li");
    await expect(processSection.locator("h2#process-title")).toHaveText(
      "JAK SPOLUPRÁCE PROBÍHÁ",
    );
    await expect(processSteps).toHaveCount(3);
    await expect(processSteps.locator("h3")).toHaveText([
      "Řeknete mi, co právě řešíte.",
      "Dám vše do souvislostí a ukážu vám možnosti.",
      "Rozhodnete, jak chcete pokračovat.",
    ]);
    await expect(processSteps.locator(":scope > p")).toHaveCount(0);
    await expect(processRail.locator("button, a, [role='button']")).toHaveCount(0);
    await expect(processSection.locator("[data-process-detail]")).toHaveText(
      "Nejdřív si uděláme jasno v celé situaci. Teprve potom má smysl seřadit priority, porovnat možnosti a rozhodnout o dalším kroku.",
    );
    await expect(processSteps.locator("[data-process-role]")).toHaveText([
      "VY",
      "JÁ",
      "VY",
    ]);
    await expect(processSteps.locator("[data-process-role-rule]")).toHaveCount(0);
    await expect(processSteps.locator("[data-process-index]")).toHaveText([
      "01",
      "02",
      "03",
    ]);
    await expect(processSection.locator("article, aside")).toHaveCount(0);
    await expect(processSection).not.toContainText("BLOCKED");
    await expect(processSection).not.toContainText("ODMĚŇOVÁNÍ");

    const processCta = processSection.locator("[data-process-cta]");
    await expect(processCta).toHaveText(/Získat přehled/u);
    await expect(processCta).toHaveAttribute("data-analytics-source", "home-process");
    await expect(processCta).not.toHaveAttribute("data-situation-id");
    await expect(processCta).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=homepage&cta=home-process",
    );
    await expect(processSection.locator("[data-process-action] > p")).toHaveText(
      "Bez závazku. Pro začátek stačí vybrat oblast a nechat mi číslo.",
    );
    const processVideoTrigger = processSection.locator(
      "[data-process-video-trigger]",
    );
    await expect(processVideoTrigger).toHaveCount(1);
    await expect(processVideoTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(processSection.locator("[data-process-video-stage]"))
      .toHaveAttribute("aria-hidden", "true");
    await expect(processSection.locator("video")).toHaveAttribute("preload", "none");
    await expect(processSection.locator("video")).toHaveAttribute("playsinline", "");
    await expect(processSteps.nth(2)).not.toContainText("Získat přehled");
    await expect(processSection).not.toContainText("PO PRVNÍ ORIENTACI BUDETE VĚDĚT");

    const processStepChrome = await processSteps.evaluateAll((steps) => steps.map((step) => {
      const style = getComputedStyle(step);
      return {
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
      };
    }));
    expect(processStepChrome).toEqual([
      { borderRadius: "0px", boxShadow: "none" },
      { borderRadius: "0px", boxShadow: "none" },
      { borderRadius: "0px", boxShadow: "none" },
    ]);
    const processRevealOffsets = await processSection.locator(
      "[data-process-transition-item]",
    ).evaluateAll((elements) => elements.map((element) => {
      const transform = getComputedStyle(element).transform;
      return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
    }));
    expect(processRevealOffsets.every((offset) => Math.abs(offset) <= 22.01)).toBe(true);
    const outcomeSection = page.locator('[data-home-module="outcome"]');
    await expect(outcomeSection).toHaveCount(0);
    await expect(page.locator("[data-process-references-reveal]"))
      .toHaveCount(0);

    const profileSection = page.locator('[data-home-module="profile"]');
    await expect(profileSection.getByRole("heading", {
      level: 2,
      name: "Nejdřív vy. Potom čísla. Teprve potom plán.",
    })).toBeVisible();
    await expect(profileSection.getByRole("img", {
      name: "David Pokorný, finanční poradce",
    })).toBeVisible();
    await expect(profileSection.locator('[data-component="profile-card"]')).toHaveCount(0);
    await expect(profileSection.locator("[data-profile-card]")).toHaveCount(0);
    await expect(profileSection.locator("[data-profile-introduction]"))
      .toHaveText(
        "Jsem David Pokorný. Nejdřív chci pochopit, co je pro vás důležité. Pak vám ukážu souvislosti a možnosti, abyste se mohli rozhodnout sami.",
      );
    await expect(profileSection.locator("[data-profile-approach]"))
      .toHaveCount(0);
    await expect(profileSection.locator("[data-profile-quote]")).toHaveText(
      "Co funguje, nechávám být.",
    );
    await expect(profileSection).not.toContainText(
      "Vázaný zástupce SAB servis s.r.o.",
    );
    await expect(profileSection).toHaveAttribute("data-surface-role", "paper");
    await expect(profileSection).toHaveAttribute("data-surface-tone", "light");
    expect(await profileSection.locator("[data-profile-portrait]").evaluate((portrait) => {
      const style = getComputedStyle(portrait);
      return {
        borderWidth: style.borderWidth,
        boxShadow: style.boxShadow,
      };
    })).toEqual({ borderWidth: "0px", boxShadow: "none" });
    const aboutLink = profileSection.locator("[data-profile-about-link]");
    await expect(aboutLink).toHaveAttribute("href", "/kdo-jsem/");
    await expect(aboutLink).toContainText("Jak stavím finanční plán");
    await expect(aboutLink).toHaveAttribute("data-cta-composition", "docked");
    await expect(aboutLink).toHaveAttribute("data-cursor", "action");
    await expect(aboutLink).toHaveAttribute("data-cursor-icon", "send");
    await expect(profileSection.locator("[data-profile-cta]")).toHaveCount(0);
    await expect(profileSection.locator("[data-profile-next]")).toHaveCount(0);
    await expect(profileSection.locator("[data-profile-actions]")).toHaveCount(0);
    await expect(profileSection).not.toContainText("Údaj potvrzený pro web");
    await expect(profileSection).not.toContainText("JERRS");
    await expect(profileSection).not.toContainText("5+ let");
    await expect(profileSection).not.toContainText("200+ klientů");
    await expect(profileSection.locator("[data-profile-registry-link]"))
      .toHaveAttribute("target", "_blank");
    await expect(profileSection.locator("[data-profile-registry-link]"))
      .toHaveAttribute("rel", "noopener noreferrer");

    const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) =>
      nodes.map((node) => JSON.parse(node.textContent || "{}")),
    );
    const serializedSchemas = JSON.stringify(schemas);
    expect(serializedSchemas).toContain('"@type":"WebPage"');
    expect(serializedSchemas).not.toContain('"@type":"FinancialService"');
    expect(serializedSchemas).not.toContain('"@type":"LocalBusiness"');
    expect(serializedSchemas).not.toContain('"@type":"Review"');
    expect(serializedSchemas).not.toContain('"@type":"AggregateRating"');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/$/u);
  });

  test("places articles and FAQ before the final contact", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.goto("/", { waitUntil: "networkidle" });

    const finalAction = page.locator('[data-template-slot="final-action"]');
    await expect(finalAction).toHaveCount(1);
    await finalAction.scrollIntoViewIfNeeded();
    const finalActionBand = finalAction.locator("#zacit");
    await expect(finalActionBand).toBeVisible();
    await expect(finalActionBand).not.toContainText("PRVNÍ KONTAKT");
    await expect(finalActionBand.getByRole("heading", {
      level: 2,
      name: "Stačí mi říct, co právě řešíte.",
    })).toBeVisible();
    await expect(finalActionBand).toContainText(
      "Vyberte oblast nebo doplňte pár vět. Nechte mi číslo; zavolám vám a společně ujasníme první krok.",
    );
    await expect(finalActionBand).not.toContainText(
      "BEZ DOKUMENTŮ · BEZ ZÁVAZKU · OSOBNĚ SE VÁM OZVU",
    );
    await expect(finalActionBand.getByRole("link", {
      name: "Získat přehled",
    })).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=homepage&cta=home-final",
    );
    await expect(finalActionBand.getByRole("link")).toHaveCount(1);

    const placement = await finalAction.evaluate((slot) => ({
      nextModule: slot.nextElementSibling?.getAttribute("data-home-module"),
      parentIsHomepageFlow: slot.parentElement?.hasAttribute(
        "data-hero-transition-flow",
      ),
      previousModule:
        slot.previousElementSibling?.getAttribute("data-home-module"),
    }));
    expect(placement).toEqual({
      nextModule: null,
      parentIsHomepageFlow: true,
      previousModule: "faq",
    });

    const verticalOrder = await page
      .locator(
        '[data-home-module="evidence"], [data-home-module="insights"], [data-home-module="faq"], [data-template-slot="final-action"]',
      )
      .evaluateAll((sections) =>
        sections.map((section) => ({
          key:
            section.getAttribute("data-home-module") ??
            section.getAttribute("data-template-slot"),
          top: section.getBoundingClientRect().top + scrollY,
        })),
      );
    expect(verticalOrder.map(({ key }) => key)).toEqual([
      "evidence",
      "insights",
      "faq",
      "final-action",
    ]);
    expect(verticalOrder.map(({ top }) => top)).toEqual(
      [...verticalOrder.map(({ top }) => top)].sort((left, right) => left - right),
    );

    const insights = page.locator('[data-home-module="insights"]');
    await expect(insights.getByRole("heading", {
      level: 2,
      name: "Situace, které stojí za bližší pohled.",
    })).toBeVisible();
    await expect(insights.locator("article[data-home-article]")).toHaveCount(3);
    await expect(insights.locator("[data-home-article-media] img")).toHaveCount(3);
    await expect(insights.locator("input, button, output")).toHaveCount(0);
    await expect(insights.locator('[data-home-article-featured="true"]')).toHaveCount(1);
    await expect(insights.getByRole("link", {
      includeHidden: true,
      name: "Procházet všechny články",
    })).toHaveAttribute("href", "/clanky/");

    const accessibility = await new AxeBuilder({ page })
      .include('[data-home-module="insights"]')
      .analyze();
    expect(accessibility.violations).toEqual([]);

    for (const { height, width } of [
      { height: 900, width: 1440 },
      { height: 844, width: 390 },
    ]) {
      await page.setViewportSize({ height, width });
      const geometry = await insights.evaluate((section) => ({
        articleWidths: Array.from(
          section.querySelectorAll<HTMLElement>("[data-home-article]"),
          (article) => article.getBoundingClientRect().width,
        ),
        mediaWidths: Array.from(
          section.querySelectorAll<HTMLElement>("[data-home-article-media]"),
          (media) => media.getBoundingClientRect().width,
        ),
        overflow:
          document.documentElement.scrollWidth
          - document.documentElement.clientWidth,
      }));
      expect(geometry.articleWidths.every((articleWidth) => articleWidth > 0)).toBe(true);
      expect(geometry.mediaWidths.every((mediaWidth) => mediaWidth > 0)).toBe(true);
      expect(geometry.overflow).toBeLessThanOrEqual(1);
    }

    await expect(insights.getByRole("link", {
      includeHidden: true,
      name: /Přečíst článek: Chcete investovat/u,
    })).toHaveAttribute(
      "href",
      "/clanky/chcete-investovat-zacnete-planem/",
    );
  });

  test("swaps the process register for a stable accessible video chapter", async ({
    page,
  }) => {
    test.slow();
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await primeRejectedConsent(page);

    const videoRequests: string[] = [];
    page.on("request", (request) => {
      if (/video(?:-mobil)?_h264.*\.mp4$/u.test(request.url())) {
        videoRequests.push(request.url());
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    expect(videoRequests).toEqual([]);

    const process = page.locator('[data-home-module="process"]');
    const layout = process.locator("[data-process-layout]");
    const stage = process.locator("[data-process-video-stage]");
    const trigger = process.locator("[data-process-video-trigger]");
    const close = process.getByRole("button", { name: "Zpět k postupu" });
    const video = process.locator("video");

    await expect(process.locator("[data-process-reveal]"))
      .toHaveAttribute("data-state", "ready");
    const desktopActionScroll = await process.evaluate((element) => {
      let top = 0;
      let current: HTMLElement | null = element as HTMLElement;
      while (current) {
        top += current.offsetTop;
        current = current.offsetParent as HTMLElement | null;
      }
      const distance = Number.parseFloat(
        getComputedStyle(element).getPropertyValue(
          "--process-sequence-distance",
        ),
      );
      return top + distance * 0.96;
    });
    await scrollImmediately(page, desktopActionScroll);
    await page.waitForTimeout(450);
    await expect(trigger).toBeVisible();
    await expect(process).toHaveAttribute("data-process-video-state", "closed");
    await expect(stage).toHaveAttribute("data-open", "false");
    expect(videoRequests).toEqual([]);
    const stableHeight = await process.evaluate(
      (element) => (element as HTMLElement).offsetHeight,
    );

    await trigger.click();
    await expect(process).toHaveAttribute("data-process-video-state", "open");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(layout).toHaveAttribute("aria-hidden", "true");
    expect(await layout.evaluate((element) => (element as HTMLElement).inert))
      .toBe(true);
    await expect(stage).toHaveAttribute("aria-hidden", "false");
    await expect(close).toBeFocused();
    await expect(process.locator("[data-process-video-header]")).toHaveCount(0);
    await expect(stage.getByText(
      "Jak začneme · krátké video · cca 1 minuta",
    )).toHaveCount(0);
    await expect(stage.locator("#process-video-summary")).toContainText(
      "Video má pouze obecný informační charakter.",
    );
    await expect(stage.locator("#process-video-summary")).toContainText(
      "Nepředstavuje individuální finanční, investiční, právní ani daňové poradenství",
    );
    await expect.poll(() => video.evaluate(
      (node) => (node as HTMLVideoElement).currentSrc,
    ))
      .toContain("/video_h264.mp4");
    await expect.poll(() => video.evaluate(
      (node) => (node as HTMLVideoElement).paused,
    )).toBe(false);
    expect(videoRequests.some((url) => url.endsWith("/video_h264.mp4"))).toBe(true);

    const videoComposition = await process.evaluate((section) => {
      const frame = section.querySelector<HTMLElement>(
        "[data-process-video-frame]",
      )!.getBoundingClientRect();
      const footer = section.querySelector<HTMLElement>(
        "[data-process-video-footer]",
      )!.getBoundingClientRect();
      const videoStage = section.querySelector<HTMLElement>(
        "[data-process-video-stage]",
      )!.getBoundingClientRect();
      const back = section.querySelector<HTMLElement>(
        "[data-process-video-close]",
      )!.getBoundingClientRect();
      const cta = section.querySelector<HTMLElement>(
        "[data-process-video-cta]",
      )!.getBoundingClientRect();
      return {
        actionsAligned: Math.abs(back.top - cta.top) <= 1,
        actionsInOrder: back.right <= cta.left,
        footerFits: footer.bottom <= videoStage.bottom,
        footerGap: footer.top - frame.bottom,
        frameRatio: frame.width / frame.height,
        frameTopClearance: frame.top - videoStage.top,
        stageTop: videoStage.top,
      };
    });
    expect(videoComposition.actionsAligned).toBe(true);
    expect(videoComposition.actionsInOrder).toBe(true);
    expect(videoComposition.footerFits).toBe(true);
    expect(videoComposition.footerGap).toBeGreaterThanOrEqual(16);
    expect(videoComposition.frameRatio).toBeCloseTo(16 / 9, 2);
    expect(videoComposition.frameTopClearance).toBeGreaterThanOrEqual(16);
    expect(videoComposition.stageTop).toBeGreaterThanOrEqual(72);

    expect(await process.evaluate(
      (element) => (element as HTMLElement).offsetHeight,
    ))
      .toBe(stableHeight);

    await page.keyboard.press("Escape");
    await expect(process).toHaveAttribute("data-process-video-state", "closed");
    await expect(trigger).toBeFocused();
    expect(await layout.evaluate((element) => (element as HTMLElement).inert))
      .toBe(false);
    await expect.poll(() => video.evaluate((node) => ({
      currentTime: (node as HTMLVideoElement).currentTime,
      paused: (node as HTMLVideoElement).paused,
    }))).toEqual({ currentTime: 0, paused: true });

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileProcess = page.locator('[data-home-module="process"]');
    const mobileTrigger = mobileProcess.locator("[data-process-video-trigger]");
    await expect.poll(() => page.evaluate(() => matchMedia(
      "(max-width: 820px)",
    ).matches)).toBe(true);
    await mobileTrigger.scrollIntoViewIfNeeded();
    const mobileHeight = await mobileProcess.evaluate(
      (element) => (element as HTMLElement).offsetHeight,
    );
    await mobileTrigger.click();
    const mobileVideo = mobileProcess.locator("video");
    await expect.poll(() => mobileVideo.evaluate(
      (node) => (node as HTMLVideoElement).currentSrc,
    ))
      .toContain("/video-mobil_h264_720p.mp4");
    const mobileGeometry = await mobileProcess.evaluate((element) => ({
      footerBottom: element.querySelector(
        "[data-process-video-footer]",
      )!.getBoundingClientRect().bottom,
      height: (element as HTMLElement).offsetHeight,
      overflow: document.documentElement.scrollWidth
        - document.documentElement.clientWidth,
      stageBottom: element.querySelector(
        "[data-process-video-stage]",
      )!.getBoundingClientRect().bottom,
      stagePosition: getComputedStyle(element.querySelector(
        "[data-process-video-stage]",
      )!).position,
      stageTop: element.querySelector(
        "[data-process-video-stage]",
      )!.getBoundingClientRect().top,
      videoRight: element.querySelector("video")!.getBoundingClientRect().right,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(mobileGeometry.footerBottom).toBeLessThanOrEqual(
      mobileGeometry.stageBottom,
    );
    expect(mobileGeometry.height).toBe(mobileHeight);
    expect(mobileGeometry.overflow).toBeLessThanOrEqual(1);
    expect(mobileGeometry.stagePosition).toBe("fixed");
    expect(mobileGeometry.stageTop).toBeGreaterThanOrEqual(64);
    expect(mobileGeometry.videoRight).toBeLessThanOrEqual(
      mobileGeometry.viewportWidth,
    );

    await mobileProcess.getByRole("button", { name: "Zpět k postupu" }).click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    const reducedProcess = page.locator('[data-home-module="process"]');
    const reducedTrigger = reducedProcess.locator("[data-process-video-trigger]");
    await reducedTrigger.scrollIntoViewIfNeeded();
    expect(await reducedProcess.locator(
      "[data-process-video-trigger] span",
    ).first().evaluate((element) => getComputedStyle(
      element,
      "::before",
    ).animationName)).toBe("none");
    await reducedTrigger.click();
    expect(await reducedProcess.locator("[data-process-video-stage]").evaluate(
      (element) => {
        const transform = getComputedStyle(element).transform;
        return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
      },
    )).toBe(0);
  });

  test("places the process description with its eyebrow and separates both actions", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.goto("/", { waitUntil: "networkidle" });

    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      const geometry = await page.locator('[data-home-module="process"]').evaluate(
        (section) => {
          const container = section.querySelector<HTMLElement>(
            '[data-layout="container"]',
          )!;
          const containerRect = container.getBoundingClientRect();
          const containerStyle = getComputedStyle(container);
          const contentLeft =
            containerRect.left + Number.parseFloat(containerStyle.paddingLeft);
          const contentRight =
            containerRect.right - Number.parseFloat(containerStyle.paddingRight);
          const rect = (selector: string) =>
            section.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
          const header = rect("[data-process-header]");
          const detail = rect("[data-process-detail]");
          const statement = rect("[data-process-step] h3");
          const cta = rect("[data-process-cta]");
          const video = rect("[data-process-video-trigger]");

          return {
            cta: { bottom: cta.bottom, left: cta.left, top: cta.top },
            detail: { left: detail.left, top: detail.top },
            detailSharesIntro:
              section.querySelector("[data-process-detail]")?.parentElement
                === section.querySelector("[data-process-intro]"),
            header: { bottom: header.bottom, left: header.left },
            overflow:
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
            statementLeft: statement.left,
            video: { left: video.left, right: video.right, top: video.top },
            contentLeft,
            contentRight,
          };
        },
      );

      expect(geometry.detailSharesIntro).toBe(true);
      expect(geometry.overflow).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.detail.left - geometry.header.left)).toBeLessThanOrEqual(1);
      expect(geometry.detail.top - geometry.header.bottom).toBeGreaterThanOrEqual(16);

      if (viewport.width > 720) {
        expect(Math.abs(geometry.cta.left - geometry.statementLeft)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.video.right - geometry.contentRight)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.video.top - geometry.cta.top)).toBeLessThanOrEqual(1);
      } else {
        expect(Math.abs(geometry.cta.left - geometry.contentLeft)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.video.left - geometry.contentLeft)).toBeLessThanOrEqual(1);
        expect(geometry.video.top).toBeGreaterThanOrEqual(geometry.cta.bottom);
      }
    }
  });

  test("aligns evidence with the shared homepage container", async ({ page }) => {
    await primeRejectedConsent(page);
    await page.goto("/", { waitUntil: "networkidle" });

    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);

      const geometry = await page.evaluate(() => {
        const selectors = [
          '[data-home-module="situations"] [data-layout="container"] > div',
          "[data-home-references-grid]",
          "[data-evidence-layout]",
        ];
        const edges = selectors.map((selector) => {
          const rect = document
            .querySelector<HTMLElement>(selector)!
            .getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        });

        return {
          edges,
          overflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        };
      });

      expect(geometry.overflow).toBeLessThanOrEqual(1);
      expect(
        Math.max(...geometry.edges.map((edge) => edge.left)) -
          Math.min(...geometry.edges.map((edge) => edge.left)),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.max(...geometry.edges.map((edge) => edge.right)) -
          Math.min(...geometry.edges.map((edge) => edge.right)),
      ).toBeLessThanOrEqual(1);
    }
  });

  test("keeps the evidence handoff closer to the final reference", async ({ page }) => {
    await page.setViewportSize({ width: 1828, height: 928 });
    await primeRejectedConsent(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const evidence = page.locator('[data-home-module="evidence"]');
    const sectionPadding = await evidence.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        bottom: Number.parseFloat(style.paddingBottom),
        top: Number.parseFloat(style.paddingTop),
      };
    });
    expect(sectionPadding.top).toBeLessThan(sectionPadding.bottom);
    expect(sectionPadding.top).toBeLessThanOrEqual(72);
  });

  test("presents credentials as one composed verification folio", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await primeRejectedConsent(page);
    await page.goto("/", { waitUntil: "networkidle" });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.dataset.homeIntroState ?? "",
        ),
      )
      .toBe("complete");

    const evidence = page.locator('[data-home-module="evidence"]');
    await expect(evidence).toHaveCount(1);
    expect(await evidence.evaluate((element) => element.tagName)).toBe("SECTION");
    await expect(evidence).toHaveAttribute("aria-labelledby", "evidence-title");
    await expect(evidence).toHaveAttribute("data-surface-role", "paper");
    await expect(evidence).toHaveAttribute("data-surface-tone", "light");
    await expect(
      evidence.getByRole("heading", {
        level: 2,
        name: "Důvěru stavím na tom, co si můžete sami ověřit.",
      }),
    ).toHaveAttribute("id", "evidence-title");
    await expect(evidence).toContainText(
      "Registrace, vazba na společnost i odborná způsobilost jsou doložené přímo původními zdroji.",
    );
    await expect(evidence.locator("[data-evidence-lead-ink] strong")).toHaveText(
      "Bez marketingových tvrzení.",
    );

    const rows = evidence.locator("[data-evidence-row]");
    await expect(rows).toHaveCount(3);
    expect(
      await rows.evaluateAll((items) =>
        items.map((item) => ({
          key: item.getAttribute("data-evidence-row"),
          role: item.getAttribute("role"),
          tagName: item.tagName,
        })),
      ),
    ).toEqual([
      { key: "cnb", role: "listitem", tagName: "ARTICLE" },
      { key: "sab", role: "listitem", tagName: "ARTICLE" },
      { key: "exams", role: "listitem", tagName: "ARTICLE" },
    ]);

    const cnb = rows.filter({ has: page.locator('[data-evidence-source]', { hasText: "ČNB" }) });
    await expect(
      cnb.getByRole("heading", {
        level: 3,
        name: "Registrace v evidenci České národní banky",
      }),
    ).toBeVisible();
    await expect(cnb).toContainText("Veřejný registr");
    const cnbLink = cnb.getByRole("link", {
      name: "Ověřit registraci v registru ČNB (otevře se v nové kartě)",
    });
    await expect(cnbLink).toHaveAttribute("data-evidence-row-link", "true");
    await expect(cnbLink).toHaveAttribute(
      "href",
      "https://jerrs.cnb.cz/apljerrsdad/JERRS.WEB10.VIZITKA?p_lang=cz&p_SEQ_ID=13296729&p_VER_ID=1004&p_DATUM=06.10.2026&p_ROL_KOD=",
    );

    const sab = rows.filter({
      has: page.locator('[data-evidence-source]', { hasText: "SAB servis" }),
    });
    await expect(
      sab.getByRole("heading", {
        level: 3,
        name: "Vázaný zástupce společnosti SAB servis s.r.o.",
      }),
    ).toBeVisible();
    await expect(sab).toContainText("IČO 24704008");
    const sabLink = sab.getByRole("link", {
      name: "Otevřít dokumentaci společnosti SAB servis (otevře se v nové kartě)",
    });
    await expect(sabLink).toHaveAttribute("data-evidence-row-link", "true");
    await expect(sabLink).toHaveAttribute(
      "href",
      "https://sabservis.cz/informace",
    );

    const exams = rows.filter({
      has: page.locator('[data-evidence-source]', { hasText: "Odborné zkoušky" }),
    });
    await expect(
      exams.getByRole("heading", {
        level: 3,
        name: "Osvědčení o odborné způsobilosti",
      }),
    ).toBeVisible();
    await expect(exams).toContainText("4 původní PDF dokumenty");

    const expectedDocuments = [
      ["Pojištění", "/pojisteni-cert.pdf"],
      ["Penzijní spoření", "/penzijko-cert.pdf"],
      ["Investice", "/investice-cert.pdf"],
      ["Úvěry", "/uvery-cert.pdf"],
    ] as const;
    const documentLinks = exams.locator("[data-evidence-certificate]");
    await expect(documentLinks).toHaveCount(expectedDocuments.length);

    for (const [index, [label, href]] of expectedDocuments.entries()) {
      const link = documentLinks.nth(index);
      await expect(link).toHaveAttribute("href", href);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      await expect(link).toContainText(label);
    }

    const actionLabels = [
      cnb.locator("[data-evidence-action]"),
      sab.locator("[data-evidence-action]"),
      ...(await documentLinks.all()),
    ];
    const sharedActionStyles = await Promise.all(
      actionLabels.map((action) =>
        action.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            color: style.color,
            display: style.display,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            minHeight: style.minHeight,
            textDecorationLine: style.textDecorationLine,
            textDecorationThickness: style.textDecorationThickness,
            textUnderlineOffset: style.textUnderlineOffset,
          };
        }),
      ),
    );
    for (const style of sharedActionStyles) {
      expect(Number.parseFloat(style.minHeight)).toBeGreaterThanOrEqual(44);
      expect(style.textDecorationLine).toBe("none");
      expect(Number.parseFloat(style.fontSize)).toBeGreaterThanOrEqual(14);
    }

    for (const [row, link] of [[cnb, cnbLink], [sab, sabLink]] as const) {
      const hitArea = await row.evaluate((rowElement) => {
        const rowRect = rowElement.getBoundingClientRect();
        const linkRect = rowElement
          .querySelector<HTMLElement>("[data-evidence-row-link]")!
          .getBoundingClientRect();
        return {
          bottom: Math.abs(rowRect.bottom - linkRect.bottom),
          left: Math.abs(rowRect.left - linkRect.left),
          right: Math.abs(rowRect.right - linkRect.right),
          top: Math.abs(rowRect.top - linkRect.top),
        };
      });
      expect(Math.max(...Object.values(hitArea))).toBeLessThanOrEqual(1);
      await expect(link).toHaveCSS("cursor", "pointer");
    }

    for (const link of [cnbLink, sabLink]) {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }

    await expect(evidence.locator("[data-evidence-legal]")).toHaveCount(0);
    await expect(evidence.locator("[data-evidence-exam]")).toHaveCount(0);
    await expect(evidence.locator("[data-evidence-card]")).toHaveCount(0);
    await expect(evidence.locator("time")).toHaveCount(0);
    await expect(evidence.locator("svg")).toHaveCount(13);
    expect(await evidence.locator("svg").evaluateAll((icons) =>
      icons.every((icon) => icon.getAttribute("aria-hidden") === "true"),
    )).toBe(true);
    await expect(evidence).not.toContainText("Právní a provozní informace");
    await expect(evidence).not.toContainText("Otevřít PDF");

    const footer = page.getByRole("contentinfo");
    await expect(footer.locator('a[href="/pravni-informace/"]')).toHaveCount(1);
    await expect(
      footer.locator('a[href="/zasady-zpracovani-osobnich-udaju/"]'),
    ).toHaveCount(1);
    await expect(footer.locator('a[href="/cookies-a-mereni/"]')).toHaveCount(1);

    await evidence.evaluate((section) => {
      const keyboardStart = document.createElement("button");
      keyboardStart.dataset.evidenceKeyboardStart = "true";
      section.before(keyboardStart);
      keyboardStart.focus();
    });
    for (const link of [cnbLink, sabLink, documentLinks.first()]) {
      await page.keyboard.press("Tab");
      await expect(link).toBeFocused();
      await expect(link).toHaveCSS("outline-style", "solid");
    }

    const accessibility = await new AxeBuilder({ page })
      .include('[data-home-module="evidence"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);

    for (const { width, height } of [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize({ width, height });
      const geometry = await evidence.evaluate((section) => {
        const registerElement = section.querySelector<HTMLElement>(
          "[data-evidence-register]",
        )!;
        const registerRect = registerElement.getBoundingClientRect();
        const registerStyle = getComputedStyle(registerElement);
        const heading = section
          .querySelector<HTMLElement>("#evidence-title")!
          .getBoundingClientRect();
        const lead = section
          .querySelector<HTMLElement>("[data-evidence-intro] > p")!
          .getBoundingClientRect();
        const rowGeometry = Array.from(
          section.querySelectorAll<HTMLElement>("[data-evidence-row]"),
          (row) => {
            const rect = row.getBoundingClientRect();
            const style = getComputedStyle(row);
            const source = row
              .querySelector<HTMLElement>("[data-evidence-source]")!
              .getBoundingClientRect();
            const content = row
              .querySelector<HTMLElement>("[data-evidence-content]")!
              .getBoundingClientRect();
            const action = row
              .querySelector<HTMLElement>("[data-evidence-action]")
              ?.getBoundingClientRect();

            return {
              key: row.getAttribute("data-evidence-row"),
              action: action
                ? {
                    bottom: action.bottom,
                    left: action.left,
                    right: action.right,
                    top: action.top,
                  }
                : null,
              backgroundImage: style.backgroundImage,
              borderBottomWidth: style.borderBottomWidth,
              borderRadius: style.borderRadius,
              boxShadow: style.boxShadow,
              content: {
                bottom: content.bottom,
                left: content.left,
                right: content.right,
                top: content.top,
              },
              height: rect.height,
              bottom: rect.bottom,
              left: rect.left,
              right: rect.right,
              source: {
                bottom: source.bottom,
                left: source.left,
                right: source.right,
                top: source.top,
              },
              top: rect.top,
            };
          },
        );
        const examsRow = section.querySelector<HTMLElement>(
          '[data-evidence-row="exams"]',
        )!;
        const examsContent = examsRow
          .querySelector<HTMLElement>("[data-evidence-content]")!
          .getBoundingClientRect();
        const examsRect = examsRow.getBoundingClientRect();
        const examsAction = examsRow
          .querySelector<HTMLElement>("[data-evidence-certificates]")!
          .getBoundingClientRect();
        const documents = Array.from(
          examsRow.querySelectorAll<HTMLElement>("[data-evidence-certificate]"),
          (link) => {
            const rect = link.getBoundingClientRect();
            const style = getComputedStyle(link);
            return {
              borderRadius: style.borderRadius,
              borderStyle: style.borderStyle,
              borderWidth: style.borderWidth,
              bottom: rect.bottom,
              height: rect.height,
              left: rect.left,
              right: rect.right,
              top: rect.top,
            };
          },
        );
        const targetHeights = Array.from(
          section.querySelectorAll<HTMLElement>("a"),
          (target) => target.getBoundingClientRect().height,
        );
        const arrows = Array.from(
          section.querySelectorAll<HTMLElement>("[data-evidence-arrow]"),
          (arrow) => {
            const rect = arrow.getBoundingClientRect();
            return {
              borderRadius: getComputedStyle(arrow).borderRadius,
              height: rect.height,
              width: rect.width,
            };
          },
        );

        return {
          arrows,
          documents,
          examsAction: {
            bottom: examsAction.bottom,
            left: examsAction.left,
            right: examsAction.right,
            top: examsAction.top,
          },
          examsContent: {
            left: examsContent.left,
            right: examsContent.right,
          },
          examsRow: {
            bottom: examsRect.bottom,
            left: examsRect.left,
            right: examsRect.right,
            top: examsRect.top,
          },
          heading: {
            bottom: heading.bottom,
            left: heading.left,
          },
          lead: {
            left: lead.left,
            top: lead.top,
          },
          minTargetHeight: Math.min(...targetHeights),
          overflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          register: {
            borderRadius: registerStyle.borderRadius,
            boxShadow: registerStyle.boxShadow,
            bottom: registerRect.bottom,
            display: registerStyle.display,
            left: registerRect.left,
            right: registerRect.right,
            top: registerRect.top,
          },
          rows: rowGeometry,
          sectionBackgroundImage: getComputedStyle(section).backgroundImage,
        };
      });

      expect(geometry.overflow).toBeLessThanOrEqual(1);
      expect(geometry.minTargetHeight).toBeGreaterThanOrEqual(44);
      expect(geometry.sectionBackgroundImage).toBe("none");
      expect(geometry.register.display).toBe("grid");
      expect(Number.parseFloat(geometry.register.borderRadius)).toBeGreaterThan(0);
      expect(geometry.register.boxShadow).not.toBe("none");
      expect(
        geometry.rows.every(
          (row) =>
            row.borderRadius === "0px" &&
            (row.key === "cnb"
              ? row.backgroundImage.startsWith("linear-gradient(") &&
                /^[a-z-]+\([^)]*\) 2px 0px 0px 0px inset$/u.test(row.boxShadow)
              : row.backgroundImage === "none" && row.boxShadow === "none"),
        ),
      ).toBe(true);
      expect(geometry.documents.every((document) =>
        document.borderRadius === "12px" &&
        document.borderStyle === "solid" && document.borderWidth === "1px",
      )).toBe(true);
      expect(geometry.arrows).toHaveLength(6);
      expect(geometry.arrows.every((arrow) =>
        Math.abs(arrow.width - arrow.height) <= 1 &&
        Number.parseFloat(arrow.borderRadius) >= arrow.width / 2,
      )).toBe(true);
      expect(
        geometry.documents.every(
          (document) =>
            document.left >= geometry.examsAction.left - 1 &&
            document.right <= geometry.examsAction.right + 1 &&
            document.top >= geometry.examsRow.top &&
            document.bottom <= geometry.examsRow.bottom,
        ),
      ).toBe(true);

      if (width >= 1024) {
        expect(geometry.lead.left).toBeGreaterThan(geometry.heading.left);
        expect(Math.max(...geometry.rows.map((row) => row.top)) -
          Math.min(...geometry.rows.map((row) => row.top)))
          .toBeLessThanOrEqual(1);
        expect(Math.max(...geometry.rows.map((row) => row.bottom)) -
          Math.min(...geometry.rows.map((row) => row.bottom)))
          .toBeLessThanOrEqual(1);
        expect(Math.max(...geometry.rows.map((row) => row.content.top)) -
          Math.min(...geometry.rows.map((row) => row.content.top)))
          .toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.rows[0]!.left - geometry.register.left))
          .toBeLessThanOrEqual(1.25);
        expect(Math.abs(geometry.rows[2]!.right - geometry.register.right))
          .toBeLessThanOrEqual(1.25);
        expect(Math.abs(geometry.rows[0]!.right - geometry.rows[1]!.left))
          .toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.rows[1]!.right - geometry.rows[2]!.left))
          .toBeLessThanOrEqual(1);
        expect(geometry.rows[0]!.right - geometry.rows[0]!.left)
          .toBeGreaterThan(geometry.rows[1]!.right - geometry.rows[1]!.left);
        expect(geometry.rows.every((row) =>
          row.action && row.action.top >= row.content.bottom)).toBe(true);
      } else if (width > 720) {
        expect(Math.abs(geometry.lead.left - geometry.heading.left))
          .toBeLessThanOrEqual(1);
        expect(geometry.lead.top - geometry.heading.bottom)
          .toBeGreaterThanOrEqual(16);
        expect(Math.abs(geometry.rows[0]!.left - geometry.register.left))
          .toBeLessThanOrEqual(1.25);
        expect(Math.abs(geometry.rows[0]!.right - geometry.register.right))
          .toBeLessThanOrEqual(1.25);
        expect(geometry.rows[1]!.top).toBeGreaterThanOrEqual(
          geometry.rows[0]!.bottom - 1,
        );
        expect(Math.abs(geometry.rows[1]!.right - geometry.rows[2]!.left))
          .toBeLessThanOrEqual(1);
      } else {
        expect(Math.abs(geometry.lead.left - geometry.heading.left))
          .toBeLessThanOrEqual(1);
        expect(geometry.lead.top - geometry.heading.bottom)
          .toBeGreaterThanOrEqual(16);
        for (const row of geometry.rows) {
          expect(row.source.top).toBeLessThanOrEqual(row.content.top);
          if (row.action) {
            expect(Math.abs(row.action.left - row.content.left)).toBeLessThanOrEqual(1);
            expect(row.action.top).toBeGreaterThanOrEqual(row.content.bottom);
          }
        }
        expect(geometry.rows[1]!.top).toBeGreaterThanOrEqual(
          geometry.rows[0]!.bottom - 1,
        );
        expect(geometry.rows[2]!.top).toBeGreaterThanOrEqual(
          geometry.rows[1]!.bottom - 1,
        );
      }

      if (width === 1440) {
        expect(geometry.rows.every((row) => row.height >= 280)).toBe(true);
        expect(geometry.rows.every((row) => row.height <= 360)).toBe(true);
        expect(new Set(geometry.documents.map((document) =>
          Math.round(document.top))).size).toBe(2);
      }
    }
  });

  test("uses distinct evidence feedback without widening document click areas", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await primeRejectedConsent(page);
    await page.goto("/", { waitUntil: "networkidle" });

    const readInteraction = (target: ReturnType<Page["locator"]>) =>
      target.evaluate((element) => {
        const row = element as HTMLElement;
        const rect = row.getBoundingClientRect();
        const style = getComputedStyle(row);
        const sweep = getComputedStyle(row, "::after");
        const title = row.querySelector<HTMLElement>("h3");
        const action = row.querySelector<HTMLElement>("[data-evidence-action]");
        const arrow = row.querySelector<HTMLElement>("[data-evidence-arrow]");
        return {
          actionBackground: action ? getComputedStyle(action).backgroundColor : null,
          actionDuration: action ? getComputedStyle(action).transitionDuration : null,
          arrowDuration: arrow ? getComputedStyle(arrow).transitionDuration : null,
          arrowTransform: arrow ? getComputedStyle(arrow).transform : null,
          background: style.backgroundColor,
          borderColor: style.borderColor,
          color: style.color,
          height: rect.height,
          sweepTransform: sweep.transform,
          titleColor: title ? getComputedStyle(title).color : null,
          width: rect.width,
        };
      });

    const evidence = page.locator('[data-home-module="evidence"]');
    const cnb = evidence.locator('[data-evidence-row="cnb"]');
    const sab = evidence.locator('[data-evidence-row="sab"]');
    const exams = evidence.locator('[data-evidence-row="exams"]');

    await cnb.scrollIntoViewIfNeeded();
    const cnbRest = await readInteraction(cnb);
    await cnb.getByRole("heading", { level: 3 }).hover();
    await expect.poll(async () =>
      (await readInteraction(cnb)).arrowTransform,
    ).not.toBe(cnbRest.arrowTransform);
    const cnbHover = await readInteraction(cnb);

    expect(cnbHover.actionDuration).toContain("0.26s");
    expect(cnbHover.background !== cnbRest.background ||
      cnbHover.actionBackground !== cnbRest.actionBackground).toBe(true);
    expect(cnbHover.width).toBe(cnbRest.width);
    expect(cnbHover.height).toBe(cnbRest.height);

    const sabRest = await readInteraction(sab);
    await sab.getByText("SAB servis", { exact: true }).hover();
    await expect.poll(async () =>
      (await readInteraction(sab)).arrowTransform,
    ).not.toBe(sabRest.arrowTransform);
    const sabHover = await readInteraction(sab);
    expect(sabHover.arrowDuration).toContain("0.26s");
    expect(sabHover.background).toBe(sabRest.background);
    expect(sabHover.sweepTransform).toBe(sabRest.sweepTransform);
    expect(sabHover.width).toBe(sabRest.width);
    expect(sabHover.height).toBe(sabRest.height);

    const examsRest = await readInteraction(exams);
    await exams.getByText("Odborné zkoušky", { exact: true }).hover();
    const examsBlankHover = await readInteraction(exams);
    expect(examsBlankHover.background).toBe(examsRest.background);
    expect(examsBlankHover.sweepTransform).toBe(examsRest.sweepTransform);
    expect(examsBlankHover.titleColor).toBe(examsRest.titleColor);
    expect(examsBlankHover.arrowTransform).toBe(examsRest.arrowTransform);

    const certificates = exams.locator("[data-evidence-certificate]");
    const firstCertificate = certificates.first();
    const certificateRest = await readInteraction(firstCertificate);
    await firstCertificate.hover();
    await expect.poll(async () =>
      (await readInteraction(firstCertificate)).arrowTransform,
    ).not.toBe(certificateRest.arrowTransform);
    const certificateHover = await readInteraction(firstCertificate);
    expect(certificateHover.arrowDuration).toContain("0.26s");
    expect(certificateHover.background !== certificateRest.background ||
      certificateHover.borderColor !== certificateRest.borderColor ||
      certificateHover.color !== certificateRest.color).toBe(true);
    expect(certificateHover.width).toBe(certificateRest.width);
    expect(certificateHover.height).toBe(certificateRest.height);
    const examsLinkHover = await readInteraction(exams);
    expect(examsLinkHover.background).toBe(examsRest.background);
    expect(examsLinkHover.sweepTransform).toBe(examsRest.sweepTransform);
    expect(examsLinkHover.titleColor).toBe(examsRest.titleColor);

    const arrowTransforms = await certificates.evaluateAll((links) =>
      links.map((link) => {
        const arrow = link.querySelector<HTMLElement>("[data-evidence-arrow]");
        return arrow ? getComputedStyle(arrow).transform : null;
      }),
    );
    expect(arrowTransforms[0]).not.toBe("none");
    expect(arrowTransforms.slice(1).every((transform) => transform === "none"))
      .toBe(true);

    await firstCertificate.focus();
    await expect(firstCertificate).toHaveCSS("outline-style", "solid");
    expect((await readInteraction(exams)).sweepTransform).toBe(
      examsRest.sweepTransform,
    );

    await page.evaluate(() => {
      document.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const link = target.closest<HTMLAnchorElement>(
          "a[data-evidence-row-link], a[data-evidence-certificate]",
        );
        if (!link) return;
        event.preventDefault();
        document.documentElement.dataset.evidenceTestClick = link.href;
      }, { capture: true });
    });

    for (const row of [cnb, sab]) {
      const rowLink = row.locator("[data-evidence-row-link]");
      const expectedHref = await rowLink.evaluate((link) =>
        (link as HTMLAnchorElement).href);
      await row.getByRole("heading", { level: 3 }).click();
      await expect(page.locator("html")).toHaveAttribute(
        "data-evidence-test-click",
        expectedHref,
      );
    }

    const expectedPdfHref = await firstCertificate.evaluate((link) =>
      (link as HTMLAnchorElement).href);
    await firstCertificate.click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-evidence-test-click",
      expectedPdfHref,
    );
  });

  test("tracks the active desktop review in a stable sticky proof navigator", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const section = page.locator('[data-home-module="references"]');
    const navigator = section.locator("[data-reference-proof-index]");
    const editorialRail = section.locator("[data-reference-editorial-rail]");
    const stickyScene = section.locator("[data-reference-sticky-scene]");
    const sectionHeading = section.getByRole("heading", {
      level: 2,
      name: "Jak spolupráce vypadá z druhé strany.",
    });
    await expect(section).toHaveAttribute("data-references-enhanced", "true");
    await expect(stickyScene).toHaveCSS("position", "sticky");
    await expect(navigator).toHaveAttribute(
      "data-cinematic-motion",
      "ready",
    );
    await scrollReferenceProgress(page, 0.04);
    await expect(sectionHeading).toBeVisible();
    await expect(sectionHeading).toHaveCSS("position", "static");
    await expect(editorialRail.getByRole("heading")).toHaveCount(0);
    await expect(navigator).toHaveAttribute(
      "data-active-reference",
      homepageReferences[0].id,
    );
    const persistentProofState = navigator.locator(
      "[data-reference-persistent-attribution]",
    );
    await expect(persistentProofState).toHaveCount(1);
    await expect(persistentProofState).toBeVisible();
    await expect(persistentProofState).toHaveCSS("opacity", "1");
    await expect(section.locator("blockquote > p")).toHaveText(
      homepageReferences.map((reference) => reference.excerpt),
    );
    for (const reference of homepageReferences) {
      await expect(
        section.locator(`[data-home-reference="${reference.id}"] blockquote`),
      ).not.toContainText(reference.fullText);
    }

    const readLiveProgress = async () =>
      persistentProofState.evaluate((state) => {
        const track = state.querySelector<HTMLElement>(
          "[data-reference-progress-track]",
        )!;
        const value = state.querySelector<HTMLElement>(
          "[data-reference-progress-value]",
        )!;
        return value.getBoundingClientRect().width
          / track.getBoundingClientRect().width;
      });

    await scrollReferenceProgress(page, 0.04);
    await expect(navigator).toHaveAttribute(
      "data-active-reference",
      homepageReferences[0].id,
    );
    const earlyProgress = await readLiveProgress();
    await scrollReferenceProgress(page, 0.14);
    await expect(navigator).toHaveAttribute(
      "data-active-reference",
      homepageReferences[0].id,
    );
    const laterProgress = await readLiveProgress();
    expect(earlyProgress).toBeCloseTo(0.04, 2);
    expect(laterProgress).toBeCloseTo(0.14, 2);
    expect(laterProgress).toBeGreaterThan(earlyProgress);

    const sceneHeights: number[] = [];
    for (const reference of homepageReferences) {
      await scrollReferenceToActivationAxis(page, reference.id);
      await expect(navigator).toHaveAttribute("data-active-reference", reference.id);
      await expect(section.locator('[data-home-reference][data-active="true"]'))
        .toHaveAttribute("data-home-reference", reference.id);
      const activeChapter = section.locator(
        `[data-home-reference="${reference.id}"]`,
      );
      await expect(activeChapter).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      const activeGeometry = await activeChapter.evaluate((article) => {
        const scene = article.closest<HTMLElement>(
          "[data-reference-sticky-scene]",
        )!;
        const metadata = scene.querySelector<HTMLElement>(
          "[data-reference-persistent-attribution]",
        )!;
        const quote = article.querySelector<HTMLElement>("blockquote")!;
        const paragraph = quote.querySelector<HTMLElement>("p")!;
        const sceneRect = scene.getBoundingClientRect();
        const metadataRect = metadata.getBoundingClientRect();
        const quoteRect = quote.getBoundingClientRect();
        const paragraphRect = paragraph.getBoundingClientRect();

        return {
          metadataCenter: metadataRect.top + metadataRect.height / 2,
          paragraphFits:
            paragraphRect.top >= sceneRect.top
            && paragraphRect.bottom <= sceneRect.bottom,
          quoteCenter: quoteRect.top + quoteRect.height / 2,
          quoteHasSurface:
            getComputedStyle(quote).backgroundColor !== "rgba(0, 0, 0, 0)",
        };
      });
      expect(activeGeometry.paragraphFits).toBe(true);
      expect(activeGeometry.quoteHasSurface).toBe(false);
      expect(
        Math.abs(activeGeometry.metadataCenter - activeGeometry.quoteCenter),
      ).toBeLessThanOrEqual(160);
      await expect.poll(() => section.locator(
        "[data-home-reference]",
      ).evaluateAll((articles) => articles.filter((article) => {
        const style = getComputedStyle(article);
        return style.visibility !== "hidden" && Number(style.opacity) > 0.98;
      }).length)).toBe(1);
      const activeProofState = persistentProofState;
      await expect(activeProofState).not.toHaveAttribute("aria-hidden", "true");
      await expect(activeProofState).toContainText(reference.author);
      await expect(activeProofState.locator("[data-rating-star]")).toHaveCount(5);
      const sourceLink = activeProofState.locator('a[target="_blank"]');
      await expect(sourceLink).toBeVisible();
      await expect(sourceLink).toHaveAttribute("href", reference.sourceUrl);
      await expect(sourceLink).toContainText(
        `Google recenze · ${reference.rating} z 5`,
      );
      await expect(sourceLink).not.toHaveAttribute("tabindex", "-1");
      await page.mouse.move(0, 0);
      await expect.poll(() => sourceLink.evaluate((link) =>
        getComputedStyle(link).textDecorationColor,
      )).toBe("rgba(0, 0, 0, 0)");
      const sourceLinkStyle = await sourceLink.evaluate((link) => {
        const style = getComputedStyle(link);
        return {
          backgroundColor: style.backgroundColor,
          height: link.getBoundingClientRect().height,
          textDecorationColor: style.textDecorationColor,
        };
      });
      expect(sourceLinkStyle.backgroundColor).toBe("rgba(0, 0, 0, 0)");
      expect(sourceLinkStyle.height).toBeGreaterThanOrEqual(44);
      expect(sourceLinkStyle.textDecorationColor).toBe("rgba(0, 0, 0, 0)");
      await sourceLink.hover();
      await expect.poll(() => sourceLink.evaluate((link) =>
        getComputedStyle(link).textDecorationColor,
      )).not.toBe("rgba(0, 0, 0, 0)");
      const inactiveProofStates = navigator.locator(
        '[data-reference-fallback-attribution][data-current="false"]',
      );
      await expect(inactiveProofStates).toHaveCount(
        homepageReferences.length - 1,
      );
      for (const inactiveState of await inactiveProofStates.all()) {
        await expect(inactiveState.locator("xpath=.."))
          .toHaveAttribute("aria-hidden", "true");
        await expect(inactiveState.locator("a")).toHaveAttribute("tabindex", "-1");
      }
      const progressRatio = await activeProofState.evaluate((state) => {
        const track = state.querySelector<HTMLElement>(
          "[data-reference-progress-track]",
        )!;
        const value = state.querySelector<HTMLElement>(
          "[data-reference-progress-value]",
        )!;
        return value.getBoundingClientRect().width
          / track.getBoundingClientRect().width;
      });
      expect(progressRatio).toBeCloseTo(
        (homepageReferences.indexOf(reference) + 0.5)
          / homepageReferences.length,
        2,
      );
      sceneHeights.push(await stickyScene.evaluate((element) =>
        element.getBoundingClientRect().height));
    }

    expect(new Set(sceneHeights.map(Math.round)).size).toBe(1);
    await expect(editorialRail.getByRole("link", {
      name: "Přečíst všechny reference",
    })).toHaveCount(0);
    await scrollReferenceToActivationAxis(page, homepageReferences[1].id);
    await expect(navigator).toHaveAttribute(
      "data-active-reference",
      homepageReferences[1].id,
    );
    const stickyGeometry = await page.evaluate(() => {
      const headerRect = document.querySelector<HTMLElement>(
        '[data-component="site-header"]',
      )!.getBoundingClientRect();
      const sceneRect = document.querySelector<HTMLElement>(
        "[data-reference-sticky-scene]",
      )!.getBoundingClientRect();
      const activeQuoteRect = document.querySelector<HTMLElement>(
        "[data-home-reference][data-active='true'] blockquote",
      )!.getBoundingClientRect();
      return {
        activeQuoteCenter: activeQuoteRect.top + activeQuoteRect.height / 2,
        headerBottom: headerRect.bottom,
        sceneCenter: sceneRect.top + sceneRect.height / 2,
        sceneTop: sceneRect.top,
      };
    });
    expect(stickyGeometry.sceneTop).toBeGreaterThan(stickyGeometry.headerBottom);
    expect(Math.abs(
      stickyGeometry.sceneCenter - stickyGeometry.activeQuoteCenter,
    )).toBeLessThanOrEqual(2);
    expect(await sectionHeading.evaluate((element) =>
      element.getBoundingClientRect().bottom)).toBeLessThan(0);

    const hiddenInactiveReviews = await section.locator(
      "[data-home-reference]:not([data-active='true'])",
    ).evaluateAll((elements) => elements.every((element) =>
      (element as HTMLElement).inert
      && element.getAttribute("aria-hidden") === "true"));
    expect(hiddenInactiveReviews).toBe(true);

    await scrollReferenceToActivationAxis(page, homepageReferences[0].id);
    await expect(navigator).toHaveAttribute(
      "data-active-reference",
      homepageReferences[0].id,
    );
    await scrollReferenceToActivationAxis(page, finalHomepageReference.id);
    await expect(navigator).toHaveAttribute(
      "data-active-reference",
      finalHomepageReference.id,
    );
    await scrollReferenceToActivationAxis(page, homepageReferences[1].id);
    await expect(navigator).toHaveAttribute(
      "data-active-reference",
      homepageReferences[1].id,
    );

    const stableLayerOpacities = await section.locator(
      "[data-home-reference]",
    ).evaluateAll((articles) =>
      articles.map((article) => Number(getComputedStyle(article).opacity)));
    expect(stableLayerOpacities.filter((opacity) => opacity > 0.98))
      .toHaveLength(1);

    await expect(page.locator("[data-process-transition-flow]")).toHaveCount(0);
    await expect(page.locator("[data-references-process-reveal]"))
      .toHaveAttribute("data-state", "ready");
    await expect(section).toHaveAttribute("data-process-handoff-enhanced", "true");
    const sectionBoundary = await page.evaluate(() => {
      const references = document.querySelector<HTMLElement>(
        '[data-home-module="references"]',
      )!;
      const process = document.querySelector<HTMLElement>(
        '[data-home-module="process"]',
      )!;
      return {
        gap: process.offsetTop - (references.offsetTop + references.offsetHeight),
        processHeight: process.offsetHeight,
      };
    });
    expect(Math.abs(sectionBoundary.gap)).toBeLessThanOrEqual(1);
    const handoffEntry = await page.evaluate(() => {
      const layoutTop = (element: HTMLElement) => {
        let top = 0;
        let current: HTMLElement | null = element;
        while (current) {
          top += current.offsetTop;
          current = current.offsetParent as HTMLElement | null;
        }
        return top;
      };
      const grid = document.querySelector<HTMLElement>(
        "[data-home-references-grid]",
      )!;
      const stickyScene = document.querySelector<HTMLElement>(
        "[data-reference-sticky-scene]",
      )!;
      const stickyInset = Number.parseFloat(getComputedStyle(stickyScene).top);
      return layoutTop(grid)
        - stickyInset
        + grid.offsetHeight
        - stickyScene.offsetHeight
        + 4;
    });
    await scrollImmediately(page, handoffEntry);
    await expect(page.locator("[data-process-reveal]"))
      .toHaveAttribute("data-state", "ready");
    await expect(navigator).toHaveAttribute(
      "data-active-reference",
      finalHomepageReference.id,
    );

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "domcontentloaded" });
    const reducedSection = page.locator('[data-home-module="references"]');
    const reducedReader = reducedSection.locator("[data-reference-reader]");
    await expect(reducedSection).not.toHaveAttribute(
      "data-references-enhanced",
      "true",
    );
    await expect(reducedReader).toHaveAttribute(
      "data-cinematic-motion",
      "reduced",
    );
    await expect(reducedSection.locator("[data-home-reference]"))
      .toHaveCount(homepageReferences.length);
    await expect(reducedSection.locator("[data-home-reference][aria-hidden]"))
      .toHaveCount(0);
    await expect(reducedSection.locator("[data-home-reference]"))
      .toHaveCSS("position", "relative");
  });

  test("uses width-only desktop motion and preserves a semantic static fallback", async ({
    browser,
    page,
  }) => {
    test.setTimeout(120_000);
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const mobileSection = page.locator('[data-home-module="references"]');
    await expect(mobileSection).not.toHaveAttribute("data-references-enhanced", "true");
    await expect(mobileSection.locator("[data-reference-proof-index]")).toBeVisible();
    await expect(mobileSection.locator("[data-reference-editorial-rail]"))
      .toHaveCSS("position", "static");
    await expect(mobileSection.locator("[data-home-reference]"))
      .toHaveCount(homepageReferences.length);
    await expect(mobileSection.locator("[data-home-reference][aria-hidden]"))
      .toHaveCount(0);
    await expect(mobileSection.locator("article cite")).toHaveText(
      homepageReferences.map((reference) => reference.author),
    );
    await expect(mobileSection.locator("article a[target='_blank']"))
      .toHaveCount(homepageReferences.length);
    await expect(mobileSection.locator("article [data-rating-star]"))
      .toHaveCount(homepageReferences.length * 5);
    await expect(mobileSection.getByRole("link", {
      name: "Přečíst všechny reference",
    })).toHaveCount(0);
    await expect(mobileSection.locator("[data-references-cta-stage]"))
      .toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    const fallbackContext = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1440, height: 900 },
    });
    const fallbackPage = await fallbackContext.newPage();
    await fallbackPage.goto("/", { waitUntil: "domcontentloaded" });

    const fallbackSection = fallbackPage.locator('[data-home-module="references"]');
    await expect(fallbackSection).not.toHaveAttribute("data-references-enhanced", "true");
    await expect(fallbackSection.locator("[data-reference-proof-index]")).toBeVisible();
    await expect(fallbackSection.locator("[data-reference-editorial-rail]"))
      .toHaveCSS("position", "static");
    await expect(fallbackSection.locator("[data-home-reference][aria-hidden]"))
      .toHaveCount(0);
    await expect(fallbackSection.locator("article cite")).toHaveText(
      homepageReferences.map((reference) => reference.author),
    );
    await expect(fallbackSection.locator("[data-references-cta-stage]"))
      .toHaveCount(0);
    await expectNoHorizontalOverflow(fallbackPage);
    await fallbackContext.close();

    const lowViewportContext = await browser.newContext({
      viewport: { width: 1440, height: 680 },
    });
    const lowViewportPage = await lowViewportContext.newPage();
    await primeRejectedConsent(lowViewportPage);
    await lowViewportPage.goto("/", { waitUntil: "domcontentloaded" });
    const lowViewportSection = lowViewportPage.locator(
      '[data-home-module="references"]',
    );
    const lowViewportCinematicController = lowViewportPage.locator(
      "[data-home-cinematic-scroll]",
    );
    const lowViewportSituationScene = lowViewportPage.locator(
      '[data-home-module="situations"]',
    );
    const lowViewportHandoff = lowViewportPage.locator(
      "[data-references-process-reveal]",
    );
    const lowViewportProcess = lowViewportPage.locator(
      '[data-home-module="process"]',
    );
    const lowViewportProcessReveal = lowViewportProcess.locator(
      "[data-process-reveal]",
    );
    const lowViewportEvidence = lowViewportPage.locator(
      '[data-home-module="evidence"]',
    );
    const lowViewportEvidenceHandoff = lowViewportPage.locator(
      "[data-process-evidence-reveal]",
    );
    await expect(lowViewportCinematicController).toHaveAttribute(
      "data-mode",
      "cinematic",
    );
    await expect(lowViewportSituationScene).toHaveAttribute(
      "data-cinematic-motion",
      "owned-scene",
    );
    await expect(lowViewportHandoff).toHaveAttribute("data-state", "ready");
    await expect(lowViewportEvidenceHandoff).toHaveAttribute("data-state", "ready");
    await expect(lowViewportEvidence).toHaveAttribute(
      "data-process-evidence-layer",
      "true",
    );
    await expect(lowViewportProcessReveal).toHaveAttribute("data-state", "ready");
    await expect(lowViewportProcessReveal).toHaveAttribute(
      "data-sequence",
      "sticky-stage",
    );
    await expect(lowViewportProcess).toHaveAttribute(
      "data-process-sequence-enhanced",
      "true",
    );
    await expect(lowViewportProcess.locator("[data-process-pin-stage]"))
      .toHaveCSS("position", "sticky");
    await expect(lowViewportSection).toHaveAttribute(
      "data-references-enhanced",
      "true",
    );
    await expect(lowViewportSection).toHaveAttribute(
      "data-process-handoff-enhanced",
      "true",
    );
    await expect(lowViewportSection.locator("[data-reference-proof-index]")).toBeVisible();
    await expect(lowViewportSection.locator("[data-reference-sticky-scene]"))
      .toHaveCSS("position", "sticky");
    await expect(lowViewportSection.locator("article[data-active='true']")).toHaveCount(1);
    await expect(lowViewportSection
      .locator("article[data-active='true'] blockquote"))
      .toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

    await lowViewportPage.setViewportSize({ width: 1440, height: 560 });
    await expect(lowViewportCinematicController).toHaveAttribute(
      "data-mode",
      "cinematic",
    );
    await expect(lowViewportSituationScene).toHaveAttribute(
      "data-cinematic-motion",
      "owned-scene",
    );
    await expect(lowViewportHandoff).toHaveAttribute("data-state", "ready");
    await expect(lowViewportEvidenceHandoff).toHaveAttribute("data-state", "ready");
    await expect(lowViewportProcess).toHaveAttribute(
      "data-process-sequence-enhanced",
      "true",
    );
    await expect(lowViewportProcess.locator("[data-process-pin-stage]"))
      .toHaveCSS("position", "sticky");
    await expect(lowViewportSection).toHaveAttribute(
      "data-references-enhanced",
      "true",
    );
    await expect(lowViewportSection.locator("[data-reference-sticky-scene]"))
      .toHaveCSS("position", "sticky");
    await expect.poll(async () => {
      await scrollReferenceToActivationAxis(
        lowViewportPage,
        homepageReferences[1].id,
      );
      return lowViewportSection.locator("[data-reference-proof-index]")
        .getAttribute("data-active-reference");
    }).toBe(homepageReferences[1].id);
    await expect(lowViewportSection.locator("article[data-active='true']"))
      .toHaveAttribute("data-home-reference", homepageReferences[1].id);

    const processSequenceGeometry = await lowViewportProcess.evaluate((section) => {
      let top = 0;
      let current: HTMLElement | null = section as HTMLElement;
      while (current) {
        top += current.offsetTop;
        current = current.offsetParent as HTMLElement | null;
      }
      const distance = Number.parseFloat(
        getComputedStyle(section).getPropertyValue("--process-sequence-distance"),
      );
      return {
        end: top + distance,
        midpoint: top + distance * 0.5,
      };
    });
    await expect.poll(async () => {
      await scrollImmediately(lowViewportPage, processSequenceGeometry.midpoint);
      const progress = Number.parseFloat(
        await lowViewportProcessReveal.getAttribute("data-progress") ?? "0",
      );
      return progress >= 0.48 && progress <= 0.52;
    }).toBe(true);
    await expect(lowViewportProcessReveal).toHaveAttribute(
      "data-phase",
      "ledger-2",
    );
    const lowHeightProcessGeometry = await lowViewportProcess.evaluate((section) => {
      const stage = section.querySelector<HTMLElement>("[data-process-pin-stage]")!;
      const actionRail = section.querySelector<HTMLElement>(
        "[data-process-action-rail]",
      )!;
      const stageRect = stage.getBoundingClientRect();
      const actionRailRect = actionRail.getBoundingClientRect();
      return {
        actionRailBottom: actionRailRect.bottom,
        stageBottom: stageRect.bottom,
      };
    });
    expect(lowHeightProcessGeometry.actionRailBottom)
      .toBeLessThanOrEqual(lowHeightProcessGeometry.stageBottom);

    await scrollImmediately(
      lowViewportPage,
      processSequenceGeometry.end + 280,
    );
    await expect.poll(() => lowViewportEvidenceHandoff.getAttribute(
      "data-progress",
    )).toBe("0.500");
    const lowHeightEvidenceClip = await lowViewportEvidence.evaluate(
      (section) => getComputedStyle(section).clipPath,
    );
    expect(lowHeightEvidenceClip).toMatch(
      /circle\([\d.]+px at 50% 560px\)/u,
    );
    await expectNoHorizontalOverflow(lowViewportPage);
    await lowViewportContext.close();
  });

  test("reflows from 320px through wide without changing module order", async ({ page }) => {
    test.setTimeout(360_000);
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });

    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForHeroFinalState(page);
    await waitForHeroSilkReady(page);

    for (const width of [320, 375, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await waitForHeroFinalState(page);
      await waitForHeroSilkResize(page, width);
      await expectNoHorizontalOverflow(page);

      const menuVisible = await page.locator(
        '[data-component="site-navigation"] > button',
      ).isVisible();
      expect(menuVisible).toBe(width <= 900);

      await expect(page.locator("[data-hero-portrait]")).toHaveCount(1);
      await expect(page.locator("[data-hero-context-wave]")).toHaveCount(0);
      await expect(page.locator("[data-hero-silk-host] canvas")).toHaveCount(1);
      await waitForHeroSilkReady(page);
      await expect(page.locator("[data-cinematic-home-hero]")).toHaveAttribute(
        "data-hero-state",
        "portrait-silk",
      );

      const sharedContainerGeometry = await page.locator(
        '[data-layout="container"]',
      ).evaluateAll((containers) => containers.map((container) => {
        const rect = container.getBoundingClientRect();
        const style = getComputedStyle(container);
        return {
          left: rect.left + Number.parseFloat(style.paddingLeft),
          right: rect.right - Number.parseFloat(style.paddingRight),
        };
      }));
      const heroFrameGeometry = await page.locator("[data-home-container-frame]").evaluate(
        (frame) => {
          const rect = frame.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        },
      );
      expect(sharedContainerGeometry.length).toBeGreaterThanOrEqual(9);
      for (const container of sharedContainerGeometry) {
        expect(Math.abs(container.left - heroFrameGeometry.left)).toBeLessThanOrEqual(1);
        expect(Math.abs(container.right - heroFrameGeometry.right)).toBeLessThanOrEqual(1);
      }

      const tops = await Promise.all(
        modules.map(({ selector }) =>
          page.locator(selector).evaluate((element) => {
            const transitionLayer = element.closest<HTMLElement>("[data-hero-transition-layer]");
            const style = getComputedStyle(transitionLayer ?? element);
            const translateY = style.transform === "none"
              ? 0
              : new DOMMatrixReadOnly(style.transform).m42;
            return element.getBoundingClientRect().top + scrollY - translateY;
          }),
        ),
      );
      expect(tops).toEqual([...tops].sort((left, right) => left - right));

      if (width >= 1440) {
        const headlineRows = await page.locator("[data-hero-heading-line]").evaluateAll((lines) =>
          new Set(lines.map((line) => Math.round(line.getBoundingClientRect().top))).size);
        expect(headlineRows).toBe(2);
        const typography = await page.locator("main h1").evaluate((heading) => {
          const style = getComputedStyle(heading);
          return {
            fontSize: Number.parseFloat(style.fontSize),
            letterSpacing: style.letterSpacing,
            lineHeight: Number.parseFloat(style.lineHeight),
          };
        });
        expect(typography.fontSize).toBeGreaterThanOrEqual(90);
        expect(typography.fontSize).toBeLessThanOrEqual(110);
        expect(typography.lineHeight / typography.fontSize).toBeGreaterThanOrEqual(0.89);
        expect(typography.lineHeight / typography.fontSize).toBeLessThanOrEqual(0.91);
        expect(["0px", "normal"]).toContain(typography.letterSpacing);

        const sceneGeometry = await page.locator('[data-component="domain-hero"]').evaluate(
          (heroElement) => {
            const heroRect = heroElement.getBoundingClientRect();
            const portraitRect = heroElement.querySelector<HTMLElement>(
              "[data-hero-portrait]",
            )!.getBoundingClientRect();
            const lastLine = heroElement.querySelectorAll("[data-hero-heading-line]")[1]
              .getBoundingClientRect();
            return {
              headlineFits: lastLine.right <= document.documentElement.clientWidth + 1,
              heroHeight: heroRect.height,
              portraitCoversBottom: Math.abs(portraitRect.bottom - heroRect.bottom) <= 1,
              portraitCoversTop: Math.abs(portraitRect.top - heroRect.top) <= 1,
            };
          },
        );
        expect(sceneGeometry.headlineFits).toBe(true);
        expect(sceneGeometry.heroHeight).toBeGreaterThanOrEqual(900);
        expect(sceneGeometry.portraitCoversBottom).toBe(true);
        expect(sceneGeometry.portraitCoversTop).toBe(true);

        const situationTop = await page.locator('[data-home-module="situations"]').evaluate(
          (element) => {
            const transitionLayer = element.closest<HTMLElement>("[data-hero-transition-layer]");
            const style = getComputedStyle(transitionLayer ?? element);
            const translateY = style.transform === "none"
              ? 0
              : new DOMMatrixReadOnly(style.transform).m42;
            return element.getBoundingClientRect().top - translateY;
          },
        );
        expect(situationTop).toBeGreaterThanOrEqual(900);

        await expect(page.locator("[data-hero-trust]")).toHaveCount(0);

        const heroAxis = await page.evaluate(() => {
          const brand = document.querySelector<HTMLElement>(
            '[aria-label="David Pokorný – úvod"]',
          )!.getBoundingClientRect();
          const heading = document.querySelector<HTMLElement>("main h1")!
            .getBoundingClientRect();
          const headerAction = document.querySelector<HTMLElement>(
            '[data-analytics-placement="header"]',
          )!.getBoundingClientRect();

          return {
            brandToHeading: brand.left - heading.left,
            headerActionToHeading: headerAction.right - heading.right,
          };
        });
        expect(Math.abs(heroAxis.brandToHeading)).toBeLessThanOrEqual(1);
        expect(Math.abs(heroAxis.headerActionToHeading)).toBeLessThanOrEqual(1);

        const referenceGeometry = await page.evaluate(() => {
          const situations = document.querySelector<HTMLElement>(
            '[data-home-module="situations"]',
          )!;
          const profile = document.querySelector<HTMLElement>(
            '[data-home-module="profile"]',
          )!;
          const references = document.querySelector<HTMLElement>(
            '[data-home-module="references"]',
          )!;
          const situationStyle = getComputedStyle(situations);
          const profileStyle = getComputedStyle(profile);
          const referencesStyle = getComputedStyle(references);
          const situationRect = situations.getBoundingClientRect();
          const profileRect = profile.getBoundingClientRect();
          const referencesRect = references.getBoundingClientRect();

          return {
            lightBackgroundsMatch:
              situationStyle.backgroundColor === referencesStyle.backgroundColor,
            profileBackgroundMatches:
              profileStyle.backgroundColor === situationStyle.backgroundColor,
            profileBorderBottom: Number.parseFloat(profileStyle.borderBottomWidth),
            profileBorderTop: Number.parseFloat(profileStyle.borderTopWidth),
            situationsAfterProfile: situationRect.top - profileRect.bottom,
            referenceBorderTop: Number.parseFloat(referencesStyle.borderTopWidth),
            referencesAfterSituations: referencesRect.top - situationRect.bottom,
            situationBorderBottom: Number.parseFloat(situationStyle.borderBottomWidth),
          };
        });
        expect(referenceGeometry.lightBackgroundsMatch).toBe(true);
        expect(referenceGeometry.profileBackgroundMatches).toBe(true);
        expect(referenceGeometry.profileBorderTop).toBe(1);
        expect(referenceGeometry.profileBorderBottom).toBe(1);
        expect(Math.abs(referenceGeometry.situationsAfterProfile)).toBeLessThanOrEqual(1);
        expect(referenceGeometry.referenceBorderTop).toBe(0);
        expect(Math.abs(referenceGeometry.referencesAfterSituations)).toBeLessThanOrEqual(1);
        expect(referenceGeometry.situationBorderBottom).toBe(0);
      }

      const headlineGeometry = await page.locator("[data-hero-heading-line]").evaluateAll(
        (lines) => ({
          offset: lines[1].getBoundingClientRect().left
            - lines[0].getBoundingClientRect().left,
        }),
      );
      expect(Math.abs(headlineGeometry.offset)).toBeLessThanOrEqual(1);

      const processGeometry = await page.locator('[data-home-module="process"]').evaluate(
        (section) => {
          const header = section.querySelector<HTMLElement>("[data-process-header]")!;
          const layout = section.querySelector<HTMLElement>("[data-process-layout]")!;
          const container = section.querySelector<HTMLElement>("[data-layout='container']")!;
          const rail = section.querySelector<HTMLElement>("[data-process-rail]")!;
          const actionRail = section.querySelector<HTMLElement>(
            "[data-process-action-rail]",
          )!;
          const action = section.querySelector<HTMLElement>("[data-process-action]")!;
          const cta = section.querySelector<HTMLElement>("[data-process-cta]")!;
          const detail = section.querySelector<HTMLElement>("[data-process-detail]")!;
          const videoTrigger = section.querySelector<HTMLElement>(
            "[data-process-video-trigger]",
          )!;
          const steps = [...rail.querySelectorAll<HTMLElement>(":scope > li")];
          const sectionStyle = getComputedStyle(section);
          const containerStyle = getComputedStyle(container);
          const railStyle = getComputedStyle(rail);
          const firstStepStyle = getComputedStyle(steps[0]);
          const lastStepStyle = getComputedStyle(steps[steps.length - 1]);
          const sectionRect = section.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const containerContentLeft = containerRect.left
            + Number.parseFloat(containerStyle.paddingLeft);
          const containerContentRight = containerRect.right
            - Number.parseFloat(containerStyle.paddingRight);
          const railRect = rail.getBoundingClientRect();
          const actionRect = action.getBoundingClientRect();
          const ctaRect = cta.getBoundingClientRect();
          const videoTriggerRect = videoTrigger.getBoundingClientRect();
          const readTranslateX = (element: HTMLElement) => {
            const transform = getComputedStyle(element).transform;
            return transform === "none"
              ? 0
              : new DOMMatrixReadOnly(transform).m41;
          };
          const actionLayoutLeft = actionRect.left - readTranslateX(action);
          const videoTriggerLayoutRight = videoTriggerRect.right
            - readTranslateX(videoTrigger);
          const stepLefts = steps.map((step) => step.getBoundingClientRect().left);
          const statementLefts = steps.map((step) => step.querySelector<HTMLElement>(
            "h3",
          )!.getBoundingClientRect().left);

          return {
            borderBottom: Number.parseFloat(sectionStyle.borderBottomWidth),
            borderTop: Number.parseFloat(sectionStyle.borderTopWidth),
            actionColumns: getComputedStyle(actionRail).gridTemplateColumns
              .split(" ").length,
            actionStartGap: actionLayoutLeft - containerContentLeft,
            actionHeadlineGap: actionLayoutLeft - statementLefts[0],
            ctaHeight: ctaRect.height,
            ctaWidth: ctaRect.width,
            detailHeaderGap:
              detail.getBoundingClientRect().left - header.getBoundingClientRect().left,
            headerLeftGap: header.getBoundingClientRect().left - railRect.left,
            layoutColumns: getComputedStyle(layout).gridTemplateColumns.split(" ").length,
            headerIsSmallHeading: header.tagName === "H2",
            minHeight: sectionStyle.minHeight,
            registerBottomRule: Number.parseFloat(railStyle.borderBottomWidth) > 0,
            registerLeftGap: railRect.left - containerContentLeft,
            registerRightGap: containerContentRight - railRect.right,
            registerTopRule: Number.parseFloat(railStyle.borderTopWidth) > 0,
            rowColumns: steps.map((step) =>
              getComputedStyle(step).gridTemplateColumns.split(" ").length),
            statementLeftSpread:
              Math.max(...statementLefts) - Math.min(...statementLefts),
            firstStepHasTopRule: Number.parseFloat(firstStepStyle.borderTopWidth) > 0,
            lastStepHasBottomRule: Number.parseFloat(lastStepStyle.borderBottomWidth) > 0,
            stepLeftSpread: Math.max(...stepLefts) - Math.min(...stepLefts),
            stepLefts,
            stepsFit: steps.every((step) => {
              const rect = step.getBoundingClientRect();
              return rect.left >= sectionRect.left - 1 && rect.right <= sectionRect.right + 1;
            }),
            videoRightGap: containerContentRight - videoTriggerLayoutRight,
          };
        },
      );
      expect(processGeometry.borderBottom).toBe(0);
      expect(processGeometry.borderTop).toBe(0);
      expect(processGeometry.firstStepHasTopRule).toBe(false);
      expect(processGeometry.headerIsSmallHeading).toBe(true);
      expect(processGeometry.lastStepHasBottomRule).toBe(false);
      expect(Number.parseFloat(processGeometry.minHeight)).toBeGreaterThanOrEqual(899);
      expect(processGeometry.layoutColumns).toBe(12);
      expect(processGeometry.registerBottomRule).toBe(true);
      expect(processGeometry.registerTopRule).toBe(true);
      expect(Math.abs(processGeometry.headerLeftGap)).toBeLessThanOrEqual(1);
      expect(Math.abs(processGeometry.registerLeftGap)).toBeLessThanOrEqual(1);
      expect(Math.abs(processGeometry.registerRightGap)).toBeLessThanOrEqual(1);
      expect(processGeometry.statementLeftSpread).toBeLessThanOrEqual(1);
      expect(processGeometry.stepLeftSpread).toBeLessThanOrEqual(1);
      expect(processGeometry.stepsFit).toBe(true);
      expect(Math.abs(processGeometry.detailHeaderGap)).toBeLessThanOrEqual(1);
      if (width > 720) {
        expect(processGeometry.actionColumns).toBe(3);
        expect(Math.abs(processGeometry.actionHeadlineGap)).toBeLessThanOrEqual(1);
        expect(Math.abs(processGeometry.videoRightGap)).toBeLessThanOrEqual(1);
      } else {
        expect(processGeometry.actionColumns).toBe(1);
        expect(Math.abs(processGeometry.actionStartGap)).toBeLessThanOrEqual(1);
        expect(Math.abs(processGeometry.videoRightGap)).toBeLessThanOrEqual(1);
      }
      if (width >= 1025) {
        expect(processGeometry.ctaHeight).toBeGreaterThanOrEqual(48);
        expect(processGeometry.ctaHeight).toBeLessThanOrEqual(52);
        expect(processGeometry.ctaWidth).toBeGreaterThanOrEqual(232);
        expect(processGeometry.ctaWidth).toBeLessThanOrEqual(280);
      }
      expect(processGeometry.rowColumns).toEqual(
        width <= 720 ? [2, 2, 2] : [12, 12, 12],
      );

      if (width === 375) {
        const orderedHeroParts = await Promise.all([
          "main h1",
          "[data-hero-lead]",
          '[data-analytics-placement="hero"]',
          "[data-hero-secondary]",
        ].map((selector) => page.locator(selector).evaluate(
          (element) => element.getBoundingClientRect().top,
        )));
        expect(orderedHeroParts).toEqual(
          [...orderedHeroParts].sort((left, right) => left - right),
        );

        await expect(page.locator("[data-hero-trust]")).toHaveCount(0);

        const mobileSilkMask = await page.locator("[data-hero-silk-host]").evaluate(
          (silk) => getComputedStyle(silk).maskImage,
        );
        expect(mobileSilkMask).toContain("linear-gradient");
      }

      const situationSection = page.locator('[data-home-module="situations"]');
      const situationChoices = situationSection.locator("[data-situation-choice]");
      await expect(situationChoices).toHaveCount(situations.length);
      await expect(situationSection.locator("[data-situation-panel]:visible"))
        .toHaveCount(1);
      await expect(situationSection.locator('[data-situation-id="plan"]'))
        .toHaveCount(0);

      const selectorGeometry = await situationSection.evaluate((section) => {
        const activePanel = section.querySelector<HTMLElement>(
          '[data-situation-panel][data-active="true"]',
        )!;
        const choiceRail = section.querySelector<HTMLElement>(
          "[data-situation-choice-rail]",
        )!;
        const detailViewport = section.querySelector<HTMLElement>(
          "[data-situation-detail-viewport]",
        )!;
        const orientation = section.querySelector<HTMLElement>(
          "[data-orientation-surface]",
        )!;
        const orientationStatement = section.querySelector<HTMLElement>(
          "[data-orientation-statement]",
        )!;
        const orientationInner = section.querySelector<HTMLElement>(
          "[data-orientation-inner]",
        )!;
        const introHeading = section.querySelector<HTMLElement>(
          "[data-situation-intro-heading]",
        )!;
        const sectionRect = section.getBoundingClientRect();
        const orientationRect = orientation.getBoundingClientRect();
        const orientationBackdropStyle = getComputedStyle(
          orientation,
          "::before",
        );
        const orientationStatementRect =
          orientationStatement.getBoundingClientRect();
        const introHeadingRect = introHeading.getBoundingClientRect();
        const choiceRailRect = choiceRail.getBoundingClientRect();
        const detailViewportRect = detailViewport.getBoundingClientRect();
        const orientationTransform = getComputedStyle(orientation).transform;
        const orientationTranslateY = orientationTransform === "none"
          ? 0
          : new DOMMatrixReadOnly(orientationTransform).m42;
        return {
          activePanelFits: activePanel.scrollWidth <= activePanel.clientWidth + 1,
          choicesAreHorizontal:
            Math.abs(choiceRailRect.top - detailViewportRect.top) <= 1
            && detailViewportRect.left > choiceRailRect.left,
          orientationClosesSection:
            Math.abs(
              sectionRect.bottom
              - (orientationRect.bottom - orientationTranslateY),
            ) <= 1,
          orientationContentAligned:
            Math.abs(orientationStatementRect.left - introHeadingRect.left) <= 1,
          orientationFits:
            orientationInner.scrollWidth <= orientationInner.clientWidth + 1,
          orientationIsFullBleed:
            Number.parseFloat(orientationBackdropStyle.width)
              >= document.documentElement.clientWidth - 1
            && orientationBackdropStyle.backgroundColor === "rgb(176, 228, 84)",
        };
      });
      expect(selectorGeometry).toEqual({
        activePanelFits: true,
        choicesAreHorizontal: width > 1320,
        orientationClosesSection: true,
        orientationContentAligned: true,
        orientationFits: true,
        orientationIsFullBleed: true,
      });

      await situationChoices.last().click();
      await expect(situationSection.locator(
        '[data-situation-panel="investing"]',
      )).toBeVisible();
      await expect(situationSection.locator("[data-situation-panel]:visible"))
        .toHaveCount(1);
    }

    expect(runtimeErrors).toEqual([]);
  });

  test("gives the portrait-led profile scene distinct breathing room after the hero", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    const readEntryGeometry = () => page.locator(
      '[data-home-module="profile"]',
    ).evaluate((section) => {
      const heading = section.querySelector<HTMLElement>(
        "[data-profile-heading]",
      )!;
      const portrait = section.querySelector<HTMLElement>("[data-profile-portrait]")!;
      const frame = section.querySelector<HTMLElement>(
        "[data-profile-portrait-frame]",
      )!;
      const narrative = section.querySelector<HTMLElement>(
        "[data-profile-narrative]",
      )!;
      const sectionRect = section.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      const portraitRect = portrait.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      const narrativeRect = narrative.getBoundingClientRect();

      return {
        headingInset: Math.round(headingRect.top - sectionRect.top),
        frameRatio: frameRect.width / frameRect.height,
        headingBeforePortrait: headingRect.bottom < portraitRect.top,
        headingBeforeNarrative: headingRect.bottom < narrativeRect.top,
        portraitOnRight:
          portraitRect.left > sectionRect.left + sectionRect.width * 0.45,
        portraitBeforeHeading: portraitRect.bottom < headingRect.top,
        portraitStartsBeforeHeadingEnd: portraitRect.top <= headingRect.bottom,
        portraitRatio: portraitRect.width / portraitRect.height,
        position: getComputedStyle(section).position,
      };
    });

    const desktop = await readEntryGeometry();
    expect(desktop.headingInset).toBeGreaterThanOrEqual(96);
    expect(desktop.portraitOnRight).toBe(true);
    expect(desktop.portraitStartsBeforeHeadingEnd).toBe(true);
    expect(desktop.portraitBeforeHeading).toBe(false);
    expect(desktop.headingBeforeNarrative).toBe(true);
    expect(desktop.frameRatio).toBeCloseTo(700 / 1096, 2);
    expect(desktop.portraitRatio).toBeCloseTo(700 / 910, 2);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(async () => (await readEntryGeometry()).headingInset)
      .toBeGreaterThanOrEqual(54);
    await expect.poll(async () => (await readEntryGeometry()).headingInset)
      .toBeLessThanOrEqual(180);
    await expect.poll(async () => (await readEntryGeometry()).headingBeforePortrait)
      .toBe(true);
    await expect.poll(async () => (await readEntryGeometry()).headingBeforeNarrative)
      .toBe(true);
    expect((await readEntryGeometry()).portraitRatio).toBeCloseTo(700 / 910, 2);
    expect((await readEntryGeometry()).position).not.toMatch(/fixed|sticky/u);
    await expect(page.locator(
      '[data-home-module="profile"] .pin-spacer',
    )).toHaveCount(0);
  });

  test("hands the hero to the profile before revealing services", async ({ page }) => {
    test.setTimeout(120_000);
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    const controller = page.locator("[data-hero-situation-reveal]");
    const hero = page.locator("[data-cinematic-home-hero]");
    const profile = page.locator('[data-home-module="profile"]');
    const situationsSection = page.locator('[data-home-module="situations"]');
    const situationsController = page.locator(
      "[data-profile-situations-handoff]",
    );
    const transitionLayer = page.locator("[data-hero-transition-layer]");
    const firstSituationRow = situationsSection.locator("[data-situation-row]").first();

    await expect(controller).toHaveAttribute("data-state", "ready");
    await expect(controller).toHaveAttribute("data-reveal", "circle");
    await expect(transitionLayer).toHaveCount(1);
    await expect(profile).toHaveAttribute("data-hero-transition-layer", "true");
    await expect(situationsController).toHaveAttribute("data-state", "ready");
    await expect(situationsController).toHaveAttribute(
      "data-reveal",
      "editorial-rise",
    );
    await expect(situationsController).toHaveAttribute(
      "data-drive",
      "natural-scroll",
    );
    await expect(situationsController).toHaveAttribute(
      "data-playback-state",
      "scroll-linked",
    );
    await expect(situationsSection).toHaveAttribute(
      "data-cinematic-motion",
      "owned-scene",
    );
    await expect(situationsSection).not.toHaveAttribute(
      "data-profile-transition-layer",
    );

    expect(await page.evaluate(() => {
      const profileSection = document.querySelector<HTMLElement>(
        '[data-home-module="profile"]',
      )!;
      const situations = document.querySelector<HTMLElement>(
        '[data-home-module="situations"]',
      )!;
      const references = document.querySelector<HTMLElement>(
        '[data-home-module="references"]',
      )!;

      return {
        profileBeforeSituations: Boolean(
          profileSection.compareDocumentPosition(situations)
            & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        situationsBeforeReferences: Boolean(
          situations.compareDocumentPosition(references)
            & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      };
    })).toEqual({
      profileBeforeSituations: true,
      situationsBeforeReferences: true,
    });

    const heroHeight = await hero.evaluate(
      (element) => (element as HTMLElement).offsetHeight,
    );
    const startState = await transitionLayer.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        backgroundColor: getComputedStyle(element).backgroundColor,
        clipPath: getComputedStyle(element).clipPath,
        height: rect.height,
        top: rect.top,
        transform: getComputedStyle(element).transform,
      };
    });
    expect(startState.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(startState.clipPath).toMatch(
      /circle\([\d.eE+-]+px at [\d.eE+-]+px [\d.eE+-]+px\)/u,
    );
    expect(startState.height).toBeGreaterThanOrEqual(heroHeight - 1);
    expect(startState.transform).toMatch(/matrix/u);
    expect(Math.abs(startState.top)).toBeLessThanOrEqual(2);

    await scrollImmediately(page, Math.round(heroHeight * 0.5));
    await page.waitForTimeout(160);
    const middleState = await transitionLayer.evaluate((element) => {
      const portraitFrame = element.querySelector<HTMLElement>(
        "[data-profile-portrait-frame]",
      )!;
      const heading = element.querySelector<HTMLElement>(
        "[data-profile-heading]",
      )!;
      const firstTitleLine = element.querySelector<HTMLElement>(
        "[data-profile-title-line]",
      )!;
      const quote = element.querySelector<HTMLElement>(
        "[data-profile-quote]",
      )!;
      const detail = element.querySelector<HTMLElement>(
        "[data-profile-detail]",
      )!;
      return {
        bottom: element.getBoundingClientRect().bottom,
        clipPath: getComputedStyle(element).clipPath,
        detailOpacity: getComputedStyle(detail).opacity,
        frameOpacity: getComputedStyle(portraitFrame).opacity,
        frameVisibility: getComputedStyle(portraitFrame).visibility,
        hasCurtain: Boolean(element.querySelector("[data-profile-portrait-curtain]")),
        headingOpacity: Number.parseFloat(getComputedStyle(heading).opacity),
        lineOpacity: Number.parseFloat(getComputedStyle(firstTitleLine).opacity),
        lineTransform: getComputedStyle(firstTitleLine).transform,
        quoteOpacity: getComputedStyle(quote).opacity,
        top: element.getBoundingClientRect().top,
      };
    });
    expect(Number(
      middleState.clipPath.match(/circle\(([\d.]+)px/u)?.[1] ?? 0,
    )).toBeGreaterThan(250);
    expect(middleState.hasCurtain).toBe(false);
    expect(middleState.headingOpacity).toBeGreaterThan(0.5);
    expect(middleState.lineOpacity).toBeGreaterThan(0.5);
    expect(middleState.quoteOpacity).toBe("0");
    expect(middleState.detailOpacity).toBe("0");
    expect(Number.parseFloat(middleState.frameOpacity)).toBeGreaterThan(0.8);
    expect(middleState.frameVisibility).toBe("visible");
    expect(middleState.lineTransform).not.toBe("none");
    expect(middleState.bottom).toBeGreaterThanOrEqual(899);
    expect(Math.abs(middleState.top)).toBeLessThanOrEqual(2);
    await expect(controller).toHaveAttribute("data-active", "true");

    await scrollImmediately(page, heroHeight);
    await page.waitForTimeout(350);
    const handoffGeometry = await page.evaluate(() => {
      const profileSection = document.querySelector<HTMLElement>(
        '[data-home-module="profile"]',
      )!;
      const situations = document.querySelector<HTMLElement>(
        '[data-home-module="situations"]',
      )!;
      const profileRect = profileSection.getBoundingClientRect();
      const situationRect = situations.getBoundingClientRect();
      const source = document.querySelector<HTMLElement>(
        "[data-profile-situation-source]",
      )!.getBoundingClientRect();

      return {
        profileBottom: profileRect.bottom,
        profileTop: profileRect.top,
        sourceBottom: source.bottom,
        situationsTop: situationRect.top,
      };
    });
    expect(Math.abs(handoffGeometry.profileTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(
      handoffGeometry.sourceBottom - handoffGeometry.profileBottom,
    )).toBeLessThanOrEqual(1);
    expect(Math.abs(
      handoffGeometry.situationsTop - handoffGeometry.sourceBottom,
    )).toBeLessThanOrEqual(1);
    await expect(profile.getByRole("heading", {
      level: 2,
      name: "Nejdřív vy. Potom čísla. Teprve potom plán.",
    })).toBeVisible();
    await expect(profile.locator("[data-profile-portrait-curtain]")).toHaveCount(0);
    await expect(profile.locator("[data-profile-heading]")).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(profile.locator("[data-profile-quote]")).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(profile.locator("[data-profile-detail]")).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(profile.locator("[data-profile-portrait-frame]")).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(profile.locator("[data-profile-eyebrow]")).toHaveCount(0);
    await expect(profile.locator("[data-profile-about-link]")).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(profile.locator("[data-profile-cta]")).toHaveCount(0);
    await expect(profile.locator("[data-profile-next]")).toHaveCount(0);
    await expect(profile.locator("[data-profile-actions]")).toHaveCount(0);

    const editorialGeometry = await profile.evaluate((section) => {
      const portrait = section.querySelector<HTMLElement>("[data-profile-portrait]")!
        .getBoundingClientRect();

      return {
        portraitOnRight:
          portrait.left > section.getBoundingClientRect().left
            + section.getBoundingClientRect().width * 0.45,
        portraitRatio: portrait.width / portrait.height,
        frameRatio: (() => {
          const frame = section.querySelector<HTMLElement>(
            "[data-profile-portrait-frame]",
          )!.getBoundingClientRect();
          return frame.width / frame.height;
        })(),
      };
    });
    expect(editorialGeometry.portraitOnRight).toBe(true);
    expect(editorialGeometry.portraitRatio).toBeCloseTo(700 / 910, 2);
    expect(editorialGeometry.frameRatio).toBeCloseTo(700 / 1096, 2);

    const profileHeight = await profile.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    await scrollImmediately(page, Math.round(heroHeight + 1 + profileHeight * 0.78));
    await expect(situationsController).toHaveAttribute(
      "data-playback-state",
      "scroll-linked",
    );
    await expect(situationsController).toHaveAttribute(
      "data-entry-state",
      "complete",
    );
    await expect(situationsController).toHaveAttribute(
      "data-scene-progress",
      "1.000",
    );
    expect(Number(
      await firstSituationRow.evaluate(
        (element) => getComputedStyle(element).opacity,
      ),
    )).toBeGreaterThan(0);
    await expectNoHorizontalOverflow(page);

    await scrollImmediately(page, 0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "networkidle" });
    await expect(controller).toHaveAttribute("data-state", "reduced-motion");
    await expect(situationsController).toHaveAttribute(
      "data-state",
      "reduced-motion",
    );
    await expect(page.locator("[data-hero-transition-layer]")).toHaveCount(0);
    await expect(situationsSection).not.toHaveAttribute(
      "data-profile-transition-layer",
    );
    await expect(profile.locator("[data-profile-portrait-curtain]")).toHaveCount(0);
    expect(await profile.evaluate((element) => element.getBoundingClientRect().top))
      .toBeGreaterThanOrEqual(899);
  });

  test("uses the editorial profile bridge and keeps verification tertiary", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    const hero = page.locator("[data-cinematic-home-hero]");
    const profile = page.locator('[data-home-module="profile"]');
    const heroHeight = await hero.evaluate(
      (element) => (element as HTMLElement).offsetHeight,
    );

    await scrollImmediately(page, heroHeight);
    await expect(profile.locator("[data-profile-eyebrow]")).toHaveCount(0);
    await expect(profile.locator("[data-profile-about-link]"))
      .toHaveAttribute("href", "/kdo-jsem/");
    await expect(profile.locator("[data-profile-cta]")).toHaveCount(0);
    await expect(profile.locator("[data-profile-next]")).toHaveCount(0);
    await expect(profile.locator("[data-profile-actions]")).toHaveCount(0);
    await expect(profile.locator("[data-profile-registry-link]"))
      .toHaveAttribute(
        "href",
        "https://jerrs.cnb.cz/apljerrsdad/JERRS.WEB10.VIZITKA?p_lang=cz&p_SEQ_ID=13296729&p_VER_ID=1004&p_DATUM=06.10.2026&p_ROL_KOD=",
      );
    await expect(profile.locator("[data-profile-registry-link]"))
      .toHaveAttribute("target", "_blank");
    await expect(profile.locator("[data-profile-registry-link]"))
      .toHaveAttribute("rel", "noopener noreferrer");
  });

  test("keeps the reordered hero handoff isolated on a 4K viewport", async ({ page }) => {
    test.setTimeout(120_000);
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 3840, height: 2160 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const controller = page.locator("[data-hero-situation-reveal]");
    const cinematicController = page.locator("[data-home-cinematic-scroll]");
    const hero = page.locator("[data-cinematic-home-hero]");
    const profile = page.locator('[data-home-module="profile"]');
    const situationsController = page.locator(
      "[data-profile-situations-handoff]",
    );
    const transitionLayer = page.locator("[data-hero-transition-layer]");

    await expect(controller).toHaveAttribute("data-state", "ready");
    await expect(controller).toHaveAttribute("data-reveal", "circle");
    await expect(situationsController).toHaveAttribute("data-state", "ready");
    await expect(situationsController).toHaveAttribute(
      "data-reveal",
      "editorial-rise",
    );
    await expect(cinematicController).toHaveAttribute("data-state", "ready");
    await expect(transitionLayer).toHaveCount(1);
    await expect(profile).toHaveAttribute("data-hero-transition-layer", "true");

    const initialGeometry = await page.evaluate(() => {
      const layer = document.querySelector<HTMLElement>(
        "[data-hero-transition-layer]",
      )!;
      const profileSection = document.querySelector<HTMLElement>(
        '[data-home-module="profile"]',
      )!;
      const situations = document.querySelector<HTMLElement>(
        '[data-home-module="situations"]',
      )!;

      return {
        layerHeight: layer.getBoundingClientRect().height,
        profileHeight: profileSection.getBoundingClientRect().height,
        profileBeforeSituations: Boolean(
          profileSection.compareDocumentPosition(situations)
            & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      };
    });
    expect(Math.abs(
      initialGeometry.layerHeight - initialGeometry.profileHeight,
    )).toBeLessThanOrEqual(1);
    expect(initialGeometry.profileBeforeSituations).toBe(true);

    const heroHeight = await hero.evaluate(
      (element) => (element as HTMLElement).offsetHeight,
    );
    await scrollImmediately(page, Math.round(heroHeight * 0.5));
    await page.waitForTimeout(350);
    const middleState = await page.evaluate(() => {
      const profileSection = document.querySelector<HTMLElement>(
        '[data-home-module="profile"]',
      )!;
      const situations = document.querySelector<HTMLElement>(
        '[data-home-module="situations"]',
      )!;
      const source = document.querySelector<HTMLElement>(
        "[data-profile-situation-source]",
      )!;
      const profileRect = profileSection.getBoundingClientRect();
      const situationRect = situations.getBoundingClientRect();
      const sourceRect = source.getBoundingClientRect();

      return {
        profileBottom: profileRect.bottom,
        profileTop: profileRect.top,
        sourceBottom: sourceRect.bottom,
        situationsTop: situationRect.top,
      };
    });
    expect(Math.abs(middleState.profileTop)).toBeLessThanOrEqual(2);
    expect(middleState.profileBottom).toBeGreaterThanOrEqual(2159);
    expect(
      Math.abs(middleState.situationsTop - middleState.sourceBottom),
    ).toBeLessThanOrEqual(2);

    await scrollImmediately(page, heroHeight);
    await expect.poll(
      () => controller.getAttribute("data-scene-progress"),
    ).toBe("1.000");
    const endState = await page.evaluate(() => {
      const profileSection = document.querySelector<HTMLElement>(
        '[data-home-module="profile"]',
      )!;
      const situations = document.querySelector<HTMLElement>(
        '[data-home-module="situations"]',
      )!;
      const profileRect = profileSection.getBoundingClientRect();
      const situationRect = situations.getBoundingClientRect();

      return {
        profileBottom: profileRect.bottom,
        profileTop: profileRect.top,
        situationsTop: situationRect.top,
      };
    });
    expect(Math.abs(endState.profileTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(
      endState.situationsTop - endState.profileBottom,
    )).toBeLessThanOrEqual(1);

    const profileHeight = await profile.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    await scrollImmediately(page, Math.round(heroHeight + 1 + profileHeight * 0.45));
    await expect(situationsController).toHaveAttribute(
      "data-entry-state",
      /revealing|complete/u,
    );
    await expect.poll(async () => Number(
      await situationsController.getAttribute("data-scene-progress") ?? 0,
    )).toBeGreaterThan(0);
    await expectNoHorizontalOverflow(page);
  });

  test("keeps the references CTA centered and reversible on a wide viewport", async ({ page }) => {
    test.setTimeout(90_000);
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto("/", { waitUntil: "networkidle" });

    const handoff = page.locator("[data-references-process-reveal]");
    const ctaStage = page.locator("[data-references-cta-stage]");
    const ctaCopy = page.locator("[data-references-cta-copy]");
    const ctaFooterSurface = ctaStage.locator(
      "[data-references-cta-footer-surface]",
    );
    await expect(handoff).toHaveAttribute("data-state", "ready");

    const geometry = await page.evaluate(() => {
      const layoutTop = (element: HTMLElement) => {
        let top = 0;
        let current: HTMLElement | null = element;
        while (current) {
          top += current.offsetTop;
          current = current.offsetParent as HTMLElement | null;
        }
        return top;
      };
      const grid = document.querySelector<HTMLElement>(
        "[data-home-references-grid]",
      )!;
      const stickyIndex = document.querySelector<HTMLElement>(
        "[data-reference-proof-index]",
      )!;
      const ctaStage = document.querySelector<HTMLElement>(
        "[data-references-cta-stage]",
      )!;
      const process = document.querySelector<HTMLElement>(
        '[data-home-module="process"]',
      )!;
      const stickyInset = Number.parseFloat(
        getComputedStyle(stickyIndex).top,
      );
      const referenceExitStart = layoutTop(grid)
        + grid.offsetHeight
        - stickyInset
        - stickyIndex.offsetHeight;
      const decisionStageInset = Math.max(
        0,
        (window.innerHeight - ctaStage.offsetHeight) / 2,
      );
      const start = Math.max(
        referenceExitStart,
        layoutTop(ctaStage) - decisionStageInset,
      );

      return { distance: layoutTop(process) - start, start };
    });

    await scrollImmediately(
      page,
      geometry.start + Math.round(geometry.distance * 0.58),
    );
    await page.waitForTimeout(240);
    await expect(handoff).toHaveAttribute("data-phase", "cta-visible");
    await expect(ctaStage).toHaveAttribute("data-interactive", "true");
    await expect(ctaStage.locator("canvas")).toHaveCount(0);
    const visibleGeometry = await ctaCopy.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        horizontalCenter: rect.left + rect.width / 2,
        partOpacities: [...element.querySelectorAll<HTMLElement>(
          "[data-gsap-text-reveal-content]",
        )].map((part) => Number.parseFloat(getComputedStyle(part).opacity)),
        ruleScales: [...element.querySelectorAll<HTMLElement>(
          "[data-references-cta-rule]",
        )].map((rule) => (
          new DOMMatrixReadOnly(getComputedStyle(rule).transform).a
        )),
        top: rect.top,
        viewportHeight: window.innerHeight,
        viewportWidth: document.documentElement.clientWidth,
      };
    });
    expect(visibleGeometry.partOpacities).toEqual(Array(6).fill(1));
    expect(visibleGeometry.ruleScales).toEqual([1, 1]);
    await expect.poll(async () => ctaFooterSurface.evaluate((surface) => (
      new DOMMatrixReadOnly(getComputedStyle(surface).transform).d
    ))).toBe(1);
    expect(visibleGeometry.top).toBeGreaterThanOrEqual(0);
    expect(visibleGeometry.bottom).toBeLessThanOrEqual(
      visibleGeometry.viewportHeight,
    );
    expect(Math.abs(
      visibleGeometry.horizontalCenter - visibleGeometry.viewportWidth / 2,
    )).toBeLessThanOrEqual(6);

    await scrollImmediately(
      page,
      geometry.start + Math.round(geometry.distance * 0.01),
    );
    await page.waitForTimeout(240);
    await expect(handoff).toHaveAttribute("data-phase", "reference-visible");
    await expect(ctaStage).toHaveAttribute("data-interactive", "false");
    const reversedCtaState = await ctaCopy.evaluate((element) => ({
      partOpacities: [...element.querySelectorAll<HTMLElement>(
        "[data-gsap-text-reveal-content]",
      )].map((part) => Number.parseFloat(getComputedStyle(part).opacity)),
      ruleScales: [...element.querySelectorAll<HTMLElement>(
        "[data-references-cta-rule]",
      )].map((rule) => (
        new DOMMatrixReadOnly(getComputedStyle(rule).transform).a
      )),
    }));
    expect(reversedCtaState.partOpacities).toEqual(Array(6).fill(0));
    expect(reversedCtaState.ruleScales).toEqual([0, 0]);
    await expect.poll(async () => ctaFooterSurface.evaluate((surface) => (
      new DOMMatrixReadOnly(getComputedStyle(surface).transform).d
    ))).toBe(0);

    await scrollImmediately(
      page,
      geometry.start + Math.round(geometry.distance * 0.58),
    );
    await page.waitForTimeout(240);
    await expect(handoff).toHaveAttribute("data-phase", "cta-visible");
    await expect(ctaStage).toHaveAttribute("data-interactive", "true");
    await expectNoHorizontalOverflow(page);
  });

  test("chains references into process and evidence through radial reveals", async ({ page }) => {
    test.setTimeout(120_000);
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    const references = page.locator('[data-home-module="references"]');
    const process = page.locator('[data-home-module="process"]');
    const evidence = page.locator('[data-home-module="evidence"]');
    const finalAction = page.locator("#zacit");
    const entryReveal = page.locator("[data-process-reveal]");
    const handoff = page.locator("[data-references-process-reveal]");
    const evidenceHandoff = page.locator("[data-process-evidence-reveal]");
    const referencesCtaStage = references.locator("[data-references-cta-stage]");
    const referencesCtaAction = references.locator("[data-references-cta-action]");
    await expect(page.locator("[data-process-transition-flow]")).toHaveCount(0);
    await expect(handoff).toHaveAttribute("data-state", "ready");
    await expect(evidenceHandoff).toHaveAttribute("data-state", "ready");
    await expect(references).toHaveAttribute("data-process-handoff-enhanced", "true");
    await expect(process).toHaveAttribute("data-references-process-layer", "true");
    await expect(evidence).toHaveAttribute("data-process-evidence-layer", "true");

    const geometry = await page.evaluate(() => {
      const flowElement = document.querySelector<HTMLElement>(
        "[data-references-process-flow]",
      )!;
      const referencesElement = document.querySelector<HTMLElement>(
        '[data-home-module="references"]',
      )!;
      const processElement = document.querySelector<HTMLElement>(
        '[data-home-module="process"]',
      )!;
      const processStage = processElement.querySelector<HTMLElement>(
        "[data-process-pin-stage]",
      )!;
      const processStyle = getComputedStyle(processElement);

      return {
        boundaryGap: processElement.offsetTop
          - (referencesElement.offsetTop + referencesElement.offsetHeight),
        flowBackground: getComputedStyle(flowElement).backgroundColor,
        height: processElement.offsetHeight,
        position: processStyle.position,
        referencesBackground: getComputedStyle(referencesElement).backgroundColor,
        sequenceDistance: Number.parseFloat(
          processStyle.getPropertyValue("--process-sequence-distance"),
        ),
        stageHeight: processStage.offsetHeight,
      };
    });

    expect(Math.abs(geometry.boundaryGap)).toBeLessThanOrEqual(1);
    expect(geometry.flowBackground).toBe(geometry.referencesBackground);
    expect(geometry.flowBackground).not.toBe("rgba(0, 0, 0, 0)");
    expect(geometry.sequenceDistance).toBe(3375);
    expect(geometry.height).toBeGreaterThanOrEqual(4274);
    expect(geometry.height).toBeLessThanOrEqual(4276);
    expect(geometry.stageHeight).toBeGreaterThanOrEqual(899);
    expect(geometry.stageHeight).toBeLessThanOrEqual(901);
    expect(geometry.position).toBe("relative");

    await scrollImmediately(page, 900);
    await page.waitForTimeout(120);
    const handoffGeometry = await page.evaluate(() => {
      const layoutTop = (element: HTMLElement) => {
        let top = 0;
        let current: HTMLElement | null = element;
        while (current) {
          top += current.offsetTop;
          current = current.offsetParent as HTMLElement | null;
        }
        return top;
      };
      const grid = document.querySelector<HTMLElement>(
        "[data-home-references-grid]",
      )!;
      const stickyIndex = document.querySelector<HTMLElement>(
        "[data-reference-proof-index]",
      )!;
      const ctaStage = document.querySelector<HTMLElement>(
        "[data-references-cta-stage]",
      )!;
      const processElement = document.querySelector<HTMLElement>(
        '[data-home-module="process"]',
      )!;
      const stickyInset = Number.parseFloat(
        getComputedStyle(stickyIndex).top,
      );
      const referenceExitStart = layoutTop(grid)
        + grid.offsetHeight
        - stickyInset
        - stickyIndex.offsetHeight;
      const decisionStageInset = Math.max(
        0,
        (window.innerHeight - ctaStage.offsetHeight) / 2,
      );
      const start = Math.max(
        referenceExitStart,
        layoutTop(ctaStage) - decisionStageInset,
      );
      return {
        distance: layoutTop(processElement) - start,
        start,
      };
    });
    const handoffStart = handoffGeometry.start;
    const revealDistance = handoffGeometry.distance;

    await scrollImmediately(page, handoffStart - 200);
    await page.waitForTimeout(60);
    await scrollImmediately(page, handoffStart - 100);
    await page.waitForTimeout(100);
    await expect(page.locator("[data-reference-proof-index]"))
      .toHaveAttribute("data-active-reference", finalHomepageReference.id);
    await expect(handoff).not.toHaveAttribute("data-active", "true");

    await scrollImmediately(page, handoffStart - 4);
    await page.waitForTimeout(100);
    await expect(page.locator("[data-reference-proof-index]"))
      .toHaveAttribute("data-active-reference", finalHomepageReference.id);
    await expect(handoff).not.toHaveAttribute("data-active", "true");
    const beforeHandoff = await page.evaluate(() => {
      const processElement = document.querySelector<HTMLElement>(
        '[data-home-module="process"]',
      )!;
      const rail = document.querySelector<HTMLElement>(
        "[data-reference-editorial-rail]",
      )!;
      return {
        clipPath: getComputedStyle(processElement).clipPath,
        processTop: processElement.getBoundingClientRect().top,
        referencesTop: document.querySelector<HTMLElement>(
          '[data-home-module="references"]',
        )!.getBoundingClientRect().top,
        railLeft: rail.getBoundingClientRect().left,
        railTop: rail.getBoundingClientRect().top,
      };
    });
    expect(Number(beforeHandoff.clipPath.match(/circle\(([\d.]+)px/u)?.[1] ?? 0))
      .toBeLessThanOrEqual(1);
    expect(Math.abs(beforeHandoff.processTop - 4)).toBeLessThanOrEqual(2);
    await expect(referencesCtaStage).toHaveAttribute("data-state", "waiting");
    await expect(referencesCtaStage).toHaveAttribute("data-interactive", "false");
    await expect(handoff).toHaveAttribute("data-cta-progress", "0.000");
    await expect(handoff).toHaveAttribute("data-process-progress", "0.000");

    await scrollImmediately(
      page,
      handoffStart + Math.round(revealDistance * 0.18),
    );
    await page.waitForTimeout(140);
    const handoffEntry = await page.evaluate(() => {
      const processElement = document.querySelector<HTMLElement>(
        '[data-home-module="process"]',
      )!;
      const rail = document.querySelector<HTMLElement>(
        "[data-reference-editorial-rail]",
      )!;
      const finalReference = document.querySelector<HTMLElement>(
        "[data-home-reference]:last-child",
      )!;
      return {
        clipPath: getComputedStyle(processElement).clipPath,
        finalReferenceOpacity: Number.parseFloat(
          getComputedStyle(finalReference).opacity,
        ),
        processTop: processElement.getBoundingClientRect().top,
        referencesTop: document.querySelector<HTMLElement>(
          '[data-home-module="references"]',
        )!.getBoundingClientRect().top,
        railLeft: rail.getBoundingClientRect().left,
        railOpacity: Number.parseFloat(getComputedStyle(rail).opacity),
        railTop: rail.getBoundingClientRect().top,
      };
    });
    expect(Number(handoffEntry.clipPath.match(/circle\(([\d.]+)px/u)?.[1] ?? 0))
      .toBeLessThanOrEqual(1);
    expect(Math.abs(handoffEntry.processTop)).toBeLessThanOrEqual(2);
    expect(Math.abs(handoffEntry.railLeft - beforeHandoff.railLeft))
      .toBeLessThanOrEqual(1);
    expect(Math.abs(handoffEntry.referencesTop - beforeHandoff.referencesTop))
      .toBeLessThanOrEqual(5);
    expect(handoffEntry.railTop).toBeLessThan(beforeHandoff.railTop);
    expect(handoffEntry.railOpacity).toBeGreaterThan(0);
    expect(handoffEntry.railOpacity).toBeLessThan(1);
    expect(handoffEntry.finalReferenceOpacity).toBeGreaterThan(0);
    expect(handoffEntry.finalReferenceOpacity).toBeLessThan(1);
    await expect(handoff).toHaveAttribute("data-active", "true");
    await expect(handoff).toHaveAttribute("data-phase", "cta-revealing");
    await expect(handoff).toHaveAttribute("data-cta-progress", /0\.[1-9]\d*/u);
    await expect(handoff).toHaveAttribute("data-process-progress", "0.000");

    await scrollImmediately(
      page,
      handoffStart + Math.round(revealDistance * 0.58),
    );
    await page.waitForTimeout(140);
    const ctaState = await page.evaluate(() => {
      const stage = document.querySelector<HTMLElement>(
        "[data-references-cta-stage]",
      )!;
      const copy = document.querySelector<HTMLElement>(
        "[data-references-cta-copy]",
      )!;
      const processElement = document.querySelector<HTMLElement>(
        '[data-home-module="process"]',
      )!;
      const rect = copy.getBoundingClientRect();
      return {
        center: rect.left + rect.width / 2,
        copyBottom: rect.bottom,
        copyTop: rect.top,
        clipPath: getComputedStyle(processElement).clipPath,
        partOpacities: [...copy.querySelectorAll<HTMLElement>(
          "[data-gsap-text-reveal-content]",
        )].map((part) => Number.parseFloat(getComputedStyle(part).opacity)),
        stageBottom: stage.getBoundingClientRect().bottom,
        stageTop: stage.getBoundingClientRect().top,
        viewportCenter: document.documentElement.clientWidth / 2,
        viewportHeight: window.innerHeight,
      };
    });
    expect(Number(ctaState.clipPath.match(/circle\(([\d.]+)px/u)?.[1] ?? 0))
      .toBeLessThanOrEqual(1);
    expect(Math.abs(ctaState.center - ctaState.viewportCenter)).toBeLessThanOrEqual(6);
    expect(ctaState.partOpacities).toEqual(Array(6).fill(1));
    expect(Math.abs(ctaState.stageTop)).toBeLessThanOrEqual(2);
    expect(ctaState.stageBottom).toBeLessThanOrEqual(ctaState.viewportHeight + 2);
    expect(ctaState.copyTop).toBeGreaterThanOrEqual(0);
    expect(ctaState.copyBottom).toBeLessThanOrEqual(ctaState.viewportHeight);
    expect(Math.abs(
      (ctaState.copyTop + ctaState.copyBottom) / 2
      - ctaState.viewportHeight / 2,
    )).toBeLessThanOrEqual(90);
    await expect(handoff).toHaveAttribute("data-phase", "cta-visible");
    await expect(handoff).toHaveAttribute("data-cta-progress", "1.000");
    await expect(handoff).toHaveAttribute("data-process-progress", "0.000");
    await expect(referencesCtaStage).toHaveAttribute("data-interactive", "true");
    await expect(referencesCtaAction).toBeVisible();

    await scrollImmediately(
      page,
      handoffStart + Math.round(revealDistance * 0.84),
    );
    await page.waitForTimeout(140);
    const middleState = await page.evaluate(() => {
      const referencesElement = document.querySelector<HTMLElement>(
        '[data-home-module="references"]',
      )!;
      const processElement = document.querySelector<HTMLElement>(
        '[data-home-module="process"]',
      )!;
      return {
        clipPath: getComputedStyle(processElement).clipPath,
        processTop: processElement.getBoundingClientRect().top,
        referencesBottom: referencesElement.getBoundingClientRect().bottom,
      };
    });
    const middleCircle = middleState.clipPath.match(
      /circle\(([\d.]+)px at 100% ([\d.]+)px\)/u,
    );
    expect(middleCircle).not.toBeNull();
    expect(Number(middleCircle?.[1])).toBeGreaterThan(500);
    expect(Math.abs(Number(middleCircle?.[2]) - 900)).toBeLessThanOrEqual(1);
    expect(Math.abs(middleState.processTop)).toBeLessThanOrEqual(2);
    expect(Math.abs(middleState.referencesBottom - 900)).toBeLessThanOrEqual(2);
    await expect(handoff).toHaveAttribute("data-active", "true");
    await expect(handoff).toHaveAttribute("data-phase", "process-revealing");
    await expect(referencesCtaStage).toHaveAttribute("data-interactive", "false");
    await expect(page.locator("[data-reference-proof-index]"))
      .toHaveAttribute("data-active-reference", finalHomepageReference.id);

    await scrollImmediately(
      page,
      handoffStart + Math.round(revealDistance * 0.995),
    );
    await page.waitForTimeout(140);
    const almostCompleteState = await process.evaluate((element) => {
      const clipPath = getComputedStyle(element).clipPath;
      const match = clipPath.match(
        /circle\(([\d.]+)px at 100% ([\d.]+)px\)/u,
      );

      return {
        clipPath,
        originY: Number(match?.[2] ?? 0),
        radius: Number(match?.[1] ?? 0),
        viewportWidth: document.documentElement.clientWidth,
      };
    });
    expect(almostCompleteState.clipPath).not.toBe("none");
    expect(almostCompleteState.radius).toBeGreaterThanOrEqual(
      Math.hypot(
        almostCompleteState.viewportWidth,
        almostCompleteState.originY,
      ),
    );

    await scrollImmediately(
      page,
      handoffStart + revealDistance + 2,
    );
    await page.waitForTimeout(140);
    const endState = await process.evaluate((element) => ({
      clipPath: getComputedStyle(element).clipPath,
      top: element.getBoundingClientRect().top,
    }));
    expect(endState.clipPath).toBe("none");
    expect(Math.abs(endState.top)).toBeLessThanOrEqual(3);
    await expect(handoff).toHaveAttribute("data-active", "false");

    await scrollImmediately(
      page,
      handoffStart + revealDistance + 180,
    );
    await page.waitForTimeout(450);

    const readSequenceState = () => process.evaluate((element) => {
      const reveal = element.querySelector<HTMLElement>("[data-process-reveal]")!;
      const stage = element.querySelector<HTMLElement>("[data-process-pin-stage]")!;
      const readOpacity = (target: Element) => Number.parseFloat(
        getComputedStyle(target).opacity,
      );
      const readVisibleChars = (selector: string) => {
        const chars = [...element.querySelectorAll(selector)];
        return {
          total: chars.length,
          visible: chars.filter((character) => readOpacity(character) > 0.5).length,
        };
      };
      const steps = [
        ...element.querySelectorAll<HTMLElement>("[data-process-step]"),
      ];
      const rules = [
        ...element.querySelectorAll<HTMLElement>("[data-process-rule]"),
      ];
      const readRuleProgress = (rule: HTMLElement) => {
        const transform = getComputedStyle(rule).transform;
        const scaleX = transform === "none"
          ? 1
          : new DOMMatrixReadOnly(transform).a;
        return Number(scaleX.toFixed(3));
      };

      return {
        actionOpacity: readOpacity(
          element.querySelector<HTMLElement>("[data-process-action]")!,
        ),
        detail: readVisibleChars(
          "[data-process-detail] [data-process-typing-char]",
        ),
        eyebrow: readVisibleChars(
          "[data-process-header] [data-process-typing-char]",
        ),
        interactive: element.querySelector<HTMLElement>(
          "[data-process-action-rail]",
        )!.dataset.interactive,
        outerTop: element.getBoundingClientRect().top,
        phase: reveal.dataset.phase,
        ruleProgress: {
          bottom: readRuleProgress(rules[3]),
          rows: rules.slice(1, 3).map(readRuleProgress),
          top: readRuleProgress(rules[0]),
        },
        stageTop: stage.getBoundingClientRect().top,
        stepOpacities: steps.map(readOpacity),
        videoOpacity: readOpacity(
          element.querySelector<HTMLElement>("[data-process-video-trigger]")!,
        ),
      };
    });

    const typingEyebrowState = await readSequenceState();
    expect(typingEyebrowState.phase).toBe("typing-eyebrow");
    expect(typingEyebrowState.outerTop).toBeLessThan(-170);
    expect(Math.abs(typingEyebrowState.stageTop)).toBeLessThanOrEqual(1);
    expect(typingEyebrowState.eyebrow.visible).toBeGreaterThan(0);
    expect(typingEyebrowState.detail.visible).toBe(0);
    expect(typingEyebrowState.stepOpacities).toEqual([0, 0, 0]);
    expect(typingEyebrowState.ruleProgress).toEqual({
      bottom: 0,
      rows: [0, 0],
      top: 0,
    });
    expect(typingEyebrowState.actionOpacity).toBe(0);
    expect(typingEyebrowState.videoOpacity).toBe(0);
    expect(typingEyebrowState.interactive).toBe("false");

    const sequenceStart = handoffStart + revealDistance;
    const scrollToSequenceProgress = async (progress: number) => {
      await scrollImmediately(
        page,
        sequenceStart + Math.round(geometry.sequenceDistance * progress),
      );
      await page.waitForTimeout(450);
      return readSequenceState();
    };

    const typingDetailState = await scrollToSequenceProgress(0.22);
    expect(typingDetailState.phase).toBe("typing-detail");
    expect(typingDetailState.eyebrow.visible).toBe(typingDetailState.eyebrow.total);
    expect(typingDetailState.detail.visible).toBeGreaterThan(0);
    expect(typingDetailState.detail.visible).toBeLessThan(typingDetailState.detail.total);
    expect(typingDetailState.stepOpacities).toEqual([0, 0, 0]);

    const firstLedgerState = await scrollToSequenceProgress(0.4);
    expect(firstLedgerState.phase).toBe("ledger-1");
    expect(firstLedgerState.stepOpacities[0]).toBeGreaterThan(0);
    expect(firstLedgerState.stepOpacities[1]).toBe(0);
    expect(firstLedgerState.stepOpacities[2]).toBe(0);
    expect(firstLedgerState.ruleProgress.top).toBeGreaterThan(0);
    expect(firstLedgerState.ruleProgress.rows).toEqual([0, 0]);

    const secondLedgerState = await scrollToSequenceProgress(0.54);
    expect(secondLedgerState.phase).toBe("ledger-2");
    expect(secondLedgerState.stepOpacities[0]).toBe(1);
    expect(secondLedgerState.stepOpacities[1]).toBeGreaterThan(0);
    expect(secondLedgerState.stepOpacities[2]).toBe(0);
    expect(secondLedgerState.ruleProgress.top).toBe(1);
    expect(secondLedgerState.ruleProgress.rows[0]).toBeGreaterThan(0);
    expect(secondLedgerState.ruleProgress.rows[1]).toBe(0);

    const thirdLedgerState = await scrollToSequenceProgress(0.68);
    expect(thirdLedgerState.phase).toBe("ledger-3");
    expect(thirdLedgerState.stepOpacities[0]).toBe(1);
    expect(thirdLedgerState.stepOpacities[1]).toBe(1);
    expect(thirdLedgerState.stepOpacities[2]).toBeGreaterThan(0);
    expect(thirdLedgerState.ruleProgress.rows[0]).toBe(1);
    expect(thirdLedgerState.ruleProgress.rows[1]).toBeGreaterThan(0);
    expect(thirdLedgerState.ruleProgress.bottom).toBe(0);

    const actionsState = await scrollToSequenceProgress(0.82);
    expect(actionsState.phase).toBe("actions");
    expect(actionsState.stepOpacities).toEqual([1, 1, 1]);
    expect(actionsState.actionOpacity).toBeGreaterThan(0);
    expect(actionsState.videoOpacity).toBeGreaterThan(0);
    expect(actionsState.interactive).toBe("true");
    expect(actionsState.ruleProgress).toEqual({
      bottom: 1,
      rows: [1, 1],
      top: 1,
    });
    expect(Math.abs(actionsState.stageTop)).toBeLessThanOrEqual(1);

    const finalActionsState = await scrollToSequenceProgress(0.92);
    expect(finalActionsState.phase).toBe("actions");
    expect(finalActionsState.interactive).toBe("true");
    expect(finalActionsState.actionOpacity).toBe(1);
    expect(finalActionsState.videoOpacity).toBe(1);
    expect(Math.abs(finalActionsState.stageTop)).toBeLessThanOrEqual(1);
    await expect(process).toHaveAttribute("data-process-video-state", "closed");
    await expect(process.locator("[data-process-video-stage]"))
      .toHaveAttribute("data-open", "false");
    await expect(process.locator("[data-process-layout]"))
      .not.toHaveAttribute("aria-hidden", "true");
    await expect(process.locator("[data-process-silk-host]")).toHaveCount(0);
    await expect(process.locator("canvas")).toHaveCount(0);
    await expect.poll(() => process.locator("video").evaluate(
      (video) => (video as HTMLVideoElement).paused,
    )).toBe(true);

    const restoredActionsState = await scrollToSequenceProgress(0.82);
    expect(restoredActionsState.phase).toBe("actions");
    expect(restoredActionsState.interactive).toBe("true");
    await expect(process).toHaveAttribute("data-process-video-state", "closed");
    await expect(process.locator("[data-process-layout]"))
      .not.toHaveAttribute("aria-hidden", "true");

    await expect(entryReveal).toHaveAttribute("data-state", "ready");
    const directionalComposition = await process.evaluate((section) => {
      const rows = [...section.querySelectorAll<HTMLElement>(
        "[data-process-step]",
      )].map((row) => row.getBoundingClientRect());
      const outcome = section.querySelector<HTMLElement>(
        "[data-process-outcome]",
      )!.getBoundingClientRect();
      return {
        outcomeAfterSteps: outcome.top >= rows.at(-1)!.bottom - 1,
      };
    });
    expect(directionalComposition.outcomeAfterSteps).toBe(true);

    const evidenceTransitionStart = sequenceStart + geometry.sequenceDistance;
    await scrollImmediately(page, evidenceTransitionStart + 450);
    await expect.poll(() => evidenceHandoff.getAttribute("data-progress"))
      .toBe("0.500");
    const evidenceRevealMiddle = await page.evaluate(() => {
      const incoming = document.querySelector<HTMLElement>(
        '[data-home-module="evidence"]',
      )!;
      const processStage = document.querySelector<HTMLElement>(
        "[data-process-pin-stage]",
      )!;
      const actionBand = document.querySelector<HTMLElement>("#zacit")!;
      const actionHeadingLine = actionBand.querySelector<HTMLElement>("h2 > span")!;
      return {
        actionContentOpacity: Number.parseFloat(
          getComputedStyle(actionHeadingLine).opacity,
        ),
        actionTop: actionBand.getBoundingClientRect().top,
        clipPath: getComputedStyle(incoming).clipPath,
        evidenceBottom: incoming.getBoundingClientRect().bottom,
        evidenceTop: incoming.getBoundingClientRect().top,
        processStageTop: processStage.getBoundingClientRect().top,
        viewportHeight: window.innerHeight,
      };
    });
    const evidenceCircle = evidenceRevealMiddle.clipPath.match(
      /circle\(([\d.]+)px at 50% ([\d.]+)px\)/u,
    );
    expect(evidenceCircle, evidenceRevealMiddle.clipPath).not.toBeNull();
    expect(Number(evidenceCircle?.[1])).toBeGreaterThan(560);
    expect(Number(evidenceCircle?.[1])).toBeLessThan(640);
    expect(Math.abs(Number(evidenceCircle?.[2]) - 900)).toBeLessThanOrEqual(1);
    expect(evidenceRevealMiddle.actionContentOpacity).toBe(0);
    expect(evidenceRevealMiddle.actionTop)
      .toBeGreaterThan(evidenceRevealMiddle.viewportHeight);
    expect(Math.abs(
      evidenceRevealMiddle.evidenceBottom - evidenceRevealMiddle.viewportHeight,
    )).toBeLessThanOrEqual(2);
    expect(Math.abs(evidenceRevealMiddle.evidenceTop)).toBeLessThanOrEqual(8);
    expect(evidenceRevealMiddle.processStageTop).toBeLessThan(-430);

    await scrollImmediately(page, evidenceTransitionStart + 900);
    await expect(evidenceHandoff).toHaveAttribute("data-phase", "complete");
    await expect(evidence).toHaveCSS("clip-path", "none");
    const settledEvidence = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>(
        '[data-home-module="evidence"]',
      )!;
      const actionBand = document.querySelector<HTMLElement>("#zacit")!;
      const actionHeadingLine = actionBand.querySelector<HTMLElement>("h2 > span")!;
      return {
        actionContentOpacity: Number.parseFloat(
          getComputedStyle(actionHeadingLine).opacity,
        ),
        actionTop: actionBand.getBoundingClientRect().top,
        actionTransform: getComputedStyle(actionBand).transform,
        bottom: section.getBoundingClientRect().bottom,
        top: section.getBoundingClientRect().top,
        transform: getComputedStyle(section).transform,
        viewportHeight: window.innerHeight,
      };
    });
    expect(settledEvidence.actionContentOpacity).toBe(0);
    expect(Math.abs(settledEvidence.actionTop - settledEvidence.viewportHeight))
      .toBeLessThanOrEqual(2);
    expect(Math.abs(settledEvidence.bottom - settledEvidence.viewportHeight))
      .toBeLessThanOrEqual(2);
    expect(settledEvidence.actionTransform).toBe("none");
    expect(Math.abs(settledEvidence.top)).toBeLessThanOrEqual(2);
    expect(settledEvidence.transform).toBe("matrix(1, 0, 0, 1, 0, 0)");
    await expect(finalAction).not.toBeInViewport();
    await expectNoHorizontalOverflow(page);

    await scrollImmediately(page, evidenceTransitionStart + 1400);
    await expect(finalAction).toBeInViewport();
    await expect.poll(() => finalAction.locator("h2 > span").first().evaluate(
      (line) => Number.parseFloat(getComputedStyle(line).opacity),
    )).toBeGreaterThan(0.5);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "networkidle" });
    await process.scrollIntoViewIfNeeded();
    await expect(entryReveal).toHaveAttribute("data-state", "reduced-motion");
    await expect(handoff).toHaveAttribute("data-state", "reduced-motion");
    await expect(evidenceHandoff).toHaveAttribute("data-state", "reduced-motion");
    await expect(references).not.toHaveAttribute("data-process-handoff-enhanced");
    await expect(process).not.toHaveAttribute("data-references-process-layer");
    await expect(evidence).not.toHaveAttribute("data-process-evidence-layer");
    await expect(evidence).toHaveCSS("clip-path", "none");
    await expect(evidence).toHaveCSS("transform", "none");
    await expect(finalAction).toHaveCSS("transform", "none");
    await expect(process.locator("[data-process-transition-item]")).toHaveCount(6);
    await expect.poll(() => process.locator(
      "[data-process-transition-item]",
    ).evaluateAll((items) => items.every((item) => {
      const style = getComputedStyle(item);
      return style.opacity === "1" && style.transform === "none";
    }))).toBe(true);
  });

  test("keeps hero silk while the process stays solid and mask-driven", async ({ page }) => {
    test.slow();
    test.setTimeout(120_000);
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    await waitForHeroFinalState(page);

    const hero = page.locator("[data-cinematic-home-hero]");
    await expect(hero).toHaveAttribute("data-hero-state", "portrait-silk");
    await expect(hero.locator("[data-hero-context-wave]")).toHaveCount(0);
    await expect(hero.locator("[data-hero-silk-host] canvas")).toHaveCount(1);
    await expect(hero.locator("[data-hero-portrait-warp] canvas"))
      .toHaveCount(ORIGINAL_HERO_PORTRAIT ? 1 : 0);
    await expect(hero.locator("[data-hero-context-label]")).toHaveCount(0);
    await expect(hero.locator("[data-hero-portrait]")).toHaveCSS("opacity", "1");
    await expect(page.locator("[data-hero-profile-handoff]"))
      .toHaveAttribute("data-state", "ready");
    const transitionLayer = page.locator("[data-hero-transition-layer]");
    await expect(transitionLayer).toHaveCount(1);
    await expect(transitionLayer).toHaveCSS("clip-path", /circle/u);
    await expect(transitionLayer).toHaveCSS("transform", /matrix/u);
    await waitForHeroSilkReady(page);

    const heroMaterialGeometry = await hero.evaluate((heroElement) => {
      const heroRect = heroElement.getBoundingClientRect();
      const portrait = heroElement.querySelector<HTMLElement>(
        "[data-hero-portrait]",
      )!.getBoundingClientRect();
      const silk = heroElement.querySelector<HTMLElement>(
        "[data-hero-silk-host]",
      )!.getBoundingClientRect();
      return {
        coversHeroLeft: silk.left <= heroRect.left + 1,
        coversHeroRight: silk.right >= heroRect.right - 1,
        portraitCoversBottom: Math.abs(portrait.bottom - heroRect.bottom) <= 1,
        portraitCoversTop: Math.abs(portrait.top - heroRect.top) <= 1,
        reachesPortraitFade: silk.right > portrait.left,
        silkOverscansBottom: silk.bottom >= heroRect.bottom,
        silkOverscansTop: silk.top <= heroRect.top,
      };
    });
    expect(heroMaterialGeometry).toEqual({
      coversHeroLeft: true,
      coversHeroRight: true,
      portraitCoversBottom: true,
      portraitCoversTop: true,
      reachesPortraitFade: true,
      silkOverscansBottom: true,
      silkOverscansTop: true,
    });

    const process = page.locator('[data-home-module="process"]');
    await expect(process.locator("[data-process-reveal]"))
      .toHaveAttribute("data-state", "ready");
    await expect(process.locator("[data-process-silk-host]")).toHaveCount(0);
    await expect(process.locator("canvas")).toHaveCount(0);
    const processField = await process.evaluate((element) => {
      const rows = [...element.querySelectorAll<HTMLElement>(
        "[data-process-step]",
      )].map((row) => row.getBoundingClientRect());
      const outcome = element.querySelector<HTMLElement>(
        "[data-process-outcome]",
      )!.getBoundingClientRect();
      return {
        backgroundImage: getComputedStyle(element).backgroundImage,
        outcomeAfterSteps: outcome.top > rows.at(-1)!.bottom,
      };
    });
    expect(processField.backgroundImage).toBe("none");
    expect(processField.outcomeAfterSteps).toBe(true);

    await page.setViewportSize({ width: 700, height: 844 });
    await process.scrollIntoViewIfNeeded();
    await expect(process.locator("[data-process-reveal]"))
      .toHaveAttribute("data-sequence", "scroll-linked");

    await page.setViewportSize({ width: 390, height: 844 });
    await process.scrollIntoViewIfNeeded();
    await expect(process.locator("[data-process-cta]")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "networkidle" });
    await process.scrollIntoViewIfNeeded();
    await expect(process.locator("[data-process-reveal]"))
      .toHaveAttribute("data-state", "reduced-motion");
    await expect(process.locator("[data-process-transition-item]")).toHaveCount(6);
  });

  test("renders the homepage FAQ as an exclusive responsive editorial accordion", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.goto("/", { waitUntil: "networkidle" });

    const faq = page.locator('[data-home-module="faq"]');
    const accordion = faq.locator("[data-home-faq-accordion]");
    const buttons = accordion.getByRole("button");

    await expect(buttons).toHaveCount(4);
    await expect(buttons.first()).toHaveAttribute("aria-expanded", "true");
    await expect(buttons.first()).toHaveAttribute(
      "aria-controls",
      "home-faq-after-contact-panel",
    );
    await expect(page.locator("#home-faq-after-contact-panel")).toHaveAttribute(
      "aria-labelledby",
      "home-faq-after-contact-trigger",
    );
    await expect(
      faq.getByRole("link", { name: "Zásady zpracování osobních údajů" }),
    ).toHaveAttribute("href", "/zasady-zpracovani-osobnich-udaju/");

    for (const width of [1920, 1440, 1280, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await faq.scrollIntoViewIfNeeded();
      await expectNoHorizontalOverflow(page);

      const geometry = await faq.evaluate((section) => {
        const heading = section.querySelector('[data-pattern="section-intro"]');
        const list = section.querySelector("[data-home-faq-accordion]");
        const item = section.querySelector('[data-home-faq-item="after-contact"]');
        const trigger = item?.querySelector("[data-home-faq-trigger]") ?? null;
        const question = item?.querySelector("[data-home-faq-question]") ?? null;
        const indicator = item?.querySelector("[data-home-faq-indicator]") ?? null;
        const answer = item?.querySelector("[data-home-faq-answer]") ?? null;
        const triggers = [...section.querySelectorAll("button")];
        const box = (node: Element | null) => node?.getBoundingClientRect();
        const itemBox = box(item);
        const triggerBox = box(trigger);
        const questionBox = box(question);
        const indicatorBox = box(indicator);

        return {
          answerPaddingLeft: answer
            ? Number.parseFloat(getComputedStyle(answer).paddingLeft)
            : 0,
          answerWidth: box(answer)?.width ?? 0,
          indicatorRightInset: itemBox && indicatorBox
            ? itemBox.right - indicatorBox.right
            : 0,
          intro: box(heading)?.toJSON(),
          itemWidth: itemBox?.width ?? 0,
          list: box(list)?.toJSON(),
          minimumTriggerHeight: Math.min(
            ...triggers.map((trigger) => trigger.getBoundingClientRect().height),
          ),
          questionLeftInset: itemBox && questionBox
            ? questionBox.left - itemBox.left
            : 0,
          triggerWidth: triggerBox?.width ?? 0,
        };
      });

      expect(geometry.answerWidth).toBeLessThanOrEqual(680);
      expect(geometry.minimumTriggerHeight).toBeGreaterThanOrEqual(68);
      expect(geometry.triggerWidth).toBeCloseTo(geometry.itemWidth, 0);
      if (width > 560) {
        expect(geometry.answerPaddingLeft).toBeGreaterThanOrEqual(24);
        expect(geometry.questionLeftInset).toBeGreaterThanOrEqual(24);
        expect(geometry.indicatorRightInset).toBeGreaterThanOrEqual(24);
      } else {
        expect(geometry.answerPaddingLeft).toBeGreaterThanOrEqual(16);
        expect(geometry.questionLeftInset).toBeGreaterThanOrEqual(16);
        expect(geometry.indicatorRightInset).toBeGreaterThanOrEqual(16);
      }
      if (width > 900) {
        expect(geometry.intro?.right).toBeLessThan(geometry.list?.left ?? 0);
      } else {
        expect(geometry.list?.top).toBeGreaterThan(geometry.intro?.bottom ?? 0);
      }
    }

    const first = buttons.nth(0);
    const second = buttons.nth(1);
    await first.focus();
    await expect(first).toHaveCSS("outline-style", "solid");
    await expect(first).toHaveCSS("outline-width", "2px");
    await first.click();
    await expect(first).toHaveAttribute("aria-expanded", "false");
    await second.click();
    await expect(first).toHaveAttribute("aria-expanded", "false");
    await expect(second).toHaveAttribute("aria-expanded", "true");
    await second.click();
    await expect(second).toHaveAttribute("aria-expanded", "false");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "networkidle" });
    const panelTransition = await page
      .locator("#home-faq-after-contact-panel")
      .evaluate((panel) => getComputedStyle(panel).transitionDuration);
    expect(
      panelTransition
        .split(",")
        .every((duration) => duration.trim() === "0s"),
    ).toBe(true);
  });

  test("reflows at a 400% desktop equivalent with a fallback font", async ({ browser }) => {
    const context = await browser.newContext({
      deviceScaleFactor: 4,
      viewport: { width: 320, height: 800 },
    });
    const page = await context.newPage();
    await primeRejectedConsent(page);
    await page.addInitScript(() => {
      document.documentElement.style.setProperty("--font-base", "Arial, sans-serif");
    });
    await page.goto("/", { waitUntil: "networkidle" });

    expect(await page.evaluate(() => window.devicePixelRatio)).toBe(4);
    await expectNoHorizontalOverflow(page);
    await expect(page.getByRole("heading", {
      level: 1,
      name: "Nejhorší finanční rozhodnutí je to, kterému nerozumíte.",
    })).toBeVisible();
    await expect(page.locator('[data-analytics-placement="hero"]')).toBeVisible();
    await expect(page.locator("[data-hero-secondary]")).toBeVisible();
    await expect(page.locator("[data-hero-trust]")).toHaveCount(0);

    const headlineOffset = await page.locator("[data-hero-heading-line]").evaluateAll((lines) =>
      lines[1].getBoundingClientRect().left - lines[0].getBoundingClientRect().left);
    expect(Math.abs(headlineOffset)).toBeLessThanOrEqual(1);

    const situationPanels = page.locator("[data-situation-panel]");
    await expect(situationPanels).toHaveCount(situations.length);
    const selectorFits = await page.locator(
      '[data-home-module="situations"]',
    ).evaluate((section) => {
      const rect = section.getBoundingClientRect();
      return rect.left >= 0
        && rect.right <= document.documentElement.clientWidth + 1;
    });
    expect(selectorFits).toBe(true);
    const panelFits = await situationPanels.evaluateAll((rows) => rows.every((row) => {
      const rect = row.getBoundingClientRect();
      return rect.left >= 0
        && rect.right <= document.documentElement.clientWidth + 1;
    }));
    expect(panelFits).toBe(true);
    await context.close();
  });

  test("keeps the compact situation selector readable across breakpoints", async ({ page }) => {
    for (const viewport of [
      { width: 1440, height: 1000, horizontal: true },
      { width: 768, height: 1000, horizontal: false },
      { width: 390, height: 844, horizontal: false },
    ]) {
      await page.setViewportSize(viewport);
      await primeRejectedConsent(page);
      await page.goto("/#situace", { waitUntil: "networkidle" });

      const section = page.locator('[data-home-module="situations"]');
      const choices = section.locator("[data-situation-choice]");
      await expect(choices).toHaveCount(situations.length);
      await expect(section.locator("[data-situation-panel]:visible")).toHaveCount(1);
      await expect(section.locator("[data-orientation-path]")).toHaveCount(1);

      const layout = await section.evaluate((element) => {
        const activePanel = element.querySelector<HTMLElement>(
          '[data-situation-panel][data-active="true"]',
        )!;
        const choiceRail = element.querySelector<HTMLElement>(
          "[data-situation-choice-rail]",
        )!;
        const detailViewport = element.querySelector<HTMLElement>(
          "[data-situation-detail-viewport]",
        )!;
        const choiceRailRect = choiceRail.getBoundingClientRect();
        const detailViewportRect = detailViewport.getBoundingClientRect();
        return {
          horizontal:
            Math.abs(choiceRailRect.top - detailViewportRect.top) <= 1
            && detailViewportRect.left > choiceRailRect.left,
          panelFits: activePanel.scrollWidth <= activePanel.clientWidth + 1,
        };
      });
      expect(layout).toEqual({
        horizontal: viewport.horizontal,
        panelFits: true,
      });

      await choices.nth(1).click();
      await expect(section.locator(
        '[data-situation-panel="new-housing"]',
      )).toBeVisible();
      await expect(section.locator("[data-situation-panel]:visible")).toHaveCount(1);
      const activeChoiceVisuals = await section.evaluate((element) => {
        const activeChoice = element.querySelector<HTMLElement>(
          '[data-active="true"] [data-situation-choice]',
        )!;
        const activeRule = activeChoice.querySelector<HTMLElement>(
          "span:last-child",
        )!;
        const orientation = element.querySelector<HTMLElement>(
          "[data-orientation-surface]",
        )!;
        const orientationAction = element.querySelector<HTMLElement>(
          "[data-orientation-action]",
        )!;
        const locator = element.querySelector<HTMLElement>(
          "[data-situation-locator]",
        )!;

        return {
          activeBackground: getComputedStyle(activeChoice).backgroundColor,
          activeBorder: getComputedStyle(activeChoice).borderBottomColor,
          activeText: getComputedStyle(activeChoice).color,
          actionBackground: getComputedStyle(orientationAction).backgroundColor,
          actionText: getComputedStyle(orientationAction).color,
          indicatorDisplay: getComputedStyle(activeRule).display,
          layout: element.querySelector<HTMLElement>(
            "[data-situation-layout]",
          )?.dataset.situationLayout,
          locatorDisplay: getComputedStyle(locator).display,
          orientationBackground: getComputedStyle(orientation).backgroundColor,
          orientationSurface: getComputedStyle(
            orientation,
            "::before",
          ).backgroundColor,
          ruleBackground: getComputedStyle(activeRule).backgroundColor,
        };
      });
      expect(activeChoiceVisuals.activeBackground).not.toBe(
        activeChoiceVisuals.orientationBackground,
      );
      expect(activeChoiceVisuals.activeText).not.toBe(
        activeChoiceVisuals.actionText,
      );
      expect(activeChoiceVisuals.activeBorder).not.toBe(
        activeChoiceVisuals.actionText,
      );
      expect(activeChoiceVisuals.orientationSurface).toBe("rgb(176, 228, 84)");
      expect(activeChoiceVisuals.actionBackground).toBe("rgb(13, 13, 13)");
      expect(activeChoiceVisuals.actionText).toBe("rgb(234, 255, 208)");
      expect(activeChoiceVisuals.ruleBackground).toBe("rgb(176, 228, 84)");
      expect(activeChoiceVisuals.layout).toBe(
        viewport.horizontal ? "tabs" : "accordion",
      );
      expect(activeChoiceVisuals.locatorDisplay).toBe(
        viewport.horizontal ? "block" : "none",
      );
      expect(activeChoiceVisuals.indicatorDisplay).toBe(
        viewport.horizontal ? "none" : "block",
      );
      await expectNoHorizontalOverflow(page);
    }
  });

  test("supports keyboard navigation, forced colors, and automated accessibility", async ({ page }) => {
    test.setTimeout(120_000);
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Přeskočit na obsah" })).toBeFocused();

    const menu = page.locator('[data-component="site-navigation"] > button');
    await menu.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await expect(menu).toHaveAttribute("aria-expanded", "false");

    const heroAction = page.locator('[data-analytics-placement="hero"]');
    await heroAction.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(heroAction).toBeFocused();
    await expect(heroAction).toHaveCSS("outline-style", "solid");
    await expect(heroAction).toHaveCSS("outline-width", "2px");

    const heroSecondary = page.locator("[data-hero-secondary]");
    await heroSecondary.focus();
    await expect(heroSecondary).toHaveCSS("outline-style", "solid");
    await expect(heroSecondary).toHaveCSS("outline-width", "2px");
    await expect(heroSecondary).toHaveCSS("text-decoration-line", "none");

    const situationChoices = page.locator("[data-situation-choice]");
    await situationChoices.first().focus();
    await expect(situationChoices.first()).toHaveCSS("outline-style", "solid");
    await expect(situationChoices.first()).toHaveCSS("outline-width", "2px");
    await situationChoices.nth(1).focus();
    await expect(situationChoices.nth(1)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(situationChoices.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(
      '[data-situation-panel="new-housing"]',
    )).toBeVisible();

    const orientationLink = page.locator("[data-orientation-path]");
    await orientationLink.focus();
    await expect(orientationLink).toHaveCSS("outline-style", "solid");
    await expect(orientationLink).toHaveCSS("outline-width", "2px");
    const customSituationLink = page.locator(
      "[data-custom-situation-link]:visible",
    );
    await customSituationLink.focus();
    await expect(customSituationLink).toBeFocused();

    const firstReferenceSource = page.locator(
      '[data-home-reference="denisa-reznickova"] a[target="_blank"]',
    );
    await firstReferenceSource.focus();
    await expect(firstReferenceSource).toHaveCSS("outline-style", "solid");
    await expect(firstReferenceSource).toHaveCSS("outline-width", "2px");

    const processCta = page.locator("[data-process-cta]");
    await processCta.focus();
    await expect(processCta).toBeFocused();
    await expect(processCta).toHaveCSS("outline-style", "solid");
    await expect(processCta).toHaveCSS("outline-width", "2px");

    const faqAccordion = page.locator("[data-home-faq-accordion]");
    const firstFaqButton = faqAccordion.getByRole("button", {
      name: "Co se stane po odeslání?",
    });
    const secondFaqButton = faqAccordion.getByRole("button", {
      name: "Je první kontakt nezávazný?",
    });
    await expect(firstFaqButton).toHaveAttribute("aria-expanded", "true");
    await firstFaqButton.focus();
    await page.keyboard.press("Enter");
    await expect(firstFaqButton).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Space");
    await expect(firstFaqButton).toHaveAttribute("aria-expanded", "true");
    await secondFaqButton.focus();
    await page.keyboard.press("Enter");
    await expect(firstFaqButton).toHaveAttribute("aria-expanded", "false");
    await expect(secondFaqButton).toHaveAttribute("aria-expanded", "true");

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(page.locator("[data-cinematic-home-hero]")).toBeInViewport();
    await waitForHeroFinalState(page);

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "networkidle" });
    await expect.poll(() => page.locator("[data-process-step]").evaluateAll(
      (steps) => steps.map((step) => {
        const style = getComputedStyle(step);
        return { opacity: style.opacity, transform: style.transform };
      }),
    )).toEqual([
      { opacity: "1", transform: "none" },
      { opacity: "1", transform: "none" },
      { opacity: "1", transform: "none" },
    ]);
    await expect(page.locator("[data-process-outcome]")).toHaveCount(0);
    await expect(page.locator("[data-process-action]")).toHaveCSS("transform", "none");

    await page.emulateMedia({ forcedColors: "active" });
    await page.reload({ waitUntil: "networkidle" });
    const forcedColorMenu = page.locator('[data-component="site-navigation"] > button');
    await expect(page.locator("[data-cinematic-home-hero]")).not.toHaveAttribute(
      "data-hero-silk-ready",
      "true",
    );
    await expect(page.locator("[data-hero-portrait]")).toHaveCSS("opacity", "1");
    await forcedColorMenu.focus();
    await expect(forcedColorMenu).toHaveCSS("outline-style", "solid");
    await expect(forcedColorMenu).toHaveCSS("outline-width", "2px");
  });

  test("keeps the brand and primary action available without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 900 },
    });
    const page = await context.newPage();
    await page.goto("/");

    const header = page.locator('[data-component="site-header"][data-header-instance="hero"]');
    await expect(header.locator('a[href="/"]')).toBeVisible();
    await expect(header.locator("[data-header-overview]")).toBeVisible();
    await expect(header.locator("[data-header-overview] [data-cta-label]")).toBeVisible();
    await expect(header.locator("[data-header-overview]"))
      .toHaveAttribute("href", "/ziskat-prehled/?source=header&cta=header-primary");
    await expect(page.getByRole("heading", {
      level: 1,
      name: "Nejhorší finanční rozhodnutí je to, kterému nerozumíte.",
    })).toBeVisible();
    await expect(page.locator("[data-hero-context-wave]")).toHaveCount(0);
    await expect(page.locator("[data-cinematic-home-hero]")).not.toHaveAttribute(
      "data-hero-silk-ready",
      "true",
    );
    await expect(page.locator("[data-hero-portrait]")).toHaveCSS(
      "display",
      "none",
    );
    await expectNoHorizontalOverflow(page);
    await context.close();
  });

  test("switches one situation detail without moving the selector", async ({ browser, page }) => {
    test.setTimeout(120_000);
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#situace", { waitUntil: "networkidle" });

    const section = page.locator('[data-home-module="situations"]');
    const selector = section.locator("[data-situation-selector]");
    const choices = section.locator("[data-situation-choice]");
    await selector.scrollIntoViewIfNeeded();
    const initialRect = await selector.boundingBox();
    await choices.nth(2).hover();
    await expect(section.locator('[data-situation-panel="mortgage-refixation"]')).toBeVisible();

    await choices.nth(2).click();
    await expect(choices.nth(2)).toHaveAttribute("aria-selected", "true");
    await expect(section.locator(
      '[data-situation-panel="insurance-review"]',
    )).toBeVisible();
    await expect(section.locator("[data-situation-panel]:visible")).toHaveCount(1);
    expect(await selector.boundingBox()).toEqual(initialRect);

    await choices.nth(4).click();
    await choices.nth(1).click();
    await expect(section.locator(
      '[data-situation-panel="new-housing"]',
    )).toBeVisible();
    await expect(section.locator("[data-situation-panel]:visible")).toHaveCount(1);

    await page.close();
    const touchContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3000",
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    const touchPage = await touchContext.newPage();
    await primeRejectedConsent(touchPage);
    await touchPage.goto("/", { waitUntil: "domcontentloaded" });
    const touchSection = touchPage.locator('[data-home-module="situations"]');
    const touchChoice = touchSection.locator(
      '[data-situation-choice="income-protection"]',
    );
    await touchChoice.scrollIntoViewIfNeeded();
    expect(await touchPage.evaluate(
      () => matchMedia("(hover: hover) and (pointer: fine)").matches,
    )).toBe(false);
    await touchChoice.tap();
    await expect(touchChoice).toHaveAttribute("aria-selected", "true");
    await expect(touchSection.locator(
      '[data-situation-panel="income-protection"]',
    )).toBeVisible();
    await expect(touchSection.locator("[data-situation-panel]:visible"))
      .toHaveCount(1);
    await expectNoHorizontalOverflow(touchPage);
    await touchContext.close();
  });

  test("routes all visible situation paths with source and concrete context", async ({ page }) => {
    test.setTimeout(90_000);
    await primeRejectedConsent(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    for (const situation of allSituationPaths) {
      if (situation !== "orientace") {
        const choice = page.locator(
          `[data-situation-choice="${situation}"]`,
        );
        if ((await choice.getAttribute("aria-expanded")) !== "true") {
          await choice.click();
        }
      }
      const link = page.locator(
        `[data-analytics-source="home-situations"][data-situation-id="${situation}"]`,
      );
      await link.scrollIntoViewIfNeeded();
      const href = await link.getAttribute("href");
      expect(href).toBeTruthy();
      const url = new URL(href!, "http://127.0.0.1:3000");
      expect(url.searchParams.get("source")).toBe("homepage");
      expect(url.searchParams.get("cta")).toBe(
        situation === "orientace"
          ? "unsure-priorities"
          : `situation-${situation}`,
      );
      if (situation !== "orientace") {
        expect(url.searchParams.get("topic")).toBeTruthy();
      }
    }

    await page.goto(
      "/ziskat-prehled/?intent=unsure&source=homepage&cta=unsure-priorities",
      { waitUntil: "domcontentloaded" },
    );
    await expect(page.locator('input[name="sourceContext"]')).toHaveValue("homepage");
    await expect(page.getByRole("heading", {
      level: 1,
      name: "Vyberte oblast",
    })).toBeAttached();
    await expect(page.getByText("Vyberte oblast, kterou řešíte.")).toBeVisible();
    await expect(page.getByRole("radio", {
      name: "Nevím přesně, kde začít",
    })).toBeChecked();
    const unsureNote = page.getByLabel(
      "Co byste mi chtěli doplnit?",
    );
    await expect(unsureNote).toBeDisabled();
    await page.getByRole("button", { name: "Chci doplnit pár vět" }).click();
    await expect(unsureNote).toBeVisible();
    await expect(unsureNote).toBeEnabled();
    await expect(page.getByRole("button", { name: "Pokračovat" })).toBeEnabled();
    await expect(unsureNote).not.toBeFocused();

    await page.goto(
      "/ziskat-prehled/?intent=housing&topic=mortgage-refixation&source=homepage&cta=situation-mortgage-refixation",
      { waitUntil: "domcontentloaded" },
    );
    await expect(page.getByRole("heading", {
      level: 1,
      name: "Kontaktní údaje",
    })).toBeAttached();
    await expect(page.locator("#overview-phone")).toBeVisible();
    await expect(page.locator('input[name="intent"]')).toHaveValue("housing");
    await expect(page.locator('input[name="topic"]')).toHaveValue(
      "mortgage-refixation",
    );
  });

  test("shows the selected situation summary in the contact step", async ({ page }) => {
    await primeRejectedConsent(page);
    await page.goto("/", { waitUntil: "networkidle" });

    const link = page.locator(
      '[data-analytics-source="home-situations"][data-situation-id="income-protection"]',
    );
    await page.locator(
      '[data-situation-choice="income-protection"]',
    ).click();
    await Promise.all([
      page.waitForURL(/\/ziskat-prehled\//u),
      link.click(),
    ]);
    await page.waitForLoadState("networkidle");

    const form = page.locator("form");
    await expect(page.getByText("Ochrana příjmu, rodiny nebo majetku", {
      exact: true,
    })).toBeVisible();
    await expect(page.getByRole("heading", {
      level: 1,
      name: "Kontaktní údaje",
    })).toBeAttached();
    await expect(page.locator("#overview-phone")).toBeVisible();
    await expect(form).toBeVisible();
  });
});
