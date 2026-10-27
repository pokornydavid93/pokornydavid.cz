export type ProcessIconKey =
  | "phone"
  | "wallet"
  | "sparkles";

export type DecisionMapStepId =
  | "uvodni-konzultace"
  | "analyza-financi"
  | "navrh-reseni";

export type DecisionMapRole =
  | "entry"
  | "analysis"
  | "central";

export type DecisionMapStep = {
  id: DecisionMapStepId;
  numberLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  tags: string[];
  artifactTitle: string;
  artifactItems: DecisionMapOutcomeItem[];
  artifactResult: string;
  icon: ProcessIconKey;
  role: DecisionMapRole;
  revealAt: number;
  anchorId?: string;
};

export type DecisionMapOutcomeItem = {
  title: string;
  description: string;
};

export const decisionMapSteps: DecisionMapStep[] = [
  {
    id: "uvodni-konzultace",
    numberLabel: "01 / 03",
    eyebrow: "PRVNÍ KROK",
    title: "Krátký hovor",
    description:
      "Řeknete mi, co právě řešíte a co od spolupráce čekáte. Rychle poznáme, jestli má smysl jít dál.",
    tags: ["15 minut", "Bez podkladů", "Bez rozhodnutí"],
    artifactTitle: "Jasnější začátek bez přípravy",
    artifactItems: [
      {
        title: "Co hoří",
        description: "Pojmenujeme jednu nebo dvě věci, které teď mění situaci.",
      },
      {
        title: "Co počká",
        description: "Oddělíme témata, která není potřeba řešit hned.",
      },
    ],
    artifactResult: "Jasno, jestli pokračovat",
    icon: "phone",
    role: "entry",
    revealAt: 0.24,
  },
  {
    id: "analyza-financi",
    numberLabel: "02 / 03",
    eyebrow: "SOUVISLOSTI",
    title: "Co má největší dopad",
    description:
      "Podíváme se na čísla, závazky a priority. Ne kvůli tabulkám, ale kvůli tomu, co opravdu mění rozhodnutí.",
    tags: ["Čísla", "Závazky", "Priority"],
    artifactTitle: "Přehled toho, co ovlivňuje rozhodnutí",
    artifactItems: [
      {
        title: "Silné a slabé místo",
        description: "Kde máte prostor a kde je potřeba být opatrný.",
      },
      {
        title: "Varianty",
        description: "Jaké cesty dávají smysl a které by jen přidaly složitost.",
      },
    ],
    artifactResult: "Víte, na čem záleží nejvíc",
    icon: "wallet",
    role: "analysis",
    revealAt: 0.5,
  },
  {
    id: "navrh-reseni",
    numberLabel: "03 / 03",
    eyebrow: "PLÁN",
    title: "Další rozumný krok",
    description:
      "Shrnu možnosti, doporučím nejbližší postup a doladíme řešení tak, aby fungovalo teď i dlouhodobě.",
    tags: ["Doporučení", "Dopady", "Tempo"],
    artifactTitle: "Jednoduchý postup, který jde skutečně udělat",
    artifactItems: [
      {
        title: "Co udělat",
        description: "Nejbližší postup, který má největší smysl teď.",
      },
      {
        title: "Co hlídat",
        description: "Co se má později zkontrolovat, upravit nebo nechat být.",
      },
    ],
    artifactResult: "Odcházíte s konkrétním postupem",
    icon: "sparkles",
    role: "central",
    revealAt: 0.72,
    anchorId: "dlouhodoba-pece",
  },
];
