"use client";

import { useEffect, useRef, useState } from "react";
import type { BlogArticleSection } from "@/lib/blog";
import e from "./articleRenderer.module.css";

type ArticleContextRailProps = {
  sections: BlogArticleSection[];
};

export default function ArticleContextRail({
  sections,
}: ArticleContextRailProps) {
  const navigationRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const activeIndex = Math.max(
    0,
    sections.findIndex((section) => section.id === activeId),
  );
  const activeSection = sections[activeIndex];

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;

      try {
        const id = decodeURIComponent(hash);
        if (sections.some((section) => section.id === id)) setActiveId(id);
      } catch {
        // An invalid fragment cannot point to an article section.
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [sections]);

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (elements.length === 0) return;

    const visible = new Map<string, IntersectionObserverEntry>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).id;

          if (entry.isIntersecting) visible.set(id, entry);
          else visible.delete(id);
        });

        const next = [...visible.values()].sort((left, right) => {
          const leftDistance = Math.abs(left.boundingClientRect.top);
          const rightDistance = Math.abs(right.boundingClientRect.top);
          return leftDistance - rightDistance;
        })[0];

        if (next) setActiveId((next.target as HTMLElement).id);
      },
      {
        rootMargin: "-18% 0px -62% 0px",
        threshold: [0, 0.01, 0.25],
      },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;

    const revealActiveLink = () => {
      if (navigation.scrollHeight <= navigation.clientHeight) return;
      const activeLink = navigation.querySelector<HTMLElement>(
        '[aria-current="location"]',
      );
      if (!activeLink) return;

      const navigationBounds = navigation.getBoundingClientRect();
      const linkBounds = activeLink.getBoundingClientRect();
      // Scroll only the contents list; article reading position stays unchanged.
      if (linkBounds.top < navigationBounds.top) {
        navigation.scrollTop += linkBounds.top - navigationBounds.top;
      } else if (linkBounds.bottom > navigationBounds.bottom) {
        navigation.scrollTop += linkBounds.bottom - navigationBounds.bottom;
      }
    };

    revealActiveLink();
    const observer = new ResizeObserver(revealActiveLink);
    observer.observe(navigation);
    return () => observer.disconnect();
  }, [activeId]);

  if (!activeSection) return null;

  const current = String(activeIndex + 1).padStart(2, "0");
  const total = String(sections.length).padStart(2, "0");

  return (
    <aside
      aria-label="Průvodce článkem"
      className={e.contextRail}
      data-article-context-rail
      data-active-section={activeSection.id}
    >
      <div className={e.contextProgress}>
        <span>Průběh článku</span>
        <strong>
          {current} / {total}
        </strong>
        <div aria-hidden="true">
          <span
            style={{
              transform: `scaleX(${(activeIndex + 1) / sections.length})`,
            }}
          />
        </div>
      </div>

      <nav
        ref={navigationRef}
        aria-label="Části článku"
        className={e.contextNavigation}
        data-lenis-prevent
      >
        <ol>
          {sections.map((section, index) => {
            const isActive = section.id === activeSection.id;

            return (
              <li data-active={isActive ? "true" : "false"} key={section.id}>
                <a
                  aria-current={isActive ? "location" : undefined}
                  data-cursor-no-frame
                  data-cursor-no-magnetic
                  href={`#${section.id}`}
                  onClick={() => setActiveId(section.id)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {section.title}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    </aside>
  );
}
