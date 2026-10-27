import { resolve } from "node:path";

import { emitNextIntegrationManifest } from "@axiom/next";
import {
  defineArticlesCapabilityContract,
  defineBookingsCapabilityContract,
  defineDesignTokensCapabilityContract,
  defineFormsCapabilityContract,
  defineMeasurementCapabilityContract,
  defineRoutesCapabilityContract,
  defineSemanticRegionsCapabilityContract,
} from "@axiom/web-core/manifest";

const artifactRoot = resolve(process.cwd(), ".next/standalone");
const funnelBuild = process.env.NEXT_PUBLIC_SITE_MODE === "funnels";

const funnelContracts = [
  defineBookingsCapabilityContract([
    {
      profile_id: "financial-consultation",
      route_path: "/ziskat-prehled/dekujeme",
      modes: ["phone", "video", "in_person"],
      calendar_exports: ["google_calendar", "ics"],
    },
  ]),
  defineFormsCapabilityContract([
    { form_id: "phone-first-consultation", route_path: "/ziskat-prehled" },
  ]),
  defineMeasurementCapabilityContract([
    {
      configuration: "workspace_web_privacy_v1",
      consent_mode: "basic",
      policy_routes: [
        "/cookies-a-mereni",
        "/zasady-zpracovani-osobnich-udaju",
      ],
    },
    { event_name: "page_view", collection: "first_party" },
    { event_name: "cta_click", collection: "first_party" },
    { event_name: "lead_submitted", collection: "first_party" },
  ]),
  defineRoutesCapabilityContract([
    { route_id: "consultation", path: "/ziskat-prehled" },
  ]),
];

const result = await emitNextIntegrationManifest({
  artifact_root: artifactRoot,
  integration: {
    content_delivery_mode: funnelBuild ? "none" : "published_channel",
    capability_contracts: funnelBuild ? funnelContracts : [
      defineArticlesCapabilityContract([
        {
          channel_id: "pokornydavid-editorial",
          route_prefix: "/clanky",
          delivery: "published_workspace_channel",
        },
      ]),
      defineBookingsCapabilityContract([
        {
          profile_id: "financial-consultation",
          route_path: "/ziskat-prehled/dekujeme",
          modes: ["phone", "video", "in_person"],
          calendar_exports: ["google_calendar", "ics"],
        },
      ]),
      defineFormsCapabilityContract([
        { form_id: "phone-first-consultation", route_path: "/ziskat-prehled" },
        { form_id: "article-screening", route_prefix: "/clanky" },
        { form_id: "income-test", route_path: "/test-jednoho-prijmu" },
      ]),
      defineMeasurementCapabilityContract([
        {
          configuration: "workspace_web_privacy_v1",
          consent_mode: "basic",
          policy_routes: [
            "/cookies-a-mereni",
            "/zasady-zpracovani-osobnich-udaju",
          ],
        },
        { event_name: "page_view", collection: "first_party" },
        { event_name: "cta_click", collection: "first_party" },
        { event_name: "lead_submitted", collection: "first_party" },
      ]),
      defineRoutesCapabilityContract([
        { route_id: "home", path: "/" },
        { route_id: "services", path: "/sluzby" },
        { route_id: "articles", path: "/clanky" },
        { route_id: "consultation", path: "/ziskat-prehled" },
        { route_id: "income-test", path: "/test-jednoho-prijmu" },
      ]),
      defineSemanticRegionsCapabilityContract([
        { region_id: "primary_navigation", role: "navigation" },
        { region_id: "article_body", role: "main" },
        { region_id: "conversion_action", role: "complementary" },
      ]),
      defineDesignTokensCapabilityContract([
        { token_namespace: "pokornydavid", source: "theme_tokens" },
      ]),
    ],
  },
});

process.stdout.write(
  `Axiom integration manifest ${result.status}: ${result.path} (${result.sha256})\n`,
);
