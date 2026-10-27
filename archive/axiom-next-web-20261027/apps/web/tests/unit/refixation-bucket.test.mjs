import assert from "node:assert/strict";
import { describe, it } from "node:test";

const {
  ACTIVE_REVIEW_MONTHS_BEFORE_FIXATION,
  formatCzechMonthCount,
  formatCzechMonthYear,
  getRecommendedReviewDate,
  resolveFixationBucket,
} = await import(
  "../../lib/leads/refixation-bucket.ts"
);

const base = new Date(2026, 6, 14);

describe("resolveFixationBucket", () => {
  it("assigns expired for a date in the past", () => {
    const result = resolveFixationBucket({ month: 6, year: 2026 }, base);
    assert.equal(result.monthsUntil, -1);
    assert.equal(result.bucket, "expired");
    assert.equal(result.path, "expired-review");
  });

  it("assigns active for the current month, 1 month and 6 months", () => {
    const currentMonth = resolveFixationBucket({ month: 7, year: 2026 }, base);
    assert.equal(currentMonth.bucket, "active");
    assert.equal(currentMonth.path, "active-audit");
    assert.equal(resolveFixationBucket({ month: 8, year: 2026 }, base).bucket, "active");
    assert.equal(resolveFixationBucket({ month: 9, year: 2026 }, base).bucket, "active");
    assert.equal(resolveFixationBucket({ month: 1, year: 2027 }, base).bucket, "active");
  });

  it("assigns prepare for 7 and 12 months", () => {
    const sevenMonths = resolveFixationBucket({ month: 2, year: 2027 }, base);
    assert.equal(sevenMonths.bucket, "prepare");
    assert.equal(sevenMonths.path, "preparation-audit");
    assert.equal(resolveFixationBucket({ month: 7, year: 2027 }, base).bucket, "prepare");
  });

  it("assigns nurture for 13 and 18 months", () => {
    const thirteenMonths = resolveFixationBucket({ month: 8, year: 2027 }, base);
    assert.equal(thirteenMonths.bucket, "nurture");
    assert.equal(thirteenMonths.path, "reminder");
    assert.equal(resolveFixationBucket({ month: 1, year: 2028 }, base).bucket, "nurture");
  });

  it("assigns early for 19 and 42 months", () => {
    const nineteenMonths = resolveFixationBucket({ month: 2, year: 2028 }, base);
    assert.equal(nineteenMonths.bucket, "early");
    assert.equal(nineteenMonths.path, "reminder");
    assert.equal(resolveFixationBucket({ month: 1, year: 2030 }, base).monthsUntil, 42);
    assert.equal(resolveFixationBucket({ month: 1, year: 2030 }, base).bucket, "early");
  });

  it("handles unknown and invalid dates", () => {
    const unknown = resolveFixationBucket({ unknown: true }, base);
    assert.equal(unknown.bucket, "unknown");
    assert.equal(unknown.path, "unknown-date");
    assert.equal(resolveFixationBucket({ month: 13, year: 2027 }, base).bucket, "unknown");
  });

  it("handles the December to January transition", () => {
    const december = new Date(2026, 11, 10);
    const result = resolveFixationBucket({ month: 1, year: 2027 }, december);
    assert.equal(result.monthsUntil, 1);
    assert.equal(result.bucket, "active");
  });
});

describe("recommended review date", () => {
  it("uses one explicit review offset", () => {
    assert.equal(ACTIVE_REVIEW_MONTHS_BEFORE_FIXATION, 9);
    const reviewDate = getRecommendedReviewDate(new Date(2028, 0, 1));
    assert.equal(reviewDate.getFullYear(), 2027);
    assert.equal(reviewDate.getMonth(), 3);
  });

  it("handles the December to January transition", () => {
    const reviewDate = getRecommendedReviewDate(new Date(2027, 0, 1));
    assert.equal(reviewDate.getFullYear(), 2026);
    assert.equal(reviewDate.getMonth(), 3);
  });

  it("formats Czech month and year", () => {
    assert.equal(formatCzechMonthYear(new Date(2027, 3, 1)), "duben 2027");
  });
});

describe("Czech month count", () => {
  it("uses the correct Czech forms", () => {
    assert.equal(formatCzechMonthCount(0), "0 měsíců");
    assert.equal(formatCzechMonthCount(1), "1 měsíc");
    assert.equal(formatCzechMonthCount(2), "2 měsíce");
    assert.equal(formatCzechMonthCount(4), "4 měsíce");
    assert.equal(formatCzechMonthCount(5), "5 měsíců");
    assert.equal(formatCzechMonthCount(42), "42 měsíců");
  });
});
