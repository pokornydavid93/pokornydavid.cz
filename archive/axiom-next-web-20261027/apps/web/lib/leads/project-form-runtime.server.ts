import { headers } from "next/headers";
import { createAxiomNextServerClient } from "@axiom/next/server";
import {
  AXIOM_PROJECT_HOSTING_FORM_EXTENSION_ID,
  createProjectHostingFormExtension,
  type ProjectHostingFormClient,
} from "@axiom/next/project-hosting-form";
import { AxiomRuntimeError } from "@axiom/web-core/runtime";

import type { NormalizedOverviewRequest } from "./overview-request";
import { PhoneFirstSubmissionError } from "./phone-first-runtime";
import type { SubmissionReceipt } from "./runtime.server";
import { isCanonicalProjectPublicHost } from "./project-public-host";
import { hostedRuntimeIdentityFromEnvironment } from "./hosted-runtime-identity";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

export function projectFormClientFromEnvironment(environment: NodeJS.ProcessEnv = process.env): ProjectHostingFormClient {
  const origin = environment.AXIOM_PUBLIC_ARTICLE_RUNTIME_ORIGIN;
  const workspaceId = environment.AXIOM_PUBLIC_ARTICLE_RUNTIME_WORKSPACE_ID;
  const identity = hostedRuntimeIdentityFromEnvironment(environment);
  if (!origin || !workspaceId || !UUID_PATTERN.test(workspaceId) || !identity) {
    throw new PhoneFirstSubmissionError("unavailable");
  }
  try {
    const sdk = createAxiomNextServerClient({
      config: {
        api_origin: origin,
        workspace_id: workspaceId,
        release_id: identity.releaseId,
        capabilities: ["forms"],
        timeout_ms: 5000,
      },
      extensions: [createProjectHostingFormExtension({
        runtime_kind: identity.kind,
        release_ref: identity.releaseRef,
        artifact_digest: identity.artifactDigest,
      })],
    });
    return sdk.extensions.get<ProjectHostingFormClient>(AXIOM_PROJECT_HOSTING_FORM_EXTENSION_ID);
  } catch {
    throw new PhoneFirstSubmissionError("unavailable");
  }
}

export function createProjectFormRuntime(environment: NodeJS.ProcessEnv = process.env) {
  const intake = projectFormClientFromEnvironment(environment);
  return {
    kind: "durable" as const,
    confirmationEmailSource: "intake" as const,
    sink: {
      async submit(input: NormalizedOverviewRequest) {
        const forwardedHost = (await headers()).get("x-forwarded-host") ?? "";
        if (!isCanonicalProjectPublicHost(forwardedHost)) throw new PhoneFirstSubmissionError("unavailable");
        try {
          const accepted = await intake.submit({
            schema_version: 1,
            form_id: "phone-first-consultation",
            public_hostname: forwardedHost,
            request_id: input.idempotencyKey,
            intent: input.intent,
            topic: input.topic ?? "",
            situation_note: input.situationNote ?? "",
            phone: input.phone,
            email: input.email,
            first_name: input.firstName ?? "",
            preferred_call_time: input.preferredCallTime ?? "",
            source_context: input.source.context ?? "direct",
            source_cta: input.source.cta ?? "",
            ...(input.campaignHandle ? { campaign_handle: input.campaignHandle } : {}),
            privacy_notice_version: input.privacyNoticeVersion,
            submitted_at: input.submittedAt,
          });
          return {
            reference: accepted.receipt_id,
            ...(accepted.confirmation_email_status === "queued"
              ? { confirmationEmailStatus: "queued" as const }
              : {}),
          };
        } catch (error) {
          if (error instanceof AxiomRuntimeError && error.status === 409) {
            throw new PhoneFirstSubmissionError("duplicate");
          }
          if (error instanceof AxiomRuntimeError && error.status === 429) {
            throw new PhoneFirstSubmissionError("rate-limited");
          }
          throw new PhoneFirstSubmissionError("unavailable");
        }
      },
    },
    receipts: {
      async create(input: Omit<SubmissionReceipt, "id">, ttlSeconds: number, acceptedReference?: string) {
        if (!acceptedReference || !UUID_PATTERN.test(acceptedReference) || ttlSeconds !== 15 * 60) {
          throw new PhoneFirstSubmissionError("unavailable");
        }
        const confirmed = await this.read(acceptedReference);
        if (
          !confirmed || confirmed.intent !== input.intent ||
          confirmed.maskedPhone.slice(-3) !== input.maskedPhone.slice(-3)
        ) throw new PhoneFirstSubmissionError("unavailable");
        return acceptedReference;
      },
      async read(receiptID: string): Promise<SubmissionReceipt | null> {
        if (!UUID_PATTERN.test(receiptID)) return null;
        try {
          const result = await intake.read(receiptID);
          if (!result || !["overview", "housing", "financing", "protection", "future", "unsure"].includes(result.intent)) return null;
          return {
            id: receiptID,
            status: "accepted",
            intent: result.intent as SubmissionReceipt["intent"],
            maskedPhone: result.masked_phone,
            ...(result.confirmation_email_status === "queued"
              ? { confirmationEmailStatus: "queued" as const }
              : {}),
            source: { route: "/ziskat-prehled/" },
            createdAt: result.created_at,
          };
        } catch {
          return null;
        }
      },
      async claimAnalytics() {
        // CRM acceptance is durable; a one-time analytics claim is not yet
        // backed by this endpoint, so never fabricate that event.
        return { status: "already-claimed" as const };
      },
    },
  };
}
