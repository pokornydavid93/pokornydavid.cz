"use client";

import { startJourney, type JourneyController } from "../analytics/journey.client.ts";
import type { JourneyStep } from "../analytics/journey.ts";

let journey: JourneyController | undefined;

export function startIncomeTestJourney(getStep: () => JourneyStep) {
  const current = startJourney(getStep);
  journey = current;
  return {
    stepChanged: current.stepChanged,
    stop: () => { current.stop(); if (journey === current) journey = undefined; },
  };
}

const EVENTS = [
  "test_started",
  "step_completed_income",
  "step_completed_budget",
  "result_viewed",
  "callback_opened_income",
  "callback_opened_budget",
  "callback_opened_reserve",
  "callback_opened_result",
  "email_result_requested",
  "callback_requested",
  "submission_failed",
  "contact_validation_failed",
] as const;

export type IncomeTestEvent = (typeof EVENTS)[number];

/** Only journey milestones leave the calculator. Financial and contact data
 * deliberately cannot be supplied to this interface. Consent is checked by
 * the shared first-party transport before it creates any measurement IDs. */
export function trackIncomeTestEvent(event: IncomeTestEvent, originStep?: JourneyStep): boolean {
  if (!(EVENTS as readonly unknown[]).includes(event)) return false;
  if (originStep !== undefined && !["income", "budget", "reserve", "result"].includes(originStep)) return false;
  return journey?.event(`income_test_${event}`,
    event === "callback_requested" ? "lead_form_submitted"
      : event === "test_started" ? "lead_form_started" : "custom", originStep) ?? false;
}
