import type { NormalizedOverviewRequest } from "./overview-request";
import { WEB_ENQUIRY_RIGHTS_NOTICE } from "../privacy/policy.ts";

const MAIL_WORKFLOW_PATH = "/internal/mail/workflows/lead-created";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

type MailWorkflowConfig = {
  endpoint: string;
  token: string;
  workspaceId: string;
  senderIdentityId: string;
};

const readMailWorkflowConfig = (
  environment: NodeJS.ProcessEnv,
): MailWorkflowConfig | null => {
  const base = environment.AXIOM_MAIL_WORKFLOW_BASE_URL;
  const token = environment.AXIOM_MAIL_WORKFLOW_TOKEN;
  const workspaceId = environment.AXIOM_MAIL_WORKFLOW_WORKSPACE_ID;
  const senderIdentityId = environment.AXIOM_MAIL_WORKFLOW_SENDER_IDENTITY_ID;
  if (!base || !token || !workspaceId || !senderIdentityId) return null;
  if (
    base !== base.trim()
    || token !== token.trim()
    || /\s/u.test(token)
    || token.length < 32
    || !UUID_PATTERN.test(workspaceId)
    || !UUID_PATTERN.test(senderIdentityId)
  ) return null;

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return null;
  }
  const allowInsecure = environment.NODE_ENV === "development"
    && environment.AXIOM_MAIL_WORKFLOW_ALLOW_INSECURE_HTTP === "true";
  if (
    (url.protocol !== "https:" && !(allowInsecure && url.protocol === "http:"))
    || url.username
    || url.password
    || url.search
    || url.hash
  ) return null;
  return {
    endpoint: `${url.href.replace(/\/$/u, "")}${MAIL_WORKFLOW_PATH}`,
    token,
    workspaceId,
    senderIdentityId,
  };
};

export const formatOverviewConfirmationEmail = (): { subject: string; text: string } => {
  const lines = [
    "Dobrý den,",
    "",
    "děkuji za vaši zprávu. Žádost jsem přijal a během následujících 24 hodin se vám ozvu.",
    "",
    "David Pokorný",
    "",
    "Vaše osobní údaje a právo na námitku",
    WEB_ENQUIRY_RIGHTS_NOTICE,
  ];
  return {
    subject: "Potvrzení žádosti o úvodní hovor | David Pokorný",
    text: lines.join("\n"),
  };
};

const isQueuedReceipt = (value: unknown): boolean => {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Record<string, unknown>;
  if (receipt.schema_version !== 1 || !Array.isArray(receipt.messages) || receipt.messages.length !== 1) {
    return false;
  }
  const message = receipt.messages[0];
  return Boolean(
    message
    && typeof message === "object"
    && message.role === "lead_confirmation"
    && typeof message.message_id === "string"
    && UUID_PATTERN.test(message.message_id)
    && typeof message.thread_id === "string"
    && UUID_PATTERN.test(message.thread_id)
    && Array.isArray(message.delivery_ids)
    && message.delivery_ids.length === 1
    && message.delivery_ids.every((id: unknown) => typeof id === "string" && UUID_PATTERN.test(id))
    && Array.isArray(message.delivery_states)
    && message.delivery_states.length === 1
    && message.delivery_states[0] === "queued",
  );
};

/** "queued" means Axiom Mail durably accepted the message, not inbox delivery. */
export async function queueOverviewConfirmationEmailWithDependencies(
  request: NormalizedOverviewRequest,
  acceptedReference: string,
  environment: NodeJS.ProcessEnv,
  fetchImplementation: typeof fetch,
): Promise<"queued" | "unavailable"> {
  const config = readMailWorkflowConfig(environment);
  if (!config || !UUID_PATTERN.test(acceptedReference)) return "unavailable";
  const content = formatOverviewConfirmationEmail();
  const idempotencyKey = `lead-created:overview:${acceptedReference}`;
  const command = {
    schema_version: 1,
    workspace_id: config.workspaceId,
    sender_identity_id: config.senderIdentityId,
    source_kind: "lead_request",
    source_id: acceptedReference,
    idempotency_key: idempotencyKey,
    messages: [{
      role: "lead_confirmation",
      to: [{ email: request.email }],
      subject: content.subject,
      text_body: content.text,
    }],
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetchImplementation(config.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": idempotencyKey,
          "X-Axiom-Mail-Receipt-Delivery-States": "1",
        },
        body: JSON.stringify(command),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(5_000),
      });
      if (response.status !== 201) {
        await response.body?.cancel().catch(() => undefined);
        if ((response.status === 429 || response.status >= 500) && attempt === 0) continue;
        return "unavailable";
      }
      const raw = await response.text();
      if (raw.length > 16_384) return "unavailable";
      return isQueuedReceipt(JSON.parse(raw)) ? "queued" : "unavailable";
    } catch {
      if (attempt === 0) continue;
    }
  }
  return "unavailable";
}
