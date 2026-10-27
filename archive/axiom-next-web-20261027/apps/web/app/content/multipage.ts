export const processPageSteps = [
  {
    number: "01",
    title: "Úvodní kontakt",
    text: "Krátce si ujasníme, co právě řešíte, co od spolupráce čekáte a jestli dává smysl jít víc do hloubky.",
    output: "Víte, jestli má smysl situaci řešit detailněji.",
  },
  {
    number: "02",
    title: "Zmapování situace",
    text: "Projdu příjmy, výdaje, rezervy, závazky i existující smlouvy. Cílem není složitý report, ale jasný obraz reality.",
    output: "Vznikne přehled toho, kde jste dnes.",
  },
  {
    number: "03",
    title: "Přehled možností",
    text: "Ukážu, co spolu souvisí, co chybí, co má prioritu a které varianty dávají smysl podle vaší situace.",
    output: "Vidíte, co řešit teď a co může počkat.",
  },
  {
    number: "04",
    title: "Návrh řešení",
    text: "Navrhnu konkrétní kroky, které společně projdeme, vysvětlíme a doladíme tak, aby byly proveditelné.",
    output: "Máte postup, kterému rozumíte.",
  },
  {
    number: "05",
    title: "Dlouhodobá péče",
    text: "Plán nezůstane jednorázový. Průběžně ho upravujeme podle změn v příjmech, rodině, bydlení nebo cílech.",
    output: "Přehled drží krok s vaším životem.",
  },
] as const;

export const aboutPrinciples = [
  {
    title: "Srozumitelně",
    text: "Vysvětlení má být praktické a lidské, ne odborně neprůstřelné.",
  },
  {
    title: "V souvislostech",
    text: "Jednu smlouvu neposuzuji izolovaně od zbytku života a rozpočtu.",
  },
  {
    title: "Dlouhodobě",
    text: "Plán má fungovat i ve chvíli, kdy se vaše situace změní.",
  },
] as const;

export const cnbRegistryUrl =
  "https://jerrs.cnb.cz/apljerrsdad/JERRS.WEB10.VIZITKA?p_lang=cz&p_SEQ_ID=13296729&p_VER_ID=1004&p_DATUM=06.10.2026&p_ROL_KOD=";

export const sabDocumentationUrl = "https://sabservis.cz/informace";

export const contactOptions = [
  {
    label: "E-mail",
    value: "info@pokornydavid.cz",
    href: "mailto:info@pokornydavid.cz",
  },
  {
    label: "Telefon",
    value: "+420 731 830 897",
    href: "tel:+420731830897",
  },
] as const;
