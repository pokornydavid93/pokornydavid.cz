import {
  validateIncomeTestInput,
  type IncomeTestInput,
  type IncomeTestResult,
  type IncomeTestScenario,
} from "./contract.ts";

function calculateScenario(
  remainingBalance: number,
  reserve: number,
  targetMonths: IncomeTestInput["targetMonths"],
): IncomeTestScenario {
  const deficit = Math.max(0, -remainingBalance);
  const requiredReserve = deficit * targetMonths;
  const reserveGap = Math.max(0, requiredReserve - reserve);

  return {
    remainingBalance,
    deficit,
    // Keep the ratio unrounded. Presentation must not change target coverage.
    reserveMonths: deficit > 0 ? reserve / deficit : null,
    requiredReserve,
    reserveGap,
    targetCovered: reserveGap === 0,
  };
}

/** Pure budget comparison; this does not evaluate mortgage approval or safety. */
export function calculateIncomeTest(input: IncomeTestInput): IncomeTestResult {
  const validation = validateIncomeTestInput(input);
  if (!validation.success) {
    throw new TypeError("Neplatné údaje pro výpočet Testu jednoho příjmu.");
  }

  const {
    incomeA,
    incomeB,
    mortgagePayment,
    essentialCosts,
    reserve,
    targetMonths,
    remainingIncomeA,
    remainingIncomeB,
  } = validation.data;
  // essentialCosts is the complete K amount, including other loan payments.
  const monthlyCosts = mortgagePayment + essentialCosts;

  return {
    todayBalance: incomeA + incomeB - monthlyCosts,
    scenarioA: calculateScenario(
      remainingIncomeA + incomeB - monthlyCosts,
      reserve,
      targetMonths,
    ),
    scenarioB: calculateScenario(
      incomeA + remainingIncomeB - monthlyCosts,
      reserve,
      targetMonths,
    ),
  };
}
