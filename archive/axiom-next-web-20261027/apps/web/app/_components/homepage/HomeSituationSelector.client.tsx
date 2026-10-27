"use client";

import { ArrowDownRight, ArrowRight, Send } from "lucide-react";
import { Fragment, useState } from "react";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import type {
  HomeOrientationPath,
  HomeSituation,
} from "../../../lib/homepage/types";
import s from "../../homepage.module.css";
import Link from "../../ui/primitives/Link";

type SituationSelectorItem = Pick<
  HomeSituation,
  | "ctaLabel"
  | "description"
  | "href"
  | "id"
  | "metadata"
  | "routeExplanation"
  | "selectorLabel"
> & {
  serviceTitle: string;
};

type OrientationSelectorItem = Pick<
  HomeOrientationPath,
  "ctaLabel" | "description" | "href" | "id" | "title"
>;

type HomeSituationSelectorProps = {
  customSituation: {
    context: string;
    href: HomeSituation["href"];
    label: string;
  };
  items: readonly SituationSelectorItem[];
  orientation: OrientationSelectorItem;
};

function isCompactSituationLayout() {
  return window.matchMedia(
    DESIGN_PRIMITIVE_MEDIA_QUERIES.compactLayout,
  ).matches;
}

function scrollSituationIntoView(row: HTMLElement) {
  const reducedMotion = window.matchMedia(
    DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
  ).matches;

  const alignRow = (behavior: ScrollBehavior) => {
    if (row.dataset.active !== "true") return;
    row.scrollIntoView({ behavior, block: "start" });
  };

  window.requestAnimationFrame(() => {
    if (reducedMotion) {
      alignRow("auto");
      return;
    }

    const detail = row.querySelector<HTMLElement>(
      "[data-situation-detail-viewport]",
    );
    if (!detail) {
      alignRow("smooth");
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(fallbackId);
      detail.removeEventListener("transitionend", handleTransitionEnd);
      // Both closing and opening panels refresh the scroll measurements.
      // Start native scrolling after their transition events have finished.
      window.requestAnimationFrame(() => alignRow("smooth"));
    };
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (
        event.target === detail
        && event.propertyName === "grid-template-rows"
      ) finish();
    };
    const fallbackId = window.setTimeout(finish, 600);

    detail.addEventListener("transitionend", handleTransitionEnd);
  });
}

export default function HomeSituationSelector({
  customSituation,
  items,
  orientation,
}: HomeSituationSelectorProps) {
  const [activeId, setActiveId] = useState<HomeSituation["id"] | "">(
    items[0]?.id ?? "",
  );
  const activeIndex = items.findIndex(({ id }) => id === activeId);

  const renderOrientationWords = (text: string) =>
    text.split(" ").map((word, index, words) => (
      <Fragment key={`${word}-${index}`}>
        <span
          aria-hidden="true"
          className={s.situationOrientationWord}
          data-orientation-word
        >
          <span data-orientation-word-ink>{word}</span>
        </span>
        {index < words.length - 1 ? " " : null}
      </Fragment>
    ));

  return (
    <div
      className={s.situationSelectorRoot}
      data-situation-active-index={activeIndex}
      data-situation-layout="accordion"
    >
      <div className={s.situationSelector} data-situation-selector>
        <span
          aria-hidden="true"
          className={s.situationStageRule}
          data-situation-stage-rule
        />
        <div
          aria-label="Vyberte finanční situaci"
          className={s.situationChoiceRail}
          data-situation-choice-rail
          role="group"
        >
          {items.map((item, itemIndex) => {
            const active = item.id === activeId;
            const panelId = `situation-${item.id}-panel`;
            const tabId = `situation-${item.id}-tab`;
            const startId = `situation-${item.id}-start`;
            const titleId = `situation-${item.id}-title`;
            const topicCount = Number(item.metadata.length);
            const topicCountLabel = topicCount === 1
              ? "1 TÉMA"
              : `${topicCount} TÉMATA`;

            return (
              <section
                className={s.situationSelectorItem}
                data-active={active ? "true" : undefined}
                data-situation-row={item.id}
                key={item.id}
              >
                <span
                  aria-hidden="true"
                  className={s.situationChoiceRule}
                  data-situation-choice-rule
                />
                <h3 className={s.situationChoiceHeading}>
                  <button
                    aria-controls={panelId}
                    aria-expanded={active}
                    className={s.situationChoice}
                    data-cursor="link"
                    data-cursor-frame-target="[data-situation-choice-marker]"
                    data-cursor-icon="arrow"
                    data-cursor-split-core
                    data-situation-choice={item.id}
                    id={tabId}
                    onClick={(event) => {
                      if (!active) {
                        setActiveId(item.id);
                        if (isCompactSituationLayout()) {
                          const row = event.currentTarget.closest<HTMLElement>(
                            "[data-situation-row]",
                          );
                          if (row) scrollSituationIntoView(row);
                        }
                        return;
                      }

                      setActiveId("");
                    }}
                    type="button"
                  >
                    <span className={s.situationChoiceMeta}>
                    <span
                      className={s.situationChoiceIndex}
                      data-situation-choice-index
                    >
                        {String(itemIndex + 1).padStart(2, "0")}
                      </span>
                      <strong data-situation-choice-context>
                        {item.selectorLabel}
                      </strong>
                    </span>
                    <span className={s.situationChoiceCopy}>
                      <span
                        className={s.situationChoiceLabel}
                        data-situation-choice-ink
                      >
                        <span id={titleId}>{item.description}</span>
                      </span>
                      <span
                        className={s.situationChoiceSummary}
                        data-situation-choice-summary
                      >
                        {item.metadata.join(" · ")}
                      </span>
                    </span>
                    <span
                      className={s.situationChoiceCount}
                      data-situation-choice-count
                    >
                      {topicCountLabel}
                    </span>
                    <span
                      aria-hidden="true"
                      className={s.situationChoiceMarker}
                      data-active={active ? "true" : undefined}
                      data-situation-choice-marker
                    >
                      <ArrowDownRight />
                    </span>
                  </button>
                </h3>

                <div
                  aria-hidden={!active}
                  aria-labelledby={tabId}
                  className={s.situationDetailViewport}
                  data-situation-dark-plane={active ? "" : undefined}
                  data-situation-detail-viewport={active ? "" : undefined}
                  id={panelId}
                  inert={!active ? true : undefined}
                  role="region"
                >
                  <button
                    aria-label={`Zavřít službu ${item.selectorLabel}`}
                    className={s.situationPanelDismiss}
                    data-situation-panel-dismiss
                    onClick={() => setActiveId("")}
                    type="button"
                  />
                  <div className={s.situationPanelClip}>
                    <div className={s.situationPanelStack}>
                      <article
                        className={s.situationPanel}
                        data-cursor="action"
                        data-cursor-click-target="[data-situation-panel-action]"
                        data-cursor-frame-target="[data-situation-panel-action]"
                        data-cursor-icon="send"
                        data-cursor-split-core
                        data-active={active ? "true" : undefined}
                        data-situation-panel={item.id}
                      >
                        <div
                          className={s.situationPanelTopics}
                          data-situation-panel-reveal
                        >
                          <span className={s.situationPanelLabel}>
                            <span data-situation-panel-label-ink>
                              Na co se podíváme
                            </span>
                          </span>
                          <ul>
                            {item.metadata.map((topic) => (
                              <li key={topic}>
                                <span data-situation-topic-ink>{topic}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div
                          className={s.situationPanelStart}
                          data-situation-panel-reveal
                        >
                          <div className={s.situationPanelStartCopy}>
                            <span className={s.situationPanelLabel}>
                              <span data-situation-panel-label-ink>
                                Jak začneme
                              </span>
                            </span>
                            <p id={startId}>
                              <span data-situation-start-ink>
                                {item.routeExplanation}
                              </span>
                            </p>
                            <p
                              className={s.situationPanelService}
                              data-situation-service
                            >
                              <span>
                                Související služba:{" "}
                                <strong>{item.serviceTitle}</strong>
                              </span>
                            </p>
                          </div>
                          <Link
                            aria-describedby={`${titleId} ${startId}`}
                            className={s.situationPanelAction}
                            data-analytics-destination={item.href}
                            data-analytics-event="home_situation_select"
                            data-analytics-source="home-situations"
                            data-cta-composition="docked"
                            data-cursor="action"
                            data-cursor-icon="send"
                            data-cursor-label="POPSAT SITUACI • DOMLUVIT PRVNÍ KONTAKT •"
                            data-cursor-magnetic="true"
                            data-cursor-split-core
                            data-situation-id={item.id}
                            data-situation-panel-action
                            href={item.href}
                            variant="primary-action"
                          >
                            <span>{item.ctaLabel}</span>
                            <span aria-hidden="true" data-cta-icon-shell>
                              <span data-cta-icon-motion>
                                <Send
                                  aria-hidden="true"
                                  data-cta-icon="paper-plane"
                                />
                              </span>
                            </span>
                          </Link>
                        </div>
                      </article>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div
        className={s.situationServices}
        data-situation-custom
        data-situation-utility
      >
        <span
          className={s.situationServicesContext}
          data-custom-situation-context
        >
          {customSituation.context}
        </span>
        <Link
          className={s.situationServicesLink}
          data-custom-situation-link
          href={customSituation.href}
          variant="text"
        >
          <span>{customSituation.label}</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>

      <noscript>
        <ul className={s.situationNoScriptList}>
          {items.map((item) => (
            <li key={item.id}>
              <a href={item.href}>{item.selectorLabel}</a>
            </li>
          ))}
        </ul>
      </noscript>

      <section
        aria-labelledby="home-situation-orientation-title"
        className={s.situationOrientation}
        data-orientation-surface
        data-surface-tone="action"
      >
        <span
          aria-hidden="true"
          className={s.situationOrientationRule}
          data-edge="top"
          data-orientation-rule
        />
        <div className={s.situationOrientationInner} data-orientation-inner>
          <div
            className={s.situationOrientationStatement}
            data-orientation-statement
          >
            <h3
              aria-label={orientation.title}
              className={s.situationOrientationHeading}
              data-orientation-heading
              id="home-situation-orientation-title"
            >
              {renderOrientationWords(orientation.title)}
            </h3>
          </div>
          <div className={s.situationOrientationContent}>
            <p
              className={s.situationOrientationDescription}
              data-orientation-description
            >
              <span
                className={s.situationOrientationDescriptionMask}
              >
                <span data-orientation-description-ink>
                  {orientation.description}
                </span>
              </span>
            </p>
            <Link
              aria-describedby="home-situation-orientation-title"
              className={s.situationOrientationCta}
              data-analytics-destination={orientation.href}
              data-analytics-event="home_situation_select"
              data-analytics-source="home-situations"
              data-cta-composition="docked"
              data-cursor="action"
              data-cursor-icon="send"
              data-cursor-label="ZÍSKAT PRVNÍ PŘEHLED • UJASNIT PRIORITY •"
              data-cursor-magnetic="true"
              data-orientation-action
              data-orientation-action-rail
              data-orientation-path="true"
              data-situation-action
              data-situation-id={orientation.id}
              href={orientation.href}
              variant="primary-action"
            >
              <span>{orientation.ctaLabel}</span>
              <span aria-hidden="true" data-cta-icon-shell>
                <span data-cta-icon-motion>
                  <Send aria-hidden="true" data-cta-icon="paper-plane" />
                </span>
              </span>
            </Link>
          </div>
        </div>
        <span
          aria-hidden="true"
          className={s.situationOrientationRule}
          data-edge="bottom"
          data-orientation-rule
        />
      </section>
    </div>
  );
}
