import type {
  OverviewNextStep,
  OverviewSource,
  SituationId,
} from "../homepage/types";
import type {
  LeadIntent,
  LeadSourceContext,
  LeadTopic,
} from "../leads/lead-contract";

export type AnalyticsEvent =
  | {
      name: "home_primary_cta_click";
      placement: "header" | "hero" | "outcome" | "references" | "final";
    }
  | {
      name: "home_situation_select";
      source: OverviewSource;
      destination: string;
      intent?: SituationId;
    }
  | { name: "lead_flow_start"; source: OverviewSource; intent?: SituationId }
  | { name: "lead_flow_view"; source: OverviewSource; intent?: SituationId }
  | { name: "lead_flow_situation_select"; source: OverviewSource; intent: SituationId }
  | { name: "lead_flow_contact_step_view"; source: OverviewSource; intent?: SituationId }
  | {
      name: "lead_flow_contact_channel_select";
      source: OverviewSource;
      channel: "email" | "phone";
    }
  | { name: "lead_flow_submit_attempt"; source: OverviewSource }
  | {
      name: "lead_flow_validation_error";
      fieldIds: string[];
      errorCount: number;
    }
  | {
      name: "lead_flow_submit_success";
      source: OverviewSource;
      intent?: SituationId;
      nextStep: OverviewNextStep;
    }
  | {
      name: "lead_flow_submit_error";
      source: OverviewSource;
      reason: "invalid" | "provider-unavailable" | "rate-limited" | "duplicate-or-ambiguous";
    }
  | {
      name: "lead_flow_direct_contact_click";
      channel: "email" | "phone";
      placement: "header" | "form" | "error" | "success";
    }
  | {
      name: "lead_form_view";
      source: LeadSourceContext;
      intent?: LeadIntent;
      topic?: LeadTopic;
    }
  | {
      name: "lead_intent_selected";
      source: LeadSourceContext;
      intent: LeadIntent;
      topic?: LeadTopic;
    }
  | {
      name: "lead_step_completed";
      source: LeadSourceContext;
      intent: LeadIntent;
      topic?: LeadTopic;
      step: 1 | 2;
    }
  | {
      name: "lead_contact_step_view";
      source: LeadSourceContext;
      intent: LeadIntent;
      topic?: LeadTopic;
    }
  | {
      name: "lead_submit_attempt";
      source: LeadSourceContext;
      intent: LeadIntent;
      topic?: LeadTopic;
    }
  | {
      name: "lead_validation_error";
      source: LeadSourceContext;
      intent: LeadIntent;
      topic?: LeadTopic;
      fieldIds: Array<(typeof ANALYTICS_LEAD_FIELD_IDS)[number]>;
    }
  | {
      name: "lead_submit_success";
      source: LeadSourceContext;
      intent: LeadIntent;
      topic?: LeadTopic;
    }
  | {
      name: "lead_submit_error";
      source: LeadSourceContext;
      intent?: LeadIntent;
      topic?: LeadTopic;
      reason: "invalid" | "provider-unavailable" | "rate-limited" | "duplicate-or-ambiguous";
    }
  | { name: "booking_start"; source: "thank-you" }
  | { name: "booking_complete"; source: "thank-you" };

export const ANALYTICS_FIELD_IDS = [
  "situation",
  "contact",
  "name",
  "email",
  "phone",
  "preferredContactChannel",
  "nextStep",
] as const;

// Field identifiers only. Never send the contact details or free-text values.
export const ANALYTICS_LEAD_FIELD_IDS = [
  "phone",
  "email",
  "firstName",
  "situationNote",
] as const;

const allowedLeadFieldIds = new Set<string>(ANALYTICS_LEAD_FIELD_IDS);

export function sanitizeLeadValidationFieldIds(fieldIds: readonly string[]) {
  if (!Array.isArray(fieldIds)) return [];
  return [...new Set(fieldIds.filter(
    (fieldId): fieldId is (typeof ANALYTICS_LEAD_FIELD_IDS)[number] =>
      allowedLeadFieldIds.has(fieldId),
  ))];
}

export const ANALYTICS_PLACEMENTS = [
  "header",
  "hero",
  "outcome",
  "references",
  "final",
] as const;
export const ANALYTICS_CONTACT_PLACEMENTS = ["header", "form", "error", "success"] as const;
export const ANALYTICS_ERROR_REASONS = [
  "invalid",
  "provider-unavailable",
  "rate-limited",
  "duplicate-or-ambiguous",
] as const;
