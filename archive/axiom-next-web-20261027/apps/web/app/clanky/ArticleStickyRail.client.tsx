"use client";

import { useEffect, useRef, useState } from "react";
import type { BlogArticleScreeningRailAside } from "@/lib/blog";
import ArticleConversionRail from "./ArticleConversionRail";
import s from "./articles.module.css";

type ArticleStickyRailProps = {
  aside: BlogArticleScreeningRailAside;
};

const SUPPRESSOR_SELECTOR =
  "[data-article-hero-summary], [data-suppress-sticky-cta]";

export default function ArticleStickyRail({
  aside,
}: ArticleStickyRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [isSuppressed, setIsSuppressed] = useState(true);

  useEffect(() => {
    const rail = railRef.current;
    const suppressors = Array.from(
      document.querySelectorAll<HTMLElement>(SUPPRESSOR_SELECTOR),
    );

    if (!rail || suppressors.length === 0) {
      setIsSuppressed(false);
      return;
    }

    const visibleSuppressors = new Set<Element>();
    const rootStyles = getComputedStyle(document.documentElement);
    const headerHeight =
      Number.parseFloat(rootStyles.getPropertyValue("--site-header-height")) ||
      72;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleSuppressors.add(entry.target);
          } else {
            visibleSuppressors.delete(entry.target);
          }
        }

        setIsSuppressed(visibleSuppressors.size > 0);
      },
      {
        rootMargin: `-${Math.round(headerHeight)}px 0px -8% 0px`,
        threshold: 0.01,
      },
    );

    suppressors.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (railRef.current) {
      railRef.current.inert = isSuppressed;
    }
  }, [isSuppressed]);

  return (
    <div
      ref={railRef}
      className={`${s.sidePanel} ${
        isSuppressed ? s.sidePanelSuppressed : ""
      }`.trim()}
      data-article-sticky-rail
      data-sticky-state={isSuppressed ? "suppressed" : "visible"}
      aria-hidden={isSuppressed}
    >
      <ArticleConversionRail
        aside={aside}
        headingId="article-desktop-conversion-rail-title"
      />
    </div>
  );
}
