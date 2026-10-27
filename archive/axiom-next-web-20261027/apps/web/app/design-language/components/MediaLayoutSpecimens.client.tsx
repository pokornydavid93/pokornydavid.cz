"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Bleed, { type BleedTarget } from "../../ui/layout/Bleed";
import Cover from "../../ui/layout/Cover";
import Frame, {
  type FrameFit,
  type FramePosition,
  type FrameRatio,
} from "../../ui/layout/Frame";
import ReadingLayout from "../../ui/layout/ReadingLayout";
import type { ContainerPreviewContext } from "./ContainerSpecimen.client";
import s from "./mediaLayoutSpecimens.module.css";

type SpecimenProps = {
  previewContext: ContainerPreviewContext;
};

type Metric = {
  id: string;
  label: string;
  value: string;
};

type CoverScenario = "short" | "balanced" | "overflow";
type ReadingDirection = "ltr" | "rtl";

type LengthStyle = CSSProperties & {
  "--specimen-block-size"?: string;
  "--specimen-inline-size"?: string;
};

const inlineContextWidths: Record<ContainerPreviewContext, number> = {
  narrow: 328,
  medium: 672,
  wide: 900,
};

const bleedContextWidths: Record<ContainerPreviewContext, number> = {
  narrow: 360,
  medium: 900,
  wide: 1280,
};

const ratioLabels: Record<FrameRatio, string> = {
  square: "1:1",
  portrait: "4:5",
  landscape: "3:2",
  wide: "16:9",
};

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function px(value: number) {
  return `${round(value)} px`;
}

function sameMetrics<TValue extends object>(current: TValue, next: TValue) {
  return JSON.stringify(current) === JSON.stringify(next);
}

function resolvedLength(value: string) {
  const normalized = value.trim();
  if (normalized.endsWith("rem")) {
    const rootSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return (Number.parseFloat(normalized) || 0) * rootSize;
  }
  if (normalized.endsWith("px")) return Number.parseFloat(normalized) || 0;
  return 0;
}

function useContextWidth(
  previewContext: ContainerPreviewContext,
  widths: Record<ContainerPreviewContext, number>,
) {
  const [selection, setSelection] = useState({
    context: previewContext,
    width: widths[previewContext],
  });
  const width = selection.context === previewContext
    ? selection.width
    : widths[previewContext];
  const setWidth = (nextWidth: number) => {
    setSelection({ context: previewContext, width: nextWidth });
  };
  return [width, setWidth] as const;
}

function RangeControl({
  controls,
  label,
  max,
  min,
  onChange,
  value,
}: {
  controls: string;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className={s.rangeControl}>
      <span>{label}</span>
      <div>
        <input
          aria-controls={controls}
          max={max}
          min={min}
          onChange={(event) => onChange(Number(event.target.value))}
          step="1"
          type="range"
          value={value}
        />
        <output>{value} px</output>
      </div>
    </label>
  );
}

function ChoiceControl<TValue extends string>({
  controls,
  label,
  onChange,
  options,
  value,
}: {
  controls: string;
  label: string;
  onChange: (value: TValue) => void;
  options: ReadonlyArray<{ label: string; value: TValue }>;
  value: TValue;
}) {
  return (
    <div className={s.choiceControl}>
      <span>{label}</span>
      <div aria-label={label} role="group">
        {options.map((option) => (
          <button
            aria-controls={controls}
            aria-pressed={value === option.value}
            data-active={value === option.value || undefined}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectControl<TValue extends string>({
  controls,
  label,
  onChange,
  options,
  value,
}: {
  controls: string;
  label: string;
  onChange: (value: TValue) => void;
  options: ReadonlyArray<{ label: string; value: TValue }>;
  value: TValue;
}) {
  return (
    <label className={s.selectControl}>
      <span>{label}</span>
      <select
        aria-controls={controls}
        onChange={(event) => {
          const option = options.find((item) => item.value === event.target.value);
          if (option) onChange(option.value);
        }}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function Diagnostics({ label, metrics }: { label: string; metrics: Metric[] }) {
  return (
    <dl aria-label={label} className={s.diagnostics}>
      {metrics.map((metric) => (
        <div key={metric.id}>
          <dt>{metric.label}</dt>
          <dd data-media-layout-metric={metric.id}>{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}

type CoverMetrics = {
  end: number;
  freeSpace: number;
  marginEnd: number;
  marginStart: number;
  minimum: number;
  principal: number;
  start: number;
  state: "centered" | "content-driven";
  used: number;
};

const initialCoverMetrics: CoverMetrics = {
  end: 0,
  freeSpace: 0,
  marginEnd: 0,
  marginStart: 0,
  minimum: 0,
  principal: 0,
  start: 0,
  state: "centered",
  used: 0,
};

function coverSlots(scenario: CoverScenario) {
  return [
      <Cover.Start className={s.coverStart} key="start">
        <span>Start</span>
        {scenario !== "short" ? <small>Volitelný kontext před principal regionem.</small> : null}
      </Cover.Start>,
      <Cover.Principal className={s.coverPrincipal} key="principal">
        <span>Principal</span>
        <strong>Jeden hlavní region v normálním flow</strong>
        {scenario === "overflow" ? (
          <p>Vyšší obsah vyčerpá všechen volný prostor. Cover přirozeně roste a principal margins klesnou na nulu.</p>
        ) : null}
      </Cover.Principal>,
      <Cover.End className={s.coverEnd} key="end">
        <span>End</span>
        {scenario === "overflow" ? <small>Pokračování zůstává za principal regionem bez překrytí.</small> : null}
      </Cover.End>,
  ];
}

export function CoverSpecimen({ previewContext }: SpecimenProps) {
  const [blockSize, setBlockSize] = useState(480);
  const [scenario, setScenario] = useState<CoverScenario>("short");
  const [metrics, setMetrics] = useState<CoverMetrics>(initialCoverMetrics);
  const sandboxRef = useRef<HTMLDivElement>(null);
  const style: LengthStyle = { "--specimen-block-size": `${blockSize}px` };

  useEffect(() => {
    const sandbox = sandboxRef.current;
    const cover = sandbox?.querySelector<HTMLElement>("[data-cover-interactive]");
    const start = cover?.querySelector<HTMLElement>("[data-cover-slot='start']");
    const principal = cover?.querySelector<HTMLElement>("[data-cover-principal]");
    const end = cover?.querySelector<HTMLElement>("[data-cover-slot='end']");
    if (!cover || !start || !principal || !end) return;

    const measure = () => {
      const computed = getComputedStyle(cover);
      const principalStyle = getComputedStyle(principal);
      const startHeight = start.getBoundingClientRect().height;
      const principalHeight = principal.getBoundingClientRect().height;
      const endHeight = end.getBoundingClientRect().height;
      const padding = (Number.parseFloat(computed.paddingBlockStart) || 0)
        + (Number.parseFloat(computed.paddingBlockEnd) || 0);
      const gap = Number.parseFloat(computed.rowGap) || 0;
      const used = cover.getBoundingClientRect().height;
      const freeSpace = Math.max(
        0,
        used - padding - startHeight - principalHeight - endHeight - gap * 2,
      );
      const next: CoverMetrics = {
        end: round(endHeight),
        freeSpace: round(freeSpace),
        marginEnd: round(Number.parseFloat(principalStyle.marginBlockEnd) || 0),
        marginStart: round(Number.parseFloat(principalStyle.marginBlockStart) || 0),
        minimum: round(resolvedLength(computed.getPropertyValue("--cover-minimum"))),
        principal: round(principalHeight),
        start: round(startHeight),
        state: freeSpace > 0.5 ? "centered" : "content-driven",
        used: round(used),
      };
      setMetrics((current) => sameMetrics(current, next) ? current : next);
    };

    const observer = new ResizeObserver(measure);
    [cover, start, principal, end].forEach((element) => observer.observe(element));
    measure();
    return () => observer.disconnect();
  }, [blockSize, previewContext, scenario]);

  const metricsView: Metric[] = [
    { id: "minimum", label: "Minimum", value: px(metrics.minimum) },
    { id: "used-block", label: "Used block-size", value: px(metrics.used) },
    { id: "slot-sizes", label: "Start / Principal / End", value: `${metrics.start} / ${metrics.principal} / ${metrics.end} px` },
    { id: "free-space", label: "Free space", value: px(metrics.freeSpace) },
    { id: "principal-margins", label: "Principal margins", value: `${metrics.marginStart} / ${metrics.marginEnd} px` },
    { id: "state", label: "State", value: metrics.state },
  ];

  return (
    <div className={s.specimen} data-cover-specimen>
      <div className={s.controls}>
        <RangeControl controls="cover-interactive" label="Available block size" max={760} min={360} onChange={setBlockSize} value={blockSize} />
        <ChoiceControl controls="cover-interactive" label="Content scenario" onChange={setScenario} options={[
          { label: "Short", value: "short" },
          { label: "Balanced", value: "balanced" },
          { label: "Overflow", value: "overflow" },
        ]} value={scenario} />
      </div>

      <div className={s.coverStage} data-preview-context={previewContext} ref={sandboxRef} style={style}>
        <Cover
          as="section"
          className={s.coverAlgorithm}
          data-cover-interactive
          data-cover-scenario={scenario}
          gap="m"
          id="cover-interactive"
          minimum="standard"
          padding="compact"
        >
          {coverSlots(scenario)}
        </Cover>
      </div>

      <Diagnostics label="Cover block-axis diagnostics" metrics={metricsView} />

      <section className={s.linearExamples} aria-labelledby="cover-states-heading">
        <header><span>Required states</span><h4 id="cover-states-heading">Kladný prostor a content-driven růst</h4></header>
        <div className={s.coverStateSummary}>
          <p><strong>Centered</strong><span>Auto margins rovnoměrně spotřebují pouze kladný volný prostor.</span></p>
          <p><strong>Content-driven</strong><span>Obsah překročí minimum bez překrytí, clippingu nebo záporných margins.</span></p>
        </div>
      </section>
    </div>
  );
}

type FrameMetrics = {
  crop: "block axis" | "inline axis" | "none";
  height: number;
  sourceHeight: number;
  sourceWidth: number;
  width: number;
};

const initialFrameMetrics: FrameMetrics = {
  crop: "none",
  height: 0,
  sourceHeight: 3840,
  sourceWidth: 2160,
  width: 0,
};

function DiagnosticPortrait({ sizes = "(max-width: 720px) 100vw, 56rem" }: { sizes?: string }) {
  return (
    <Image
      alt="Můj portrét v diagnostickém zdroji"
      height={3840}
      loading="eager"
      sizes={sizes}
      src="/nahled-mobil.avif"
      width={2160}
    />
  );
}

const frameVariants: ReadonlyArray<{
  fit: FrameFit;
  id: string;
  label: string;
  position: FramePosition;
  ratio: FrameRatio;
}> = [
  { fit: "cover", id: "square-cover", label: "Square + cover", position: "center", ratio: "square" },
  { fit: "cover", id: "landscape-cover", label: "Landscape + cover", position: "center", ratio: "landscape" },
  { fit: "cover", id: "wide-cover", label: "Wide + cover", position: "center", ratio: "wide" },
  { fit: "contain", id: "wide-contain", label: "Wide + contain", position: "center", ratio: "wide" },
  { fit: "cover", id: "wide-focal", label: "Wide + focal 62% 38%", position: "62% 38%", ratio: "wide" },
];

export function FrameSpecimen({ previewContext }: SpecimenProps) {
  const [parentWidth, setParentWidth] = useContextWidth(previewContext, inlineContextWidths);
  const [fit, setFit] = useState<FrameFit>("cover");
  const [positionMode, setPositionMode] = useState<"center" | "focal">("focal");
  const [ratio, setRatio] = useState<FrameRatio>("wide");
  const [metrics, setMetrics] = useState<FrameMetrics>(initialFrameMetrics);
  const sandboxRef = useRef<HTMLDivElement>(null);
  const position: FramePosition = positionMode === "focal" ? "62% 38%" : "center";
  const style: LengthStyle = { "--specimen-inline-size": `${parentWidth}px` };

  useEffect(() => {
    const sandbox = sandboxRef.current;
    const frame = sandbox?.querySelector<HTMLElement>("[data-frame-interactive]");
    const image = frame?.querySelector<HTMLImageElement>("img");
    if (!frame || !image) return;

    const measure = () => {
      const rectangle = frame.getBoundingClientRect();
      const sourceWidth = 2160;
      const sourceHeight = 3840;
      const sourceRatio = sourceWidth / sourceHeight;
      const frameRatio = rectangle.width / Math.max(rectangle.height, 1);
      const crop = fit === "contain" || Math.abs(sourceRatio - frameRatio) < 0.01
        ? "none"
        : sourceRatio > frameRatio
          ? "inline axis"
          : "block axis";
      const next: FrameMetrics = {
        crop,
        height: round(rectangle.height),
        sourceHeight,
        sourceWidth,
        width: round(rectangle.width),
      };
      setMetrics((current) => sameMetrics(current, next) ? current : next);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    image.addEventListener("load", measure);
    measure();
    return () => {
      observer.disconnect();
      image.removeEventListener("load", measure);
    };
  }, [fit, parentWidth, position, previewContext, ratio]);

  const metricsView: Metric[] = [
    { id: "parent", label: "Parent", value: px(metrics.width) },
    { id: "frame", label: "Frame", value: `${metrics.width} × ${metrics.height} px` },
    { id: "ratio", label: "Ratio", value: `${ratio} · ${ratioLabels[ratio]}` },
    { id: "source", label: "Source", value: `${metrics.sourceWidth} × ${metrics.sourceHeight} px` },
    { id: "fit", label: "Fit", value: fit },
    { id: "position", label: "Position", value: position },
    { id: "crop", label: "Crop", value: metrics.crop },
  ];

  return (
    <div className={s.specimen} data-frame-specimen>
      <div className={s.controls}>
        <RangeControl controls="frame-interactive-parent" label="Parent target size" max={900} min={280} onChange={setParentWidth} value={parentWidth} />
        <SelectControl controls="frame-interactive" label="Ratio" onChange={setRatio} options={[
          { label: "Square · 1:1", value: "square" },
          { label: "Portrait · 4:5", value: "portrait" },
          { label: "Landscape · 3:2", value: "landscape" },
          { label: "Wide · 16:9", value: "wide" },
        ]} value={ratio} />
        <ChoiceControl controls="frame-interactive" label="Fit" onChange={setFit} options={[
          { label: "Cover", value: "cover" },
          { label: "Contain", value: "contain" },
        ]} value={fit} />
        <ChoiceControl controls="frame-interactive" label="Position" onChange={setPositionMode} options={[
          { label: "Center", value: "center" },
          { label: "62% 38%", value: "focal" },
        ]} value={positionMode} />
      </div>

      <div className={s.frameStage} ref={sandboxRef} style={style}>
        <div className={s.frameParent} data-frame-parent id="frame-interactive-parent">
          <Frame
            as="figure"
            className={s.frameAlgorithm}
            data-frame-interactive
            fit={fit}
            id="frame-interactive"
            position={position}
            ratio={ratio}
          >
            <DiagnosticPortrait />
          </Frame>
          <span aria-hidden="true" className={s.focalMarker} />
        </div>
      </div>

      <Diagnostics label="Frame crop diagnostics" metrics={metricsView} />

      <section className={s.linearExamples} aria-labelledby="frame-variants-heading">
        <header><span>Crop matrix</span><h4 id="frame-variants-heading">Jeden portrait zdroj, pět kontraktů</h4></header>
        <div className={s.frameVariants}>
          {frameVariants.map((variant) => (
            <article key={variant.label}>
              <div><strong>{variant.label}</strong><code>{variant.ratio} / {variant.fit}</code></div>
              <Frame data-frame-variant={variant.id} fit={variant.fit} position={variant.position} ratio={variant.ratio}>
                <DiagnosticPortrait sizes="(max-width: 720px) 70vw, 18rem" />
              </Frame>
            </article>
          ))}
        </div>
      </section>

      <section className={s.linearExamples} aria-labelledby="frame-composition-heading">
        <header><span>Composition example</span><h4 id="frame-composition-heading">Finanční fotografie až v reálném kontextu</h4></header>
        <Frame className={s.financeFrame} fit="cover" position="center" ratio="wide">
          <Image
            alt="Finanční plán při osobní konzultaci"
            height={1000}
            loading="eager"
            sizes="(max-width: 720px) 100vw, 70rem"
            src="/articles/investicni-plan-editorial.webp"
            width={1600}
          />
        </Frame>
      </section>
    </div>
  );
}

type BleedMetrics = {
  context: number;
  end: number;
  measure: number;
  overflow: number;
  start: number;
  state: "capped" | "context-full" | "converged";
  target: number;
};

const initialBleedMetrics: BleedMetrics = {
  context: 0,
  end: 0,
  measure: 0,
  overflow: 0,
  start: 0,
  state: "capped",
  target: 0,
};

function ReadingTrackExample({
  direction = "ltr",
  interactive = false,
  target,
}: {
  direction?: ReadingDirection;
  interactive?: boolean;
  target: BleedTarget;
}) {
  return (
    <ReadingLayout className={s.readingPreview} dir={direction}>
      <span aria-hidden="true" className={s.wideTrackGuide} />
      <span aria-hidden="true" className={s.measureTrackGuide} />
      <p className={s.readingCopy} data-reading-measure={interactive || undefined}>
        Reading measure drží běžný text v čitelné šířce.
      </p>
      <Bleed
        as="figure"
        className={s.bleedBand}
        data-bleed-interactive={interactive || undefined}
        target={target}
      >
        <strong>{target} target</strong>
        <span>Obsah používá pojmenované tracky stejného layoutového kontextu.</span>
      </Bleed>
      <p className={s.readingCopy}>Další text se vrací do measure tracku.</p>
    </ReadingLayout>
  );
}

function FixedReadingContext({
  children,
  label,
  width,
}: {
  children: ReactNode;
  label: string;
  width: number;
}) {
  const style: LengthStyle = { "--specimen-inline-size": `${width}px` };
  return (
    <section className={s.fixedContext}>
      <header><span>{label}</span><code>{width} px context</code></header>
      <div className={s.contextScroller}>
        <div className={s.fixedContextInner} data-bleed-fixed-context={width} style={style}>
          {children}
        </div>
      </div>
    </section>
  );
}

export function BleedSpecimen({ previewContext }: SpecimenProps) {
  const [contextWidth, setContextWidth] = useContextWidth(previewContext, bleedContextWidths);
  const [direction, setDirection] = useState<ReadingDirection>("ltr");
  const [target, setTarget] = useState<BleedTarget>("wide");
  const [metrics, setMetrics] = useState<BleedMetrics>(initialBleedMetrics);
  const sandboxRef = useRef<HTMLDivElement>(null);
  const style: LengthStyle = { "--specimen-inline-size": `${contextWidth}px` };

  useEffect(() => {
    const sandbox = sandboxRef.current;
    const context = sandbox?.querySelector<HTMLElement>("[data-bleed-context]");
    const reading = context?.querySelector<HTMLElement>("[data-layout-context='reading']");
    const measureProbe = reading?.querySelector<HTMLElement>("[data-reading-measure]");
    const bleed = reading?.querySelector<HTMLElement>("[data-bleed-interactive]");
    if (!context || !reading || !measureProbe || !bleed) return;

    const measure = () => {
      const contextRect = context.getBoundingClientRect();
      const measureRect = measureProbe.getBoundingClientRect();
      const bleedRect = bleed.getBoundingClientRect();
      const rtl = getComputedStyle(reading).direction === "rtl";
      const start = rtl
        ? bleedRect.right - measureRect.right
        : measureRect.left - bleedRect.left;
      const end = rtl
        ? measureRect.left - bleedRect.left
        : bleedRect.right - measureRect.right;
      const converged = Math.abs(bleedRect.width - measureRect.width) < 1;
      const next: BleedMetrics = {
        context: round(contextRect.width),
        end: round(Math.max(0, end)),
        measure: round(measureRect.width),
        overflow: round(Math.max(0, reading.scrollWidth - reading.clientWidth)),
        start: round(Math.max(0, start)),
        state: converged ? "converged" : target === "full" ? "context-full" : "capped",
        target: round(bleedRect.width),
      };
      setMetrics((current) => sameMetrics(current, next) ? current : next);
    };

    const observer = new ResizeObserver(measure);
    [context, reading, measureProbe, bleed].forEach((element) => observer.observe(element));
    measure();
    return () => observer.disconnect();
  }, [contextWidth, direction, previewContext, target]);

  const metricsView: Metric[] = [
    { id: "context", label: "Context", value: px(metrics.context) },
    { id: "measure", label: "Reading measure", value: px(metrics.measure) },
    { id: "target", label: "Target", value: `${target} · ${px(metrics.target)}` },
    { id: "start-bleed", label: "Inline start bleed", value: px(metrics.start) },
    { id: "end-bleed", label: "Inline end bleed", value: px(metrics.end) },
    { id: "state", label: "State", value: metrics.state },
    { id: "root-overflow", label: "Root overflow", value: px(metrics.overflow) },
  ];

  return (
    <div className={s.specimen} data-bleed-specimen>
      <div className={s.controls}>
        <RangeControl controls="bleed-interactive-context" label="Context target size" max={1400} min={320} onChange={setContextWidth} value={contextWidth} />
        <ChoiceControl controls="bleed-interactive" label="Target" onChange={setTarget} options={[
          { label: "Wide", value: "wide" },
          { label: "Full", value: "full" },
        ]} value={target} />
        <ChoiceControl controls="bleed-interactive" label="Direction" onChange={setDirection} options={[
          { label: "LTR", value: "ltr" },
          { label: "RTL", value: "rtl" },
        ]} value={direction} />
      </div>

      <div className={s.bleedStage} ref={sandboxRef}>
        <div className={s.bleedContext} data-bleed-context id="bleed-interactive-context" style={style}>
          <ReadingTrackExample direction={direction} interactive target={target} />
        </div>
      </div>

      <Diagnostics label="Bleed context diagnostics" metrics={metricsView} />

      <section className={s.linearExamples} aria-labelledby="bleed-parent-proof-heading" data-bleed-parent-proof>
        <header><span>Parent response proof</span><h4 id="bleed-parent-proof-heading">Stejný viewport, dva layout contexts</h4></header>
        <FixedReadingContext label="Compact context" width={520}>
          <ReadingTrackExample target="wide" />
        </FixedReadingContext>
        <FixedReadingContext label="Wide context" width={1280}>
          <ReadingTrackExample target="wide" />
        </FixedReadingContext>
      </section>

      <details className={s.edgeCases} data-bleed-edge-cases>
        <summary>Wide, full, narrow convergence and RTL fixtures</summary>
        <div>
          <FixedReadingContext label="Wide target" width={1280}>
            <ReadingTrackExample target="wide" />
          </FixedReadingContext>
          <FixedReadingContext label="Full target" width={1280}>
            <ReadingTrackExample target="full" />
          </FixedReadingContext>
          <FixedReadingContext label="Narrow convergence" width={360}>
            <ReadingTrackExample target="wide" />
          </FixedReadingContext>
          <FixedReadingContext label="RTL" width={900}>
            <ReadingTrackExample direction="rtl" target="wide" />
          </FixedReadingContext>
        </div>
      </details>
    </div>
  );
}
