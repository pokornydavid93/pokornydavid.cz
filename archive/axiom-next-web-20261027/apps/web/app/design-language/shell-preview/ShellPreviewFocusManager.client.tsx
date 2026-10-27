"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

export default function ShellPreviewFocusManager({ targetId }: { targetId: string }) {
  const searchParams = useSearchParams();
  const routeState = searchParams.toString();
  const previousRouteState = useRef(routeState);

  useEffect(() => {
    if (!routeState || routeState === previousRouteState.current) return;
    previousRouteState.current = routeState;
    document.getElementById(targetId)?.focus();
  }, [routeState, targetId]);

  return null;
}
