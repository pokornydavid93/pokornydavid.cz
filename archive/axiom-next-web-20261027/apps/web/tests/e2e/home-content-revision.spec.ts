import { expect, test, type Locator, type Page } from "@playwright/test";

const situationNotes = [
  {
    ctaLabel: "Zjistit dopad nové sazby",
    heading: "Spočítáme, co nová sazba udělá s vaší splátkou.",
    href:
      "/ziskat-prehled/?source=homepage&intent=housing&topic=mortgage-refixation&cta=situation-mortgage-refixation",
    id: "mortgage-refixation",
    metadata: [
      "Datum konce fixace",
      "Nabídka nové sazby",
      "Dopad na měsíční splátku",
    ],
    routeExplanation:
      "Nejdřív spolu srovnáme termín fixace, nabídku banky a možnosti dalšího postupu.",
    selectorLabel: "Končí mi fixace",
  },
  {
    ctaLabel: "Zjistit bezpečnou splátku",
    heading: "Najdeme bezpečný rámec pro vaše nové bydlení.",
    href:
      "/ziskat-prehled/?source=homepage&intent=housing&topic=mortgage&cta=situation-new-housing",
    id: "new-housing",
    metadata: [
      "Cena nového bydlení",
      "Vlastní zdroje",
      "Bezpečná výše splátky",
    ],
    routeExplanation:
      "Nejdřív spolu srovnáme cenu bydlení, vlastní zdroje, bezpečnou splátku a časový rámec.",
    selectorLabel: "Řeším nové bydlení",
  },
  {
    ctaLabel: "Prověřit pojistné krytí",
    heading: "Prověříme, jestli vaše pojištění chrání to podstatné.",
    href:
      "/ziskat-prehled/?source=homepage&intent=protection&topic=property-insurance&cta=situation-insurance-review",
    id: "insurance-review",
    metadata: [
      "Co je skutečně kryté",
      "Limity a výluky",
      "Cena vzhledem k ochraně",
    ],
    routeExplanation:
      "Nejdřív spolu ujasníme, co má pojištění chránit, a prověříme, zda tomu odpovídá současné krytí.",
    selectorLabel: "Chci prověřit pojištění",
  },
  {
    ctaLabel: "Prověřit ochranu příjmu",
    heading: "Zjistíme, jak chránit příjem vaší domácnosti.",
    href:
      "/ziskat-prehled/?source=homepage&intent=protection&topic=income-protection&cta=situation-income-protection",
    id: "income-protection",
    metadata: [
      "Dopad výpadku příjmu",
      "Rezerva domácnosti",
      "Současná úroveň ochrany",
    ],
    routeExplanation:
      "Nejdřív společně spočítáme, jak by výpadek příjmu ovlivnil domácnost a co už dnes máte pokryté.",
    selectorLabel: "Potřebuji ochránit příjem",
  },
  {
    ctaLabel: "Srovnat rezervu a investice",
    heading: "Nastavíme investice podle vašich cílů, rezervy a času.",
    href:
      "/ziskat-prehled/?source=homepage&intent=future&topic=investments&cta=situation-investing",
    id: "investing",
    metadata: ["Dostupná rezerva", "Investiční horizont", "Dlouhodobé cíle"],
    routeExplanation:
      "Nejdřív oddělíme dostupnou rezervu od peněz určených na dlouhodobé cíle a ujasníme si časový horizont.",
    selectorLabel: "Chci začít investovat",
  },
] as const;

const moduleSelectors = [
  '[data-component="domain-hero"]',
  '[data-home-module="profile"]',
  '[data-home-module="situations"]',
  '[data-home-module="process"]',
  '[data-home-module="references"]',
  '[data-home-module="evidence"]',
  '[data-home-module="insights"]',
  '[data-home-module="faq"]',
  '[data-home-module="final-action"]',
] as const;

const publicHeadingRoutes = [
  "/",
  "/sluzby/",
  "/jak-pracuji/",
  "/kdo-jsem/",
  "/reference/",
  "/clanky/",
  "/pravni-informace/",
  "/osvedceni-a-certifikace/",
  "/ziskat-prehled/",
] as const;

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

async function renderedTextLineCount(locator: Locator) {
  return locator.evaluate((element) => {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
    );
    const lineTops = new Set<number>();
    let textNode = walker.nextNode();

    while (textNode) {
      if (textNode.textContent?.trim()) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        for (const rect of Array.from(range.getClientRects())) {
          if (rect.width > 1 && rect.height > 1) {
            lineTops.add(Math.round(rect.top * 10) / 10);
          }
        }
      }
      textNode = walker.nextNode();
    }

    return lineTops.size;
  });
}

test.describe("homepage content and composition revision", () => {
  test("keeps the hero intact and renders the revised narrative in order", async ({
    page,
    request,
  }) => {
    await primeRejectedConsent(page);
    const response = await request.get("/");
    expect(response.status()).toBe(200);
    const html = await response.text();

    expect(html).not.toContain("FINANČNÍ PORADENSTVÍ BEZ NÁTLAKU");
    expect(html).toContain("Nejhorší finanční rozhodnutí");
    expect(html).toContain("je to, kterému nerozumíte.");
    expect(html).toContain(
      "Pomůžu vám udělat si jasno dřív, než uděláte důležité rozhodnutí.",
    );
    expect(html).toContain("Co právě potřebujete vyřešit?");
    expect(html).toContain("JAK SPOLUPRÁCE PROBÍHÁ");
    expect(html).not.toContain("Jasno už po");
    expect(html).not.toContain("prvním hovoru.");
    expect(html).toContain("CO SI ODNESETE");
    expect(html).toContain(
      "Přehled, díky kterému víte, co dál.",
    );
    expect(html).toContain(
      "Budete rozumět své situaci, prioritám i možnostem — a vědět, který další krok dává smysl právě vám.",
    );
    expect(html).toContain(
      "Nejdřív si uděláme jasno v celé situaci. Teprve potom má smysl seřadit priority, porovnat možnosti a rozhodnout o dalším kroku.",
    );
    for (const line of [
      "Nejdřív vy.",
      "Potom čísla.",
      "Teprve potom plán.",
    ]) {
      expect(html).toContain(line);
    }
    expect(html).toContain(
      "Jsem David Pokorný. Nejdřív chci pochopit, co je pro vás důležité. Pak vám ukážu souvislosti a možnosti, abyste se mohli rozhodnout sami.",
    );
    expect(html).toContain("Co funguje, nechávám být.");
    expect(html).toContain("david-profile-cutout.webp");
    expect(html).toContain('href="/kdo-jsem/"');
    expect(html).not.toContain("Údaj potvrzený pro web");
    expect(html).toContain("Jak spolupráce funguje v praxi.");
    expect(html).toContain("Stačí mi říct, co právě řešíte.");
    expect(html).not.toContain("DOBRÝ PRVNÍ KROK");
    expect(html).not.toContain("CO SPOLU VYŘEŠÍME");

    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("[data-hero-eyebrow]")).toHaveCount(0);
    await expect(page.locator("[data-hero-trust]")).toHaveCount(0);
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.getByRole("heading", {
      level: 1,
      name: "Nejhorší finanční rozhodnutí je to, kterému nerozumíte.",
    })).toBeVisible();
    const profile = page.locator('[data-home-module="profile"]');
    await expect(profile.locator("[data-profile-heading]"))
      .toHaveText("Nejdřív vy. Potom čísla. Teprve potom plán.");
    await expect(profile.locator("[data-profile-introduction]")).toHaveText(
      "Jsem David Pokorný. Nejdřív chci pochopit, co je pro vás důležité. Pak vám ukážu souvislosti a možnosti, abyste se mohli rozhodnout sami.",
    );
    await expect(profile.locator("[data-profile-approach]")).toHaveCount(0);
    await expect(profile.locator('[data-profile-story="context"]')).toHaveCount(0);
    await expect(profile.locator("[data-profile-quote]")).toHaveText(
      "Co funguje, nechávám být.",
    );
    await expect(profile.locator("[data-profile-about-link]"))
      .toHaveAttribute("href", "/kdo-jsem/");
    await expect(profile.locator("[data-profile-about-link]"))
      .toContainText("Jak stavím finanční plán");
    await expect(profile.locator("[data-profile-cta]")).toHaveCount(0);
    await expect(profile.locator("[data-profile-next]")).toHaveCount(0);
    await expect(profile.locator("[data-profile-actions]")).toHaveCount(0);
    await expect(profile).not.toContainText("Osobní finanční plánování");

    const positions: number[] = [];
    for (const selector of moduleSelectors) {
      const section = page.locator(selector);
      await expect(section).toHaveCount(1);
      positions.push(await section.evaluate((element) => {
        let top = 0;
        let current: HTMLElement | null = element as HTMLElement;
        while (current) {
          top += current.offsetTop;
          current = current.offsetParent as HTMLElement | null;
        }
        return top;
      }));
    }
    expect(positions).toEqual(
      [...positions].sort((left, right) => left - right),
    );

    const references = page.locator('[data-home-module="references"]');
    await expect(references.locator("[data-references-cta-stage]")).toHaveCount(1);
    await expect(
      references.locator('[data-analytics-placement="references"]'),
    ).toHaveAccessibleName("Získat přehled");

    const outcome = page.locator('[data-home-module="outcome"]');
    await expect(outcome).toHaveCount(0);
    await expect(page.locator("[data-process-references-reveal]"))
      .toHaveCount(0);

    const situations = page.locator('[data-home-module="situations"]');
    const situationChoices = situations.locator("[data-situation-choice]");
    await expect(situationChoices).toHaveCount(situationNotes.length);
    for (const [index, note] of situationNotes.entries()) {
      await expect(situationChoices.nth(index)).toHaveAccessibleName(
        note.selectorLabel,
      );
    }
    const visibleChoiceText = (await situationChoices.allTextContents())
      .map((label) => label.trim());
    expect(visibleChoiceText).toEqual(
      situationNotes.map(({ selectorLabel }) => selectorLabel),
    );
    expect(visibleChoiceText.join(" ")).not.toMatch(/\b0[1-6]\b/u);
    await expect(situations.getByRole("tablist", {
      name: "Vyberte finanční situaci",
    })).toHaveAttribute("aria-orientation", "vertical");
    await expect(situations.locator("[data-situation-detail-viewport]"))
      .toHaveCount(1);
    await expect(situations.locator(
      "[data-situation-accordion-disclosure]",
    )).toHaveCount(0);
    await expect(situations.locator(
      '[data-situation-panel="mortgage-refixation"]',
    )).toHaveAttribute("data-active", "true");
    await expect(situations.locator(
      '[data-situation-panel][data-active="true"]',
    )).toHaveCount(1);
    await expect(situations.locator("[data-situation-panel][inert]"))
      .toHaveCount(situationNotes.length - 1);
    const situationPanelsText = (await situations
      .locator("[data-situation-panel]")
      .allTextContents())
      .join(" ");
    expect(situationPanelsText).not.toContain(
      "Kopie dokumentů mi přes formulář neposílejte.",
    );
    expect(situationPanelsText).not.toContain("Zdravotní údaje neposílejte.");
    expect(situationPanelsText).not.toContain(
      "Konkrétní částky zatím zadávat nemusíte.",
    );
    await expect(situations.locator("[data-situation-shared-microcopy]"))
      .toHaveCount(0);
    await expect(situations.locator("[data-custom-situation-link]"))
      .toHaveAttribute(
        "href",
        "/sluzby/",
      );
    await situations.scrollIntoViewIfNeeded();
    await expect(situations).toHaveAttribute(
      "data-situation-entry-state",
      "complete",
    );
    await situationChoices
      .filter({ hasText: "Chci prověřit pojištění" })
      .click();
    await expect(situations.locator(
      '[data-situation-panel="insurance-review"]',
    )).toHaveAttribute("data-active", "true");
    await expect(situations.locator(
      '[data-situation-panel="insurance-review"] h3',
    )).toHaveText(situationNotes[2].heading);
    await expect(situations.locator(
      '[data-situation-panel][data-active="true"]',
    )).toHaveCount(1);
    await expect(situations.locator('[data-situation-id="plan"]')).toHaveCount(0);
    const orientation = situations.locator("[data-orientation-surface]");
    await expect(orientation).toContainText(
      "Když nevíte, kde začít, začneme přehledem.",
    );
    expect(await orientation.innerText()).not.toMatch(/\b06\b/u);

    const finalAction = page.locator('[data-home-module="final-action"]');
    await expect(finalAction).not.toContainText("PRVNÍ KONTAKT");
    await expect(finalAction.locator(
      '[data-analytics-placement="final"]',
    )).toHaveAttribute(
      "href",
      "/ziskat-prehled/?source=homepage&cta=home-final",
    );
  });

  test("keeps the revised flow responsive from 320px through desktop", async ({
    page,
  }) => {
    await primeRejectedConsent(page);

    for (const viewport of [
      { width: 320, height: 720 },
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 920, height: 900 },
      { width: 921, height: 900 },
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });

      expect(await page.evaluate(
        () => document.documentElement.scrollWidth
          - document.documentElement.clientWidth,
      )).toBeLessThanOrEqual(1);

      const headingsFit = await page.locator("main h1, main h2").evaluateAll(
        (headings) => headings.every(
          (heading) => heading.scrollWidth <= heading.clientWidth + 1,
        ),
      );
      expect(headingsFit).toBe(true);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const articles = page.locator('[data-home-module="insights"]');
    const articleHeaderTop = await articles.locator("header").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.top + window.scrollY;
    });
    const articleStageTop = await articles.locator(
      "[data-home-articles-stage]",
    ).evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.top + window.scrollY;
    });
    expect(articleStageTop).toBeGreaterThan(articleHeaderTop);

    const situations = page.locator('[data-home-module="situations"]');
    await situations.scrollIntoViewIfNeeded();
    await expect(situations).toHaveAttribute(
      "data-situation-entry-state",
      "complete",
    );
    const actionMetrics = await page.locator(
      '[data-home-module="situations"] a:visible, '
        + '[data-home-module="final-action"] a:visible, '
        + '[data-home-module="faq"] button',
    ).evaluateAll((actions) => actions.map((action) => ({
      height: action.getBoundingClientRect().height,
      label:
        action.getAttribute("aria-label")
        ?? action.textContent?.trim().replace(/\s+/gu, " ")
        ?? action.tagName,
    })));
    for (const { height, label } of actionMetrics) {
      expect(height, `${label} must keep a 44px target`).toBeGreaterThanOrEqual(44);
    }
  });

  test("renders every direct advisor note in one stable natural-height viewport", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 921, height: 900 },
      { width: 920, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);

      const section = page.locator('[data-home-module="situations"]');
      const detailViewport = section.locator(
        "[data-situation-detail-viewport]",
      );
      await expect(detailViewport).toHaveCount(1);
      await expect(section.locator("[data-situation-panel]"))
        .toHaveCount(situationNotes.length);
      await expect(section.locator(
        "[data-situation-accordion-disclosure]",
      )).toHaveCount(0);
      await expect(section.locator("[data-situation-title-line]"))
        .toHaveCount(0);

      const directComposition = await section.evaluate((element) => {
        const ledger = element.querySelector<HTMLElement>(
          "[data-situation-selector]",
        );
        const detail = element.querySelector<HTMLElement>(
          "[data-situation-detail-viewport]",
        );
        const services = element.querySelector<HTMLElement>(
          "[data-situation-custom]",
        );
        return Boolean(
          ledger
          && detail
          && services
          && !ledger.contains(services)
          && !detail.contains(services),
        );
      });
      expect(directComposition).toBe(true);

      let baseline: {
        detailHeight: number;
        panelHeight: number;
        panelStackHeight: number;
        selectorHeight: number;
        servicesTop: number;
      } | undefined;

      for (const item of situationNotes) {
        const choice = section.locator(
          `[data-situation-choice="${item.id}"]`,
        );
        await choice.click();
        await expect(choice).toHaveAttribute("aria-selected", "true");

        const panel = section.locator(`[data-situation-panel="${item.id}"]`);
        await expect(panel).toHaveAttribute("data-active", "true");
        await expect(panel).toHaveAttribute("aria-hidden", "false");
        const heading = panel.locator("h3");

        await expect(heading).toHaveText(item.heading);
        await expect(heading.locator("br")).toHaveCount(0);
        expect(await renderedTextLineCount(heading)).toBeLessThanOrEqual(8);
        expect(await heading.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        )).toBe(true);

        await expect(panel.getByText("Na co se podíváme", { exact: true }))
          .toHaveCount(1);
        await expect(panel.getByRole("listitem"))
          .toHaveText([...item.metadata]);
        await expect(panel.getByText("Jak začneme", { exact: true }))
          .toHaveCount(1);
        await expect(panel.getByText(item.routeExplanation, { exact: true }))
          .toHaveCount(1);

        const action = panel.locator(
          `[data-situation-id="${item.id}"][data-cta-composition="docked"]`,
        );
        await expect(action).toHaveCount(1);
        await expect(action).toHaveText(item.ctaLabel);
        await expect(action).toHaveAttribute("href", item.href);
        await expect(action).toHaveAttribute(
          "data-analytics-destination",
          item.href,
        );
        await expect(action).toHaveAttribute(
          "data-analytics-event",
          "home_situation_select",
        );

        const geometry = await section.evaluate((element, id) => {
          const ledger = element.querySelector<HTMLElement>(
            "[data-situation-selector]",
          )!;
          const rail = element.querySelector<HTMLElement>(
            "[data-situation-choice-rail]",
          )!;
          const detail = element.querySelector<HTMLElement>(
            "[data-situation-detail-viewport]",
          )!;
          const services = element.querySelector<HTMLElement>(
            "[data-situation-custom]",
          )!;
          const activePanel = element.querySelector<HTMLElement>(
            `[data-situation-panel="${id}"]`,
          )!;
          const panels = Array.from(element.querySelectorAll<HTMLElement>(
            "[data-situation-panel]",
          ));
          const panelStack = activePanel.parentElement!;
          const ledgerRect = ledger.getBoundingClientRect();
          const railRect = rail.getBoundingClientRect();
          const detailRect = detail.getBoundingClientRect();
          const panelRect = activePanel.getBoundingClientRect();
          const firstPanelRect = panels[0]!.getBoundingClientRect();

          return {
            detailFits:
              detail.scrollHeight <= detail.clientHeight + 1
              && detail.scrollWidth <= detail.clientWidth + 1,
            detailHeight: detailRect.height,
            panelFits:
              activePanel.scrollHeight <= activePanel.clientHeight + 1
              && activePanel.scrollWidth <= activePanel.clientWidth + 1,
            panelGridStable:
              getComputedStyle(panelStack).display === "grid"
              && panels.every((candidate) => {
                const candidateRect = candidate.getBoundingClientRect();
                return getComputedStyle(candidate).position !== "absolute"
                  && Math.abs(candidateRect.top - firstPanelRect.top) <= 1
                  && Math.abs(candidateRect.left - firstPanelRect.left) <= 1
                  && Math.abs(candidateRect.width - firstPanelRect.width) <= 1;
              }),
            panelHeight: panelRect.height,
            panelStackHeight: panelStack.getBoundingClientRect().height,
            selectorHeight: ledgerRect.height,
            servicesTop: services.getBoundingClientRect().top + window.scrollY,
            split:
              railRect.right <= detailRect.left + 1
              && railRect.top < detailRect.bottom
              && detailRect.top < railRect.bottom,
            stacked:
              railRect.bottom <= detailRect.top + 1,
          };
        }, item.id);

        expect(geometry.detailFits).toBe(true);
        expect(geometry.panelFits).toBe(true);
        expect(geometry.panelGridStable).toBe(true);
        if (viewport.width <= 920) {
          expect(geometry.stacked).toBe(true);
          expect(geometry.split).toBe(false);
        } else {
          expect(geometry.split).toBe(true);
        }

        if (!baseline) {
          baseline = geometry;
        } else {
          for (const key of [
            "detailHeight",
            "panelHeight",
            "panelStackHeight",
            "selectorHeight",
            "servicesTop",
          ] as const) {
            expect(
              Math.abs(geometry[key] - baseline[key]),
              `${viewport.width}px ${key} moved after selecting ${item.id}`,
            ).toBeLessThanOrEqual(1);
          }
        }
      }

      expect(await page.evaluate(
        () => document.documentElement.scrollWidth
          - document.documentElement.clientWidth,
      )).toBeLessThanOrEqual(1);
    }
  });

  test("keeps the situation question primary and the shared note clear of the sticky header", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const viewport of [
      { width: 1588, height: 710 },
      { width: 1440, height: 900 },
      { width: 921, height: 900 },
      { width: 920, height: 900 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "networkidle" });

      const section = page.locator('[data-home-module="situations"]');
      const metrics = await section.evaluate((element) => {
        const header = document.querySelector<HTMLElement>(
          '[data-component="site-header"]',
        );
        const introHeading = element.querySelector<HTMLElement>(
          "[data-situation-title]",
        );
        const activeChoice = element.querySelector<HTMLElement>(
          '[data-situation-choice][aria-selected="true"]',
        );
        const introHeadingBlock = element.querySelector<HTMLElement>(
          "[data-situation-intro-heading]",
        );
        const introCopy = element.querySelector<HTMLElement>(
          "[data-situation-intro-copy]",
        );
        const selector = element.querySelector<HTMLElement>(
          "[data-situation-selector]",
        );
        const choiceRail = element.querySelector<HTMLElement>(
          "[data-situation-choice-rail]",
        );
        const detailViewport = element.querySelector<HTMLElement>(
          "[data-situation-detail-viewport]",
        );
        const activePanel = element.querySelector<HTMLElement>(
          '[data-situation-panel][data-active="true"]',
        );
        const activeHeading = activePanel?.querySelector<HTMLElement>("h3");
        const sectionStyle = getComputedStyle(element);
        const headerStyle = header ? getComputedStyle(header) : null;
        const introStyle = introHeading ? getComputedStyle(introHeading) : null;
        const activeStyle = activeHeading
          ? getComputedStyle(activeHeading)
          : null;
        const introHeadingRect =
          introHeadingBlock?.getBoundingClientRect();
        const introCopyRect = introCopy?.getBoundingClientRect();
        const selectorRect = selector?.getBoundingClientRect();
        const railRect = choiceRail?.getBoundingClientRect();
        const detailRect = detailViewport?.getBoundingClientRect();
        const panelRect = activePanel?.getBoundingClientRect();

        return {
          activeFontSize: Number.parseFloat(activeStyle?.fontSize ?? "0"),
          activePanelFits:
            (activePanel?.scrollHeight ?? 1) <= (activePanel?.clientHeight ?? 0) + 1
            && (activePanel?.scrollWidth ?? 1)
              <= (activePanel?.clientWidth ?? 0) + 1,
          activeSelectionComplete:
            activeChoice?.getAttribute("aria-controls") === activePanel?.id
            && activePanel?.getAttribute("aria-labelledby") === activeChoice?.id,
          headerBlockSize: Number.parseFloat(
            headerStyle?.minBlockSize ?? "0",
          ),
          introFontSize: Number.parseFloat(introStyle?.fontSize ?? "0"),
          paddingTop: Number.parseFloat(sectionStyle.paddingTop),
          scrollMarginTop: Number.parseFloat(
            sectionStyle.scrollMarginTop,
          ),
          introToTabsGap:
            (selectorRect?.top ?? 0)
            - Math.max(
              introHeadingRect?.bottom ?? 0,
              introCopyRect?.bottom ?? 0,
            ),
          panelHasNaturalHeight: (panelRect?.height ?? 0) > 0,
          split:
            (railRect?.right ?? 0) <= (detailRect?.left ?? 0) + 1
            && (railRect?.top ?? 0) < (detailRect?.bottom ?? 0)
            && (detailRect?.top ?? 0) < (railRect?.bottom ?? 0),
          stacked:
            (railRect?.bottom ?? 0) <= (detailRect?.top ?? 0) + 1,
        };
      });

      expect(metrics.introFontSize + 0.5)
        .toBeGreaterThanOrEqual(metrics.activeFontSize);
      expect(metrics.activeSelectionComplete).toBe(true);
      expect(metrics.activePanelFits).toBe(true);
      expect(metrics.panelHasNaturalHeight).toBe(true);
      expect(metrics.paddingTop).toBeGreaterThanOrEqual(70);
      expect(metrics.scrollMarginTop - metrics.headerBlockSize)
        .toBeGreaterThanOrEqual(23);
      expect(metrics.introToTabsGap).toBeGreaterThanOrEqual(32);
      if (viewport.width <= 920) {
        expect(metrics.stacked).toBe(true);
        expect(metrics.split).toBe(false);
      } else {
        expect(metrics.split).toBe(true);
      }

      await section.evaluate((element) => {
        element.scrollIntoView({ behavior: "instant", block: "start" });
      });
      await expect.poll(async () => section.evaluate(
        (element) => Math.round(element.getBoundingClientRect().top),
      )).toBe(Math.round(metrics.scrollMarginTop));
    }
  });

  test("removes decorative prefix rules from public heading eyebrows", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const route of publicHeadingRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });

      const headingPrefixRules = await page.locator("body").evaluate(() => (
        Array.from(document.querySelectorAll<HTMLElement>(
          "h1, h2, h3, h4, p, span",
        )).flatMap((element) => {
          const text = element.textContent?.trim() ?? "";
          const rect = element.getBoundingClientRect();
          const before = getComputedStyle(element, "::before");
          const beforeWidth = Number.parseFloat(before.width);
          const beforeHeight = Number.parseFloat(before.height);
          const hasShortHorizontalRule = before.display !== "none"
            && before.content !== "none"
            && before.content !== "normal"
            && beforeWidth >= 16
            && beforeWidth <= 90
            && beforeHeight > 0
            && beforeHeight <= 5;

          if (
            !text
            || rect.width <= 0
            || rect.height <= 0
            || !hasShortHorizontalRule
          ) {
            return [];
          }

          return [{
            className: element.className,
            text: text.replace(/\s+/gu, " ").slice(0, 90),
          }];
        })
      ));

      expect(headingPrefixRules, `decorative heading rule on ${route}`)
        .toEqual([]);
    }

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const situations = page.locator('[data-home-module="situations"]');
    await expect(situations.locator("[data-situation-eyebrow]")).toHaveText(
      "VÁŠ VÝCHOZÍ BOD",
    );
    await expect(situations.getByText(
      "HYPOTÉKA · KONEC FIXACE",
      { exact: true },
    )).toBeVisible();
  });

  test("removes the former outcome chapter across desktop, tablet, and mobile", async ({
    page,
  }) => {
    await primeRejectedConsent(page);

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1280, height: 800 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "networkidle" });

      await expect(page.locator('[data-home-module="outcome"]')).toHaveCount(0);
      await expect(page.getByRole("heading", {
        name: "Jasno už po prvním hovoru.",
      })).toHaveCount(0);
      await expect(page.locator("[data-process-references-reveal]"))
        .toHaveCount(0);
      await expect(page.locator("[data-process-pin-stage]"))
        .toHaveCount(0);
      await expect(page.locator("[data-process-reveal]"))
        .toHaveAttribute("data-sequence", "scroll-linked");
    }
  });

  test("keeps references directly after process and preserves the final contact", async ({
    page,
  }) => {
    await primeRejectedConsent(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    const process = page.locator('[data-home-module="process"]');
    const references = page.locator('[data-home-module="references"]');
    const finalAction = page.locator('[data-home-module="final-action"]');

    await expect(page.locator("[data-process-references-reveal]")).toHaveCount(0);
    await expect(page.locator("[data-process-references-flow]")).toHaveCount(0);
    await expect(page.locator("[data-process-pin-stage]")).toHaveCount(0);
    await expect(references).toHaveAttribute("data-surface-role", "paper");
    await expect(references).toHaveAttribute("data-surface-tone", "light");
    await expect(page.locator('[data-home-module="outcome"]')).toHaveCount(0);

    const boundary = await page.evaluate(() => {
      const processSection = document.querySelector<HTMLElement>(
        '[data-home-module="process"]',
      )!;
      const referencesSection = document.querySelector<HTMLElement>(
        '[data-home-module="references"]',
      )!;
      return {
        processBottom: processSection.offsetTop + processSection.offsetHeight,
        referencesTop: referencesSection.offsetTop,
      };
    });
    expect(Math.abs(boundary.referencesTop - boundary.processBottom))
      .toBeLessThanOrEqual(1);
    await process.scrollIntoViewIfNeeded();
    await expect(references).toHaveCSS("clip-path", "none");

    await finalAction.scrollIntoViewIfNeeded();
    await expect(finalAction.getByRole("heading", { level: 2 })).toBeVisible();
    await expect(finalAction.getByRole("link")).toBeVisible();
    await expect(finalAction.locator("canvas")).toHaveCount(0);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-process-references-reveal]")).toHaveCount(0);
    await expect(page.locator("[data-process-reveal]")).toHaveAttribute(
      "data-state",
      "reduced-motion",
    );
    await expect(page.locator('[data-home-module="references"]')).toHaveCSS(
      "clip-path",
      "none",
    );
  });
});
