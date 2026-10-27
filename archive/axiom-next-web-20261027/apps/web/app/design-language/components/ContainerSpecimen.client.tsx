"use client";

import { useEffect, useRef, useState } from "react";
import Container, {
  type ContainerGutter,
  type ContainerSize,
} from "../../ui/layout/Container";
import Grid from "../../ui/layout/Grid";
import Stack from "../../ui/layout/Stack";
import Prose from "../../ui/primitives/Prose";
import Surface from "../../ui/primitives/Surface";
import s from "./layoutFoundationPreview.module.css";

export type ContainerPreviewContext = "narrow" | "medium" | "wide";

type ContainerSpecimenProps = {
  previewContext: ContainerPreviewContext;
};

type ContainerMetrics = {
  preview: number;
  outer: number;
  gutter: number;
  content: number;
  state: "fluid" | "capped + centered";
};

const containerSizes = ["measure", "content", "wide"] as const;

const initialMetrics: ContainerMetrics = {
  preview: 0,
  outer: 0,
  gutter: 0,
  content: 0,
  state: "fluid",
};

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function sameMetrics(first: ContainerMetrics, second: ContainerMetrics) {
  return first.preview === second.preview
    && first.outer === second.outer
    && first.gutter === second.gutter
    && first.content === second.content
    && first.state === second.state;
}

function TechnicalContent() {
  return (
    <div className={s.containerContentProbe} data-container-content-edge>
      <span>Content edge</span>
      <h4>Jasná šířka drží souvislosti pohromadě.</h4>
      <p>
        Rozhodnutí se čte lépe, když řádky nejsou ani stísněné, ani bezbřeze
        dlouhé. Container omezuje pouze dostupný inline prostor.
      </p>
      <p className={s.stressText} data-container-long-url>
        pokornydavid.cz/financni-plan/dlouhodoby-scenar-a-navazujici-kroky
      </p>
    </div>
  );
}

function RealCompositionExamples() {
  return (
    <section className={s.containerExamples} aria-labelledby="container-examples-heading">
      <header>
        <span>Runtime compositions</span>
        <h4 id="container-examples-heading">Stejný primitive, tři obsahové role</h4>
      </header>

      <article>
        <div><code>measure</code><span>Prose</span></div>
        <div className={s.exampleRunway}>
          <Container data-container-example="measure" size="measure">
            <Prose as="div" measure="body">
              <h4>Plán musí zůstat čitelný i bez okolního layoutu</h4>
              <p>Čtecí role omezuje použitelnou šířku textu a nechává typografii řídit vlastní rytmus.</p>
            </Prose>
          </Container>
        </div>
      </article>

      <article>
        <div><code>content</code><span>Standard section</span></div>
        <div className={s.exampleRunway}>
          <Container data-container-example="content" size="content">
            <Stack gap="m">
              <span className={s.demoLabel}>Standard section</span>
              <h4>Nejdřív přehled, potom rozhodnutí</h4>
              <p>Obsahová role drží nadpis, vysvětlení a navazující blok ve společné kompoziční hranici.</p>
            </Stack>
          </Container>
        </div>
      </article>

      <article>
        <div><code>wide</code><span>Card grid</span></div>
        <div className={s.exampleRunway}>
          <Container data-container-example="wide" size="wide">
            <Grid as="ul" className={s.containerExampleGrid} minimum="default">
              {["Rezerva", "Investice", "Ochrana příjmu"].map((label) => (
                <Surface as="li" className={s.containerExampleCard} key={label} surface="card-dark" tone="dark">
                  <strong>{label}</strong>
                  <span>Samostatný rozhodovací blok</span>
                </Surface>
              ))}
            </Grid>
          </Container>
        </div>
      </article>
    </section>
  );
}

function EdgeCaseFixtures() {
  return (
    <details className={s.containerEdgeCases} data-container-edge-cases>
      <summary>Edge-case fixtures</summary>
      <div>
        <section>
          <span>Empty</span>
          <Container className={s.emptyContainerFixture} data-container-edge-case="empty">{null}</Container>
        </section>
        <section>
          <span>Single + long word</span>
          <Container data-container-edge-case="single" size="measure">
            <p className={s.stressText}>nejpravdepodobnejsidlouhodobyinvesticniscenarbezdelicichznaku</p>
          </Container>
        </section>
        <section>
          <span>Multiple blocks</span>
          <Container data-container-edge-case="multiple" size="content">
            <Stack gap="s"><p>První blok.</p><p>Druhý blok.</p><p>Třetí blok.</p></Stack>
          </Container>
        </section>
        <section dir="rtl">
          <span>RTL</span>
          <Container data-container-edge-case="rtl" size="measure">
            <p>من اليمين إلى اليسار مع حواف داخلية منطقية ومتوازنة.</p>
          </Container>
        </section>
        <section>
          <span>Nested / explicit none</span>
          <Container data-container-edge-case="nested-outer" size="content">
            <Container data-container-edge-case="nested-inner" gutter="none" size="measure">
              <p>Vnitřní instance nepřidává druhý inline gutter.</p>
            </Container>
          </Container>
        </section>
      </div>
    </details>
  );
}

export default function ContainerSpecimen({ previewContext }: ContainerSpecimenProps) {
  const [size, setSize] = useState<ContainerSize>("measure");
  const [gutter, setGutter] = useState<ContainerGutter>("default");
  const [metrics, setMetrics] = useState<ContainerMetrics>(initialMetrics);
  const sandboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sandbox = sandboxRef.current;
    const container = sandbox?.querySelector<HTMLElement>("[data-container-interactive]");
    if (!sandbox || !container) return;

    const measure = () => {
      const previewWidth = sandbox.getBoundingClientRect().width;
      const containerWidth = container.getBoundingClientRect().width;
      const computed = getComputedStyle(container);
      const gutterStart = Number.parseFloat(computed.paddingInlineStart) || 0;
      const gutterEnd = Number.parseFloat(computed.paddingInlineEnd) || 0;
      const next: ContainerMetrics = {
        preview: round(previewWidth),
        outer: round(containerWidth),
        gutter: round((gutterStart + gutterEnd) / 2),
        content: round(Math.max(0, containerWidth - gutterStart - gutterEnd)),
        state: containerWidth < previewWidth - 0.5 ? "capped + centered" : "fluid",
      };
      setMetrics((current) => sameMetrics(current, next) ? current : next);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(sandbox);
    observer.observe(container);
    measure();
    return () => observer.disconnect();
  }, [gutter, previewContext, size]);

  return (
    <div className={s.containerSpecimen} data-container-specimen>
      <div className={s.containerControls}>
        <div>
          <span>Container size</span>
          <div aria-label="Container size" className={s.segmentedControl} role="group">
            {containerSizes.map((item) => (
              <button
                aria-controls="container-interactive-stage"
                aria-pressed={size === item}
                data-active={size === item || undefined}
                key={item}
                onClick={() => setSize(item)}
                type="button"
              >
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <label className={s.gutterToggle}>
          <input
            checked={gutter === "default"}
            onChange={(event) => setGutter(event.target.checked ? "default" : "none")}
            type="checkbox"
          />
          <span>Default gutter</span>
        </label>
      </div>

      <div className={s.containerLegend} aria-label="Container measurement legend">
        <span data-marker="available">Available space</span>
        <span data-marker="gutter">Inline gutter</span>
        <span data-marker="outer">Container edge</span>
        <span data-marker="content">Content edge</span>
      </div>

      <div className={s.containerContextFrame}>
        <div
          className={s.containerSandbox}
          data-container-preview-context={previewContext}
          id="container-interactive-stage"
          ref={sandboxRef}
        >
          <span className={s.availableBoundary} aria-hidden="true" />
          <Container
            className={s.containerProbe}
            data-container-interactive
            data-container-state={metrics.state}
            gutter={gutter}
            size={size}
          >
            <span aria-hidden="true" className={s.gutterMarker} data-side="start" />
            <span aria-hidden="true" className={s.gutterMarker} data-side="end" />
            <TechnicalContent />
          </Container>
        </div>
      </div>

      <dl className={s.containerDiagnostics} aria-live="polite">
        <div><dt>Preview</dt><dd data-container-metric="preview">{metrics.preview} px</dd></div>
        <div><dt>Size</dt><dd data-container-metric="size">{size}</dd></div>
        <div><dt>Gutter</dt><dd data-container-metric="gutter">{metrics.gutter} px</dd></div>
        <div><dt>Content</dt><dd data-container-metric="content">{metrics.content} px</dd></div>
        <div><dt>State</dt><dd data-container-metric="state">{metrics.state}</dd></div>
      </dl>

      <RealCompositionExamples />
      <EdgeCaseFixtures />
    </div>
  );
}
