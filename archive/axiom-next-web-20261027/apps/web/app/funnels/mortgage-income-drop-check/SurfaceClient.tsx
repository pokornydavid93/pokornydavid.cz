"use client";

import {
  SurfaceRenderer,
  createMortgageIncomeDropCheckDocument,
  mortgageIncomeDropWorkflowHandlers,
} from "@axiom-dp/surface-engine";
import type { LeadFormPayload } from "@/lib/api";
import { getApiClient } from "@/src/services/api";
import { gaEvent } from "@/src/app/ui/privacy/lib/ga";
import { formPrivacyNotice } from "@/app/content/form-privacy";
import s from "./SurfaceClient.module.css";

const document = createMortgageIncomeDropCheckDocument({
  advisorName: "David Pokorný",
  leadDestination: "legacy_lead",
  videoUrl: "/video_h264.mp4",
  videoPoster: "/nahled-video.avif",
  bookingUrl: "tel:+420731830897",
});

document.nodes.lead_capture_body!.props = {
  ...document.nodes.lead_capture_body!.props,
  text: formPrivacyNotice.funnelScreeningText,
};
document.nodes.thank_you_heading!.props = {
  ...document.nodes.thank_you_heading!.props,
  text: "Děkuji za kontakt. Ozvu se vám.",
};

const analyticsEvents = new Set([
  "landing_view", "video_play", "video_50", "screening_start",
  "question_answered", "screening_complete", "result_view",
  "lead_submit", "thank_you_view", "booking_click",
]);

function toLeadFormPayload(contact: Record<string, unknown>): LeadFormPayload {
  return {
    name: String(contact.first_name ?? ""),
    email: String(contact.email ?? ""),
    phone: String(contact.phone ?? ""),
    topic: "Hypotéka & bydlení",
    source: "screening",
    privacy_notice_version: formPrivacyNotice.version,
    message: [
      "Žádám o kontakt k hypotéce a ochraně příjmu.",
      "Funnel: mortgage_income_drop_check",
      typeof contact.preferred_contact_time === "string" && contact.preferred_contact_time.trim()
        ? `Preferovaný čas kontaktu: ${contact.preferred_contact_time.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export default function MortgageIncomeDropSurfaceClient() {
  return (
    <main className={s.funnelPage}>
      <SurfaceRenderer
        document={document}
        submitForm={async (_formId, payload) => {
          await getApiClient().submitLead(toLeadFormPayload(payload));
        }}
        trackingAdapter={{
          track(event) {
            if (analyticsEvents.has(event)) {
              gaEvent(event, { location: "mortgage_income_drop_check" });
            }
          },
        }}
        workflowHandlers={mortgageIncomeDropWorkflowHandlers}
      />
    </main>
  );
}
