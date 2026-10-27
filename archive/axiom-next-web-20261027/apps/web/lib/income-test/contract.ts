/** All money values are whole CZK. K includes every commitment except the mortgage. */
export type IncomeTestInput = {
  incomeA: number;
  incomeB: number;
  mortgagePayment: number;
  essentialCosts: number;
  reserve: number;
  targetMonths: 3 | 6 | 12;
  remainingIncomeA?: number;
  remainingIncomeB?: number;
};

export type NormalizedIncomeTestInput = Required<IncomeTestInput>;
export type IncomeTestInputField = keyof IncomeTestInput;
export type IncomeTestValidationErrors = Partial<
  Record<IncomeTestInputField | "form", string>
>;

export type IncomeTestValidationResult =
  | { success: true; data: NormalizedIncomeTestInput }
  | { success: false; errors: IncomeTestValidationErrors };

export type IncomeTestScenario = {
  remainingBalance: number;
  deficit: number;
  /** Null means the scenario has no monthly deficit, not unlimited savings. */
  reserveMonths: number | null;
  requiredReserve: number;
  reserveGap: number;
  /** Whether the supplied reserve covers the chosen period in this scenario. */
  targetCovered: boolean;
};

export type IncomeTestResult = {
  todayBalance: number;
  /** Only income A changes; income B stays at its current amount. */
  scenarioA: IncomeTestScenario;
  /** Only income B changes; income A stays at its current amount. */
  scenarioB: IncomeTestScenario;
};

export const INCOME_TEST_TARGET_MONTHS = [3, 6, 12] as const;

// Explicit household-calculator input limits keep every CZK sum and product
// far below Number.MAX_SAFE_INTEGER. They are not lending eligibility limits.
export const INCOME_TEST_MAX_MONTHLY_AMOUNT = 10_000_000;
export const INCOME_TEST_MAX_RESERVE = 1_000_000_000;

const requiredAmountFields = [
  "incomeA",
  "incomeB",
  "mortgagePayment",
  "essentialCosts",
  "reserve",
] as const;
const optionalAmountFields = ["remainingIncomeA", "remainingIncomeB"] as const;
const allowedFields = new Set<string>([
  ...requiredAmountFields,
  ...optionalAmountFields,
  "targetMonths",
]);

/** Validate numeric values without coercing blanks, strings, or null to money. */
export function validateIncomeTestInput(input: unknown): IncomeTestValidationResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { success: false, errors: { form: "Vyplňte údaje pro výpočet." } };
  }

  const values = input as Record<string, unknown>;
  const errors: IncomeTestValidationErrors = {};
  const amounts: Partial<Record<(typeof requiredAmountFields)[number] | (typeof optionalAmountFields)[number], number>> = {};

  if (Object.keys(values).some((field) => !allowedFields.has(field))) {
    errors.form = "Výpočet obsahuje nepodporované údaje.";
  }

  for (const field of [...requiredAmountFields, ...optionalAmountFields]) {
    const optional = field === "remainingIncomeA" || field === "remainingIncomeB";
    const raw = Object.prototype.hasOwnProperty.call(values, field)
      ? values[field]
      : undefined;
    const value = optional && raw === undefined ? 0 : raw;
    const maximum = field === "reserve"
      ? INCOME_TEST_MAX_RESERVE
      : INCOME_TEST_MAX_MONTHLY_AMOUNT;

    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
      errors[field] = "Zadejte částku v celých korunách, nejméně 0 Kč.";
    } else if (value > maximum) {
      errors[field] = field === "reserve"
        ? "Zadejte rezervu nejvýše 1 000 000 000 Kč."
        : "Zadejte měsíční částku nejvýše 10 000 000 Kč.";
    } else {
      amounts[field] = value === 0 ? 0 : value;
    }
  }

  const targetMonths = Object.prototype.hasOwnProperty.call(values, "targetMonths")
    ? values.targetMonths
    : undefined;
  if (targetMonths !== 3 && targetMonths !== 6 && targetMonths !== 12) {
    errors.targetMonths = "Vyberte období 3, 6 nebo 12 měsíců.";
  }

  for (const [current, remaining] of [
    ["incomeA", "remainingIncomeA"],
    ["incomeB", "remainingIncomeB"],
  ] as const) {
    const currentAmount = amounts[current];
    const remainingAmount = amounts[remaining];
    if (currentAmount !== undefined && remainingAmount !== undefined && remainingAmount > currentAmount) {
      errors[remaining] = "Příjem po snížení nemůže být vyšší než současný příjem této osoby.";
    }
  }

  if (Object.keys(errors).length > 0) return { success: false, errors };

  // Every required amount and the target period passed the checks above.
  return {
    success: true,
    data: { ...amounts, targetMonths } as NormalizedIncomeTestInput,
  };
}
