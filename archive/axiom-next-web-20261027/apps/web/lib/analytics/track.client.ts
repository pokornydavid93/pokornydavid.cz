"use client";

import {
  isKnownInternalHref,
  isOverviewSource,
  isSituationId,
} from "../homepage/routing";
import {
  isLeadIntent,
  isLeadSourceContext,
  isLeadTopic,
} from "../leads/lead-contract";
import type { AnalyticsEvent } from "./events";
import { queueAxiomAnalyticsEvent } from "./axiom-first-party.client";
import {
  ANALYTICS_CONTACT_PLACEMENTS,
  ANALYTICS_ERROR_REASONS,
  ANALYTICS_FIELD_IDS,
  ANALYTICS_PLACEMENTS,
  sanitizeLeadValidationFieldIds,
} from "./events";
import { canSendAnalytics } from "./runtime.client";
import {
  gaEvent,
  isGaAvailable,
  type GAParams,
} from "@/src/app/ui/privacy/lib/ga";

const fieldIds = new Set<string>(ANALYTICS_FIELD_IDS);
const placements = new Set<string>(ANALYTICS_PLACEMENTS);
const nextSteps = new Set(["contact-me", "choose-date"]);
const channels = new Set(["email", "phone"]);
const contactPlacements = new Set<string>(ANALYTICS_CONTACT_PLACEMENTS);
const errorReasons = new Set<string>(ANALYTICS_ERROR_REASONS);

const intentDimensionApproved =
  process.env.NEXT_PUBLIC_ANALYTICS_INTENT_DIMENSION === "approved";

export const analyticsCanSend = canSendAnalytics;

const dispatchAnalyticsEvent = (
  event: AnalyticsEvent,
  dimensions: GAParams,
) => {
  const firstPartyQueued = queueAxiomAnalyticsEvent(event);
  const gaAvailable = isGaAvailable();
  if (gaAvailable) {
    gaEvent(event.name, dimensions);
  }
  return firstPartyQueued || gaAvailable;
};

export function trackAnalyticsEvent(event: AnalyticsEvent): boolean {
  if (!analyticsCanSend()) return false;

  switch (event.name) {
    case "home_primary_cta_click":
      if (!placements.has(event.placement)) return false;
      return dispatchAnalyticsEvent(event, { placement: event.placement });
    case "home_situation_select":
      if (!isOverviewSource(event.source) || !isKnownInternalHref(event.destination)) {
        return false;
      }
      return dispatchAnalyticsEvent(event, {
        source: event.source,
        ...(intentDimensionApproved && event.intent && isSituationId(event.intent)
          ? { intent: event.intent }
          : {}),
      });
    case "lead_flow_start":
    case "lead_flow_view":
    case "lead_flow_contact_step_view":
      if (!isOverviewSource(event.source)) return false;
      return dispatchAnalyticsEvent(event, {
        source: event.source,
        ...(intentDimensionApproved && event.intent && isSituationId(event.intent)
          ? { intent: event.intent }
          : {}),
      });
    case "lead_flow_situation_select":
      if (!isOverviewSource(event.source) || !isSituationId(event.intent)) return false;
      return dispatchAnalyticsEvent(event, {
        source: event.source,
        ...(intentDimensionApproved ? { intent: event.intent } : {}),
      });
    case "lead_flow_contact_channel_select":
      if (!isOverviewSource(event.source) || !channels.has(event.channel)) return false;
      return dispatchAnalyticsEvent(event, {
        source: event.source,
        channel: event.channel,
      });
    case "lead_flow_submit_attempt":
      if (!isOverviewSource(event.source)) return false;
      return dispatchAnalyticsEvent(event, { source: event.source });
    case "lead_flow_validation_error": {
      const safeFieldIds = [...new Set(event.fieldIds.filter((id) => fieldIds.has(id)))];
      return dispatchAnalyticsEvent(event, {
        field_ids: safeFieldIds,
        error_count: safeFieldIds.length,
      });
    }
    case "lead_flow_submit_success":
      if (!isOverviewSource(event.source) || !nextSteps.has(event.nextStep)) return false;
      return dispatchAnalyticsEvent(event, {
        source: event.source,
        next_step: event.nextStep,
        ...(intentDimensionApproved && event.intent && isSituationId(event.intent)
          ? { intent: event.intent }
          : {}),
      });
    case "lead_flow_submit_error":
      if (!isOverviewSource(event.source) || !errorReasons.has(event.reason)) return false;
      return dispatchAnalyticsEvent(event, {
        source: event.source,
        reason: event.reason,
      });
    case "lead_flow_direct_contact_click":
      if (!channels.has(event.channel) || !contactPlacements.has(event.placement)) return false;
      return dispatchAnalyticsEvent(event, {
        channel: event.channel,
        placement: event.placement,
      });
    case "lead_form_view":
    case "lead_intent_selected":
    case "lead_step_completed":
    case "lead_contact_step_view":
    case "lead_submit_attempt":
    case "lead_submit_success": {
      if (!isLeadSourceContext(event.source)) return false;
      if (event.intent === undefined) {
        if (event.name !== "lead_form_view") return false;
      } else if (!isLeadIntent(event.intent)) {
        return false;
      }
      if (event.topic && !isLeadTopic(event.topic)) return false;
      return dispatchAnalyticsEvent(event, {
        source: event.source,
        ...(event.intent ? { intent: event.intent } : {}),
        ...(event.topic ? { topic: event.topic } : {}),
        ...("step" in event ? { step: event.step } : {}),
      });
    }
    case "lead_validation_error": {
      if (
        !isLeadSourceContext(event.source)
        || !isLeadIntent(event.intent)
        || (event.topic && !isLeadTopic(event.topic))
      ) {
        return false;
      }
      const safeFieldIds = sanitizeLeadValidationFieldIds(event.fieldIds);
      if (safeFieldIds.length === 0) return false;
      return dispatchAnalyticsEvent(
        { ...event, fieldIds: safeFieldIds },
        {
          source: event.source,
          field_ids: safeFieldIds,
          error_count: safeFieldIds.length,
          ...(event.topic ? { topic: event.topic } : {}),
          intent: event.intent,
        },
      );
    }
    case "lead_submit_error":
      if (
        !isLeadSourceContext(event.source)
        || !errorReasons.has(event.reason)
        || (event.intent && !isLeadIntent(event.intent))
        || (event.topic && !isLeadTopic(event.topic))
      ) {
        return false;
      }
      return dispatchAnalyticsEvent(event, {
        source: event.source,
        reason: event.reason,
        ...(event.intent ? { intent: event.intent } : {}),
        ...(event.topic ? { topic: event.topic } : {}),
      });
    case "booking_start":
    case "booking_complete":
      return dispatchAnalyticsEvent(event, { source: "thank-you" });
    default:
      return false;
  }
}
