"use client";

import { useEffect, useRef } from "react";
import Link from "../../ui/primitives/Link";
import s from "./thankYouExperience.module.css";

export type ThankYouArticle = {
  slug: string;
  href: string;
  title: string;
  categoryLabel: string;
  readingTime?: string;
};

type ThankYouExperienceProps = {
  emailStatus: "queued" | "unavailable";
  articles: ThankYouArticle[];
  websiteHref: string | null;
};

const EYEBROW = "POPTÁVKA PŘIJATA";
const HEADLINE = "Děkuji. Ozvu se vám.";
const PROMISE =
  "Během následujících 24 hodin vám zavolám. Společně si ujasníme, co má smysl řešit jako první.";
const EMAIL_QUEUED = "Shrnutí toho, co jste zadali, vám právě posílám e-mailem.";
const EMAIL_UNAVAILABLE =
  "Odeslání shrnutí e-mailem teď nemohu potvrdit. Vaši poptávku jsem ale přijal.";

const BLINK_CYCLE_MS = 340;
const BLINK_CYCLES = 4;
const REVEAL_MS = 1100;

function splitGraphemes(value: string): string[] {
  if (typeof Intl.Segmenter === "function") {
    return Array.from(
      new Intl.Segmenter("cs", { granularity: "grapheme" }).segment(value),
      ({ segment }) => segment,
    );
  }
  return Array.from(value);
}

function TypedCopy({ children }: { children: string }) {
  return (
    <span className={s.typeSlot} data-type-slot>
      <span className={s.fullCopy} data-type-base>{children}</span>
      <span className={s.visualCopy} aria-hidden="true">
        <span data-type-ink />
        <span className={s.caret} data-type-caret />
      </span>
    </span>
  );
}

export default function ThankYouExperience({
  emailStatus,
  articles,
  websiteHref,
}: ThankYouExperienceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const emailCopy = emailStatus === "queued" ? EMAIL_QUEUED : EMAIL_UNAVAILABLE;
  const recommendations = articles.slice(0, 3);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const slots = Array.from(root.querySelectorAll<HTMLElement>("[data-type-slot]"));
    const firstBase = slots[0]?.querySelector<HTMLElement>("[data-type-base]");
    const nextChapter = root.querySelector<HTMLElement>("[data-next-chapter]");

    // The complete page is rendered by the server. CSS gives hydration a short
    // window to start the enhancement, then shows the static page on its own.
    // If that fallback has already appeared, keep it instead of clearing copy.
    if (
      reducedMotion.matches ||
      !firstBase ||
      root.contains(document.activeElement) ||
      window.scrollY > 24 ||
      document.visibilityState === "hidden" ||
      window.getComputedStyle(firstBase).opacity !== "0"
    ) {
      root.dataset.motionState = "done";
      return;
    }

    const lines = slots.map((slot) => ({
      slot,
      ink: slot.querySelector<HTMLElement>("[data-type-ink]"),
      graphemes: splitGraphemes(slot.querySelector("[data-type-base]")?.textContent ?? ""),
    }));
    if (lines.some(({ ink }) => !ink)) {
      root.dataset.motionState = "done";
      return;
    }

    const characterCount = lines.reduce((total, line) => total + line.graphemes.length, 0);
    const characterMs = Math.max(16, Math.min(25, 4100 / Math.max(characterCount, 1)));
    let timer: number | undefined;
    let finished = false;
    let activeLine = 0;
    let characterIndex = 0;

    const clearTimer = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
    };
    const clearActiveCaret = () => {
      for (const { slot } of lines) delete slot.dataset.active;
    };
    const removeInterruptions = () => {
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", onMotionChange);
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimer();
      clearActiveCaret();
      if (nextChapter) nextChapter.inert = false;
      root.dataset.motionState = "done";
      removeInterruptions();
    };
    function onKeyDown(event: KeyboardEvent) {
      // A keyboard visitor must never tab into a visually unrevealed link.
      if (event.key === "Tab") finish();
    }
    function onScroll() {
      // Reading further down is an explicit request for the whole page.
      if (window.scrollY > 24) finish();
    }
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") finish();
    }
    function onMotionChange() {
      if (reducedMotion.matches) finish();
    }

    const reveal = () => {
      if (finished) return;
      clearActiveCaret();
      if (nextChapter) nextChapter.inert = false;
      root.dataset.motionState = "revealing";
      timer = window.setTimeout(finish, REVEAL_MS);
    };
    const blink = () => {
      if (finished) return;
      root.dataset.motionState = "blinking";
      timer = window.setTimeout(reveal, BLINK_CYCLE_MS * BLINK_CYCLES);
    };
    const typeNext = () => {
      if (finished) return;
      const line = lines[activeLine];
      if (!line) {
        blink();
        return;
      }
      const next = line.graphemes[characterIndex];
      if (next === undefined) {
        if (activeLine === lines.length - 1) {
          blink();
          return;
        }
        delete line.slot.dataset.active;
        activeLine += 1;
        characterIndex = 0;
        lines[activeLine]?.slot.setAttribute("data-active", "true");
        timer = window.setTimeout(typeNext, 125);
        return;
      }

      line.ink?.append(document.createTextNode(next));
      characterIndex += 1;
      const pause = /[.!?]/u.test(next) ? 95 : /[,;]/u.test(next) ? 55 : 0;
      timer = window.setTimeout(typeNext, characterMs + pause);
    };

    root.dataset.motionState = "typing";
    if (nextChapter) nextChapter.inert = true;
    lines[0]?.slot.setAttribute("data-active", "true");
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", onMotionChange);
    timer = window.setTimeout(typeNext, 90);

    return () => {
      clearTimer();
      removeInterruptions();
      clearActiveCaret();
      if (nextChapter) nextChapter.inert = false;
      for (const { ink } of lines) ink?.replaceChildren();
      root.dataset.motionState = "pending";
    };
  }, [emailStatus]);

  return (
    <div ref={rootRef} className={s.experience} data-motion-state="pending">
      <header className={s.intro}>
        <p className={s.eyebrow}><TypedCopy>{EYEBROW}</TypedCopy></p>
        <h1 className={s.headline}><TypedCopy>{HEADLINE}</TypedCopy></h1>
        <p className={s.promise}><TypedCopy>{PROMISE}</TypedCopy></p>
        <p className={s.emailNote} data-email-status={emailStatus}>
          <TypedCopy>{emailCopy}</TypedCopy>
        </p>
      </header>

      {(recommendations.length > 0 || websiteHref) && (
        <div className={s.nextChapter} data-next-chapter>
          {recommendations.length > 0 && (
            <section className={s.recommendations} data-route-reveal-group aria-labelledby="thank-you-reading-title">
              <h2 className={s.recommendationsTitle} data-route-reveal-item="title" id="thank-you-reading-title">
                Mohlo by vás zajímat
              </h2>
              <ul className={s.articleList}>
                {recommendations.map((article) => (
                  <li className={s.articleItem} data-route-reveal-group="row" key={article.slug}>
                    <Link className={s.articleLink} data-cursor-no-magnetic href={article.href}>
                      <span className={s.articleText}>
                        <span className={s.articleMeta} data-route-reveal-item="meta">
                          {article.categoryLabel}
                          {article.readingTime && <span aria-hidden="true" className={s.metaDot}>·</span>}
                          {article.readingTime && <span>{article.readingTime}</span>}
                        </span>
                        <span className={s.articleTitle} data-route-reveal-item="title">{article.title}</span>
                      </span>
                      <span className={s.articleArrow} aria-hidden="true">↗</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {websiteHref && (
            <Link className={s.continueLink} href={websiteHref}>
              Pokračovat na webu <span aria-hidden="true">↗</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
