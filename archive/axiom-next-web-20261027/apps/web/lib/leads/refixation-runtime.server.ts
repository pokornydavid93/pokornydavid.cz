import "server-only";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { projectFormClientFromEnvironment } from "./project-form-runtime.server";
import { isCanonicalProjectPublicHost } from "./project-public-host";
import { refixationIntakeCommand } from "./refixation-intake";
import { PhoneFirstSubmissionError } from "./phone-first-runtime";
import type { NormalizedRefixationRequest } from "./refixation-request";
import type { CallbackWindow } from "./refixation-request";
import type { FixationBucket, RefixationPath } from "./refixation-bucket";

export type RefixationSubmissionReceipt = {
  id: string;
  status: "accepted";
  funnelId: "mortgage-refixation";
  fixationBucket: FixationBucket;
  refixationPath: RefixationPath;
  callbackWindow: CallbackWindow;
  createdAt: string;
};

export interface RefixationLeadSink {
  submit(input: NormalizedRefixationRequest): Promise<{ reference: string }>;
}

export interface RefixationIdempotencyStore {
  acquire(key: string, ttlSeconds: number): Promise<"acquired" | "duplicate">;
  complete(key: string, receiptId: string): Promise<void>;
  fail(key: string, retryable: boolean): Promise<void>;
}

export interface RefixationRateLimitStore {
  consume(key: string): Promise<{ allowed: boolean; retryAfter?: number }>;
}

export interface RefixationSubmissionReceiptStore {
  create(
    input: Omit<RefixationSubmissionReceipt, "id">,
    ttlSeconds: number,
  ): Promise<string>;
  read(id: string): Promise<RefixationSubmissionReceipt | null>;
}

type Expiring<T> = { value: T; expiresAt: number };
type IdempotencyValue = { status: "pending" | "complete"; receiptId?: string };
type RateValue = { count: number; resetAt: number };

type RefixationDevelopmentRuntime = {
  kind: "development";
  sink: RefixationLeadSink;
  idempotency: RefixationIdempotencyStore;
  rateLimit: RefixationRateLimitStore;
  receipts: RefixationSubmissionReceiptStore;
};

type RefixationRuntime = RefixationDevelopmentRuntime | {
  kind: "durable";
  submit(input: NormalizedRefixationRequest): Promise<void>;
};

const globalKey = Symbol.for("pokornydavid.refixation-development-runtime");

class RefixationProductionProviderUnavailableError extends Error {
  constructor() {
    super("Approved production refixation lead infrastructure is not configured.");
    this.name = "RefixationProductionProviderUnavailableError";
  }
}

const createDevelopmentRuntime = (): RefixationDevelopmentRuntime => {
  const idempotencyEntries = new Map<string, Expiring<IdempotencyValue>>();
  const rateEntries = new Map<string, RateValue>();
  const receiptEntries = new Map<string, Expiring<RefixationSubmissionReceipt>>();

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
        void input;
        return { reference: `dev-refixation-${randomUUID()}` };
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
        if (!entry) throw new Error("Missing refixation idempotency entry.");
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
        return entry.count <= 20
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
    },
  };
};

export const getRefixationRuntime = (): RefixationRuntime => {
  if (process.env.NODE_ENV === "production") {
    let intake: ReturnType<typeof projectFormClientFromEnvironment>;
    try {
      intake = projectFormClientFromEnvironment();
    } catch {
      throw new RefixationProductionProviderUnavailableError();
    }
    return {
      kind: "durable",
      async submit(input) {
        const publicHost = (await headers()).get("x-forwarded-host") ?? "";
        if (!isCanonicalProjectPublicHost(publicHost)) throw new PhoneFirstSubmissionError("unavailable");
        const receipt = await intake.submit(refixationIntakeCommand(input, publicHost));
        if (receipt.intent !== "housing" || receipt.masked_phone.slice(-3) !== input.phone.slice(-3)) {
          throw new PhoneFirstSubmissionError("unavailable");
        }
      },
    };
  }

  const globalRuntime = globalThis as typeof globalThis & {
    [globalKey]?: RefixationDevelopmentRuntime;
  };
  globalRuntime[globalKey] ??= createDevelopmentRuntime();
  return globalRuntime[globalKey];
};

export const isRefixationProductionProviderUnavailable = (error: unknown) =>
  error instanceof RefixationProductionProviderUnavailableError;
