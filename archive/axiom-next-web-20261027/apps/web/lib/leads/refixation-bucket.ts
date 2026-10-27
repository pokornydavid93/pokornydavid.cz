export const FIXATION_BUCKETS = [
  "expired",
  "active",
  "prepare",
  "nurture",
  "early",
  "unknown",
] as const;

export type FixationBucket = (typeof FIXATION_BUCKETS)[number];

export const REFIXATION_PATHS = [
  "expired-review",
  "active-audit",
  "preparation-audit",
  "reminder",
  "unknown-date",
] as const;

export type RefixationPath = (typeof REFIXATION_PATHS)[number];

export const ACTIVE_REVIEW_MONTHS_BEFORE_FIXATION = 9;

export type FixationBucketInput = {
  month?: number | null;
  year?: number | null;
  unknown?: boolean;
};

export type FixationBucketResult = {
  bucket: FixationBucket;
  monthsUntil: number | null;
  path: RefixationPath;
};

export const getRefixationPath = (bucket: FixationBucket): RefixationPath => {
  switch (bucket) {
    case "expired":
      return "expired-review";
    case "active":
      return "active-audit";
    case "prepare":
      return "preparation-audit";
    case "nurture":
    case "early":
      return "reminder";
    case "unknown":
      return "unknown-date";
  }
};

export const getRecommendedReviewDate = (fixationDate: Date): Date =>
  new Date(
    fixationDate.getFullYear(),
    fixationDate.getMonth() - ACTIVE_REVIEW_MONTHS_BEFORE_FIXATION,
    1,
  );

const czechMonthYearFormatter = new Intl.DateTimeFormat("cs-CZ", {
  month: "long",
  year: "numeric",
});

export const formatCzechMonthYear = (date: Date): string =>
  czechMonthYearFormatter.format(date);

export const formatCzechMonthCount = (months: number): string => {
  if (months === 1) return "1 měsíc";
  if (months >= 2 && months <= 4) return `${months} měsíce`;
  return `${months} měsíců`;
};

const isValidMonth = (month: unknown): month is number =>
  Number.isInteger(month) && Number(month) >= 1 && Number(month) <= 12;

const isValidYear = (year: unknown): year is number =>
  Number.isInteger(year) && Number(year) >= 2000 && Number(year) <= 2100;

export function resolveFixationBucket(
  input: FixationBucketInput,
  baseDate = new Date(),
): FixationBucketResult {
  if (input.unknown) {
    return { bucket: "unknown", monthsUntil: null, path: "unknown-date" };
  }

  const month = input.month;
  const year = input.year;
  if (!isValidMonth(month) || !isValidYear(year)) {
    return { bucket: "unknown", monthsUntil: null, path: "unknown-date" };
  }

  const baseMonth = baseDate.getMonth() + 1;
  const baseYear = baseDate.getFullYear();
  const monthsUntil = (year - baseYear) * 12 + (month - baseMonth);

  if (monthsUntil < 0) {
    return { bucket: "expired", monthsUntil, path: "expired-review" };
  }
  if (monthsUntil <= 6) {
    return { bucket: "active", monthsUntil, path: "active-audit" };
  }
  if (monthsUntil <= 12) {
    return { bucket: "prepare", monthsUntil, path: "preparation-audit" };
  }
  if (monthsUntil <= 18) {
    return { bucket: "nurture", monthsUntil, path: "reminder" };
  }
  return { bucket: "early", monthsUntil, path: "reminder" };
}

export const fixationBucketLabels: Record<FixationBucket, string> = {
  expired: "Kontrola současného nastavení",
  active: "Rozhodovací okno",
  prepare: "Příprava možností",
  nurture: "Doporučený kontrolní termín",
  early: "Vzdálenější časový horizont",
  unknown: "Termín doplníme později",
};

export const fixationBucketTexts: Record<FixationBucket, string> = {
  expired:
    "Pokud fixace skutečně skončila, dává smysl prověřit současné nastavení hypotéky. Pokud šlo o překlep, stačí datum upravit.",
  active:
    "Teď má smysl prověřit nabídku současné banky a připravit srovnatelnou alternativu.",
  prepare:
    "Finální nabídky se mohou ještě změnit. Už teď lze zkontrolovat podklady a určit začátek aktivního porovnávání.",
  nurture:
    "Na konkrétní nabídky je ještě brzy. Nejdůležitější je vrátit se k tématu ve správném kontrolním termínu.",
  early:
    "Dnešní nabídky by do konce fixace zastaraly. Smysl má pohlídat okamžik, kdy se k tématu vrátit.",
  unknown:
    "Konec fixace najdete ve smlouvě nebo internetovém bankovnictví. V auditu lze pokračovat a termín doplnit později.",
};
