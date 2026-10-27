import type {
  CallbackWindow,
  RefixationPriority,
  RemainingBalanceBand,
} from "@/lib/leads/refixation-request";
import { WEB_PRIVACY_NOTICE_VERSION } from "@/lib/privacy/policy";

export const refixationPrivacyNoticeVersion = WEB_PRIVACY_NOTICE_VERSION;

export const monthOptions = [
  { value: "1", label: "Leden" },
  { value: "2", label: "Únor" },
  { value: "3", label: "Březen" },
  { value: "4", label: "Duben" },
  { value: "5", label: "Květen" },
  { value: "6", label: "Červen" },
  { value: "7", label: "Červenec" },
  { value: "8", label: "Srpen" },
  { value: "9", label: "Září" },
  { value: "10", label: "Říjen" },
  { value: "11", label: "Listopad" },
  { value: "12", label: "Prosinec" },
] as const;

export const remainingBalanceOptions: ReadonlyArray<{
  value: RemainingBalanceBand;
  label: string;
}> = [
  { value: "under-1m", label: "Méně než 1 mil. Kč" },
  { value: "1-2m", label: "1-2 mil. Kč" },
  { value: "2-4m", label: "2-4 mil. Kč" },
  { value: "4-6m", label: "4-6 mil. Kč" },
  { value: "over-6m", label: "Více než 6 mil. Kč" },
  { value: "prefer-not", label: "Nechci uvádět" },
];

export const priorityOptions: ReadonlyArray<{
  value: RefixationPriority;
  label: string;
}> = [
  {
    value: "lower-or-keep-payment",
    label: "Snížit nebo udržet měsíční splátku",
  },
  { value: "longer-certainty", label: "Získat delší jistotu" },
  { value: "repay-faster", label: "Splatit hypotéku rychleji" },
  {
    value: "compare-options",
    label: "Porovnat možnosti bez jasné preference",
  },
  { value: "unknown", label: "Zatím nevím" },
];

export const callbackWindowOptions: ReadonlyArray<{
  value: CallbackWindow;
  label: string;
}> = [
  { value: "morning", label: "Dopoledne" },
  { value: "midday", label: "Kolem oběda" },
  { value: "afternoon", label: "Odpoledne" },
  { value: "evening", label: "Podvečer" },
];

export const callbackWindowLabels: Record<CallbackWindow, string> = {
  morning: "dopoledne",
  midday: "kolem oběda",
  afternoon: "odpoledne",
  evening: "v podvečer",
};

export const decisionWindowSegments = [
  {
    label: "Dnes",
    detail: "Základní orientace bez kontaktu",
    tone: "base",
  },
  {
    label: "Příprava",
    detail: "Podklady, termín a nabídka banky",
    tone: "calm",
  },
  {
    label: "Rozhodovací okno",
    detail: "Současná banka, vyjednání, alternativa",
    tone: "active",
  },
  {
    label: "Konec fixace",
    detail: "Rozhodnutí musí být časově bezpečné",
    tone: "deadline",
  },
  {
    label: "Další postup",
    detail: "Jednostránkový plán kroků",
    tone: "base",
  },
] as const;

export const threePaths = [
  {
    title: "Zůstat u současné banky",
    text: "Pokud nabídka a nastavení dávají po ověření smysl, změna banky nemusí být cílem.",
  },
  {
    title: "Vyjednat nové podmínky",
    text: "Někdy stačí včasná příprava a srovnatelný argument pro jednání se současnou bankou.",
  },
  {
    title: "Připravit refinancování",
    text: "Pokud alternativa dává smysl, je potřeba hlídat termíny, podklady a návaznost kroků.",
  },
] as const;

export const checklist = [
  "Datum konce fixace",
  "Aktuální zůstatek",
  "Zbývající splatnost",
  "Nabídka banky, pokud už existuje",
  "Hlavní priorita domácnosti",
] as const;

export const faqItems = [
  {
    question: "Kdy je vhodné začít řešit konec fixace?",
    answer:
      "První orientaci má smysl udělat dřív, než přijde finální tlak na rozhodnutí. Diagnostika rozliší, jestli jste v aktivním okně, v přípravě, nebo zatím stačí hlídat kontrolní termín.",
  },
  {
    question: "Znamená kontrola, že musím změnit banku?",
    answer:
      "Ne. Jednou z možných cest je zůstat u současné banky. Cílem auditu je ověřit čas, podklady a dostupné varianty, ne automaticky vybírat novou banku.",
  },
  {
    question: "Je první konzultace závazná?",
    answer:
      "Odeslání diagnostiky je žádost o kontakt k této konkrétní poptávce. Není to souhlas s produktem, změnou banky ani individuálním doporučením.",
  },
  {
    question: "Jaké podklady budu potřebovat?",
    answer:
      "Pro první ověření pomůže datum konce fixace, aktuální zůstatek, zbývající splatnost, případná nabídka banky a hlavní priorita domácnosti. Dokumenty přes tento formulář neposílejte.",
  },
  {
    question: "Co když přesné datum fixace neznám?",
    answer:
      "V diagnostice můžete označit, že termín neznáte. Při navazujícím kontaktu vám pomohu určit, kde datum ověřit ve smlouvě nebo internetovém bankovnictví.",
  },
  {
    question: "Jak bude probíhat další kontakt?",
    answer:
      "Po úspěšném odeslání se vám zobrazí potvrzení. Potom projdu zadané informace a ozvu se preferovaným způsobem. Konkrétní termín tím ještě není rezervovaný.",
  },
  // TODO(business/compliance): Restore a remuneration FAQ only after approved,
  // David-specific canonical copy is available.
] as const;
