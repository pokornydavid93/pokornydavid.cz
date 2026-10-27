const isCanonicalSubmittedAt = (value: string) => {
  if (value.length !== 24) return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
};

export function resolveOverviewSubmittedAt(
  existingSubmittedAt?: string,
  now: () => Date = () => new Date(),
) {
  const submittedAt = existingSubmittedAt ?? now().toISOString();
  return {
    submittedAt,
    valid: existingSubmittedAt === undefined
      || isCanonicalSubmittedAt(existingSubmittedAt),
  };
}
