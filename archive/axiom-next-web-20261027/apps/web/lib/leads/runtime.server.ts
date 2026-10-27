import "server-only";

import { randomUUID } from "node:crypto";
import { formatOverviewLeadNotification } from "./overview-notification";
import {
  createPhoneFirstHttpSink,
  createSignedOverviewReceiptStore,
  parsePhoneFirstProductionConfig,
  PhoneFirstSubmissionError,
  resolvePhoneFirstRuntimeMode,
  type AnalyticsClaimResult,
} from "./phone-first-runtime";
import type { NormalizedOverviewRequest } from "./overview-request";
import { createProjectFormRuntime } from "./project-form-runtime.server";
import type {
  LeadIntent,
  LeadSource,
  LeadTopic,
} from "./lead-contract";

export type SubmissionReceipt = {
  id: string;
  status: "accepted";
  intent: LeadIntent;
  topic?: LeadTopic;
  maskedPhone: string;
  confirmationEmailStatus?: "queued";
  source: LeadSource;
  createdAt: string;
  analyticsClaimedAt?: string;
};

export interface LeadSink {
  submit(input: NormalizedOverviewRequest): Promise<{
    reference: string;
    confirmationEmailStatus?: "queued";
  }>;
}

export interface IdempotencyStore {
  acquire(key: string, ttlSeconds: number): Promise<"acquired" | "duplicate">;
  complete(key: string, receiptId: string): Promise<void>;
  fail(key: string, retryable: boolean): Promise<void>;
}

export interface RateLimitStore {
  consume(key: string): Promise<{ allowed: boolean; retryAfter?: number }>;
}

export interface SubmissionReceiptStore {
  create(
    input: Omit<SubmissionReceipt, "id">,
    ttlSeconds: number,
    acceptedReference?: string,
  ): Promise<string>;
  read(id: string): Promise<SubmissionReceipt | null>;
  claimAnalytics(id: string, existingMarker?: string): Promise<AnalyticsClaimResult>;
}

type Expiring<T> = { value: T; expiresAt: number };
type IdempotencyValue = { status: "pending" | "complete"; receiptId?: string };
type RateValue = { count: number; resetAt: number };

type DevelopmentRuntime = {
  kind: "development";
  sink: LeadSink;
  idempotency: IdempotencyStore;
  rateLimit: RateLimitStore;
  receipts: SubmissionReceiptStore;
};

type DurableRuntime = {
  kind: "durable";
  confirmationEmailSource: "intake" | "web";
  sink: LeadSink;
  receipts: SubmissionReceiptStore;
};

export type OverviewRuntime = DevelopmentRuntime | DurableRuntime;

const globalKey = Symbol.for("pokornydavid.overview-development-runtime");

class ProductionProviderUnavailableError extends Error {
  constructor() {
    super("Approved production lead infrastructure is not configured.");
    this.name = "ProductionProviderUnavailableError";
  }
}

const createDevelopmentRuntime = (): DevelopmentRuntime => {
  const idempotencyEntries = new Map<string, Expiring<IdempotencyValue>>();
  const rateEntries = new Map<string, RateValue>();
  const receiptEntries = new Map<string, Expiring<SubmissionReceipt>>();

  const prune = () => {
    const now = Date.now();
    idempotencyEntries.forEach((entry, key) => {
      if (entry.expiresAt <= now) idempotencyEntries.delete(key);
    });
    receiptEntries.forEach((entry, key) => {
      if (entry.expiresAt <= now) receiptEntries.delete(key);
    });
    rateEntries.forEach((entry, key) => {
      if (entry.resetAt <= now) rateEntries.delete(key);
    });
  };

  return {
    kind: "development",
    sink: {
      async submit(input) {
        // Development/test adapter intentionally keeps no payload and emits no logs.
        const notification = formatOverviewLeadNotification(input);
        void notification;
        void input;
        return { reference: `dev-${randomUUID()}` };
      },
    },
    idempotency: {
      async acquire(key, ttlSeconds) {
        prune();
        if (idempotencyEntries.has(key)) return "duplicate";
        idempotencyEntries.set(key, {
          value: { status: "pending" },
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
        return "acquired";
      },
      async complete(key, receiptId) {
        const entry = idempotencyEntries.get(key);
        if (!entry) throw new Error("Missing idempotency entry.");
        entry.value = { status: "complete", receiptId };
      },
      async fail(key, retryable) {
        if (retryable) idempotencyEntries.delete(key);
      },
    },
    rateLimit: {
      async consume(key) {
        prune();
        const now = Date.now();
        const windowMs = 10 * 60 * 1000;
        const existing = rateEntries.get(key);
        const entry = existing ?? { count: 0, resetAt: now + windowMs };
        entry.count += 1;
        rateEntries.set(key, entry);
        return entry.count <= 30
          ? { allowed: true }
          : { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
      },
    },
    receipts: {
      async create(input, ttlSeconds) {
        prune();
        const id = randomUUID();
        receiptEntries.set(id, {
          value: { ...input, id },
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
        return id;
      },
      async read(id) {
        prune();
        return receiptEntries.get(id)?.value ?? null;
      },
      async claimAnalytics(id) {
        prune();
        const entry = receiptEntries.get(id);
        if (!entry) return { status: "missing" };
        if (entry.value.analyticsClaimedAt) return { status: "already-claimed" };
        entry.value.analyticsClaimedAt = new Date().toISOString();
        return { status: "claimed" };
      },
    },
  };
};

export const getOverviewRuntime = (): OverviewRuntime => {
  if (process.env.NODE_ENV === "production" && (
    process.env.AXIOM_PROJECT_RELEASE_REF !== undefined ||
    process.env.AXIOM_HOSTED_RUNTIME_KIND !== undefined
  )) {
    try {
      return createProjectFormRuntime();
    } catch {
      throw new ProductionProviderUnavailableError();
    }
  }
  let mode: ReturnType<typeof resolvePhoneFirstRuntimeMode>;
  try {
    mode = resolvePhoneFirstRuntimeMode(process.env);
  } catch {
    throw new ProductionProviderUnavailableError();
  }

  if (mode === "durable") {
    try {
      const config = parsePhoneFirstProductionConfig(process.env);
      return {
        kind: "durable",
        confirmationEmailSource: "web",
        sink: createPhoneFirstHttpSink(config),
        receipts: createSignedOverviewReceiptStore(config),
      };
    } catch {
      throw new ProductionProviderUnavailableError();
    }
  }

  const globalRuntime = globalThis as typeof globalThis & {
    [globalKey]?: DevelopmentRuntime;
  };
  globalRuntime[globalKey] ??= createDevelopmentRuntime();
  return globalRuntime[globalKey];
};

export const isProductionProviderUnavailable = (error: unknown) =>
  error instanceof ProductionProviderUnavailableError;

export const getPhoneFirstSubmissionFailure = (error: unknown) =>
  error instanceof PhoneFirstSubmissionError ? error.failure : null;
