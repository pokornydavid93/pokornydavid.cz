/** Syntax only: the canonical intake independently verifies the domain binding. */
export function isCanonicalProjectPublicHost(hostname: string): boolean {
  if (!hostname || hostname.length > 253 || hostname !== hostname.toLowerCase()) return false;
  const labels = hostname.split(".");
  return labels.length >= 2 && /[a-z]/u.test(labels.at(-1) ?? "")
    && labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label));
}
