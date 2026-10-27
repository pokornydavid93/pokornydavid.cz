export type ConsentDecision = "essential" | "all";

export type ConsentSnapshot = {
  decision: ConsentDecision | null;
  analytics: boolean;
  decidedAt: string | null;
};

export type ConsentStore = {
  getSnapshot: () => ConsentSnapshot;
  getServerSnapshot: () => ConsentSnapshot;
  subscribe: (listener: () => void) => () => void;
  decide: (decision: ConsentDecision) => ConsentSnapshot;
  reset: () => ConsentSnapshot;
};

const undecidedSnapshot: ConsentSnapshot = {
  decision: null,
  analytics: false,
  decidedAt: null,
};

export function createConsentStore(initial: ConsentSnapshot = undecidedSnapshot): ConsentStore {
  let snapshot = initial;
  const listeners = new Set<() => void>();

  const publish = (next: ConsentSnapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
    return snapshot;
  };

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    decide: (decision) => publish({
      decision,
      analytics: decision === "all",
      decidedAt: new Date().toISOString(),
    }),
    reset: () => publish(undecidedSnapshot),
  };
}
