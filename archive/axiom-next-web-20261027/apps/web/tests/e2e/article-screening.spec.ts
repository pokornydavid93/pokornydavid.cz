import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const articles = [
  {
    slug: "zdrazilo-vam-pojisteni",
    title: "Ujasněte si, co ve smlouvě prověřit",
    questions: 5,
  },
  {
    slug: "chcete-investovat-zacnete-planem",
    title: "Ujasněte si, co ve svém investičním plánu prověřit",
    questions: 5,
  },
  {
    slug: "mate-pojisteni-prijmu-nebo-jen-pocit",
    title: "Ujasněte si, co v ochraně příjmu prověřit",
    questions: 6,
  },
] as const;

function action(tool: Locator, name: string) {
  return tool.locator(`[data-screening-action="${name}"]`);
}

async function expectPhase(tool: Locator, phase: string) {
  await expect(tool).toHaveAttribute("data-screening-phase", phase);
  await expect(tool.getByRole("heading", { level: 3 })).toHaveCount(1);
  await expect(tool.getByRole("heading", { level: 3 })).toBeFocused();
}

async function expectAccessibleTool(page: Page) {
  const accessibility = await new AxeBuilder({ page })
    .include("#screening")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
}

async function openScreening(page: Page, slug: string) {
  await page.goto(`/clanky/${slug}/`);
  await page.waitForLoadState("networkidle");
  const consent = page.getByRole("region", { name: "Nastavení cookies" });
  if (await consent.count()) {
    await consent.getByRole("button", { name: "Nesouhlasím", exact: true }).click();
    await expect(consent).toBeHidden();
  }
  return page.locator("#screening");
}

for (const article of articles) {
  test(`${article.slug}: one question at a time leads to a useful review before optional contact`, async ({ page }) => {
    const postRequests: string[] = [];
    await page.route("**/*", async (route) => {
      if (route.request().method() === "POST") {
        postRequests.push(route.request().url());
        await route.abort();
      } else {
        await route.continue();
      }
    });
    if (article.slug === "zdrazilo-vam-pojisteni") {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
    }
    const tool = await openScreening(page, article.slug);
    await expect(tool.getByRole("heading", { level: 3 })).toHaveText(article.title);
    await expect(tool.locator("fieldset")).toHaveCount(0);
    await action(tool, "start").click();
    await expectPhase(tool, "questions");
    await expect(tool.getByRole("heading", { level: 3 })).not.toHaveText(article.title);
    await expect(tool.getByRole("progressbar")).toHaveAttribute("aria-valuemax", String(article.questions));
    await expect(tool.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    await expect(tool.getByRole("progressbar")).toHaveAttribute("aria-valuetext", `Otázka 1 z ${article.questions}`);
    await expect(tool.locator("fieldset")).toHaveCount(1);

    // Missing answers keep the visitor at the current question and identify its control.
    await action(tool, "next").click();
    await expect(tool.getByRole("alert")).toContainText("Vyberte");
    await expect(tool.locator('input[type="radio"]').first()).toBeFocused();

    for (let question = 0; question < article.questions; question += 1) {
      await expect(tool.locator("fieldset")).toHaveCount(1);
      await expect(tool.getByRole("progressbar")).toHaveAttribute("aria-valuetext", `Otázka ${question + 1} z ${article.questions}`);
      const field = tool.locator("fieldset");
      const choices = field.locator('input[type="radio"], input[type="checkbox"]');
      const firstChoice = choices.first();
      const currentHeading = await tool.getByRole("heading", { level: 3 }).textContent();
      await firstChoice.check();
      await expect(firstChoice).toBeChecked();
      // Choosing a radio cannot unexpectedly replace the question.
      await expect(tool.getByRole("heading", { level: 3 })).toHaveText(currentHeading ?? "");
      await expect(tool).toHaveAttribute("data-screening-phase", "questions");

      if (await field.getByRole("checkbox").count() > 1) {
        await expect(field).toContainText("Můžete vybrat více možností");
        await choices.nth(1).check();
        await expect(firstChoice).toBeChecked();
        await expect(choices.nth(1)).toBeChecked();
      }

      if (question === 0) {
        // Native options follow a simple vertical reading and keyboard order.
        const optionRows = field.locator("label");
        const firstBounds = await optionRows.first().boundingBox();
        const secondBounds = await optionRows.nth(1).boundingBox();
        expect(firstBounds).not.toBeNull();
        expect(secondBounds).not.toBeNull();
        expect(secondBounds!.y).toBeGreaterThanOrEqual(firstBounds!.y + firstBounds!.height - 1);
        await firstChoice.focus();
        await page.keyboard.press("ArrowDown");
        await expect(choices.nth(1)).toBeChecked();
        await expect(tool.getByRole("heading", { level: 3 })).toHaveText(currentHeading ?? "");

        await action(tool, "close").click();
        await expect(tool).toHaveAttribute("data-screening-phase", "intro");
        await expect(action(tool, "start")).toBeFocused();
        await action(tool, "start").click();
        await expectPhase(tool, "questions");
        await expect(choices.nth(1)).toBeChecked();
        await expect(tool.getByRole("heading", { level: 3 })).toHaveText(currentHeading ?? "");
        await expectAccessibleTool(page);
      }

      if (question === 1) {
        // Moving back retains both the earlier answer and this question's answer.
        await action(tool, "back").click();
        await expectPhase(tool, "questions");
        await expect(tool.locator('input[type="radio"]').nth(1)).toBeChecked();
        await action(tool, "next").click();
        await expectPhase(tool, "questions");
        await expect(firstChoice).toBeChecked();
        await expect(tool.getByRole("heading", { level: 3 })).toHaveText(currentHeading ?? "");
      }

      await action(tool, "next").click();
      if (question < article.questions - 1) {
        await expectPhase(tool, "questions");
        await expect(tool.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(question + 1));
      }
    }

    await expectPhase(tool, "review");
    await expect(tool.locator("fieldset")).toHaveCount(0);
    const review = tool.locator("[data-screening-review]");
    const priorityItems = review.locator("[data-screening-primary-review] details");
    await expect(priorityItems).toHaveCount(3);
    await expect(priorityItems.first().locator("summary")).toBeVisible();
    await expect(priorityItems.first()).not.toHaveAttribute("open", "");
    await priorityItems.first().locator("summary").click();
    await expect(priorityItems.first()).toHaveAttribute("open", "");
    await priorityItems.first().locator("summary").click();
    await expect(priorityItems.first()).not.toHaveAttribute("open", "");
    const extraReview = review.locator("details[data-screening-extra-review]");
    if (await extraReview.count()) {
      await expect(extraReview).not.toHaveAttribute("open", "");
      await extraReview.locator(":scope > summary").click();
      await expect(extraReview).toHaveAttribute("open", "");
      await extraReview.locator(":scope > summary").click();
    }
    await expect(tool.locator('input[type="email"]')).toHaveCount(0);
    await expect(tool).not.toContainText("Stačí klidná kontrola ceny");
    await expectAccessibleTool(page);

    // Closing a finished review and reopening it must not restart the questionnaire.
    await action(tool, "close").click();
    await expect(tool).toHaveAttribute("data-screening-phase", "intro");
    await expect(action(tool, "start")).toBeFocused();
    await expect(action(tool, "start")).toContainText("Zobrazit přehled");
    await action(tool, "start").click();
    await expectPhase(tool, "review");

    const savedAnswers = tool.locator("details[data-screening-answers]");
    await savedAnswers.locator(":scope > summary").click();
    await expect(savedAnswers).toHaveAttribute("open", "");
    const editFirst = savedAnswers.locator('[data-screening-action="edit"][data-screening-question="0"]');
    await expect(editFirst).toBeVisible();
    await editFirst.click();
    await expectPhase(tool, "questions");
    await expect(tool.locator('input[type="radio"]').nth(1)).toBeChecked();
    await tool.locator('input[type="radio"]').first().check();
    await action(tool, "next").click();
    await expectPhase(tool, "review");

    await action(tool, "contact").click();
    await expectPhase(tool, "contact");
    await expect(tool.locator('input[type="email"]')).toBeVisible();
    await expectAccessibleTool(page);
    await action(tool, "submit").click();
    await expect(tool.locator('[aria-invalid="true"]').first()).toBeFocused();
    expect(postRequests).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
      .toBeLessThanOrEqual(1);
  });
}

test("insurance review follows selected goals and refreshes notice-dependent copy after edits", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const tool = await openScreening(page, "zdrazilo-vam-pojisteni");
  await action(tool, "start").click();

  for (const [questionId, answer, multiple] of [
    ["insuranceType", "Nemovitost", false],
    ["priceNotice", "Oznámení ještě nepřišlo", false],
    ["lastReview", "Před více lety", false],
    ["coverageFit", "Nevím", false],
    ["insuranceNeed", "Ověřit hodnotu majetku", true],
  ] as const) {
    await expectPhase(tool, "questions");
    const choice = tool.getByRole(multiple ? "checkbox" : "radio", { name: answer, exact: true });
    await expect(choice).toHaveAttribute("name", new RegExp(`-${questionId}$`));
    if (questionId === "coverageFit") {
      await expect(tool.locator("fieldset")).toHaveAccessibleDescription(/Pokud vaše pojištění s hodnotou majetku nepracuje/);
    }
    await choice.check();
    await action(tool, "next").click();
  }

  await expectPhase(tool, "review");
  const primary = tool.locator("[data-screening-primary-review] [data-screening-review-item]");
  const item = (id: string) => tool.locator(`[data-screening-review-item="${id}"]`);
  await expect(primary.first()).toHaveAttribute("data-screening-review-item", "property-value");
  await expect(primary.first().locator("summary")).toBeVisible();
  await expect(item("price").locator("summary")).toContainText("Novou cenu doplníte, až přijde oznámení.");
  await expect(item("current-documents").locator("summary")).toContainText("Nové oznámení přidáte, až ho obdržíte.");

  const editAnswer = async (questionIndex: number) => {
    const savedAnswers = tool.locator("details[data-screening-answers]");
    await savedAnswers.locator(":scope > summary").click();
    await savedAnswers.locator(`[data-screening-action="edit"][data-screening-question="${questionIndex}"]`).click();
    await expectPhase(tool, "questions");
  };

  await editAnswer(1);
  await expect(tool.getByRole("radio", { name: "Oznámení ještě nepřišlo", exact: true })).toBeChecked();
  await tool.getByRole("radio", { name: "Vyšší než minule", exact: true }).check();
  await action(tool, "next").click();
  await expectPhase(tool, "review");
  await expect(primary.first()).toHaveAttribute("data-screening-review-item", "property-value");
  await expect(item("price").locator("summary")).toContainText("Cena za stejné období");
  await expect(item("price").locator("summary")).toContainText("Porovnejte původní a nové pojistné");
  await expect(item("price")).not.toContainText("až přijde oznámení");
  await expect(item("current-documents").locator("summary")).toContainText("poslední oznámení o pojistném");
  await expect(item("current-documents")).not.toContainText("až ho obdržíte");

  await editAnswer(4);
  await tool.getByRole("checkbox", { name: "Ověřit hodnotu majetku", exact: true }).uncheck();
  await tool.getByRole("checkbox", { name: "Prověřit krytí a výluky", exact: true }).check();
  await action(tool, "next").click();
  await expectPhase(tool, "review");
  await expect(primary.first()).toHaveAttribute("data-screening-review-item", "coverage");
  await expect(primary.first().locator("summary")).toBeVisible();

  await editAnswer(4);
  for (const choice of await tool.getByRole("checkbox").all()) await choice.check();
  await action(tool, "next").click();
  await expectPhase(tool, "review");
  await expect(primary).toHaveCount(4);
  expect(await primary.evaluateAll((items) => items.map((item) => item.getAttribute("data-screening-review-item"))))
    .toEqual(["price", "coverage", "limits-deductible", "property-value"]);
  for (const summary of await primary.locator("summary").all()) await expect(summary).toBeVisible();
  await expect(tool.locator("[data-screening-extra-review] [data-screening-review-item]"))
    .toHaveAttribute("data-screening-review-item", "current-documents");
  await expect(tool.locator("[data-screening-review-item]")).toHaveCount(5);
  await expectAccessibleTool(page);
});

const incomeReviewPaths = [
  {
    name: "business costs without an existing policy",
    answers: [
      "Jsem hlavní živitel/ka",
      ["Hypotéku", "Péči o děti nebo jiné blízké", "Náklady podnikání"],
      "Nemám nic",
      "Pojištění nemám",
      "Méně než 1 měsíc",
      ["Jestli neplatím za zbytečnosti", "Chci tomu konečně rozumět"],
    ],
    primary: ["policy", "cost-benefit", "commitments"],
  },
  {
    name: "uncertain coverage and two household incomes",
    answers: [
      "Příjmy máme dva podobné",
      ["Nájem", "Péči o děti nebo jiné blízké"],
      "Ano, ale nevím přesně co kryje",
      "Nevím",
      "Nemám spočítáno",
      ["Jestli nechybí invalidita nebo nemoc"],
    ],
    primary: ["missing-coverage", "commitments", "reserve"],
  },
  {
    name: "all goals with known coverage and no commitments",
    answers: [
      "Můj příjem je doplňkový",
      ["Nemám takové závazky"],
      "Ano, pravidelně ho kontroluji",
      "Invaliditu i závažná onemocnění",
      "Více než 6 měsíců",
      [
        "Jestli pojistka pokryje výdaje",
        "Jestli jsou pojistné částky dostatečné",
        "Jestli nechybí invalidita nebo nemoc",
        "Jestli neplatím za zbytečnosti",
        "Chci tomu konečně rozumět",
      ],
    ],
    primary: ["expenses", "policy", "amounts", "missing-coverage", "cost-benefit"],
  },
] as const;

for (const width of [390, 1440]) {
  for (const scenario of incomeReviewPaths) {
    test(`income review: ${scenario.name} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const screeningPosts: string[] = [];
      await page.route("**/api/article-screening", async (route) => {
        if (route.request().method() === "POST") {
          screeningPosts.push(route.request().url());
          await route.abort();
        } else await route.continue();
      });
      const tool = await openScreening(page, "mate-pojisteni-prijmu-nebo-jen-pocit");
      await expect(tool).toContainText("bez zadání kontaktu");
      await expect(tool).not.toContainText("pojištění domácnosti");
      await action(tool, "start").focus();
      await action(tool, "start").press("Enter");

      for (const [index, answer] of scenario.answers.entries()) {
        await expectPhase(tool, "questions");
        await expect(tool.getByRole("progressbar")).toHaveAttribute("aria-valuetext", `Otázka ${index + 1} z 6`);
        if (typeof answer === "string") {
          await tool.getByRole("radio", { name: answer, exact: true }).check();
        } else {
          for (const choice of answer) await tool.getByRole("checkbox", { name: choice, exact: true }).check();
          if (index === 1 && scenario.name === "business costs without an existing policy") {
            const none = tool.getByRole("checkbox", { name: "Nemám takové závazky", exact: true });
            const unknown = tool.getByRole("checkbox", { name: "Nevím, co všechno započítat", exact: true });
            await none.check();
            for (const choice of answer) await expect(tool.getByRole("checkbox", { name: choice, exact: true })).not.toBeChecked();
            await unknown.check();
            await expect(none).not.toBeChecked();
            for (const choice of answer) await tool.getByRole("checkbox", { name: choice, exact: true }).check();
            await expect(unknown).not.toBeChecked();
            await expect(none).not.toBeChecked();
            for (const choice of answer) await expect(tool.getByRole("checkbox", { name: choice, exact: true })).toBeChecked();
          }
        }
        await action(tool, "next").click();
      }

      await expectPhase(tool, "review");
      const primary = tool.locator("[data-screening-primary-review] [data-screening-review-item]");
      await expect(primary).toHaveCount(scenario.primary.length);
      expect(await primary.evaluateAll((items) => items.map((item) => item.getAttribute("data-screening-review-item"))))
        .toEqual(scenario.primary);
      const allItems = tool.locator("[data-screening-review-item]");
      const itemIds = await allItems.evaluateAll((items) => items.map((item) => item.getAttribute("data-screening-review-item")));
      expect(new Set(itemIds).size).toBe(itemIds.length);
      const reviewItem = (id: string) => tool.locator(`[data-screening-review-item="${id}"]`);

      if (scenario.name === "business costs without an existing policy") {
        await expect(reviewItem("policy")).toContainText("Podmínky případné nové ochrany");
        await expect(reviewItem("amounts")).toContainText("Kolik by při výpadku chybělo");
        await expect(reviewItem("missing-coverage")).toContainText("Rozsah případné nové ochrany");
        await expect(reviewItem("cost-benefit")).toContainText("Cena případné nové ochrany");
        await expect(reviewItem("commitments")).toContainText("náklady podnikání");
      } else if (scenario.name === "uncertain coverage and two household incomes") {
        await expect(reviewItem("expenses")).toContainText("druhý příjem");
      } else {
        await expect(tool.locator("[data-screening-extra-review]")).toHaveCount(0);
        await expect(reviewItem("commitments")).toHaveCount(0);
        await expect(reviewItem("missing-coverage")).not.toContainText("nemáte jistotu");
        await expect(reviewItem("expenses")).toContainText("doplňkového příjmu");
      }

      const firstDetail = primary.first().locator("details");
      await firstDetail.locator("summary").focus();
      await firstDetail.locator("summary").press("Enter");
      await expect(firstDetail.locator("p")).toBeVisible();
      await expect(firstDetail.locator("p")).not.toBeEmpty();
      if (scenario.name === "all goals with known coverage and no commitments") await expectAccessibleTool(page);
      await action(tool, "contact").click();
      await expectPhase(tool, "contact");
      await expect(tool.getByRole("heading", { level: 3 })).toHaveText("Domluvme kontrolu ochrany příjmu");
      await expect(tool).toContainText("Nechte mi kontakt. Ozvu se");
      expect(screeningPosts).toEqual([]);
      expect(await page.evaluate(() => document.scrollingElement!.scrollWidth - document.documentElement.clientWidth))
        .toBeLessThanOrEqual(1);
    });
  }
}

const investmentReviewPaths = [
  {
    name: "beginner with a short horizon and every goal",
    answers: [
      "Nejdřív doplnit finanční rezervu",
      "Do 3 let",
      "Zatím neinvestuji",
      "Zatím jsem investice nevybíral/a",
      [
        "Zjistit, jestli investuji dostatečnou částku",
        "Ověřit, jestli moje investice odpovídají cíli",
        "Zjednodušit více různých produktů",
        "Nastavit jasnou dlouhodobou strategii",
        "Snížit chaos a emoce při rozhodování",
        "Začít investovat, ale bezpečněji a s plánem",
      ],
    ],
    primary: ["near-term", "goal", "monthly-contribution", "overview", "strategy", "decision-rules", "starting-plan"],
  },
  {
    name: "regular investor checking the monthly amount",
    answers: [
      "Budování majetku",
      "Více než 15 let",
      "Ano, pravidelně investuji",
      "Podle finančního plánu",
      ["Zjistit, jestli investuji dostatečnou částku"],
    ],
    primary: ["monthly-contribution", "decision-rules", "goal"],
  },
  {
    name: "uncertain products and horizon with several goals",
    answers: [
      "Zatím nevím přesně",
      "Nejsem si jistý/jistá",
      "Nevím, jestli se to dá považovat za investice",
      "Podle internetu / sociálních sítí",
      ["Zjednodušit více různých produktů", "Nastavit jasnou dlouhodobou strategii", "Snížit chaos a emoce při rozhodování"],
    ],
    primary: ["overview", "strategy", "decision-rules"],
  },
] as const;

for (const width of [390, 1440]) {
  for (const scenario of investmentReviewPaths) {
    test(`investment review: ${scenario.name} at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const screeningPosts: string[] = [];
      const browserErrors: string[] = [];
      page.on("pageerror", (error) => browserErrors.push(error.message));
      await page.route("**/api/article-screening", async (route) => {
        if (route.request().method() === "POST") {
          screeningPosts.push(route.request().url());
          await route.abort();
        } else await route.continue();
      });
      const tool = await openScreening(page, "chcete-investovat-zacnete-planem");
      await expect(tool).toContainText("bez zadání kontaktu");
      await action(tool, "start").focus();
      await action(tool, "start").press("Enter");

      for (const [index, answer] of scenario.answers.entries()) {
        await expectPhase(tool, "questions");
        await expect(tool.getByRole("progressbar")).toHaveAttribute("aria-valuetext", `Otázka ${index + 1} z 5`);
        if (typeof answer === "string") {
          const choice = tool.getByRole("radio", { name: answer, exact: true });
          await choice.focus();
          await choice.press("Space");
          await expect(choice).toBeChecked();
        } else {
          for (const choice of answer) await tool.getByRole("checkbox", { name: choice, exact: true }).check();
        }
        if (index === 3 && scenario.name === "beginner with a short horizon and every goal") {
          await tool.screenshot({ path: testInfo.outputPath("beginner-selection-question.png") });
        }
        await action(tool, "next").click();
      }

      await expectPhase(tool, "review");
      const primary = tool.locator("[data-screening-primary-review] [data-screening-review-item]");
      await expect(primary).toHaveCount(scenario.primary.length);
      expect(await primary.evaluateAll((items) => items.map((item) => item.getAttribute("data-screening-review-item"))))
        .toEqual(scenario.primary);
      for (const item of await primary.all()) await expect(item.locator("summary")).toBeVisible();
      const reviewItem = (id: string) => tool.locator(`[data-screening-review-item="${id}"]`);
      const itemIds = await tool.locator("[data-screening-review-item]").evaluateAll((items) =>
        items.map((item) => item.getAttribute("data-screening-review-item")));
      expect(new Set(itemIds).size).toBe(itemIds.length);
      await expect(tool.locator('input[type="email"]')).toHaveCount(0);

      if (scenario.name === "beginner with a short horizon and every goal") {
        await expect(primary.first()).toContainText("Rezerva a blízké výdaje");
        await expect(reviewItem("goal")).toContainText("Cíl před výběrem investice");
        await expect(reviewItem("overview")).toContainText("Zatím nemáte investice ke slučování");
        await expect(reviewItem("risk-costs")).toContainText("Rizika a náklady případné nabídky");
        await expect(reviewItem("starting-plan")).toContainText("Podklady před první investicí");
        await expect(tool.locator("[data-screening-review]")).not.toContainText("Připravte poslední výpisy");
        await expectAccessibleTool(page);
      } else if (scenario.name === "regular investor checking the monthly amount") {
        await expect(reviewItem("monthly-contribution")).toContainText("po nutných výdajích a doplňování rezervy");
        await expect(reviewItem("decision-rules")).toContainText("pravidla pro jeho kontrolu a změny");
      } else {
        await expect(reviewItem("overview")).toContainText("Co už máte a k čemu to slouží");
        await expect(reviewItem("decision-rules")).toContainText("zdroj a ověřitelné podklady");
        await expect(reviewItem("horizon")).toContainText("nejbližší možný termín");
      }

      await tool.screenshot({ path: testInfo.outputPath("review.png") });
      const firstDetail = primary.first().locator("details");
      await firstDetail.locator("summary").focus();
      await firstDetail.locator("summary").press("Enter");
      await expect(firstDetail.locator("p")).toBeVisible();
      await expect(firstDetail.locator("p")).not.toBeEmpty();
      await tool.screenshot({ path: testInfo.outputPath("review-expanded.png") });

      if (scenario.name === "beginner with a short horizon and every goal") {
        // Editing the underlying situation must replace prospective copy throughout the existing review.
        for (const [index, answer] of [[2, "Mám více různých produktů"], [3, "Podle finančního plánu"]] as const) {
          const savedAnswers = tool.locator("details[data-screening-answers]");
          if (await savedAnswers.getAttribute("open") === null) await savedAnswers.locator(":scope > summary").click();
          await savedAnswers.locator(`[data-screening-action="edit"][data-screening-question="${index}"]`).click();
          await expectPhase(tool, "questions");
          await tool.getByRole("radio", { name: answer, exact: true }).check();
          await action(tool, "next").click();
          await expectPhase(tool, "review");
        }
        await expect(reviewItem("overview")).toContainText("Přehled současných investic");
        await expect(reviewItem("overview")).not.toContainText("Zatím nemáte investice");
        await expect(reviewItem("starting-plan")).toContainText("Další investice v kontextu plánu");
        await expect(reviewItem("decision-rules")).toContainText("pravidla pro jeho kontrolu a změny");
        await expect(primary).toHaveCount(7);
      }

      await action(tool, "contact").click();
      await expectPhase(tool, "contact");
      await expect(tool.getByRole("heading", { level: 3 })).toHaveText("Projděme váš investiční plán");
      await expect(tool).toContainText("Nechte mi kontakt. Ozvu se");
      await tool.screenshot({ path: testInfo.outputPath("contact.png") });
      expect(screeningPosts).toEqual([]);
      expect(browserErrors).toEqual([]);
      expect(await page.evaluate(() => document.scrollingElement!.scrollWidth - document.documentElement.clientWidth))
        .toBeLessThanOrEqual(1);
    });
  }
}

test("screening contact submits once while pending and sends no questionnaire answers", async ({ page }) => {
  const leadPayloads: Record<string, unknown>[] = [];
  const unexpectedPosts: string[] = [];
  const deferred = { release: () => {} };
  const responseGate = new Promise<void>((resolve) => {
    deferred.release = resolve;
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const isLead = new URL(request.url()).pathname.replace(/\/$/u, "") === "/api/article-screening";
    const corsHeaders = {
      "access-control-allow-origin": new URL(page.url()).origin,
      "access-control-allow-credentials": "true",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "Content-Type",
    };
    if (isLead && request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
    } else if (isLead && request.method() === "POST") {
      leadPayloads.push(request.postDataJSON() as Record<string, unknown>);
      await responseGate;
      await route.fulfill({
        status: 201,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify({ status: "accepted", receiptId: "16cddaba-362a-4b0e-81af-5a2782759cf4" }),
      });
    } else if (request.method() === "POST") {
      unexpectedPosts.push(request.url());
      await route.abort();
    } else {
      await route.continue();
    }
  });

  try {
    const tool = await openScreening(page, articles[0].slug);
    await action(tool, "start").click();
    for (let question = 0; question < articles[0].questions; question += 1) {
      await expectPhase(tool, "questions");
      await tool.locator('input[type="radio"], input[type="checkbox"]').first().check();
      await action(tool, "next").click();
    }
    await expectPhase(tool, "review");
    await action(tool, "contact").click();
    await expectPhase(tool, "contact");
    await tool.getByRole("textbox", { name: "Jméno", exact: true }).fill("Testovací uživatel");
    await tool.getByRole("textbox", { name: "E-mail", exact: true }).fill("screening-test@example.invalid");
    await tool.getByRole("textbox", { name: "Telefon", exact: true }).fill("123 456 789");
    await action(tool, "submit").click();
    await expect.poll(() => leadPayloads.length).toBe(1);
    await expect(tool.locator("form input")).toHaveCount(3);
    for (const input of await tool.locator("form input").all()) {
      await expect(input).toBeDisabled();
    }
    await expect(action(tool, "submit")).toBeDisabled();
    await expect(action(tool, "submit")).toHaveAttribute("aria-busy", "true");
    await expect(action(tool, "back")).toBeDisabled();
    await expect(action(tool, "close")).toBeDisabled();

    // A second native submit event must also be guarded, beyond disabling the button.
    await tool.locator("form").evaluate((form) => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await expect(tool).toHaveAttribute("data-screening-phase", "contact");
    await expect(action(tool, "submit")).toBeDisabled();
    expect(leadPayloads).toHaveLength(1);
    const payload = leadPayloads[0];
    expect(Object.keys(payload).sort()).toEqual([
      "articleSlug", "email", "name", "phone", "privacyNoticeVersion", "requestId", "screeningType", "submittedAt",
    ]);
    expect(payload).toMatchObject({
      name: "Testovací uživatel",
      email: "screening-test@example.invalid",
      phone: "123 456 789",
      articleSlug: "zdrazilo-vam-pojisteni",
      screeningType: "insurance-price-check",
    });
    expect(payload.privacyNoticeVersion).toEqual(expect.any(String));
    expect(payload.requestId).toMatch(/^[a-f0-9-]{36}$/u);
    expect(Number.isNaN(Date.parse(String(payload.submittedAt)))).toBe(false);
    expect(payload).not.toHaveProperty("articleTitle");
    expect(payload).not.toHaveProperty("workspace_id");
    expect(payload).not.toHaveProperty("answers");
    expect(payload).not.toHaveProperty("review");

    deferred.release();
    await expectPhase(tool, "submitted");
    await expect(tool.getByRole("heading", { level: 3 })).toHaveText("Děkuji, ozvu se vám.");
    expect(leadPayloads).toHaveLength(1);
    expect(unexpectedPosts).toEqual([]);
  } finally {
    deferred.release();
  }
});

test("an uncertain response preserves the request identity for a confirmed retry", async ({ page }) => {
  const payloads: Record<string, unknown>[] = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.continue();
    if (new URL(request.url()).pathname.replace(/\/$/u, "") !== "/api/article-screening") return route.abort();
    payloads.push(request.postDataJSON());
    if (payloads.length === 1) return route.fulfill({ status: 503, json: { status: "error", reason: "unavailable" } });
    return route.fulfill({ status: 201, json: { status: "accepted", receiptId: "16cddaba-362a-4b0e-81af-5a2782759cf4" } });
  });
  const tool = await openScreening(page, articles[0].slug);
  await action(tool, "start").click();
  for (let question = 0; question < articles[0].questions; question += 1) {
    await tool.locator('input[type="radio"], input[type="checkbox"]').first().check();
    await action(tool, "next").click();
  }
  await action(tool, "contact").click();
  await tool.getByRole("textbox", { name: "Jméno", exact: true }).fill("Test opakování");
  await tool.getByRole("textbox", { name: "E-mail", exact: true }).fill("retry@example.invalid");
  await tool.getByRole("textbox", { name: "Telefon", exact: true }).fill("+420 777 123 456");
  await action(tool, "submit").click();
  await expect(tool.getByRole("alert")).toContainText("Odeslání se nepovedlo");
  await expect(tool).toHaveAttribute("data-screening-phase", "contact");
  await expect(action(tool, "submit")).toBeEnabled();
  await action(tool, "submit").click();
  await expectPhase(tool, "submitted");
  expect(payloads).toHaveLength(2);
  expect(payloads[1]).toEqual(payloads[0]);
});
