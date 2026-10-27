import type { LeadTopic } from "@/lib/api";

export const LEAD_FORM_PREFILL_EVENT = "lead-form:prefill-topic";

export type LeadFormPrefillEventDetail = {
  topic: LeadTopic;
  focus?: boolean;
};

export const dispatchLeadFormPrefillEvent = (
  detail: LeadFormPrefillEventDetail
) => {
  window.dispatchEvent(
    new CustomEvent<LeadFormPrefillEventDetail>(LEAD_FORM_PREFILL_EVENT, {
      detail,
    })
  );
};
