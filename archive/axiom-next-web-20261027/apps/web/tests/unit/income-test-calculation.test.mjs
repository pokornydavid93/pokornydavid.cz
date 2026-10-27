import assert from "node:assert/strict";
import test from "node:test";

import { calculateIncomeTest } from "../../lib/income-test/calculation.ts";
import {
  INCOME_TEST_MAX_MONTHLY_AMOUNT,
  INCOME_TEST_MAX_RESERVE,
  validateIncomeTestInput,
} from "../../lib/income-test/contract.ts";

// The campaign's documented example: 22,000 CZK living costs plus 3,000 CZK
// other commitments are a single 25,000 CZK K input, separate from the mortgage.
const example = {
  incomeA: 45_000,
  incomeB: 35_000,
  mortgagePayment: 25_000,
  essentialCosts: 25_000,
  reserve: 60_000,
  targetMonths: 6,
};

test("matches the campaign example and includes other commitments exactly once", () => {
  assert.deepEqual(calculateIncomeTest(example), {
    todayBalance: 30_000,
    scenarioA: {
      remainingBalance: -15_000,
      deficit: 15_000,
      reserveMonths: 4,
      requiredReserve: 90_000,
      reserveGap: 30_000,
      targetCovered: false,
    },
    scenarioB: {
      remainingBalance: -5_000,
      deficit: 5_000,
      reserveMonths: 12,
      requiredReserve: 30_000,
      reserveGap: 0,
      targetCovered: true,
    },
  });
});

test("replaces only the reduced person's income, independently for each scenario", () => {
  const result = calculateIncomeTest({
    ...example,
    remainingIncomeA: 10_000,
    remainingIncomeB: 5_000,
  });
  assert.equal(result.todayBalance, 30_000);
  assert.equal(result.scenarioA.remainingBalance, -5_000);
  assert.equal(result.scenarioA.reserveMonths, 12);
  assert.equal(result.scenarioB.remainingBalance, 0);
  assert.equal(result.scenarioB.reserveMonths, null);
});

test("no deficit needs no reserve even when the reserve is zero", () => {
  const result = calculateIncomeTest({
    ...example,
    mortgagePayment: 10_000,
    essentialCosts: 25_000,
    reserve: 0,
  });
  assert.deepEqual(result.scenarioA, {
    remainingBalance: 0,
    deficit: 0,
    reserveMonths: null,
    requiredReserve: 0,
    reserveGap: 0,
    targetCovered: true,
  });
  assert.equal(result.scenarioB.remainingBalance, 10_000);
  assert.equal(result.scenarioB.reserveMonths, null);
  assert.equal(result.scenarioB.targetCovered, true);
  assert.ok(!JSON.stringify(result).includes("Infinity"));
});

test("a deficit with no reserve lasts zero months", () => {
  const result = calculateIncomeTest({ ...example, reserve: 0 });
  assert.equal(result.scenarioA.reserveMonths, 0);
  assert.equal(result.scenarioA.reserveGap, 90_000);
  assert.equal(result.scenarioA.targetCovered, false);
});

test("allows zero current incomes and a zero mortgage without a lending verdict", () => {
  const result = calculateIncomeTest({
    incomeA: 0,
    incomeB: 0,
    mortgagePayment: 0,
    essentialCosts: 1_000,
    reserve: 3_000,
    targetMonths: 3,
  });
  assert.equal(result.todayBalance, -1_000);
  assert.equal(result.scenarioA.reserveMonths, 3);
  assert.equal(result.scenarioA.targetCovered, true);
  assert.deepEqual(result.scenarioA, result.scenarioB);
});

test("all-zero amounts produce finite balances and no division by zero", () => {
  const result = calculateIncomeTest({
    incomeA: 0,
    incomeB: 0,
    mortgagePayment: 0,
    essentialCosts: 0,
    reserve: 0,
    targetMonths: 12,
  });
  assert.equal(result.todayBalance, 0);
  assert.equal(result.scenarioA.reserveMonths, null);
  assert.equal(result.scenarioA.reserveGap, 0);
  assert.equal(result.scenarioA.targetCovered, true);
});

test("coverage uses exact CZK even when the displayed month count could round up", () => {
  for (const targetMonths of [3, 6, 12]) {
    const requiredReserve = 15_000 * targetMonths;
    const short = calculateIncomeTest({ ...example, targetMonths, reserve: requiredReserve - 1 });
    const exact = calculateIncomeTest({ ...example, targetMonths, reserve: requiredReserve });
    assert.equal(short.scenarioA.reserveGap, 1);
    assert.equal(short.scenarioA.targetCovered, false);
    assert.ok(short.scenarioA.reserveMonths < targetMonths);
    assert.equal(exact.scenarioA.reserveMonths, targetMonths);
    assert.equal(exact.scenarioA.reserveGap, 0);
    assert.equal(exact.scenarioA.targetCovered, true);
  }
});

test("reducing the mortgage changes both deficits and reserve durations coherently", () => {
  const result = calculateIncomeTest({ ...example, mortgagePayment: 20_000 });
  assert.equal(result.todayBalance, 35_000);
  assert.equal(result.scenarioA.deficit, 10_000);
  assert.equal(result.scenarioA.reserveMonths, 6);
  assert.equal(result.scenarioA.targetCovered, true);
  assert.equal(result.scenarioB.deficit, 0);
  assert.equal(result.scenarioB.reserveMonths, null);
});

test("switching the people switches the scenarios without changing today's budget", () => {
  const input = { ...example, remainingIncomeA: 3_000, remainingIncomeB: 8_000 };
  const original = calculateIncomeTest(input);
  const swapped = calculateIncomeTest({
    ...input,
    incomeA: input.incomeB,
    incomeB: input.incomeA,
    remainingIncomeA: input.remainingIncomeB,
    remainingIncomeB: input.remainingIncomeA,
  });
  assert.equal(swapped.todayBalance, original.todayBalance);
  assert.deepEqual(swapped.scenarioA, original.scenarioB);
  assert.deepEqual(swapped.scenarioB, original.scenarioA);
});

test("validation fills only optional amounts and never mutates the input", () => {
  const input = Object.freeze({ ...example });
  const validated = validateIncomeTestInput(input);
  assert.deepEqual(validated, {
    success: true,
    data: { ...example, remainingIncomeA: 0, remainingIncomeB: 0 },
  });
  calculateIncomeTest(input);
  assert.equal(Object.hasOwn(input, "remainingIncomeA"), false);
  const negativeZero = validateIncomeTestInput({ ...example, reserve: -0 });
  assert.equal(negativeZero.success, true);
  assert.equal(Object.is(negativeZero.data.reserve, -0), false);
});

test("rejects malformed shapes, unknown fields, and missing required inputs", () => {
  for (const input of [null, undefined, [], "", 0, true, new Date()]) {
    assert.equal(validateIncomeTestInput(input).success, false);
  }
  assert.equal(validateIncomeTestInput({ ...example, otherDebt: 3_000 }).success, false);
  for (const field of Object.keys(example)) {
    const input = { ...example };
    delete input[field];
    const validated = validateIncomeTestInput(input);
    assert.equal(validated.success, false);
    assert.ok(validated.errors[field]);
  }
  assert.equal(validateIncomeTestInput(Object.create(example)).success, false);
});

test("rejects coercible, fractional, negative, and non-finite money in every field", () => {
  const fields = [
    "incomeA", "incomeB", "mortgagePayment", "essentialCosts", "reserve",
    "remainingIncomeA", "remainingIncomeB",
  ];
  for (const field of fields) {
    for (const value of ["45000", "", " ", null, false, [], {}, -1, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      const validated = validateIncomeTestInput({ ...example, [field]: value });
      assert.equal(validated.success, false, `${field}: ${String(value)}`);
      assert.ok(validated.errors[field]);
    }
  }
});

test("accepts only the three explicit numeric target periods", () => {
  for (const targetMonths of [3, 6, 12]) {
    assert.equal(validateIncomeTestInput({ ...example, targetMonths }).success, true);
  }
  for (const targetMonths of [0, 1, 4, 24, -3, 3.5, "6", null, NaN, Infinity]) {
    const validated = validateIncomeTestInput({ ...example, targetMonths });
    assert.equal(validated.success, false);
    assert.ok(validated.errors.targetMonths);
  }
});

test("remaining income can equal but cannot exceed that person's current income", () => {
  const unchanged = calculateIncomeTest({
    ...example,
    remainingIncomeA: example.incomeA,
    remainingIncomeB: example.incomeB,
  });
  assert.equal(unchanged.scenarioA.remainingBalance, unchanged.todayBalance);
  assert.equal(unchanged.scenarioB.remainingBalance, unchanged.todayBalance);
  for (const [field, value] of [["remainingIncomeA", 45_001], ["remainingIncomeB", 35_001]]) {
    const validated = validateIncomeTestInput({ ...example, [field]: value });
    assert.equal(validated.success, false);
    assert.ok(validated.errors[field]);
  }
  assert.equal(validateIncomeTestInput({ ...example, incomeA: 0, remainingIncomeA: 1 }).success, false);
});

test("explicit amount limits bound arithmetic without rejecting the exact limits", () => {
  const largest = {
    incomeA: INCOME_TEST_MAX_MONTHLY_AMOUNT,
    incomeB: INCOME_TEST_MAX_MONTHLY_AMOUNT,
    mortgagePayment: INCOME_TEST_MAX_MONTHLY_AMOUNT,
    essentialCosts: INCOME_TEST_MAX_MONTHLY_AMOUNT,
    reserve: INCOME_TEST_MAX_RESERVE,
    targetMonths: 12,
  };
  assert.equal(validateIncomeTestInput(largest).success, true);
  const result = calculateIncomeTest(largest);
  assert.equal(result.todayBalance, 0);
  assert.equal(result.scenarioA.requiredReserve, 120_000_000);
  assert.ok(Number.isSafeInteger(result.scenarioA.requiredReserve));
  for (const field of ["incomeA", "incomeB", "mortgagePayment", "essentialCosts", "remainingIncomeA", "remainingIncomeB"]) {
    const validated = validateIncomeTestInput({ ...largest, [field]: INCOME_TEST_MAX_MONTHLY_AMOUNT + 1 });
    assert.equal(validated.success, false);
    assert.ok(validated.errors[field]);
  }
  const tooMuchReserve = validateIncomeTestInput({ ...largest, reserve: INCOME_TEST_MAX_RESERVE + 1 });
  assert.equal(tooMuchReserve.success, false);
  assert.ok(tooMuchReserve.errors.reserve);
});

test("calculation rejects invalid runtime input even without a separate validation call", () => {
  assert.throws(() => calculateIncomeTest({ ...example, incomeA: "45000" }), TypeError);
  assert.throws(() => calculateIncomeTest({ ...example, essentialCosts: -1 }), TypeError);
});
