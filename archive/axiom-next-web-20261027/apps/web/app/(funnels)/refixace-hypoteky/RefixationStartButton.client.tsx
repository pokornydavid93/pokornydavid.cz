"use client";

import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import { gaEvent } from "@/src/app/ui/privacy/lib/ga";
import s from "./refixationFunnel.module.css";

const focusHeroInstrument = () => {
  const target = document.getElementById("refixation-hero-instrument");
  const firstControl = document.getElementById("hero-refixation-month");
  const reducedMotion = window.matchMedia(
    DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
  ).matches;

  window.dispatchEvent(new CustomEvent("refixation:hero-focus"));

  target?.scrollIntoView({
    behavior: reducedMotion ? "auto" : "smooth",
    block: "center",
  });

  window.setTimeout(
    () => firstControl?.focus({ preventScroll: true }),
    reducedMotion ? 0 : 260,
  );
};

export default function RefixationStartButton({
  placement = "hero",
}: {
  placement?: "hero" | "header" | "final";
}) {
  const [headerCtaVisible, setHeaderCtaVisible] = useState(placement !== "header");

  useEffect(() => {
    if (placement !== "header") return undefined;
    const heroInstrument = document.getElementById("refixation-hero-instrument");
    if (!heroInstrument || !("IntersectionObserver" in window)) {
      const fallbackTimer = window.setTimeout(() => setHeaderCtaVisible(true), 0);
      return () => window.clearTimeout(fallbackTimer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => setHeaderCtaVisible(!entry?.isIntersecting),
      {
        rootMargin: "-76px 0px 0px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(heroInstrument);
    return () => observer.disconnect();
  }, [placement]);

  return (
    <button
      className={placement === "header" ? s.headerCta : s.primaryCta}
      data-cursor="action"
      data-cursor-icon="send"
      data-cursor-label="ZÍSKAT PŘEHLED • ZAČÍT PRVNÍM KROKEM •"
      data-cursor-magnetic="true"
      data-visible={placement === "header" ? headerCtaVisible : undefined}
      data-testid={`refixation-start-${placement}`}
      type="button"
      onClick={() => {
        gaEvent("diagnostic_start", {
          funnel_id: "mortgage-refixation",
          page_path: "/refixace-hypoteky/",
        });
        focusHeroInstrument();
      }}
    >
      <span>
        {placement === "final"
          ? "Zjistit moje rozhodovací okno"
          : "Zjistit, kdy začít"}
      </span>
      <ArrowDown aria-hidden="true" />
    </button>
  );
}
