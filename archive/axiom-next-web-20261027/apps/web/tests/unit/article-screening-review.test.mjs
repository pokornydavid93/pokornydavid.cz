import assert from "node:assert/strict";
import test from "node:test";
import { articleScreeningConfigs } from "../../app/clanky/articleScreeningConfigs.ts";
import { getScreeningPrimaryReviewCount, getScreeningReviewItems } from "../../app/clanky/articleScreeningReview.ts";

const insurance = articleScreeningConfigs["insurance-price-check"];
const income = articleScreeningConfigs["income-protection"];
const investment = articleScreeningConfigs["investment-plan"];
const ids = (answers, config = insurance) =>
  getScreeningReviewItems(answers, config.review).map((item) => item.id);

test("every screening topic provides useful baseline checks without a risk diagnosis", () => {
  for (const config of Object.values(articleScreeningConfigs)) {
    const items = getScreeningReviewItems({}, config.review);
    assert.equal(items.length, 3, config.type);
    assert.ok(items.every((item) => item.title && item.summary && item.text), config.type);
    assert.ok(config.review.items.every((item) => item.summary.length <= 110), config.type);
    assert.ok(config.review.contactCtaLabel, config.type);
    assert.equal("scoreRules" in config, false, config.type);
    assert.equal("intentLabels" in config, false, config.type);
  }
});

test("review rules reference real questions and selectable answers in every topic", () => {
  for (const config of Object.values(articleScreeningConfigs)) {
    const questions = new Map(config.steps.flatMap((step) => step.questions).map((question) => [question.id, question]));
    const itemIds = config.review.items.map((item) => item.id);
    assert.equal(new Set(itemIds).size, itemIds.length, config.type);
    for (const item of config.review.items) {
      const conditions = [
        ...(item.when ?? []),
        ...(item.prioritizeWhen ?? []),
        ...(item.variants ?? []).flatMap((variant) => variant.when),
      ];
      if (item.when) assert.ok(item.when.length > 0, `${config.type}/${item.id}`);
      if (item.prioritizeWhen) assert.ok(item.prioritizeWhen.length > 0, `${config.type}/${item.id}`);
      if (item.variants) assert.ok(item.variants.length > 0, `${config.type}/${item.id}`);
      for (const variant of item.variants ?? []) {
        assert.ok(variant.when.length > 0, `${config.type}/${item.id}: variant conditions`);
        assert.ok([variant.title, variant.summary, variant.text].some((copy) => copy?.trim()), `${config.type}/${item.id}: variant copy`);
        if (variant.summary) assert.ok(variant.summary.length <= 110, `${config.type}/${item.id}: variant summary`);
      }
      for (const condition of conditions) {
        const question = questions.get(condition.questionId);
        assert.ok(question, `${config.type}/${item.id}: ${condition.questionId}`);
        assert.ok(condition.options.length > 0, `${config.type}/${item.id}`);
        assert.ok(condition.options.every((option) => question.options.includes(option)), `${config.type}/${item.id}`);
      }
    }
  }
});

test("insurance overview keeps price, coverage and deductible checks for a recently reviewed car policy", () => {
  assert.deepEqual(ids({
    insuranceType: "Auto",
    priceNotice: "Stejné nebo nižší",
    lastReview: "Letos",
    coverageFit: "Ano",
    insuranceNeed: ["Porovnat cenu"],
  }), ["price", "coverage", "limits-deductible"]);
});

test("explicit valuation goals precede relevant document checks and baselines without duplicates", () => {
  assert.deepEqual(ids({
    insuranceType: "Nemovitost",
    lastReview: "Nikdy / nepamatuji si",
    coverageFit: "Nevím",
    insuranceNeed: ["Ověřit hodnotu majetku"],
  }), ["property-value", "current-documents", "price", "coverage", "limits-deductible"]);
});

test("selecting more comparison goals does not raise an aggregate severity or add a diagnosis", () => {
  const oneGoal = { insuranceNeed: ["Porovnat cenu"] };
  const fourGoals = {
    insuranceNeed: [
      "Porovnat cenu",
      "Prověřit krytí a výluky",
      "Porovnat více pojišťoven",
      "Projít smlouvu jako celek",
    ],
  };
  assert.deepEqual(ids(fourGoals).sort(), ids(oneGoal).sort());
  assert.equal("score" in getScreeningReviewItems(fourGoals, insurance.review)[0], false);
});

test("single-question flows have truthful counts and inline start actions across all topics", () => {
  const counts = { "mortgage-fixation": 5, "investment-plan": 5, "insurance-price-check": 5, "income-protection": 6 };
  for (const config of Object.values(articleScreeningConfigs)) {
    const questions = config.steps.flatMap((step) => step.questions);
    assert.equal(questions.length, counts[config.type], config.type);
    assert.equal(new Set(questions.map((question) => question.id)).size, questions.length, config.type);
    assert.ok(questions.every((question) => question.options.length > 1), config.type);
    for (const question of questions.filter((question) => question.exclusiveOptions)) {
      assert.equal(question.multiple, true, `${config.type}/${question.id}`);
      assert.ok(question.exclusiveOptions.length > 0, `${config.type}/${question.id}`);
      assert.ok(question.exclusiveOptions.every((option) => question.options.includes(option)), `${config.type}/${question.id}`);
    }
    assert.ok(config.microcopy.startsWith(`${questions.length} otázek`), config.type);
    assert.equal(config.startCtaLabel.includes("↗"), false, config.type);
    assert.equal(config.microcopy.includes("kontaktu"), false, config.type);
  }
});

test("explicit insurance goals change baseline ordering without changing the diagnosis-free topics", () => {
  const baseline = ids({ insuranceNeed: ["Porovnat cenu"] });
  const coverage = ids({ insuranceNeed: ["Prověřit krytí a výluky"] });
  const wholePolicy = ids({ insuranceNeed: ["Projít smlouvu jako celek"] });
  assert.deepEqual(baseline, ["price", "coverage", "limits-deductible"]);
  assert.deepEqual(coverage, ["coverage", "price", "limits-deductible"]);
  assert.deepEqual(wholePolicy, ["coverage", "limits-deductible", "price"]);
});

test("missing or unexamined price notices highlight the documents needed for comparison", () => {
  for (const priceNotice of ["Oznámení ještě nepřišlo", "Oznámení mám, změnu ceny zatím neznám"]) {
    assert.equal(ids({ priceNotice })[0], "current-documents");
  }
  assert.deepEqual(ids({ priceNotice: "Vyšší než minule", insuranceNeed: ["Prověřit krytí a výluky"] }), ["coverage", "price", "limits-deductible"]);
});

test("insurance copy distinguishes a missing notice from one received but not yet compared", () => {
  const review = (priceNotice) => new Map(getScreeningReviewItems({
    priceNotice,
    lastReview: "Před více lety",
  }, insurance.review).map((item) => [item.id, item]));
  const missing = review("Oznámení ještě nepřišlo");
  assert.equal(missing.get("price").summary, "Připravte si dosavadní pojistné. Novou cenu doplníte, až přijde oznámení.");
  assert.equal(missing.get("current-documents").summary, "Dohledejte smlouvu a dodatky. Nové oznámení přidáte, až ho obdržíte.");
  const unexamined = review("Oznámení mám, změnu ceny zatím neznám");
  assert.equal(unexamined.get("price").title, "Zjistěte novou cenu");
  assert.match(unexamined.get("current-documents").summary, /Přiložte nové oznámení ke smlouvě/);
  const arrived = review("Vyšší než minule");
  for (const id of ["price", "current-documents"]) {
    const baseline = insurance.review.items.find((item) => item.id === id);
    assert.equal(arrived.get(id).title, baseline.title);
    assert.equal(arrived.get(id).summary, baseline.summary);
    assert.equal(arrived.get(id).text, baseline.text);
  }
});

test("a property-value note respects an explicit answer that the policy does not use asset value", () => {
  const items = getScreeningReviewItems({
    insuranceType: "Nemovitost",
    coverageFit: "Netýká se mého pojištění",
  }, insurance.review);
  assert.equal(items.find((item) => item.id === "property-value").summary,
    "Pokud vaše smlouva s hodnotou majetku nepracuje, tento bod můžete přeskočit.");
});

test("explicit coverage goals remain first despite stale documents, uncertain value and higher premiums", () => {
  const answers = {
    insuranceType: "Nemovitost",
    priceNotice: "Vyšší než minule",
    lastReview: "Nikdy / nepamatuji si",
    coverageFit: "Nevím",
  };
  assert.deepEqual(ids({ ...answers, insuranceNeed: ["Prověřit krytí a výluky"] }), [
    "coverage", "current-documents", "property-value", "price", "limits-deductible",
  ]);
  assert.deepEqual(ids({ ...answers, insuranceNeed: ["Projít smlouvu jako celek"] }), [
    "coverage", "limits-deductible", "current-documents", "property-value", "price",
  ]);
});

test("all explicitly requested insurance topics stay in the primary review, even beyond three", () => {
  const answers = {
    lastReview: "Nikdy / nepamatuji si",
    insuranceNeed: [
      "Porovnat cenu",
      "Prověřit krytí a výluky",
      "Ověřit hodnotu majetku",
      "Porovnat více pojišťoven",
      "Projít smlouvu jako celek",
    ],
  };
  const items = getScreeningReviewItems(answers, insurance.review);
  const primaryCount = getScreeningPrimaryReviewCount(answers, items);
  assert.equal(primaryCount, 4);
  assert.deepEqual(items.slice(0, primaryCount).map((item) => item.id), [
    "price", "coverage", "limits-deductible", "property-value",
  ]);
  assert.deepEqual(items.slice(primaryCount).map((item) => item.id), ["current-documents"]);
  assert.equal(getScreeningPrimaryReviewCount({}, getScreeningReviewItems({}, insurance.review)), 3);
  assert.equal(getScreeningPrimaryReviewCount({}, []), 0);
});

test("relevant topics retain deterministic authored order independently of answer selection order", () => {
  const first = { lastReview: "Nikdy / nepamatuji si", insuranceNeed: ["Ověřit hodnotu majetku", "Porovnat cenu"] };
  const reversed = { insuranceNeed: ["Porovnat cenu", "Ověřit hodnotu majetku"], lastReview: "Nikdy / nepamatuji si" };
  assert.deepEqual(ids(first), ids(reversed));
  assert.deepEqual(ids(first), ["price", "property-value", "current-documents", "coverage", "limits-deductible"]);
});

test("review variants use the first matching copy, retain unspecified fields and recompute without source mutation", () => {
  const review = {
    items: [{
      id: "price",
      title: "Price comparison",
      summary: "Compare the notice already received.",
      text: "Keep coverage comparable.",
      variants: [
        {
          when: [{ questionId: "notice", options: ["missing"] }],
          title: "Prepare for the notice",
          summary: "Compare after the notice arrives.",
        },
        {
          when: [{ questionId: "notice", options: ["missing", "arrived"] }],
          text: "Compare with the current policy.",
        },
      ],
    }],
  };
  const source = structuredClone(review);
  const missing = getScreeningReviewItems({ notice: "missing" }, review)[0];
  assert.equal(missing.title, "Prepare for the notice");
  assert.equal(missing.summary, "Compare after the notice arrives.");
  assert.equal(missing.text, "Keep coverage comparable.");
  const arrived = getScreeningReviewItems({ notice: "arrived" }, review)[0];
  assert.equal(arrived.title, "Price comparison");
  assert.equal(arrived.summary, "Compare the notice already received.");
  assert.equal(arrived.text, "Compare with the current policy.");
  const unknown = getScreeningReviewItems({ notice: "unsupported" }, review)[0];
  assert.equal(unknown.title, source.items[0].title);
  assert.equal(unknown.summary, source.items[0].summary);
  assert.equal(unknown.text, source.items[0].text);
  assert.deepEqual(getScreeningReviewItems({ notice: ["missing"] }, review)[0], missing);
  assert.deepEqual(review, source);
});

test("other topics add practical checks for specific answers rather than contact intent", () => {
  assert.ok(ids({ fixationEnds: "Do 3 měsíců" }, articleScreeningConfigs["mortgage-fixation"]).includes("timing"));
  assert.ok(ids({ investmentHorizon: "Do 3 let" }, articleScreeningConfigs["investment-plan"]).includes("near-term"));
  assert.ok(ids({ reserveDuration: "Nemám spočítáno" }, articleScreeningConfigs["income-protection"]).includes("reserve"));
  assert.deepEqual(ids({ unknownQuestion: "Nemovitost", insuranceType: "unsupported-answer" }), ["price", "coverage", "limits-deductible"]);
});

test("requested mortgage alternatives precede the other conditional timing check", () => {
  assert.deepEqual(ids({
    fixationEnds: "Do 3 měsíců",
    considering: ["Porovnat nabídky jiných bank"],
  }, articleScreeningConfigs["mortgage-fixation"]), [
    "alternatives", "timing", "offer", "payment", "budget",
  ]);
});

test("every income goal promotes its own useful review topic and all five remain visible", () => {
  const goalTopics = [
    ["Jestli pojistka pokryje výdaje", "expenses"],
    ["Jestli jsou pojistné částky dostatečné", "amounts"],
    ["Jestli nechybí invalidita nebo nemoc", "missing-coverage"],
    ["Jestli neplatím za zbytečnosti", "cost-benefit"],
    ["Chci tomu konečně rozumět", "policy"],
  ];
  for (const [goal, topic] of goalTopics) {
    assert.equal(ids({ protectionNeed: [goal] }, income)[0], topic, goal);
  }
  const answers = {
    commitments: ["Hypotéku", "Náklady podnikání"],
    reserveDuration: "1–3 měsíce",
    protectionNeed: goalTopics.map(([goal]) => goal),
  };
  const items = getScreeningReviewItems(answers, income.review);
  const primaryCount = getScreeningPrimaryReviewCount(answers, items);
  assert.equal(primaryCount, 5);
  assert.deepEqual(items.slice(0, primaryCount).map((item) => item.id), [
    "expenses", "policy", "amounts", "missing-coverage", "cost-benefit",
  ]);
  assert.deepEqual(items.slice(primaryCount).map((item) => item.id), ["commitments", "reserve"]);
  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
});

test("income checks without a policy describe prospective protection instead of an existing contract", () => {
  const answers = {
    currentPolicy: "Nemám nic",
    keyRisks: "Pojištění nemám",
    protectionNeed: ["Jestli neplatím za zbytečnosti", "Chci tomu konečně rozumět"],
  };
  const items = getScreeningReviewItems(answers, income.review);
  const byId = new Map(items.map((item) => [item.id, item]));
  assert.equal(byId.get("policy").title, "Podmínky případné nové ochrany");
  assert.equal(byId.get("amounts").title, "Kolik by při výpadku chybělo");
  assert.equal(byId.get("missing-coverage").title, "Rozsah případné nové ochrany");
  assert.equal(byId.get("cost-benefit").title, "Cena případné nové ochrany");
  assert.doesNotMatch(items.map((item) => `${item.summary} ${item.text}`).join(" "), /Ve smlouvě ověřte|Zapište pojistné částky|U každého sjednaného rizika/);
});

test("income coverage checks respect both known coverage and distinct partial coverage answers", () => {
  const reviewCoverage = (keyRisks) => getScreeningReviewItems({
    currentPolicy: "Ano, pravidelně ho kontroluji",
    keyRisks,
    protectionNeed: ["Jestli nechybí invalidita nebo nemoc"],
  }, income.review).find((item) => item.id === "missing-coverage");
  const known = reviewCoverage("Invaliditu i závažná onemocnění");
  assert.doesNotMatch(known.text, /nemáte jistotu|pojištění nemáte/);
  assert.match(reviewCoverage("Jen invaliditu").summary, /závažná onemocnění/);
  assert.match(reviewCoverage("Jen závažná onemocnění").summary, /následky invalidity/);
  assert.notEqual(reviewCoverage("Jen invaliditu").text, reviewCoverage("Jen závažná onemocnění").text);
});

test("household role and business commitments change practical income review guidance", () => {
  const roles = income.steps.flatMap((step) => step.questions).find((question) => question.id === "incomeRole").options;
  const descriptions = roles.map((incomeRole) => getScreeningReviewItems({ incomeRole }, income.review)
    .find((item) => item.id === "expenses").text);
  assert.equal(new Set(descriptions).size, roles.length);
  const business = getScreeningReviewItems({ commitments: ["Hypotéku", "Náklady podnikání"] }, income.review);
  assert.match(business.find((item) => item.id === "commitments").text, /nákladů podnikání/);
  assert.equal(business.filter((item) => item.id === "commitments").length, 1);
  assert.equal(ids({ commitments: ["Nemám takové závazky"] }, income).includes("commitments"), false);
  const unsure = getScreeningReviewItems({ commitments: ["Nevím, co všechno započítat"] }, income.review);
  assert.match(unsure.find((item) => item.id === "commitments").text, /výpisy a plánované platby/);
});

const investmentGoalTopics = [
  ["Zjistit, jestli investuji dostatečnou částku", "monthly-contribution"],
  ["Ověřit, jestli moje investice odpovídají cíli", "goal"],
  ["Zjednodušit více různých produktů", "overview"],
  ["Nastavit jasnou dlouhodobou strategii", "strategy"],
  ["Snížit chaos a emoce při rozhodování", "decision-rules"],
  ["Začít investovat, ale bezpečněji a s plánem", "starting-plan"],
];

test("each investment goal gets a distinct useful priority and all six remain visible", () => {
  const question = investment.steps.flatMap((step) => step.questions).find((item) => item.id === "investmentNeed");
  assert.deepEqual(investmentGoalTopics.map(([goal]) => goal), question.options);
  for (const [goal, topic] of investmentGoalTopics) {
    assert.equal(ids({ investmentNeed: [goal] }, investment)[0], topic, goal);
  }
  const answers = { investmentNeed: question.options };
  const items = getScreeningReviewItems(answers, investment.review);
  const count = getScreeningPrimaryReviewCount(answers, items);
  assert.equal(count, 6);
  assert.deepEqual(items.slice(0, count).map((item) => item.id), [
    "goal", "monthly-contribution", "overview", "strategy", "decision-rules", "starting-plan",
  ]);
  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
  assert.deepEqual(ids({ investmentNeed: [...question.options].reverse() }, investment), items.map((item) => item.id));
});

test("a reserve goal or short horizon stays first and visible alongside every requested investment topic", () => {
  for (const situation of [
    { investmentGoal: "Nejdřív doplnit finanční rezervu", investmentHorizon: "Více než 15 let" },
    { investmentGoal: "Budování majetku", investmentHorizon: "Do 3 let" },
  ]) {
    const answers = { ...situation, investmentNeed: investmentGoalTopics.map(([goal]) => goal) };
    const items = getScreeningReviewItems(answers, investment.review);
    const primary = items.slice(0, getScreeningPrimaryReviewCount(answers, items));
    assert.equal(primary.length, 7);
    assert.equal(primary[0].id, "near-term");
    assert.ok(investmentGoalTopics.every(([, id]) => primary.some((item) => item.id === id)));
  }
});

test("beginners can answer truthfully and receive prospective copy even when choosing every goal", () => {
  const questions = investment.steps.flatMap((step) => step.questions);
  assert.ok(questions.find((question) => question.id === "selectionBasis").options.includes("Zatím jsem investice nevybíral/a"));
  const source = structuredClone(investment.review);
  const answers = {
    currentInvestments: "Zatím neinvestuji",
    selectionBasis: "Zatím jsem investice nevybíral/a",
    investmentNeed: investmentGoalTopics.map(([goal]) => goal),
  };
  const beginner = new Map(getScreeningReviewItems(answers, investment.review).map((item) => [item.id, item]));
  assert.equal(beginner.get("goal").title, "Cíl před výběrem investice");
  assert.equal(beginner.get("overview").title, "Přehled před výběrem produktů");
  assert.equal(beginner.get("risk-costs").title, "Rizika a náklady případné nabídky");
  assert.equal(beginner.get("starting-plan").title, "Podklady před první investicí");
  assert.doesNotMatch([...beginner.values()].map((item) => `${item.summary} ${item.text}`).join(" "),
    /Sepište současné produkty|Připravte poslední výpisy|Přiřaďte investice ke konkrétním cílům|K existujícím investicím/);
  const existing = new Map(getScreeningReviewItems({
    ...answers,
    currentInvestments: "Mám více různých produktů",
    selectionBasis: "Podle finančního plánu",
  }, investment.review).map((item) => [item.id, item]));
  assert.equal(existing.get("overview").title, "Přehled současných investic");
  assert.equal(existing.get("starting-plan").title, "Další investice v kontextu plánu");
  assert.notEqual(existing.get("decision-rules").text, beginner.get("decision-rules").text);
  assert.deepEqual(investment.review, source);
});

test("the basis of investment choices changes practical decision guidance instead of being discarded", () => {
  const choices = investment.steps.flatMap((step) => step.questions).find((question) => question.id === "selectionBasis").options;
  const guidance = choices.map((selectionBasis) => getScreeningReviewItems({ selectionBasis }, investment.review)
    .find((item) => item.id === "decision-rules").text);
  assert.equal(new Set(guidance).size, choices.length);
  assert.match(guidance[choices.indexOf("Podle internetu / sociálních sítí")], /zdroj a ověřitelné podklady/);
  assert.match(guidance[choices.indexOf("Podle známých nebo rodiny")], /v čem se vaše situace liší/);
  assert.match(guidance[choices.indexOf("Podle finančního plánu")], /pravidla pro jeho kontrolu a změny/);
});

test("investment details add actionable next steps for amount, emotions and uncertain existing products", () => {
  const amount = getScreeningReviewItems({ investmentNeed: [investmentGoalTopics[0][0]] }, investment.review)[0];
  assert.match(amount.text, /po nutných výdajích a doplňování rezervy/);
  assert.match(amount.text, /propočet více scénářů/);
  const emotions = getScreeningReviewItems({ investmentNeed: [investmentGoalTopics[4][0]] }, investment.review)[0];
  assert.equal(emotions.id, "decision-rules");
  assert.match(emotions.text, /Oddělte změnu svých potřeb od reakce na zprávy/);
  const uncertain = new Map(getScreeningReviewItems({
    currentInvestments: "Nevím, jestli se to dá považovat za investice",
    investmentHorizon: "Nejsem si jistý/jistá",
  }, investment.review).map((item) => [item.id, item]));
  assert.equal(uncertain.get("overview").title, "Co už máte a k čemu to slouží");
  assert.match(uncertain.get("horizon").text, /nejbližší možný termín/);
  assert.match(uncertain.get("overview").text, /nejasné názvy nebo účel/i);
});
