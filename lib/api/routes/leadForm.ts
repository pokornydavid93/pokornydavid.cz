import type { ApiRequest } from "../core/request"
import type { LeadFormPayload } from "../types"

export type LeadFormSubmitResponse = {
  id: number
}

export function createLeadFormApi(request: ApiRequest) {
  return {
    submit: (payload: LeadFormPayload) =>
      request<LeadFormSubmitResponse>("/lead", { method: "POST", payload }),
  }
}
