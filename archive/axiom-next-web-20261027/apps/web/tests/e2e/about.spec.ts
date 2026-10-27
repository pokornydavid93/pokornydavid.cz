import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const CONSENT_STORAGE_KEY = "cookie_consent_v1";
const CONSENT_VERSION = "2026-09-13-web-privacy-v2";

const chapterSequence = [
  { chapter: "dark", tone: "dark" },
  { chapter: "paper", tone: "light" },
  { chapter: "dark", tone: "dark" },
  { chapter: "paper", tone: "light" },
  { chapter: "dark", tone: "dark" },
  { chapter: "paper", tone: "light" },
  { chapter: "dark", tone: "dark" },
  { chapter: "action", tone: "action" },
] as const;

const chapterHeadings = [
  "Finanční rozhodnutí nevznikají ve vakuu.",
  "Nejdřív chráníme to podstatné. Potom stavíme to, kam míříte.",
  "Za každým plánem vidím konkrétní život.",
  "Aby bylo od začátku jasno.",
  "Důvěra nemusí stát jen na dojmu.",
  "Důležitější než vlastní slib je zkušenost zvenku.",
  "Můj přístup už znáte. Teď pojďme zjistit, co dává smysl právě vám.",
] as const;

async function seedCookieConsent(page: Page) {
  await page.addInitScript(
    ({ key, version }) => {
      const decidedAt = Date.now();

      window.localStorage.setItem(
        key,
        JSON.stringify({
          choice: "rejected",
          decidedAt,
          expiresAt: decidedAt + 180 * 24 * 60 * 60 * 1_000,
          version,
        }),
      );
    },
    { key: CONSENT_STORAGE_KEY, version: CONSENT_VERSION },
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const scrollWidth = Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        );

        return scrollWidth - document.documentElement.clientWidth;
      }),
    )
    .toBeLessThanOrEqual(1);
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

test.describe("about route", () => {
  test.beforeEach(async ({ page }) => {
    await seedCookieConsent(page);
  });

  test("aligns the shared chrome with page content without widening the hero", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1000 });
    await page.goto("/kdo-jsem/", { waitUntil: "domcontentloaded" });

    const [headerBrand, content, hero, footerIdentity] = await Promise.all([
      page.locator("[data-header-motion-inner] > a").boundingBox(),
      page
        .locator("[data-about-editorial] [data-about-reveal]")
        .boundingBox(),
      page.locator("[data-about-hero]").boundingBox(),
      page
        .locator('footer [data-layout="container"] > :first-child')
        .boundingBox(),
    ]);

    expect(headerBrand).not.toBeNull();
    expect(content).not.toBeNull();
    expect(hero).not.toBeNull();
    expect(footerIdentity).not.toBeNull();

    if (!headerBrand || !content || !hero || !footerIdentity) {
      throw new Error("About page container geometry is unavailable.");
    }

    expect(Math.abs(headerBrand.x - content.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(footerIdentity.x - content.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(hero.x - content.x)).toBeLessThanOrEqual(1);
    await expectNoHorizontalOverflow(page);
  });

  test("keeps the eight-chapter story semantic and responsive", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const viewports = [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1024, height: 900 },
      { width: 1440, height: 900 },
    ] as const;

    await page.setViewportSize(viewports[0]);
    await page.goto("/kdo-jsem/", { waitUntil: "domcontentloaded" });

    const main = page.locator("main");
    const about = main.locator("[data-about-page]");
    const chapters = about.locator(":scope > [data-about-chapter]");
    const manifesto = about.locator("[data-about-manifesto]");
    const expectations = about.locator("[data-about-expectations]");

    await expect(main).toHaveCount(1);
    await expect(about).toBeVisible();
    await expect(main.locator("h1")).toHaveCount(1);
    await expect(
      main.getByRole("heading", {
        level: 1,
        name: /Nechci, abyste mi věřili\.\s*Chci, abyste mi rozuměli\./u,
      }),
    ).toBeVisible();
    await expect(
      main.getByText(
        "Ukážu vám celý obraz, abyste se mohli rozhodnout sami a s jistotou.",
      ),
    ).toBeVisible();
    await expect(
      about.getByText(
        "K financím jsem se dostal, protože jsem chtěl pochopit, proč mohou dvě jednotlivě správná rozhodnutí společně vytvořit špatný výsledek.",
      ),
    ).toBeVisible();
    await expect(
      about.getByText(
        "Hypotéka ovlivňuje rezervu. Pojištění chrání příjem, ze kterého se splácí. Investice potřebují čas i prostor v rozpočtu. Postupně mi došlo, že smysl nemá hledat nejlepší produkt izolovaně, ale pochopit celý životní kontext člověka.",
      ),
    ).toBeVisible();
    await expect(
      about.getByText(
        "Nechci, abyste odešli jen s novou smlouvou. Chci, abyste rozuměli tomu, proč je další krok správný právě pro vás.",
      ),
    ).toBeVisible();
    await expect(
      about.locator("[data-about-editorial] blockquote > span"),
    ).toHaveAttribute("aria-hidden", "true");
    const human = about.locator("[data-about-human]");
    const humanMedia = human.locator("[data-about-human-media]");
    await expect(humanMedia.locator("img")).toHaveAttribute(
      "alt",
      "Můj portrét při pracovním rozhovoru",
    );
    await expect(humanMedia.locator("p")).toHaveCount(0);
    await expect(
      human.getByText(
        "Takové, které můžete dlouhodobě skutečně dodržet — nejen obhájit v tabulce.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      human.getByText(
        "Dopad na rozpočet, rezervu a další plány. Jedna výhoda nesmí schovat problém jinde.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      human.getByText(
        "Vy. Mojí rolí je udělat v možnostech jasno, ne rozhodnout za vás.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(human.locator("dl > div")).toHaveCount(3);
    await expect(human.locator("dt")).toHaveCount(3);
    await expect(human.locator("dd")).toHaveCount(3);
    await expect(chapters).toHaveCount(chapterSequence.length);
    expect(
      await chapters.evaluateAll((elements) =>
        elements.map((element) => ({
          chapter: element.getAttribute("data-about-chapter"),
          tone: element.getAttribute("data-surface-tone"),
        })),
      ),
    ).toEqual(chapterSequence);

    await expect(main.locator("h2")).toHaveCount(chapterHeadings.length);
    for (const heading of chapterHeadings) {
      await expect(
        main.getByRole("heading", { level: 2, name: heading }),
      ).toBeAttached();
    }

    await expect(manifesto.locator("ol > [data-about-principle]")).toHaveCount(
      3,
    );
    await expect(
      manifesto.locator("[data-about-principle] h3"),
    ).toHaveText([
      "Nejdřív potřebuji vědět, co nesmí být ohrožené.",
      "Na pevném základu můžeme stavět to, kam míříte.",
      "Každé rozhodnutí musí fungovat v obou vrstvách.",
    ]);
    await expect(
      manifesto.getByText(
        "Nezačínám produktem. Nejdřív si společně srovnáme pořadí: co chránit, co budovat a jak obě části propojit do jednoho plánu.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(manifesto.locator("[data-about-diagram]")).toHaveCount(0);
    await expect(
      manifesto.getByText("Vaše situace", { exact: true }),
    ).toHaveCount(0);
    await expect(
      manifesto.getByText("Jedno pravidlo", { exact: true }),
    ).toBeVisible();
    await expect(
      manifesto.getByText(
        "Dobrý finanční plán neřeší jen to, čeho chcete dosáhnout. Musí zároveň chránit všechno, na čem vaše cesta stojí.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      expectations.getByText(
        "Dobrá spolupráce stojí na otevřenosti, ale také na jasných hranicích. Proto říkám rovnou, co ode mě můžete čekat — a co ne.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(expectations.locator("#agreement-expected, #agreement-not-expected")).toHaveText([
      "Co můžete očekávat",
      "Co ode mě čekat nemusíte",
    ]);
    const agreementList = expectations.locator("ol");
    const agreementRows = agreementList.locator(
      ":scope > [data-about-agreement-row]",
    );
    await expect(agreementList).toHaveCount(1);
    await expect(agreementRows).toHaveCount(4);
    await expect(expectations.locator("ul")).toHaveCount(0);
    await expect(expectations.locator("a, button, svg")).toHaveCount(0);
    const expectedAgreementPairs = [
      [
        "Otázky dřív než doporučení.",
        "Tlak na rychlé rozhodnutí.",
      ],
      [
        "Souvislosti vysvětlené normálním jazykem.",
        "Řešení jednoho produktu bez ohledu na zbytek vaší situace.",
      ],
      [
        "Možnosti s jasně vysvětlenými dopady a pořadím.",
        "Slib univerzálního řešení pro každého.",
      ],
      [
        "Konkrétní další krok, o kterém rozhodnete vy.",
        "Citlivé údaje nebo dokumenty hned při prvním kontaktu.",
      ],
    ] as const;
    for (const [index, pair] of expectedAgreementPairs.entries()) {
      await expect(agreementRows.nth(index).locator("h3, [data-about-agreement-description]")).toHaveText(pair);
    }
    await expect(about.locator("[data-about-human-answer]")).toHaveCount(3);
    await expect(about.locator("[data-about-evidence-item]")).toHaveCount(3);

    for (const [index, viewport] of viewports.entries()) {
      await page.setViewportSize(viewport);
      if (index > 0) await page.waitForTimeout(120);

      const titleLines = await main.locator("h1 > span").evaluateAll((lines) =>
        lines.map((line) => {
          const range = document.createRange();
          range.selectNodeContents(line);
          return range.getClientRects().length;
        }),
      );
      expect(titleLines.every((lineCount) => lineCount >= 1)).toBe(true);
      if (viewport.width >= 768) expect(titleLines).toEqual([1, 1]);

      const beliefHeadingLines = await main
        .locator("#belief-title > span")
        .evaluateAll((lines) =>
          lines.map((line) => {
            const range = document.createRange();
            range.selectNodeContents(line);
            return range.getClientRects().length;
          }),
        );
      expect(beliefHeadingLines).toHaveLength(4);
      if (viewport.width >= 921) {
        expect(beliefHeadingLines).toEqual([1, 1, 1, 1]);
      }

      await human.scrollIntoViewIfNeeded();
      await page.waitForTimeout(viewport.width >= 921 ? 900 : 50);

      const humanHeadingLineCount = await main
        .locator("#human-title")
        .evaluate((heading) => {
          const walker = document.createTreeWalker(
            heading,
            NodeFilter.SHOW_TEXT,
          );
          const lineTops = new Set<number>();
          let node = walker.nextNode();

          while (node) {
            if (node.textContent?.trim()) {
              const range = document.createRange();
              range.selectNodeContents(node);
              Array.from(range.getClientRects()).forEach((rect) => {
                lineTops.add(Math.round(rect.top));
              });
            }
            node = walker.nextNode();
          }

          return lineTops.size;
        });
      expect(humanHeadingLineCount).toBeLessThanOrEqual(
        viewport.width >= 921 ? 3 : 4,
      );

      const humanChildren = await human
        .locator(
          ":scope > div > header, :scope > div > [data-about-human-media], :scope > div > dl",
        )
        .evaluateAll((elements) =>
          elements.map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              kind: element.hasAttribute("data-about-human-media")
                ? "media"
                : element.tagName.toLowerCase(),
              bottom: rect.bottom,
              y: rect.y,
            };
          }),
        );

      expect(humanChildren.map((item) => item.kind)).toEqual([
        "header",
        "media",
        "dl",
      ]);
      if (viewport.width <= 920) {
        expect(humanChildren[0]?.y).toBeLessThan(humanChildren[1]?.y ?? 0);
        expect(humanChildren[1]?.y).toBeLessThan(humanChildren[2]?.y ?? 0);
      } else {
        expect(
          Math.abs(
            (humanChildren[1]?.y ?? 0) - (humanChildren[0]?.y ?? 0),
          ),
        ).toBeLessThanOrEqual(1);
        expect(
          Math.abs(
            (humanChildren[1]?.bottom ?? 0) -
              (humanChildren[2]?.bottom ?? 0),
          ),
        ).toBeLessThanOrEqual(1);
      }

      await expectations.scrollIntoViewIfNeeded();
      await page.waitForTimeout(viewport.width >= 921 ? 650 : 50);

      const expectationHeadingLineCount = await expectations
        .locator("#expectations-title")
        .evaluate((heading) => {
          const range = document.createRange();
          range.selectNodeContents(heading);
          return range.getClientRects().length;
        });
      expect(expectationHeadingLineCount).toBeLessThanOrEqual(
        viewport.width >= 921 ? 2 : 4,
      );

      const agreementLayout = await agreementRows.evaluateAll((rows) =>
        rows.map((row) => {
          const children = Array.from(row.children)
            .filter((child) => !child.hasAttribute("data-about-agreement-rule"))
            .map((child) => {
              const rect = child.getBoundingClientRect();
              return {
                bottom: rect.bottom,
                right: rect.right,
                x: rect.x,
                y: rect.y,
              };
            });

          return children;
        }),
      );
      for (const [indexCell, expectedCell, notExpectedCell] of agreementLayout) {
        if (!indexCell || !expectedCell || !notExpectedCell) {
          throw new Error("Agreement row composition is incomplete");
        }

        if (viewport.width <= 680) {
          expect(indexCell.y).toBeLessThan(expectedCell.y);
          expect(expectedCell.bottom).toBeLessThan(notExpectedCell.y);
        } else {
          expect(indexCell.x).toBeLessThan(expectedCell.x);
          expect(expectedCell.bottom).toBeLessThan(notExpectedCell.y);
          expect(Math.abs(expectedCell.x - notExpectedCell.x)).toBeLessThanOrEqual(1);
        }
      }

      if (viewport.width === 1440) {
        const typography = await page.evaluate(() => {
          const read = (selector: string) => {
            const style = getComputedStyle(document.querySelector(selector)!);
            return [style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing, style.color];
          };
          return {
            principleIndex: read("[data-about-principle-index]"),
            agreementIndex: read("[data-about-agreement-index]"),
            principleTitle: read("[data-about-principle-title]"),
            agreementTitle: read("[data-about-agreement-expected]"),
          };
        });
        expect(typography.agreementIndex).toEqual(typography.principleIndex);
        expect(typography.agreementTitle).toEqual(typography.principleTitle);
        await expect(expectations).toHaveCSS("min-height", "0px");
        await expect(expectations).not.toHaveCSS("position", "fixed");
      }
      await expectNoHorizontalOverflow(page);
    }
  });

  test("keeps the hero navigation, official evidence and both CTAs intact", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/kdo-jsem/", { waitUntil: "domcontentloaded" });

    const about = page.locator("[data-about-page]");
    const evidence = about.locator("[data-about-evidence]");
    const handoff = about.getByRole("link", {
      name: "Jak spolupráce probíhá",
    });
    const primaryAction = about.getByRole("link", {
      name: "Zjistit, čím začít",
    }).first();
    const heroTitleLines = about.locator("h1 > span");
    const heroChapter = about.locator("[data-about-hero-chapter]");
    const heroSilk = heroChapter.locator(
      '[data-react-bits-silk][data-silk-source="react-bits"]',
    );
    const portraitScene = about.locator("[data-about-portrait-image]");
    const portraitFrame = portraitScene.locator("..");

    await expect(heroTitleLines).toHaveCount(2);
    await expect(
      heroChapter.getByText("Kdo jsem", { exact: true }),
    ).toHaveCount(0);
    expect(
      await heroTitleLines.evaluateAll((lines) =>
        lines.map((line) => {
          const range = document.createRange();
          range.selectNodeContents(line);
          return range.getClientRects().length;
        }),
      ),
    ).toEqual([1, 1]);
    await expect(portraitScene.locator("img")).toHaveAttribute(
      "src",
      /heroRemastered\.png/u,
    );
    expect(
      await portraitScene.evaluate((scene) =>
        getComputedStyle(scene, "::before").backgroundImage,
      ),
    ).toBe("none");
    await expect(portraitFrame).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(heroSilk).toHaveCount(1);
    await expect(heroSilk).toHaveAttribute("data-state", "ready");
    await expect(heroChapter).toHaveAttribute("data-about-silk-ready", "true");
    await expect(heroSilk.locator("canvas")).toBeAttached();
    await expect(heroChapter.locator("[data-refixation-silk]")).toHaveCount(0);
    const [heroBox, silkBox, portraitBox, portraitImageBox] = await Promise.all([
      heroChapter.boundingBox(),
      heroSilk.boundingBox(),
      portraitFrame.boundingBox(),
      portraitScene.locator("img").boundingBox(),
    ]);
    expect(heroBox).not.toBeNull();
    expect(silkBox).not.toBeNull();
    expect(portraitBox).not.toBeNull();
    expect(portraitImageBox).not.toBeNull();
    if (!heroBox || !silkBox || !portraitBox || !portraitImageBox) {
      throw new Error("Hero composition bounds are missing");
    }
    expect(heroBox.height).toBeGreaterThanOrEqual(900 - 72);
    expect(heroBox.height).toBeLessThanOrEqual(900 - 72 + 2);
    expect(
      Math.abs(
        portraitBox.y + portraitBox.height - (heroBox.y + heroBox.height),
      ),
    ).toBeLessThanOrEqual(1);
    expect(
      portraitImageBox.y + portraitImageBox.height -
        (heroBox.y + heroBox.height),
    ).toBeGreaterThanOrEqual(170);
    expect(
      portraitImageBox.y + portraitImageBox.height -
        (heroBox.y + heroBox.height),
    ).toBeLessThanOrEqual(200);
    expect(silkBox.x).toBeLessThanOrEqual(heroBox.x);
    expect(silkBox.y).toBeLessThanOrEqual(heroBox.y);
    expect(silkBox.x + silkBox.width).toBeGreaterThanOrEqual(
      heroBox.x + heroBox.width,
    );
    expect(silkBox.y + silkBox.height).toBeGreaterThanOrEqual(
      heroBox.y + heroBox.height,
    );

    await expect(handoff).toHaveAttribute("href", "/jak-pracuji/");
    await expect(primaryAction).toHaveAttribute(
      "data-cta-composition",
      "docked",
    );
    await expect(primaryAction.locator("[data-cta-icon-shell]")).toHaveCount(1);
    await expect(handoff).toHaveAttribute("data-variant", "secondary-action");
    await expect(handoff.locator("[data-cta-icon-shell]")).toHaveCount(1);

    const cnbLink = evidence.getByRole("link", {
      name: /Ověřit registraci v registru ČNB/u,
    });
    const sabLink = evidence.getByRole("link", {
      name: /Otevřít dokumentaci SAB servis/u,
    });

    await expect(cnbLink).toHaveAttribute(
      "href",
      "https://jerrs.cnb.cz/apljerrsdad/JERRS.WEB10.VIZITKA?p_lang=cz&p_SEQ_ID=13296729&p_VER_ID=1004&p_DATUM=06.10.2026&p_ROL_KOD=",
    );
    await expect(sabLink).toHaveAttribute(
      "href",
      "https://sabservis.cz/informace",
    );

    for (const link of [cnbLink, sabLink]) {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }

    const certificateLinks = evidence.locator(
      'ul[aria-label="Osvědčení o odborné způsobilosti"] a',
    );
    const expectedCertificates = [
      ["Pojištění", "/pojisteni-cert.pdf"],
      ["Penzijní spoření", "/penzijko-cert.pdf"],
      ["Investice", "/investice-cert.pdf"],
      ["Úvěry", "/uvery-cert.pdf"],
    ] as const;

    await expect(certificateLinks).toHaveCount(expectedCertificates.length);
    for (const [index, [label, href]] of expectedCertificates.entries()) {
      const link = certificateLinks.nth(index);
      await expect(link).toContainText(label);
      await expect(link).toHaveAttribute("href", href);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }

    const clientReview = about
      .locator("[data-about-proof]")
      .getByRole("link", { name: /Google recenzi/u });
    await expect(clientReview).toHaveAttribute(
      "href",
      "https://share.google/w0usRR2Gu4l37n3to",
    );
    await expect(clientReview).toHaveAttribute("target", "_blank");
    await expect(clientReview).toHaveAttribute("rel", "noopener noreferrer");

    const overviewCtas = about.locator('a[href^="/ziskat-prehled/"]');
    await expect(overviewCtas).toHaveCount(2);
    await expect(overviewCtas.nth(0)).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=about&cta=about-hero",
    );
    await expect(overviewCtas.nth(1)).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=about&cta=about-final",
    );
    for (const cta of await overviewCtas.all()) {
      await expect(cta.locator('[data-cta-icon="paper-plane"]')).toHaveCount(1);
      await expect(
        cta.locator(".lucide-arrow-right, .lucide-chevron-right"),
      ).toHaveCount(0);
    }
  });

  test("runs the React Bits silk timeline and switches to its static fallback", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/kdo-jsem/", { waitUntil: "domcontentloaded" });

    const hero = page.locator("[data-about-hero-chapter]");
    const silk = hero.locator(
      '[data-react-bits-silk][data-silk-source="react-bits"]',
    );
    const canvas = silk.locator("canvas[data-react-bits-silk-canvas]");
    const readTime = () => canvas.evaluate((element) => {
      const node = element as HTMLCanvasElement;
      const gl = node.getContext("webgl2") ?? node.getContext("webgl");
      if (!gl) return null;
      const program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
      if (!program) return null;
      const location = gl.getUniformLocation(program, "uTime");
      if (location === null) return null;
      const value = gl.getUniform(program, location);
      return typeof value === "number" ? value : null;
    });

    await expect(silk).toHaveAttribute("data-state", "ready");
    await expect(hero).toHaveAttribute("data-about-silk-ready", "true");
    await expect.poll(readTime).not.toBeNull();
    const initialTime = (await readTime())!;
    await expect.poll(readTime).toBeGreaterThan(initialTime + 0.04);

    await page.locator("[data-about-manifesto]").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const offscreenTime = (await readTime())!;
    await page.waitForTimeout(500);
    expect(Math.abs((await readTime())! - offscreenTime)).toBeLessThanOrEqual(
      0.002,
    );

    await page.evaluate(() => window.scrollTo({ behavior: "instant", top: 0 }));
    await expect.poll(readTime).toBeGreaterThan(offscreenTime + 0.02);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(silk).toHaveAttribute("data-state", "static");
    await expect(canvas).toHaveCSS("display", "none");
    await expect(hero).not.toHaveAttribute("data-about-silk-ready", "true");
  });

  test("activates the desktop manifesto without creating a pinned scene", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/kdo-jsem/", { waitUntil: "domcontentloaded" });

    const about = page.locator("[data-about-page]");
    const controller = about.locator("[data-about-motion]");
    const manifesto = about.locator("[data-about-manifesto]");
    const principles = manifesto.locator("[data-about-principle]");

    await expect(controller).toHaveAttribute("data-state", "ready");
    await expect(manifesto).toHaveAttribute("data-active-principle", "1");
    await expect(manifesto).toHaveAttribute(
      "data-active-layer",
      "foundation",
    );
    await expect(manifesto.locator("[data-about-diagram]")).toHaveCount(0);
    await expect(principles.first()).toHaveAttribute(
      "data-about-principle-state",
      "active",
    );
    await expect(page.locator(".pin-spacer, [data-pin-spacer]")).toHaveCount(0);
    await expect(manifesto).not.toHaveCSS("position", "fixed");

    const finalPrincipleTop = await principles.last().evaluate((principle) => {
      const rect = principle.getBoundingClientRect();
      return window.scrollY + rect.top - window.innerHeight * 0.5;
    });
    await scrollImmediately(page, finalPrincipleTop);

    await expect(manifesto).toHaveAttribute("data-active-principle", "3");
    await expect(manifesto).toHaveAttribute("data-active-layer", "whole");
    await expect(principles.last()).toHaveAttribute(
      "data-about-principle-state",
      "active",
    );
    await expect(page.locator(".pin-spacer, [data-pin-spacer]")).toHaveCount(0);
  });

  test("reveals the mobile manifesto in natural flow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/kdo-jsem/", { waitUntil: "domcontentloaded" });

    const about = page.locator("[data-about-page]");
    const controller = about.locator("[data-about-motion]");
    const manifesto = about.locator("[data-about-manifesto]");
    const principles = manifesto.locator("[data-about-principle]");

    await expect(controller).toHaveAttribute("data-state", "ready");
    await expect(controller).toHaveAttribute("data-profile", "compact");
    await expect(manifesto).toHaveAttribute("data-active-principle", "all");
    await expect(manifesto).toHaveAttribute("data-active-layer", "whole");
    await expect(manifesto.locator("[data-about-diagram]")).toHaveCount(0);
    await expect(principles).toHaveCount(3);

    const principleState = await principles.evaluateAll((items) =>
      items.map((item) => ({
        opacity: getComputedStyle(item).opacity,
        state: item.getAttribute("data-about-principle-state"),
        top: item.getBoundingClientRect().top + window.scrollY,
        visibility: getComputedStyle(item).visibility,
      })),
    );
    expect(principleState.map(({ state }) => state)).toEqual([
      "visible",
      "visible",
      "visible",
    ]);
    expect(principleState.every(({ opacity }) => opacity === "1")).toBe(true);
    expect(principleState.every(({ visibility }) => visibility === "visible")).toBe(
      true,
    );
    expect(principleState.map(({ top }) => top)).toEqual(
      [...principleState.map(({ top }) => top)].sort((left, right) => left - right),
    );
    await expect(page.locator(".pin-spacer, [data-pin-spacer]")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    for (const scene of [
      { name: "manifesto", selector: "[data-about-principle]", count: 3 },
      { name: "agreement", selector: "[data-about-agreement-row]", count: 4 },
    ]) {
      test(`reveals ${scene.name} rows with staged depth at ${viewport.width}px`, async ({ page }, testInfo) => {
        test.setTimeout(90_000);
        await page.setViewportSize(viewport);
        await page.goto("/kdo-jsem/", { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator("[data-about-motion]")).toHaveAttribute("data-state", "ready");
        await expect(page.locator("[data-unified-reveal-engine]")).toHaveAttribute("data-state", "ready");
        const rows = page.locator(scene.selector);
        await expect(rows).toHaveCount(scene.count);
        const align = async (index: number, fraction: number) => {
          const top = await rows.nth(index).evaluate((row, at) =>
            window.scrollY + row.getBoundingClientRect().top - window.innerHeight * at,
          fraction);
          await scrollImmediately(page, top);
        };
        const read = (index: number) => rows.nth(index).evaluate((row) => {
          const pose = (element: Element) => {
            const style = getComputedStyle(element);
            const matrix = new DOMMatrixReadOnly(style.transform === "none" ? undefined : style.transform);
            return {
              opacity: Number(style.opacity), y: matrix.m42, scaleX: matrix.m11,
              tilt: Math.abs(matrix.m23) + Math.abs(matrix.m32),
            };
          };
          return {
            parent: pose(row),
            rule: pose(row.querySelector("[data-route-reveal-rule]")!),
            title: pose(row.querySelector('[data-route-reveal-item="title"]')!),
            parts: [...row.querySelectorAll("[data-route-reveal-item]")].map(pose),
          };
        });
        const complete = (row: Awaited<ReturnType<typeof read>>) =>
          row.parent.opacity === 1 && Math.abs(row.parent.y) < 0.1 && row.rule.scaleX > 0.99 &&
          row.parts.length >= 4 && row.parts.every((part) =>
            part.opacity > 0.99 && Math.abs(part.y) < 0.2 && part.tilt < 0.005,
          );

        for (let index = 0; index < scene.count; index += 1) {
          await expect(rows.nth(index)).not.toHaveAttribute("data-route-reveal-item");
          const heading = rows.nth(index).locator("h3");
          await expect(heading).toHaveAccessibleName((await heading.textContent())!);
          await align(index, 1.08);
          await expect.poll(async () => {
            const row = await read(index);
            return row.rule.scaleX < 0.25 && row.title.opacity < 0.02 && row.title.y > 30;
          }).toBe(true);

          await align(index, 0.84);
          await expect.poll(async () => {
            const row = await read(index);
            return row.parent.opacity === 1 && Math.abs(row.parent.y) < 0.1 &&
              row.title.opacity > 0.15 && row.title.y > 3 && row.title.tilt > 0.01 &&
              row.rule.scaleX > 0.4 && row.parts.some((part) => part.opacity < 0.98);
          }).toBe(true);

          await align(index, 0.75);
          await expect.poll(async () => (await read(index)).parts.every((part) => part.opacity > 0.95)).toBe(true);
          await align(index, 0.55);
          await expect.poll(async () => complete(await read(index))).toBe(true);
          for (let previous = 0; previous < index; previous += 1) {
            expect(complete(await read(previous))).toBe(true);
          }
        }

        await page.screenshot({ path: testInfo.outputPath(`${scene.name}-${viewport.width}-settled.png`) });
        await align(scene.count - 1, 0.84);
        await expect.poll(async () => {
          const row = await read(scene.count - 1);
          return row.title.y > 3 && row.title.tilt > 0.01 && row.title.opacity < 0.99;
        }).toBe(true);
        await align(scene.count - 1, 1.08);
        await expect.poll(async () => (await read(scene.count - 1)).title.opacity < 0.02).toBe(true);
        await expect(page.locator(".pin-spacer, [data-pin-spacer]")).toHaveCount(0);
        await expectNoHorizontalOverflow(page);
      });
    }
  }

  test("composes the mobile hero around a bottom-anchored portrait", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const viewports = [
      { width: 320, height: 720 },
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 430, height: 860 },
      { width: 768, height: 1024 },
    ] as const;

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/kdo-jsem/", { waitUntil: "domcontentloaded" });

      const hero = page.locator("[data-about-hero-chapter]");
      const portrait = hero.locator("[data-about-portrait]");
      const portraitImage = portrait.locator("img");
      const primaryAction = hero.getByRole("link", {
        name: "Zjistit, čím začít",
      });
      const secondaryAction = hero.getByRole("link", {
        name: "Jak spolupráce probíhá",
      });
      const mobileCall = page.locator("[data-mobile-call]");
      const cookieSettings = page.locator("[data-cookie-settings]");

      await expect(hero).toBeVisible();
      await expect(portrait).toHaveCSS("position", "absolute");
      await expect(portrait).toHaveCSS("transform", "none");
      await expect(portrait).toHaveCSS("opacity", "1");
      await expect(primaryAction).toBeVisible();
      await expect(secondaryAction).toBeVisible();
      await expect(mobileCall).toHaveAttribute(
        "data-about-hero-occluded",
        "true",
      );
      await expect(cookieSettings).toHaveAttribute(
        "data-about-hero-occluded",
        "true",
      );
      await expect.poll(() => hero.evaluate((heroElement) => {
        const heroRect = heroElement.getBoundingClientRect();
        const portraitRect = heroElement.querySelector<HTMLElement>(
          "[data-about-portrait]",
        )!.getBoundingClientRect();
        return Math.abs(portraitRect.bottom - heroRect.bottom);
      })).toBeLessThanOrEqual(1);

      const [heroBox, portraitBox, imageBox, primaryBox, secondaryBox] =
        await Promise.all([
          hero.boundingBox(),
          portrait.boundingBox(),
          portraitImage.boundingBox(),
          primaryAction.boundingBox(),
          secondaryAction.boundingBox(),
        ]);

      if (
        !heroBox ||
        !portraitBox ||
        !imageBox ||
        !primaryBox ||
        !secondaryBox
      ) {
        throw new Error("Mobile about hero geometry is unavailable.");
      }

      expect(heroBox.height).toBeGreaterThanOrEqual(
        viewport.height - 64 - 1,
      );
      expect(imageBox.width).toBeGreaterThanOrEqual(viewport.width);
      expect(primaryBox.height).toBeGreaterThanOrEqual(52);
      expect(Math.abs(primaryBox.y - secondaryBox.y)).toBeLessThanOrEqual(1);
      expect(secondaryBox.y + secondaryBox.height).toBeLessThan(
        heroBox.y + heroBox.height,
      );
      await expectNoHorizontalOverflow(page);

      await scrollImmediately(page, heroBox.y + heroBox.height + 8);
      await expect(mobileCall).not.toHaveAttribute(
        "data-about-hero-occluded",
        "true",
      );
      await expect(cookieSettings).not.toHaveAttribute(
        "data-about-hero-occluded",
        "true",
      );
    }
  });

  test("keeps the client proof composition open without a central divider", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/kdo-jsem/", { waitUntil: "domcontentloaded" });

    const proof = page.locator("[data-about-proof]");
    const caption = proof.locator("figcaption");
    const decoration = await proof.evaluate((element) => {
      const proofStyle = getComputedStyle(element);
      const captionStyle = getComputedStyle(
        element.querySelector("figcaption") as HTMLElement,
      );

      return {
        backgroundImage: proofStyle.backgroundImage,
        captionBorderStyle: captionStyle.borderTopStyle,
        captionBorderWidth: Number.parseFloat(captionStyle.borderTopWidth),
      };
    });

    expect(decoration.backgroundImage).toBe("none");
    expect(decoration.captionBorderStyle).not.toBe("none");
    expect(decoration.captionBorderWidth).toBeGreaterThan(0);
    await expect(caption).toBeVisible();
  });

  test("keeps reduced motion static, readable and axe-clean", async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    try {
      await seedCookieConsent(page);
      await page.goto("/kdo-jsem/", { waitUntil: "domcontentloaded" });

      const about = page.locator("[data-about-page]");
      const controller = about.locator("[data-about-motion]");
      const manifesto = about.locator("[data-about-manifesto]");
      const principles = manifesto.locator("[data-about-principle]");
      const revealTargets = about.locator(
        [
          "[data-about-reveal]",
          "[data-route-reveal-item]",
          "[data-about-agreement-eyebrow]",
          "[data-about-agreement-heading]",
          "[data-about-agreement-description]",
          "[data-about-agreement-row]",
        ].join(", "),
      );

      await expect(controller).toHaveAttribute("data-state", "reduced-motion");
      await expect(manifesto).toHaveAttribute("data-active-principle", "all");
      await expect(manifesto).toHaveAttribute("data-active-layer", "whole");
      await expect(manifesto.locator("[data-about-diagram]")).toHaveCount(0);
      await expect(principles).toHaveCount(3);
      expect(
        await principles.evaluateAll((items) =>
          items.map((item) => item.getAttribute("data-about-principle-state")),
        ),
      ).toEqual(["visible", "visible", "visible"]);

      const staticStyles = await revealTargets.evaluateAll((items) =>
        items.map((item) => {
          const style = getComputedStyle(item);
          return {
            opacity: style.opacity,
            transform: style.transform,
            visibility: style.visibility,
          };
        }),
      );
      expect(staticStyles.length).toBeGreaterThan(0);
      expect(
        staticStyles.every(
          ({ opacity, transform, visibility }) =>
            opacity === "1" &&
            transform === "none" &&
            visibility === "visible",
        ),
      ).toBe(true);
      await expect(page.locator(".pin-spacer, [data-pin-spacer]")).toHaveCount(0);
      await expectNoHorizontalOverflow(page);

      const accessibility = await new AxeBuilder({ page })
        .include("[data-about-page]")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(accessibility.violations).toEqual([]);
    } finally {
      await context.close();
    }
  });
});
