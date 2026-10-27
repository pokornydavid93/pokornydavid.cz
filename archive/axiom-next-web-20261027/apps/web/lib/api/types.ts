export { LEAD_TOPICS } from "@axiom-dp/contracts/lead";
export type { LeadSubmitResponse, LeadTopic } from "@axiom-dp/contracts/lead";
import type { LeadFormPayload as LegacyLeadFormPayload } from "@axiom-dp/contracts/lead";

// Each form must supply the revision it actually displays. The API client must
// not silently assign today's notice to older callers.
export type LeadFormPayload = LegacyLeadFormPayload & { privacy_notice_version: string };
