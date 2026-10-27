"use client";

import type { CSSProperties } from "react";
import {
  Phone,
  Sparkles,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import s from "./process.module.css";
import type { DecisionMapStep, ProcessIconKey } from "./processDiagramData";

const ICONS: Record<ProcessIconKey, LucideIcon> = {
  phone: Phone,
  wallet: WalletCards,
  sparkles: Sparkles,
};

type ProcessDiagramNodeProps = {
  className?: string;
  index: number;
  step: DecisionMapStep;
  style?: CSSProperties;
};

export default function ProcessDiagramNode({
  className,
  index,
  step,
  style,
}: ProcessDiagramNodeProps) {
  const Icon = ICONS[step.icon];

  return (
    <article
      className={className ? `${s.artifactCard} ${className}` : s.artifactCard}
      data-process-node
      data-process-node-id={step.id}
      data-process-node-role={step.role}
      data-process-reveal-at={step.revealAt}
      data-process-step-index={index}
      data-process-step-item
      id={step.anchorId}
      style={style}
    >
      <div className={s.artifactChrome} aria-hidden="true" />
      <div className={s.artifactTopline}>
        <div className={s.artifactHeaderMeta}>
          <span className={s.artifactIndex}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className={s.artifactLabel}>VÝSTUP MAPY</span>
        </div>
        <span className={s.artifactIcon} aria-hidden="true">
          <Icon size={18} strokeWidth={1.8} />
        </span>
      </div>

      <div className={s.artifactCopy}>
        <h3>{step.artifactTitle}</h3>
      </div>

      <ul className={s.artifactList}>
        {step.artifactItems.map((item) => (
          <li key={item.title}>
            <span className={s.artifactMarker} aria-hidden="true" />
            <span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </span>
          </li>
        ))}
      </ul>

      <div className={s.artifactResult}>
        <span>Výsledek</span>
        <strong>{step.artifactResult}</strong>
      </div>
    </article>
  );
}
