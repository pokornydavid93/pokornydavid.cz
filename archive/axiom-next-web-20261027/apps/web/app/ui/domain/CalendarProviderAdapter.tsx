"use client";

import { useEffect, useState } from "react";
import s from "./domain.module.css";

export type CalendarProviderFailure = "provider-error" | "network-blocked";
export type CalendarProviderState = "loading" | "ready" | CalendarProviderFailure;

export type CalendarProvider = {
  src: string;
  title: string;
  allow?: string;
};

export type CalendarProviderAdapterProps = {
  provider: CalendarProvider;
  failure?: CalendarProviderFailure;
  onStateChange: (state: CalendarProviderState) => void;
};

export default function CalendarProviderAdapter({
  failure,
  onStateChange,
  provider,
}: CalendarProviderAdapterProps) {
  const [readySource, setReadySource] = useState<string | null>(null);
  const state: CalendarProviderState = failure ?? (readySource === provider.src ? "ready" : "loading");

  useEffect(() => {
    onStateChange(failure ?? "loading");
  }, [failure, onStateChange, provider.src]);

  if (failure) {
    return <div data-component="calendar-provider-adapter" data-state={failure} />;
  }

  return (
    <div data-component="calendar-provider-adapter" data-state={state}>
      <iframe
        allow={provider.allow}
        className={s.bookingFrame}
        data-ready={state === "ready" || undefined}
        loading="lazy"
        onError={() => onStateChange("provider-error")}
        onLoad={() => {
          setReadySource(provider.src);
          onStateChange("ready");
        }}
        src={provider.src}
        title={provider.title}
      />
    </div>
  );
}
