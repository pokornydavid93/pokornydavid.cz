import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  getPublicArticle,
  renderPublicArticleMarkdown,
} from "../../../packages/article-editorial/src/index.mjs";

const contentDirectory = path.join(process.cwd(), "content", "blog");
const dashboardRegistryPath = path.resolve(
  process.cwd(),
  "../../packages/article-editorial/generated/dashboard-articles.json",
);
const forbiddenPreviewPatterns = [
  /vyžaduje ověření/i,
  /před publikací/i,
  /zdroj uvádí/i,
  /zdroj popisuje/i,
  /zdroj zachycuje/i,
  /zdroj obsahuje/i,
  /redakce musí/i,
  /veřejný render/i,
  /renderovaná verze/i,
  /interní ověřovací workflow/i,
  /financialDelta/i,
  /needsVerification/i,
  /productionNotes/i,
  /verification status/i,
  /release gate/i,
  /compliance TODO/i,
];

const legacyBlockingTitles = [
  "Dokončit odbornou kontrolu formulace bankovního posouzení",
  "Ověřit individuální předpoklady změny splátky",
  "Očekávaný investiční výnos není zaručený",
  "Složení RPSN, poplatky a produktové podmínky je nutné ověřit v konkrétní nabídce",
  "Konkrétní slevové podmínky jsou produktově a časově citlivé",
  "Pravidla mimořádného a předčasného splácení vyžadují aktuální právní kontrolu",
  "Srovnání investování a rychlejšího splácení není univerzální pravidlo",
  "Nátlak, podmínky a cenové rozdíly se musí posuzovat v konkrétním čase",
  "Investiční tvrzení musí zůstat metodikou, ne příslibem výsledku",
  "Předpoklady růstu a inflace musí být ve skutečném výpočtu aktuální a transparentní",
  "Případ vyžaduje kontrolu anonymizace a přesnosti výsledku",
  "Automatické přesouvání a rebalancování musí odpovídat skutečně používanému řešení",
  "Aktivace, navázání na kartu a maximální délka cesty se liší podle produktu",
  "Orientační limity a čtyřicetinásobné porovnání vyžadují aktuální zdroje",
  "Konkrétní příklady sublimitů a spoluúčasti jsou produktově citlivé",
  "Věkové hranice, společná cesta a sdílení limitů musí být ověřené u konkrétní varianty",
  "Délky 90–120 dní, sportovní hranice a zdravotní výluky nejsou univerzální",
  "Doporučené situace pro kartu nebo samostatnou smlouvu jsou rozhodovací rámec",
  "Zdroj obsahuje konkrétní produktové odkazy, ale nesmějí být použité bez nové kontroly",
  "Číselné orientace v checklistu musí být před publikací aktualizované",
  "Třetí přenos embrya musí být ověřen proti aktuální verzi podmínek",
  "Věk 45 let, přibližně dvouměsíční čekací doba a požadavek diagnostikované nemoci jsou produktově specifické",
  "Přesná hranice předchozího zdravotního stavu vyžaduje odbornou kontrolu",
  "Výplata 100 % pojistné částky a zánik krytí po plnění jsou specifické pro popsaný model",
  "Počet hrazených cyklů, věková hranice a uvedené částky vyžadují aktuální zdravotní a cenové zdroje",
  "Statistiky četnosti a úspěšnosti nejsou v článku použité jako hotový fakt",
  "Před veřejným renderem je nutná kontrola všech zdravotních a produktových tvrzení",
];

function findArticleFiles(directory) {
  const files = [];
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(target);
      else if (entry.name.endsWith(".article.json")) files.push(target);
    }
  }
  return files.sort((left, right) =>
    path.basename(left).localeCompare(path.basename(right), "cs-CZ"),
  );
}

const articleFiles = findArticleFiles(contentDirectory);
assert.equal(articleFiles.length, 12, "Editorial migration must cover exactly articles 01–12.");

const allVerificationItems = [];
const expectedDashboardArticles = [];
for (const articlePath of articleFiles) {
  const article = JSON.parse(fs.readFileSync(articlePath, "utf8"));
  const publicArticle = getPublicArticle(article);
  const publicJson = JSON.stringify(publicArticle);
  const previewPath = articlePath.replace(/\.article\.json$/, ".preview.md");
  const preview = fs.readFileSync(previewPath, "utf8");

  assert.equal(
    JSON.stringify(article.sections).includes('"sourceNote"'),
    false,
    `${article.meta.slug}: sourceNote remains in public blocks.`,
  );
  assert.equal(publicJson.includes('"editorial"'), false);
  assert.equal(publicJson.includes('"productionNotes"'), false);
  assert.equal(publicJson.includes('"needsVerification"'), false);
  assert.equal(publicJson.includes('"sourceBasis"'), false);
  assert.equal(preview, renderPublicArticleMarkdown(article), `${article.meta.slug}: preview is stale.`);

  for (const pattern of forbiddenPreviewPatterns) {
    assert.equal(pattern.test(preview), false, `${article.meta.slug}: preview contains ${pattern}.`);
  }

  allVerificationItems.push(...article.editorial.verificationItems);
  expectedDashboardArticles.push({
    schemaVersion: article.schemaVersion,
    publication: article.publication,
    meta: {
      slug: article.meta.slug,
      topic: article.meta.topic,
      category: article.meta.category,
      estimatedReadTime: article.meta.estimatedReadTime,
    },
    hero: {
      title: article.hero.title,
      subtitle: article.hero.subtitle,
    },
    sections: article.sections.map((section) => ({
      id: section.id,
      title: section.title,
    })),
    editorial: article.editorial,
  });
}

assert.deepEqual(
  JSON.parse(fs.readFileSync(dashboardRegistryPath, "utf8")),
  expectedDashboardArticles,
  "Generated dashboard registry is stale.",
);

// The fixation screening-only item is retired. The financial-plan case now has
// its own provenance confirmation; all migrated blockers remain below.
assert.equal(allVerificationItems.length, 44, "Expected 44 internal editorial items including the confirmed financial-plan case.");
const internalTitles = new Set(allVerificationItems.map((item) => item.title));
for (const title of legacyBlockingTitles) {
  assert.equal(internalTitles.has(title), true, `Missing migrated verification: ${title}`);
}
assert.equal(legacyBlockingTitles.length, 27);

console.log(
  JSON.stringify(
    {
      articles: articleFiles.length,
      internalVerificationItems: allVerificationItems.length,
      preservedLegacyBlockingItems: legacyBlockingTitles.length,
      cleanPreviews: articleFiles.length,
    },
    null,
    2,
  ),
);
