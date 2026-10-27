import type {
  ArticleScreeningReview,
  ArticleScreeningReviewItem,
} from "./articleScreeningConfigs";

export type ScreeningAnswers = Record<string, string | string[]>;

export function selectedScreeningValues(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function matchesAnswers(
  answers: ScreeningAnswers,
  conditions: NonNullable<ArticleScreeningReviewItem["when"]>,
) {
  return conditions.some((condition) =>
    selectedScreeningValues(answers[condition.questionId]).some((value) =>
      condition.options.includes(value),
    ),
  );
}

/** Select and order topics by relevance, without scoring the visitor or their policy. */
export function getScreeningReviewItems(
  answers: ScreeningAnswers,
  review: ArticleScreeningReview,
): ArticleScreeningReviewItem[] {
  const requested: ArticleScreeningReviewItem[] = [];
  const answerSpecific: ArticleScreeningReviewItem[] = [];
  const remaining: ArticleScreeningReviewItem[] = [];

  for (const item of review.items) {
    if (item.when && !matchesAnswers(answers, item.when)) continue;

    const variant = item.variants?.find((candidate) => matchesAnswers(answers, candidate.when));
    const resolved = variant ? {
      ...item,
      title: variant.title ?? item.title,
      summary: variant.summary ?? item.summary,
      text: variant.text ?? item.text,
    } : item;

    if (item.prioritizeWhen && matchesAnswers(answers, item.prioritizeWhen)) {
      requested.push(resolved);
    } else if (item.when) {
      answerSpecific.push(resolved);
    } else {
      remaining.push(resolved);
    }
  }

  return [...requested, ...answerSpecific, ...remaining];
}

/** Keep every explicitly requested topic visible, including selections beyond the usual three. */
export function getScreeningPrimaryReviewCount(
  answers: ScreeningAnswers,
  items: ArticleScreeningReviewItem[],
) {
  const requestedCount = items.filter((item) =>
    item.prioritizeWhen && matchesAnswers(answers, item.prioritizeWhen),
  ).length;
  return Math.min(items.length, Math.max(3, requestedCount));
}
