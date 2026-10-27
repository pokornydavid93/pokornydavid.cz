export const processPageSteps = [
  {
    number: "01",
    role: "Vy",
    title: "Pojmenujete hlavní otázku.",
    text: "Stručně popíšete výchozí situaci. Podklady zatím nejsou potřeba.",
    result: "Víme, zda a jak pokračovat.",
  },
  {
    number: "02",
    role: "Já",
    title: "Poskládám, co spolu souvisí.",
    text: "Příjmy, závazky, rezervy, smlouvy a cíle posoudím jako jeden celek, ne jako oddělené produkty.",
    result: "Vidíte celek, ne jen jednotlivé smlouvy.",
  },
  {
    number: "03",
    role: "Spolu",
    title: "Společně stanovíme priority.",
    text: "Rozlišíme naléhavé body, otázky k ověření a témata, která mohou bezpečně počkat.",
    result: "Víte, čemu dát přednost.",
  },
  {
    number: "04",
    role: "Spolu",
    title: "Společně porovnáme možnosti a jejich dopady.",
    text: "U každé varianty vysvětlím vliv na rozpočet, rezervu a dlouhodobý plán.",
    result: "Rozumíte doporučení a konečná volba je na vás.",
  },
  {
    number: "05",
    role: "Spolu",
    title: "Plán spolu průběžně kontrolujeme.",
    text: "K nastavení se vracíme při změně příjmu, rodinné situace, bydlení, úvěru nebo smluv.",
    result: "Plán zůstává aktuální a použitelný.",
  },
] as const;

export type ProcessPageStep = (typeof processPageSteps)[number];
