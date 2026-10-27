"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import type { ConsentStore } from "./ConsentStore";

export default function ConsentAnalyticsLoader({
  children,
  store,
}: {
  children: ReactNode;
  store: ConsentStore;
}) {
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  return (
    <div data-component="consent-analytics-loader" data-state={snapshot.analytics ? "loaded" : "blocked"}>
      {snapshot.analytics ? children : null}
    </div>
  );
}
