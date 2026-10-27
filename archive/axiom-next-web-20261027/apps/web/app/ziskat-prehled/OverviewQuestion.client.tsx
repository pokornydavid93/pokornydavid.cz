"use client";

import { useEffect, useRef } from "react";
import s from "./overviewFunnel.module.css";

/** The income funnel's character reveal, with readable HTML before enhancement. */
export default function OverviewQuestion({
  id,
  lead,
  body,
  compact = false,
  emphasis = "lead",
}: {
  id: string;
  lead: string;
  body: string;
  compact?: boolean;
  emphasis?: "lead" | "body";
}) {
  const bodyRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const target = bodyRef.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!target || preference.matches || typeof target.animate !== "function") return;

    const characters: HTMLSpanElement[] = [];
    const fragment = document.createDocumentFragment();
    for (const part of body.split(/(\s+)/u)) {
      if (/^\s*$/u.test(part)) {
        fragment.append(document.createTextNode(part));
        continue;
      }
      const word = document.createElement("span");
      word.style.whiteSpace = "nowrap";
      for (const character of Array.from(part)) {
        const span = document.createElement("span");
        span.textContent = character;
        word.append(span);
        characters.push(span);
      }
      fragment.append(word);
    }
    target.replaceChildren(fragment);

    const stagger = Math.min(24, 1_160 / Math.max(1, characters.length - 1));
    const animations = characters.map((character, index) => character.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      {
        duration: 440,
        delay: index * stagger,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      },
    ));
    const settle = () => {
      animations.forEach((animation) => animation.cancel());
      target.textContent = body;
    };
    const timer = window.setTimeout(settle, 1_600);
    const onPreferenceChange = () => {
      if (preference.matches) settle();
    };
    preference.addEventListener("change", onPreferenceChange);

    return () => {
      window.clearTimeout(timer);
      preference.removeEventListener("change", onPreferenceChange);
      settle();
    };
  }, [body]);

  return (
    <h1
      aria-label={`${lead}${body}`}
      className={compact ? `${s.question} ${s.contactQuestion}` : s.question}
      id={id}
    >
      <span aria-hidden="true" className={emphasis === "lead" ? s.questionLead : undefined}>{lead}</span>
      <span aria-hidden="true" className={emphasis === "body" ? s.questionLead : undefined} ref={bodyRef}>{body}</span>
    </h1>
  );
}
