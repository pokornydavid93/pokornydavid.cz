export const COOKIE_CONSENT_STORAGE_KEY = "cookie_consent_v1";
export const COOKIE_CONSENT_CHANGED_EVENT = "cookie-consent-changed";

export type CookieConsentChoice = "accepted" | "rejected";

export type CookieConsentRecord = {
  choice: CookieConsentChoice;
  decidedAt: number;
  expiresAt: number;
  version: string;
};

export type CookieConsentPolicy = Readonly<{
  version: string;
  acceptedTtlDays: number;
  rejectedTtlDays: number;
}>;

const DEFAULT_POLICY: CookieConsentPolicy = Object.freeze({
  version: "2026-05-05-ga4-v1",
  acceptedTtlDays: 365,
  rejectedTtlDays: 180,
});
const DAY_MS = 24 * 60 * 60 * 1000;
let activePolicy = DEFAULT_POLICY;
let unpersistedWithdrawal: CookieConsentRecord | null = null;
const listeners = new Set<() => void>();
let expiryTimer: ReturnType<typeof setTimeout> | undefined;

const normalizePolicy = (policy?: CookieConsentPolicy): CookieConsentPolicy => {
  const value = policy ?? activePolicy;
  if (
    !value ||
    typeof value.version !== "string" ||
    !Number.isSafeInteger(value.acceptedTtlDays) ||
    !Number.isSafeInteger(value.rejectedTtlDays) ||
    value.acceptedTtlDays < 30 || value.acceptedTtlDays > 365 ||
    value.rejectedTtlDays < 30 || value.rejectedTtlDays > 365
  ) return DEFAULT_POLICY;
  return value;
};

export const configureCookieConsent = (policy: CookieConsentPolicy) => {
  const next = normalizePolicy(policy);
  const changed = next.version !== activePolicy.version
    || next.acceptedTtlDays !== activePolicy.acceptedTtlDays
    || next.rejectedTtlDays !== activePolicy.rejectedTtlDays;
  activePolicy = next;
  // Configuration is installed during React render; notify external consumers
  // afterwards so an old grant cannot leave activity listeners or IDs running.
  if (changed && typeof window !== "undefined") queueMicrotask(() => {
    if (listeners.size > 0) notifyConsentSubscribers();
  });
};

const isConsentChoice = (value: unknown): value is CookieConsentChoice =>
  value === "accepted" || value === "rejected";

const getStorage = () => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const removeStoredConsent = () => {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    // ignore unavailable storage
  }
};

const getTtlMs = (choice: CookieConsentChoice, policy: CookieConsentPolicy) =>
  (choice === "accepted" ? policy.acceptedTtlDays : policy.rejectedTtlDays) * DAY_MS;

const parseRecord = (raw: string, policy: CookieConsentPolicy): CookieConsentRecord | null => {
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsentRecord>;

    if (
      !isConsentChoice(parsed.choice) ||
      parsed.version !== policy.version ||
      typeof parsed.decidedAt !== "number" ||
      typeof parsed.expiresAt !== "number" ||
      !Number.isFinite(parsed.decidedAt) ||
      !Number.isFinite(parsed.expiresAt) ||
      parsed.decidedAt <= 0 ||
      parsed.decidedAt > Date.now() ||
      parsed.expiresAt <= parsed.decidedAt ||
      parsed.expiresAt > parsed.decidedAt + getTtlMs(parsed.choice, policy)
    ) {
      return null;
    }

    return parsed as CookieConsentRecord;
  } catch {
    return null;
  }
};

export const readCookieConsentRecord = (inputPolicy?: CookieConsentPolicy): CookieConsentRecord | null => {
  const policy = normalizePolicy(inputPolicy);
  if (unpersistedWithdrawal) {
    return unpersistedWithdrawal.version === policy.version && unpersistedWithdrawal.expiresAt > Date.now()
      ? unpersistedWithdrawal
      : null;
  }
  const storage = getStorage();
  if (!storage) return null;

  let raw: string | null = null;
  try {
    raw = storage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }

  if (!raw) return null;

  const record = parseRecord(raw, policy);
  if (!record || record.expiresAt <= Date.now()) {
    removeStoredConsent();
    return null;
  }

  return record;
};

export const readCookieConsent = (policy?: CookieConsentPolicy): CookieConsentChoice | null =>
  readCookieConsentRecord(policy)?.choice ?? null;

export const writeCookieConsent = (
  choice: CookieConsentChoice,
  inputPolicy?: CookieConsentPolicy,
): CookieConsentRecord | null => {
  const policy = normalizePolicy(inputPolicy);
  const decidedAt = Date.now();
  const record: CookieConsentRecord = {
    choice,
    decidedAt,
    expiresAt: decidedAt + getTtlMs(choice, policy),
    version: policy.version,
  };

  const storage = getStorage();
  if (!storage) {
    if (choice === "rejected") unpersistedWithdrawal = record;
    return null;
  }
  try {
    storage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    if (choice === "rejected") {
      unpersistedWithdrawal = record;
      try {
        // Quota/write failures can still allow deletion of an older grant.
        storage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
      } catch {
        // When all persistence is denied, the current document stays blocked.
      }
    }
    return null;
  }

  unpersistedWithdrawal = null;
  return record;
};

export const updateCookieConsent = (choice: CookieConsentChoice, policy?: CookieConsentPolicy) => {
  const record = writeCookieConsent(choice, policy);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(COOKIE_CONSENT_CHANGED_EVENT, { detail: choice })
    );
  }

  return record;
};

const scheduleExpiry = () => {
  clearTimeout(expiryTimer);
  const record = readCookieConsentRecord();
  if (record) {
    expiryTimer = setTimeout(notifyConsentSubscribers, Math.min(record.expiresAt - Date.now(), 2_147_483_647));
  }
};

const notifyConsentSubscribers = () => {
  listeners.forEach((listener) => listener());
  scheduleExpiry();
};

const handleConsentStorage = (event: StorageEvent) => {
  if (event.key === COOKIE_CONSENT_STORAGE_KEY || event.key === null) notifyConsentSubscribers();
};

const handleConsentVisibility = () => {
  if (document.visibilityState === "visible") notifyConsentSubscribers();
};

/** One browser subscription also covers another tab, expiry and resumed tabs. */
export const subscribeCookieConsent = (listener: () => void) => {
  if (typeof window === "undefined") return () => {};
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, notifyConsentSubscribers);
    window.addEventListener("storage", handleConsentStorage);
    window.addEventListener("focus", notifyConsentSubscribers);
    document.addEventListener("visibilitychange", handleConsentVisibility);
  }
  scheduleExpiry();
  return () => {
    listeners.delete(listener);
    if (listeners.size !== 0) return;
    clearTimeout(expiryTimer);
    window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, notifyConsentSubscribers);
    window.removeEventListener("storage", handleConsentStorage);
    window.removeEventListener("focus", notifyConsentSubscribers);
    document.removeEventListener("visibilitychange", handleConsentVisibility);
  };
};

export const getServerCookieConsent = () => null;
