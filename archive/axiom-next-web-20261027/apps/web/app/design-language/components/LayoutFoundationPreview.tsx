"use client";

import { useState } from "react";
import PrimitiveBadge from "../../ui/badge/PrimitiveBadge";
import ContainerSpecimen, { type ContainerPreviewContext } from "./ContainerSpecimen.client";
import { GridSpecimen, SidebarSpecimen, SwitcherSpecimen } from "./IntrinsicLayoutSpecimens.client";
import { BleedSpecimen, CoverSpecimen, FrameSpecimen } from "./MediaLayoutSpecimens.client";
import { ClusterSpecimen, StackSpecimen } from "./StackClusterSpecimens.client";
import { getRuntimeEntriesByLayer } from "./registry";
import s from "./layoutFoundationPreview.module.css";

type PreviewSize = ContainerPreviewContext;

const previewSizes = [
  { id: "narrow", label: "Narrow", measure: "360 px" },
  { id: "medium", label: "Medium", measure: "672 px" },
  { id: "wide", label: "Wide", measure: "available width" },
] as const satisfies ReadonlyArray<{
  id: PreviewSize;
  label: string;
  measure: string;
}>;

const layoutEntries = getRuntimeEntriesByLayer("layout");
const containerEntry = layoutEntries.find((entry) => entry.id === "layout.container");
const stackEntry = layoutEntries.find((entry) => entry.id === "layout.stack");
const clusterEntry = layoutEntries.find((entry) => entry.id === "layout.cluster");
const gridEntry = layoutEntries.find((entry) => entry.id === "layout.grid");
const switcherEntry = layoutEntries.find((entry) => entry.id === "layout.switcher");
const sidebarEntry = layoutEntries.find((entry) => entry.id === "layout.sidebar");
const coverEntry = layoutEntries.find((entry) => entry.id === "layout.cover");
const frameEntry = layoutEntries.find((entry) => entry.id === "layout.frame");
const bleedEntry = layoutEntries.find((entry) => entry.id === "layout.bleed");

export default function LayoutFoundationPreview() {
  const [previewSize, setPreviewSize] = useState<PreviewSize>("wide");
  const activeSize = previewSizes.find((item) => item.id === previewSize);

  return (
    <div className={s.workbench} data-layout-foundation>
      <div className={s.toolbar}>
        <div
          aria-label="Layout preview width"
          className={s.segmentedControl}
          role="group"
        >
          {previewSizes.map((size) => (
            <button
              aria-controls="layout-preview-stage"
              aria-pressed={previewSize === size.id}
              data-active={previewSize === size.id || undefined}
              key={size.id}
              onClick={() => setPreviewSize(size.id)}
              type="button"
            >
              {size.label}
            </button>
          ))}
        </div>
        <output aria-live="polite">
          {activeSize?.label} · {activeSize?.measure}
        </output>
      </div>

      <div
        className={s.previewStage}
        data-layout-preview-size={previewSize}
        id="layout-preview-stage"
      >
        {containerEntry ? (
          <article
            className={s.specimenRow}
            data-layout-specimen={containerEntry.id}
          >
            <header>
              <div>
                <code translate="no">{containerEntry.id}</code>
                <h3>{containerEntry.name}</h3>
              </div>
              <PrimitiveBadge tone="success">{containerEntry.maturity}</PrimitiveBadge>
            </header>
            <p>{containerEntry.responsibility}</p>
            <div className={s.specimenCanvas} data-container-specimen-canvas>
              <ContainerSpecimen previewContext={previewSize} />
            </div>
          </article>
        ) : null}

        {stackEntry ? (
          <article className={s.specimenRow} data-layout-specimen={stackEntry.id}>
            <header>
              <div>
                <code translate="no">{stackEntry.id}</code>
                <h3>{stackEntry.name}</h3>
              </div>
              <PrimitiveBadge tone="warning">{stackEntry.maturity}</PrimitiveBadge>
            </header>
            <p>{stackEntry.responsibility}</p>
            <div className={s.specimenCanvas} data-stack-specimen-canvas>
              <StackSpecimen previewContext={previewSize} />
            </div>
          </article>
        ) : null}

        {clusterEntry ? (
          <article className={s.specimenRow} data-layout-specimen={clusterEntry.id}>
            <header>
              <div>
                <code translate="no">{clusterEntry.id}</code>
                <h3>{clusterEntry.name}</h3>
              </div>
              <PrimitiveBadge tone="warning">{clusterEntry.maturity}</PrimitiveBadge>
            </header>
            <p>{clusterEntry.responsibility}</p>
            <div className={s.specimenCanvas} data-cluster-specimen-canvas>
              <ClusterSpecimen previewContext={previewSize} />
            </div>
          </article>
        ) : null}

        {gridEntry ? (
          <article className={s.specimenRow} data-layout-specimen={gridEntry.id}>
            <header>
              <div>
                <code translate="no">{gridEntry.id}</code>
                <h3>{gridEntry.name}</h3>
              </div>
              <PrimitiveBadge tone="warning">{gridEntry.maturity}</PrimitiveBadge>
            </header>
            <p>{gridEntry.responsibility}</p>
            <div className={s.specimenCanvas} data-grid-specimen-canvas>
              <GridSpecimen previewContext={previewSize} />
            </div>
          </article>
        ) : null}

        {switcherEntry ? (
          <article className={s.specimenRow} data-layout-specimen={switcherEntry.id}>
            <header>
              <div>
                <code translate="no">{switcherEntry.id}</code>
                <h3>{switcherEntry.name}</h3>
              </div>
              <PrimitiveBadge tone="warning">{switcherEntry.maturity}</PrimitiveBadge>
            </header>
            <p>{switcherEntry.responsibility}</p>
            <div className={s.specimenCanvas} data-switcher-specimen-canvas>
              <SwitcherSpecimen previewContext={previewSize} />
            </div>
          </article>
        ) : null}

        {sidebarEntry ? (
          <article className={s.specimenRow} data-layout-specimen={sidebarEntry.id}>
            <header>
              <div>
                <code translate="no">{sidebarEntry.id}</code>
                <h3>{sidebarEntry.name}</h3>
              </div>
              <PrimitiveBadge tone="warning">{sidebarEntry.maturity}</PrimitiveBadge>
            </header>
            <p>{sidebarEntry.responsibility}</p>
            <div className={s.specimenCanvas} data-sidebar-specimen-canvas>
              <SidebarSpecimen previewContext={previewSize} />
            </div>
          </article>
        ) : null}

        {coverEntry ? (
          <article className={s.specimenRow} data-layout-specimen={coverEntry.id}>
            <header>
              <div>
                <code translate="no">{coverEntry.id}</code>
                <h3>{coverEntry.name}</h3>
              </div>
              <PrimitiveBadge tone="warning">{coverEntry.maturity}</PrimitiveBadge>
            </header>
            <p>{coverEntry.responsibility}</p>
            <div className={s.specimenCanvas} data-cover-specimen-canvas>
              <CoverSpecimen previewContext={previewSize} />
            </div>
          </article>
        ) : null}

        {frameEntry ? (
          <article className={s.specimenRow} data-layout-specimen={frameEntry.id}>
            <header>
              <div>
                <code translate="no">{frameEntry.id}</code>
                <h3>{frameEntry.name}</h3>
              </div>
              <PrimitiveBadge tone="warning">{frameEntry.maturity}</PrimitiveBadge>
            </header>
            <p>{frameEntry.responsibility}</p>
            <div className={s.specimenCanvas} data-frame-specimen-canvas>
              <FrameSpecimen previewContext={previewSize} />
            </div>
          </article>
        ) : null}

        {bleedEntry ? (
          <article className={s.specimenRow} data-layout-specimen={bleedEntry.id}>
            <header>
              <div>
                <code translate="no">{bleedEntry.id}</code>
                <h3>{bleedEntry.name}</h3>
              </div>
              <PrimitiveBadge tone="warning">{bleedEntry.maturity}</PrimitiveBadge>
            </header>
            <p>{bleedEntry.responsibility}</p>
            <div className={s.specimenCanvas} data-bleed-specimen-canvas>
              <BleedSpecimen previewContext={previewSize} />
            </div>
          </article>
        ) : null}
      </div>
    </div>
  );
}
