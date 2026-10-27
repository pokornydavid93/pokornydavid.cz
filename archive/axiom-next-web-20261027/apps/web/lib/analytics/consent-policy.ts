import type { AxiomWebPrivacyConfiguration } from "@axiom/web-core";
import type { CookieConsentRecord } from "../../src/app/ui/privacy/cookieConsent";

type AnalyticsConsentPolicy = Pick<AxiomWebPrivacyConfiguration,
  "consent_policy_version" | "consent_grant_ttl_days">;

/** Validate the current browser's consent assertion against the server policy. */
export function hasCurrentAnalyticsConsent(
  value: unknown,
  policy: AnalyticsConsentPolicy,
  now = Date.now(),
): value is CookieConsentRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<CookieConsentRecord>;
  return record.choice === "accepted"
    && record.version === policy.consent_policy_version
    && typeof record.decidedAt === "number"
    && Number.isFinite(record.decidedAt)
    && record.decidedAt > 0
    && record.decidedAt <= now
    && typeof record.expiresAt === "number"
    && Number.isFinite(record.expiresAt)
    && record.expiresAt > now
    && record.expiresAt <= record.decidedAt + policy.consent_grant_ttl_days * 86_400_000;
}
