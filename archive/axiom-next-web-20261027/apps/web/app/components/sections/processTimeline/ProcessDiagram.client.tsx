"use client";

import { useRef } from "react";
import {
  Phone,
  Sparkles,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import s from "./process.module.css";
import {
  decisionMapSteps,
  type ProcessIconKey,
} from "./processDiagramData";
import { useProcessScrollTimeline } from "./useProcessScrollTimeline";

const ICONS: Record<ProcessIconKey, LucideIcon> = {
  phone: Phone,
  wallet: WalletCards,
  sparkles: Sparkles,
};

const PROCESS_ROUTE_PATH =
  "M 118 114 C 284 114 314 286 488 286 C 650 286 668 136 838 136";

export default function ProcessDiagram() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useProcessScrollTimeline({ rootRef });

  return (
    <div className={s.diagramArea} data-process-tree ref={rootRef}>
      <div
        className={s.routeBoard}
        data-process-mobile-flow
        data-process-route-board
      >
        <svg
          aria-hidden="true"
          className={s.diagramConnectors}
          preserveAspectRatio="none"
          viewBox="0 0 1000 390"
        >
          <path
            className={s.diagramConnectorBase}
            d={PROCESS_ROUTE_PATH}
            pathLength={1}
          />
          <path
            className={s.diagramConnectorFill}
            d={PROCESS_ROUTE_PATH}
            pathLength={1}
          />
          <circle className={s.diagramConnectorDot} cx="118" cy="114" r="3.5" />
          <circle className={s.diagramConnectorDot} cx="488" cy="286" r="3.5" />
          <circle className={s.diagramConnectorDot} cx="838" cy="136" r="3.5" />
        </svg>
        <span className={s.routeTrack} aria-hidden="true">
          <span className={s.routeTrackFill} data-process-route-fill />
        </span>
        {decisionMapSteps.map((step, index) => {
          const Icon = ICONS[step.icon];
          const stepNumber = String(index + 1).padStart(2, "0");
          return (
            <div
              className={s.routeStep}
              data-process-diagram-step
              data-process-step-index={index}
              data-process-step-role={step.role}
              key={step.id}
            >
              <article
                className={s.routeStepInner}
                data-process-mobile-card
                data-process-reveal-at={step.revealAt}
                data-process-step-role={step.role}
                id={step.anchorId ?? step.id}
              >
                <div className={s.routeStepTop} data-process-card-part>
                  <span
                    aria-current={index === 0 ? "step" : undefined}
                    aria-label={`Krok ${index + 1}: ${step.title}`}
                    className={s.routeNode}
                    data-process-progress-item
                    data-process-reveal-at={step.revealAt}
                    data-process-step-index={index}
                  >
                    <span>{stepNumber}</span>
                  </span>
                  <span className={s.routeIcon}>
                    <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
                  </span>
                </div>
                <div className={s.routeStepBody}>
                  <p className={s.nodeMeta} data-process-card-part>
                    {step.eyebrow}
                  </p>
                  <h3 data-process-card-part>{step.title}</h3>
                  <p data-process-card-part>{step.description}</p>
                  <div className={s.routeOutcome} data-process-card-part>
                    <span>Výstup</span>
                    <strong>{step.artifactResult}</strong>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </div>
  );
}
