import "server-only";

import { unstable_cache } from "next/cache";
import {
  AxiomRuntimeError,
  createAxiomWebClient,
  type AxiomWebPrivacyConfiguration,
} from "@axiom/web-core";
import {
  WEB_ANALYTICS_PRIVACY_VERIFIED,
  WEB_FORM_PROCESSING_PURPOSE,
  WEB_COOKIE_POLICY_PATH,
  WEB_PRIVACY_CONTROLLER,
  WEB_PRIVACY_EFFECTIVE_DATE,
  WEB_PRIVACY_NOTICE_VERSION,
  WEB_PRIVACY_POLICY_PATH,
} from "./policy";

const FALLBACK_CONFIGURATION: AxiomWebPrivacyConfiguration = Object.freeze({
  schema_version: 1,
  analytics_mode: "disabled",
  ga4_measurement_id: null,
  consent_mode: "basic",
  consent_policy_version: `${WEB_PRIVACY_NOTICE_VERSION}:safe-fallback-v1`,
  consent_grant_ttl_days: 365,
  consent_reject_ttl_days: 180,
  analytics_retention_months: 2,
  privacy_policy_path: WEB_PRIVACY_POLICY_PATH,
  cookie_policy_path: WEB_COOKIE_POLICY_PATH,
  controller_name: WEB_PRIVACY_CONTROLLER.name,
  controller_registration_id: WEB_PRIVACY_CONTROLLER.registrationId,
  controller_address: WEB_PRIVACY_CONTROLLER.address,
  privacy_contact_email: WEB_PRIVACY_CONTROLLER.email,
  dpo_contact_email: null,
  analytics_purpose: "Měření souhrnné návštěvnosti a zlepšování obsahu webu.",
  form_processing_purpose: WEB_FORM_PROCESSING_PURPOSE,
  form_retention_months: 6,
  effective_date: WEB_PRIVACY_EFFECTIVE_DATE,
  banner_title: "Soukromí na tomto webu",
  banner_description: "Volitelnou analytiku spustím pouze s vaším souhlasem. Odmítnutí neomezí používání webu.",
});

const loadPublishedConfiguration = unstable_cache(async () => {
  const apiOrigin = (
    process.env.AXIOM_WEB_PRIVACY_ORIGIN ??
    process.env.AXIOM_ARTICLE_RUNTIME_ORIGIN ??
    "https://axiom.syllcode.com"
  ).replace(/\/+$/u, "");
  const workspaceId =
    process.env.AXIOM_WEB_PRIVACY_WORKSPACE_ID ??
    process.env.AXIOM_ARTICLE_RUNTIME_WORKSPACE_ID ??
    "80d9593f-13ac-461d-93dd-e51b7c48beef";
  const client = createAxiomWebClient({
    config: {
      api_origin: apiOrigin,
      workspace_id: workspaceId,
      capabilities: ["measurement"],
      timeout_ms: 3_500,
    },
  });
  return (await client.measurement.configuration()).configuration;
}, ["pokornydavid-web-privacy-v1"], { revalidate: 60 });

export async function getWebPrivacyConfiguration(): Promise<AxiomWebPrivacyConfiguration> {
  try {
    const published = await loadPublishedConfiguration();
    // Measurement settings do not establish who controls this website's own
    // enquiries. Keep the verified local identity authoritative on success too.
    // A new website notice also requires a fresh analytics choice; retain the
    // published version so later measurement-policy changes invalidate it.
    return {
      ...published,
      analytics_mode: WEB_ANALYTICS_PRIVACY_VERIFIED ? published.analytics_mode : "disabled",
      controller_name: WEB_PRIVACY_CONTROLLER.name,
      controller_registration_id: WEB_PRIVACY_CONTROLLER.registrationId,
      controller_address: WEB_PRIVACY_CONTROLLER.address,
      privacy_contact_email: WEB_PRIVACY_CONTROLLER.email,
      dpo_contact_email: null,
      form_processing_purpose: WEB_FORM_PROCESSING_PURPOSE,
      privacy_policy_path: WEB_PRIVACY_POLICY_PATH,
      cookie_policy_path: WEB_COOKIE_POLICY_PATH,
      effective_date: WEB_PRIVACY_EFFECTIVE_DATE,
      consent_policy_version: `${WEB_PRIVACY_NOTICE_VERSION}:${published.consent_policy_version}`,
    };
  } catch (error) {
    // Missing or unavailable policy must never silently enable optional tracking.
    if (error instanceof AxiomRuntimeError || error instanceof Error) {
      return FALLBACK_CONFIGURATION;
    }
    return FALLBACK_CONFIGURATION;
  }
}
