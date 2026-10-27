import fs from "node:fs";
import path from "node:path";

const contentDirectory = path.join(process.cwd(), "content", "blog");

const publicNotes = {
  "01": {
    "Jak číst tento případ": {
      title: "Jak číst tento případ",
      text: "Jde o anonymizovaný případ z praxe. Uvedené sazby, částky a nastavení popisují konkrétní výchozí situaci klienta; nejsou aktuální nabídkou ani univerzálním doporučením.",
    },
  },
  "02": {
    "Jak číst tento případ": {
      title: "Jak číst tento případ",
      text: "Jde o anonymizovaný případ z praxe. Delší splatnost není univerzální doporučení; v tomto případě sloužila k obnovení flexibility, rezervy a ochrany příjmu.",
    },
  },
  "03": {
    "Jak číst orientační rozpětí": {
      title: "Jak číst orientační rozpětí",
      text: "Tři až šest měsíců není univerzální norma ani automatický výsledek pro každého. Toto rozpětí používám jen jako orientační rámec. Konkrétní velikost rezervy společně odvodíme od jistoty a nahraditelnosti vašich příjmů, počtu příjmů v domácnosti, lidí, kteří jsou na nich závislí, pevných závazků a nastavené ochrany velkých rizik.",
    },
    "Jak číst tento případ": {
      title: "Jak číst tento případ",
      text: "Jde o anonymizovaný případ z praxe.",
    },
  },
  "04": {
    "Jak číst tento model": {
      title: "Jak číst tento model",
      text: "Jde o výslovně modelový příklad, nikoli o anonymizovaný skutečný případ. Všechny částky jsou uvedené orientačně a popisují logiku srovnání. Řádová výše úvěru závisí na sazbě, splatnosti a konkrétní nabídce; čísla proto nejsou aktuální kalkulací ani příslibem financování.",
    },
  },
  "05": {
    "Jak číst tento případ": {
      title: "Jak číst tento případ",
      text: "Jde o skutečný anonymizovaný případ. Částky odpovídají tehdejším konkrétním nabídkám; nejde o současný sazebník ani univerzální očekávaný rozdíl.",
    },
  },
  "06": {
    "Hranice tří, deseti a více let jsou orientační rámec, ne univerzální zákon": {
      title: "Hranice tří, deseti a více let jsou orientační rámec, ne univerzální zákon",
      text: "Rozdělení do tří let, přibližně čtyř až deseti let a deseti let a více je praktická metodika. Konkrétní nastavení se může lišit podle přesnosti termínu, důležitosti cíle, vaší tolerance, použitého řešení a dalších okolností. Časové pásmo samo o sobě neurčuje konkrétní produkt ani přesný podíl jednotlivých aktiv.",
    },
  },
};

const supplementalInternal = {
  "02": [
    {
      id: "02-missing-case-loan-values",
      title: "Nevytvářet chybějící částku splátky ani úvěru",
      instruction:
        "Podklad neobsahuje přesnou výši splátky ani úvěru. Tyto hodnoty proto nebyly dopočítány a nesmí být do případu doplněny bez doloženého zdroje.",
      status: "not_applicable",
      severity: "advisory",
      blocksPublish: false,
      visibility: "internal",
      sectionId: "spravny-cil-spatne-nacasovani",
      claimRef: "case-missing-loan-values",
      evidenceRequired: "Doložená výše splátky a úvěru, pokud mají být někdy zveřejněné.",
      sources: [],
      note: "Veřejná verze záměrně neobsahuje nedoložená čísla.",
    },
  ],
  "03": [
    {
      id: "03-missing-case-repair-values",
      title: "Nevytvářet chybějící cenu opravy ani korunovou rezervu",
      instruction:
        "Podklad neobsahuje přesnou cenu opravy ani korunovou výši rezervy. Proto nebylo vytvořeno číselné porovnání a částky nesmí být doplněny bez doloženého zdroje.",
      status: "not_applicable",
      severity: "advisory",
      blocksPublish: false,
      visibility: "internal",
      sectionId: "rezerva-zmenila-prusvih-na-neprijemnost",
      claimRef: "case-missing-repair-values",
      evidenceRequired: "Doložená cena opravy a korunová výše rezervy, pokud mají být někdy zveřejněné.",
      sources: [],
      note: "Veřejná verze záměrně zůstává bez nedoloženého číselného delta bloku.",
    },
  ],
  "05": [
    {
      id: "05-case-anonymization-release-check",
      title: "Ověřit dostatečnou anonymizaci klientského případu",
      instruction:
        "Před release potvrdit, že kombinace částek, okolností a výsledku neumožňuje zpětnou identifikaci klientky.",
      status: "pending",
      severity: "blocking",
      blocksPublish: true,
      visibility: "internal",
      sectionId: "pripad-kdy-vyssi-sazba-vysla-levneji",
      claimRef: "case-anonymization",
      evidenceRequired: "Zaznamenaná anonymizační kontrola konkrétního případu.",
      sources: [],
      requiresRecheck: false,
    },
  ],
};

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
  return files.sort();
}

function slugify(value) {
  return value
    .toLocaleLowerCase("cs-CZ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 52)
    .replace(/-$/g, "");
}

function verificationFromSourceNote(articleNumber, note, sectionId, index) {
  const originallyBlocking = note.needsVerification === true;
  const insurerNamesNote =
    articleNumber === "08" &&
    note.title === "Konkrétní pojišťovny se ve veřejném článku záměrně nejmenují";

  return {
    id: `${articleNumber}-${String(index + 1).padStart(2, "0")}-${slugify(note.title)}`,
    title: note.title,
    instruction: note.text,
    status: insurerNamesNote ? "not_applicable" : "pending",
    severity: originallyBlocking ? "blocking" : "advisory",
    blocksPublish: originallyBlocking,
    visibility: "internal",
    sectionId,
    claimRef: `${sectionId}:verification-${index + 1}`,
    evidenceRequired: originallyBlocking
      ? "Aktuální autoritativní nebo produktový podklad a zaznamenaný výsledek kontroly."
      : "Záznam editorial rozhodnutí, pokud se veřejná formulace změní.",
    sources: [],
    requiresRecheck: originallyBlocking,
    ...(insurerNamesNote
      ? { note: "Veřejná verze záměrně neuvádí konkrétní pojišťovny." }
      : {}),
  };
}

for (const filePath of findArticleFiles(contentDirectory)) {
  const articleNumber = path.basename(filePath).slice(0, 2);
  const article = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (article.editorial && !JSON.stringify(article.sections).includes('"sourceNote"')) {
    continue;
  }

  const verificationItems = [];
  let internalIndex = 0;

  for (const section of article.sections) {
    const migratedBlocks = [];

    for (const block of section.blocks) {
      if (block.type !== "sourceNote") {
        migratedBlocks.push(block);
        continue;
      }

      const publicNote = publicNotes[articleNumber]?.[block.title];
      if (publicNote) {
        migratedBlocks.push({ type: "expertNote", ...publicNote });
      }

      const shouldMoveInternal =
        block.needsVerification === true ||
        articleNumber === "08";
      if (shouldMoveInternal) {
        verificationItems.push(
          verificationFromSourceNote(articleNumber, block, section.id, internalIndex),
        );
        internalIndex += 1;
      }
    }

    section.blocks = migratedBlocks;
    delete section.needsVerification;
    if (section.rail) {
      delete section.rail.needsVerification;
      delete section.rail.verificationLabel;
      if (
        articleNumber === "08" &&
        section.id === "co-hradi-verejne-pojisteni-a-co-muze-zustat"
      ) {
        section.rail.label = "VEŘEJNÁ ÚHRADA A VLASTNÍ NÁKLADY";
      }
    }
  }

  verificationItems.push(...(supplementalInternal[articleNumber] ?? []));

  article.editorial = {
    contentStatus: article.meta.contentStatus,
    sourceBasis: article.meta.sourceBasis,
    needsExternalVerification: article.meta.needsExternalVerification,
    ...(article.meta.sensitivity ? { sensitivity: article.meta.sensitivity } : {}),
    review: { status: "pending" },
    verificationItems,
    ...(article.productionNotes
      ? { productionNotes: article.productionNotes }
      : {}),
  };

  delete article.meta.contentStatus;
  delete article.meta.sourceBasis;
  delete article.meta.needsExternalVerification;
  delete article.meta.sensitivity;
  delete article.productionNotes;

  fs.writeFileSync(filePath, `${JSON.stringify(article, null, 2)}\n`);
}
