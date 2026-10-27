"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import Grid, {
  type GridAlign,
  type GridGap,
  type GridMinimum,
} from "../../ui/layout/Grid";
import Sidebar, {
  type SidebarAlign,
  type SidebarContentMin,
  type SidebarSide,
  type SidebarWidth,
} from "../../ui/layout/Sidebar";
import Switcher, {
  type SwitcherLimit,
  type SwitcherThreshold,
} from "../../ui/layout/Switcher";
import Button from "../../ui/primitives/Button";
import type { ContainerPreviewContext } from "./ContainerSpecimen.client";
import s from "./intrinsicLayoutSpecimens.module.css";

type SpecimenProps = {
  previewContext: ContainerPreviewContext;
};

type Metric = {
  id: string;
  label: string;
  value: string;
};

type ParentWidthStyle = CSSProperties & {
  "--intrinsic-parent-width": string;
};

const contextWidths: Record<ContainerPreviewContext, number> = {
  narrow: 328,
  medium: 672,
  wide: 900,
};

const gapLabels: Record<GridGap, string> = {
  none: "space-0",
  s: "space-s",
  m: "space-m",
  l: "space-l",
};

const gridItems = [
  { id: "1", title: "Krátký obsah", body: "Jedna věta." },
  { id: "2", title: "Víceřádkový obsah", body: "Delší vysvětlení ukazuje rozdílnou vnitřní výšku bez změny algoritmu." },
  { id: "3", title: "Střední položka", body: "Dvě souvislosti." },
  { id: "4", title: "Dlouhý identifikátor", body: "pokornydavid.cz/plan/dlouhodoby-scenar-bez-ztraty-kontextu" },
  { id: "5", title: "Pátá položka", body: "Neúplný poslední řádek." },
  { id: "6", title: "Šestá položka", body: "Další rovnocenná jednotka." },
  { id: "7", title: "Sedmá položka", body: "Pořadí zůstává podle DOM." },
] as const;

const switcherItems = [
  "Situace",
  "Možnosti",
  "Dopady",
  "Priority",
  "Další krok",
] as const;

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

function useParentWidth(previewContext: ContainerPreviewContext) {
  const [selection, setSelection] = useState({
    context: previewContext,
    width: contextWidths[previewContext],
  });
  const parentWidth = selection.context === previewContext
    ? selection.width
    : contextWidths[previewContext];
  const setParentWidth = (width: number) => {
    setSelection({ context: previewContext, width });
  };

  return [parentWidth, setParentWidth] as const;
}

function WidthControl({
  controls,
  onChange,
  value,
}: {
  controls: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className={s.widthControl}>
      <span>Parent inline size</span>
      <div>
        <input
          aria-controls={controls}
          max="900"
          min="320"
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

function SelectControl<TValue extends string | number>({
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
          const option = options.find((item) => String(item.value) === event.target.value);
          if (option) onChange(option.value);
        }}
        value={String(value)}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function ChoiceControl<TValue extends string | number>({
  controls,
  label,
  onChange,
  options,
  value,
}: {
  controls: string;
  label: string;
  onChange: (value: TValue) => void;
  options: readonly TValue[];
  value: TValue;
}) {
  return (
    <div className={s.choiceControl}>
      <span>{label}</span>
      <div aria-label={label} role="group">
        {options.map((option) => (
          <button
            aria-controls={controls}
            aria-pressed={value === option}
            data-active={value === option || undefined}
            key={String(option)}
            onClick={() => onChange(option)}
            type="button"
          >
            {String(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

function ParentSandbox({
  children,
  kind,
  parentWidth,
  sandboxRef,
}: {
  children: ReactNode;
  kind: "grid" | "switcher" | "sidebar";
  parentWidth: number;
  sandboxRef: RefObject<HTMLDivElement | null>;
}) {
  const style: ParentWidthStyle = {
    "--intrinsic-parent-width": `${parentWidth}px`,
  };

  return (
    <div className={s.parentStage}>
      <div
        className={s.parentSandbox}
        data-intrinsic-parent={kind}
        data-parent-target={parentWidth}
        id={`${kind}-interactive-parent`}
        ref={sandboxRef}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}

function Diagnostics({ label, metrics }: { label: string; metrics: Metric[] }) {
  return (
    <dl aria-label={label} className={s.diagnostics}>
      {metrics.map((metric) => (
        <div key={metric.id}>
          <dt>{metric.label}</dt>
          <dd data-intrinsic-metric={metric.id}>{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function FixedParent({
  children,
  kind,
  width,
}: {
  children: ReactNode;
  kind: string;
  width: number;
}) {
  const style: ParentWidthStyle = {
    "--intrinsic-parent-width": `${width}px`,
  };
  return (
    <section className={s.proofCase}>
      <header><span>Same viewport</span><code>{width} px parent</code></header>
      <div className={s.proofScroller}>
        <div
          className={s.fixedParent}
          data-parent-proof={kind}
          data-parent-width={width}
          style={style}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

function ParentProof({
  children,
  kind,
}: {
  children: (width: 420 | 900) => ReactNode;
  kind: "grid" | "switcher" | "sidebar";
}) {
  return (
    <section className={s.parentProof} aria-labelledby={`${kind}-parent-proof-heading`}>
      <header>
        <span>Parent response proof</span>
        <h4 id={`${kind}-parent-proof-heading`}>Stejný viewport, stejné props, jiný rodič</h4>
      </header>
      <FixedParent kind={kind} width={420}>{children(420)}</FixedParent>
      <FixedParent kind={kind} width={900}>{children(900)}</FixedParent>
    </section>
  );
}

function ExampleRow({
  children,
  description,
  label,
}: {
  children: ReactNode;
  description: string;
  label: string;
}) {
  return (
    <section className={s.exampleRow}>
      <div><code translate="no">{label}</code><span>{description}</span></div>
      <div>{children}</div>
    </section>
  );
}

function NeutralGridItems({ count }: { count: number }) {
  return (
    <>
      {gridItems.slice(0, count).map((item) => (
        <li className={s.gridItem} data-grid-item={item.id} key={item.id}>
          <strong>{item.id} · {item.title}</strong>
          <span>{item.body}</span>
        </li>
      ))}
    </>
  );
}

type GridMetrics = {
  align: string;
  available: number;
  childHeights: number[];
  columns: number;
  gap: number;
  minimum: number;
  rows: number;
};

const initialGridMetrics: GridMetrics = {
  align: "stretch",
  available: 0,
  childHeights: [],
  columns: 0,
  gap: 0,
  minimum: 0,
  rows: 0,
};

function GridEdgeCases() {
  return (
    <details className={s.edgeCases} data-grid-edge-cases>
      <summary>Grid boundary fixtures</summary>
      <div>
        {[1, 2, 7].map((count) => (
          <section data-grid-edge-case={`count-${count}`} key={count}>
            <span>{count} {count === 1 ? "item" : "items"}</span>
            <Grid as="ul" className={s.algorithmList} gap="m" minimum="compact">
              <NeutralGridItems count={count} />
            </Grid>
          </section>
        ))}
        <section data-grid-edge-case="rtl" dir="rtl">
          <span>RTL + long content</span>
          <Grid as="ul" className={s.algorithmList} gap="m" minimum="compact">
            <NeutralGridItems count={5} />
          </Grid>
        </section>
      </div>
    </details>
  );
}

export function GridSpecimen({ previewContext }: SpecimenProps) {
  const [parentWidth, setParentWidth] = useParentWidth(previewContext);
  const [minimum, setMinimum] = useState<GridMinimum>("compact");
  const gap: GridGap = "m";
  const [align, setAlign] = useState<GridAlign>("stretch");
  const [count, setCount] = useState<1 | 2 | 5 | 7>(5);
  const [metrics, setMetrics] = useState<GridMetrics>(initialGridMetrics);
  const sandboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sandbox = sandboxRef.current;
    const grid = sandbox?.querySelector<HTMLElement>("[data-grid-interactive]");
    if (!sandbox || !grid) return;

    const measure = () => {
      const computed = getComputedStyle(grid);
      const columns = computed.gridTemplateColumns === "none"
        ? []
        : computed.gridTemplateColumns.split(" ").filter(Boolean);
      const rows = computed.gridTemplateRows === "none"
        ? []
        : computed.gridTemplateRows.split(" ").filter(Boolean);
      const children = Array.from(grid.children) as HTMLElement[];
      const next: GridMetrics = {
        align: computed.alignItems,
        available: round(grid.getBoundingClientRect().width),
        childHeights: children.map((child) => round(child.getBoundingClientRect().height)),
        columns: columns.length,
        gap: round(Number.parseFloat(computed.columnGap) || 0),
        minimum: round(resolvedLength(computed.getPropertyValue("--grid-minimum"))),
        rows: rows.length,
      };
      setMetrics((current) => sameMetrics(current, next) ? current : next);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(sandbox);
    observer.observe(grid);
    Array.from(grid.children).forEach((child) => observer.observe(child));
    measure();
    return () => observer.disconnect();
  }, [align, count, gap, minimum, parentWidth]);

  const metricsView: Metric[] = [
    { id: "available", label: "Available", value: px(metrics.available) },
    { id: "minimum", label: "Minimum", value: `${minimum} · ${px(metrics.minimum)}` },
    { id: "gap", label: "Resolved gap", value: `${gapLabels[gap]} · ${px(metrics.gap)}` },
    { id: "columns", label: "Columns", value: String(metrics.columns) },
    { id: "rows", label: "Rows", value: String(metrics.rows) },
    { id: "items", label: "Items", value: String(count) },
    { id: "align", label: "Align", value: metrics.align },
    { id: "child-heights", label: "Child heights", value: metrics.childHeights.map(px).join(" / ") },
  ];

  return (
    <div className={s.specimen} data-grid-specimen>
      <div className={s.controls}>
        <WidthControl controls="grid-interactive-parent" onChange={setParentWidth} value={parentWidth} />
        <ChoiceControl controls="grid-interactive" label="Items" onChange={setCount} options={[1, 2, 5, 7] as const} value={count} />
        <SelectControl controls="grid-interactive" label="Minimum" onChange={setMinimum} options={[
          { label: "Compact", value: "compact" },
          { label: "Default", value: "default" },
          { label: "Wide", value: "wide" },
        ] as const} value={minimum} />
        <SelectControl controls="grid-interactive" label="Align" onChange={setAlign} options={[
          { label: "Stretch", value: "stretch" },
          { label: "Start", value: "start" },
        ] as const} value={align} />
      </div>

      <ParentSandbox kind="grid" parentWidth={parentWidth} sandboxRef={sandboxRef}>
        <Grid
          align={align}
          as="ul"
          className={s.algorithmList}
          data-grid-interactive
          gap={gap}
          id="grid-interactive"
          minimum={minimum}
        >
          <NeutralGridItems count={count} />
        </Grid>
      </ParentSandbox>

      <Diagnostics label="Grid diagnostics" metrics={metricsView} />

      <ParentProof kind="grid">
        {() => (
          <Grid as="ul" className={s.algorithmList} data-grid-parent-proof gap="m" minimum="compact">
            <NeutralGridItems count={5} />
          </Grid>
        )}
      </ParentProof>

      <section className={s.examples} aria-labelledby="grid-example-heading">
        <header><span>Composition example</span><h4 id="grid-example-heading">Rovnocenné plánovací oblasti</h4></header>
        <ExampleRow description="Five equal-priority content units" label="Planning overview">
          <Grid as="ul" className={s.compositionGrid} gap="m" minimum="compact">
            {gridItems.slice(0, 5).map((item) => <li key={item.id}><strong>{item.title}</strong><span>{item.body}</span></li>)}
          </Grid>
        </ExampleRow>
      </section>

      <GridEdgeCases />
    </div>
  );
}

function NeutralSwitcherItems({ count }: { count: number }) {
  return (
    <>
      {switcherItems.slice(0, count).map((label, index) => (
        <li className={s.switcherItem} data-switcher-item={index + 1} key={label}>
          <strong>{index + 1}</strong><span>{label}</span>
        </li>
      ))}
    </>
  );
}

type SwitcherMetrics = {
  available: number;
  gap: number;
  rows: number;
  state: "row" | "column";
  threshold: number;
};

const initialSwitcherMetrics: SwitcherMetrics = {
  available: 0,
  gap: 0,
  rows: 0,
  state: "column",
  threshold: 0,
};

function SwitcherEdgeCases() {
  return (
    <details className={s.edgeCases} data-switcher-edge-cases>
      <summary>Switcher threshold and quantity fixtures</summary>
      <div>
        {[703, 704, 705].map((width) => (
          <FixedParent kind="switcher-boundary" width={width} key={width}>
            <Switcher as="ol" className={s.algorithmList} data-switcher-boundary={width} gap="m" limit={4} threshold="standard">
              <NeutralSwitcherItems count={3} />
            </Switcher>
          </FixedParent>
        ))}
        <FixedParent kind="switcher-limit" width={900}>
          <Switcher as="ol" className={s.algorithmList} data-switcher-limit="4" gap="m" limit={4} threshold="standard">
            <NeutralSwitcherItems count={4} />
          </Switcher>
        </FixedParent>
        <FixedParent kind="switcher-limit" width={900}>
          <Switcher as="ol" className={s.algorithmList} data-switcher-limit="5" gap="m" limit={4} threshold="standard">
            <NeutralSwitcherItems count={5} />
          </Switcher>
        </FixedParent>
        <section data-switcher-edge-case="rtl" dir="rtl">
          <span>RTL + long content</span>
          <Switcher as="ol" className={s.algorithmList} gap="m" limit={4} threshold="compact">
            <NeutralSwitcherItems count={3} />
          </Switcher>
        </section>
      </div>
    </details>
  );
}

export function SwitcherSpecimen({ previewContext }: SpecimenProps) {
  const [parentWidth, setParentWidth] = useParentWidth(previewContext);
  const [threshold, setThreshold] = useState<SwitcherThreshold>("standard");
  const [limit, setLimit] = useState<SwitcherLimit>(4);
  const [count, setCount] = useState<2 | 3 | 4 | 5>(3);
  const [metrics, setMetrics] = useState<SwitcherMetrics>(initialSwitcherMetrics);
  const sandboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sandbox = sandboxRef.current;
    const switcher = sandbox?.querySelector<HTMLElement>("[data-switcher-interactive]");
    if (!sandbox || !switcher) return;

    const measure = () => {
      const children = Array.from(switcher.children) as HTMLElement[];
      const tops = children.map((child) => Math.round(child.getBoundingClientRect().top));
      const computed = getComputedStyle(switcher);
      const rows = new Set(tops).size;
      const next: SwitcherMetrics = {
        available: round(switcher.getBoundingClientRect().width),
        gap: round(Number.parseFloat(computed.rowGap) || 0),
        rows,
        state: rows === 1 ? "row" : "column",
        threshold: round(resolvedLength(computed.getPropertyValue("--layout-switcher-threshold"))),
      };
      setMetrics((current) => sameMetrics(current, next) ? current : next);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(sandbox);
    observer.observe(switcher);
    Array.from(switcher.children).forEach((child) => observer.observe(child));
    measure();
    return () => observer.disconnect();
  }, [count, limit, parentWidth, threshold]);

  const reason = count > limit
    ? "quantity limit"
    : metrics.available < metrics.threshold
      ? "width threshold"
      : "threshold met";
  const metricsView: Metric[] = [
    { id: "available", label: "Available", value: px(metrics.available) },
    { id: "threshold", label: "Threshold", value: `${threshold} · ${px(metrics.threshold)}` },
    { id: "items", label: "Items", value: String(count) },
    { id: "limit", label: "Limit", value: String(limit) },
    { id: "gap", label: "Resolved gap", value: `space-m · ${px(metrics.gap)}` },
    { id: "resolved", label: "Resolved", value: metrics.state },
    { id: "reason", label: "Reason", value: reason },
    { id: "rows", label: "Rows", value: String(metrics.rows) },
  ];

  return (
    <div className={s.specimen} data-switcher-specimen>
      <div className={s.controls}>
        <WidthControl controls="switcher-interactive-parent" onChange={setParentWidth} value={parentWidth} />
        <ChoiceControl controls="switcher-interactive" label="Items" onChange={setCount} options={[2, 3, 4, 5] as const} value={count} />
        <SelectControl controls="switcher-interactive" label="Threshold" onChange={setThreshold} options={[
          { label: "Compact", value: "compact" },
          { label: "Standard", value: "standard" },
          { label: "Wide", value: "wide" },
        ] as const} value={threshold} />
        <SelectControl controls="switcher-interactive" label="Limit" onChange={setLimit} options={[
          { label: "2", value: 2 }, { label: "3", value: 3 }, { label: "4", value: 4 }, { label: "5", value: 5 },
        ] as const} value={limit} />
      </div>

      <ParentSandbox kind="switcher" parentWidth={parentWidth} sandboxRef={sandboxRef}>
        <Switcher
          as="ol"
          className={s.algorithmList}
          data-switcher-interactive
          gap="m"
          id="switcher-interactive"
          limit={limit}
          threshold={threshold}
        >
          <NeutralSwitcherItems count={count} />
        </Switcher>
      </ParentSandbox>

      <Diagnostics label="Switcher diagnostics" metrics={metricsView} />

      <ParentProof kind="switcher">
        {() => (
          <Switcher as="ol" className={s.algorithmList} data-switcher-parent-proof gap="m" limit={4} threshold="standard">
            <NeutralSwitcherItems count={3} />
          </Switcher>
        )}
      </ParentProof>

      <section className={s.examples} aria-labelledby="switcher-example-heading">
        <header><span>Composition example</span><h4 id="switcher-example-heading">Situace, možnosti a další krok</h4></header>
        <ExampleRow description="A named composition may contain a real action" label="Decision flow">
          <Switcher className={s.switcherComposition} gap="m" limit={3} threshold="standard">
            <section><strong>Situace</strong><p>Co se právě mění a proč je potřeba rozhodnout.</p></section>
            <section><strong>Možnosti</strong><p>Srovnání cest bez falešné priority.</p></section>
            <section><strong>Další krok</strong><Button>Domluvit konzultaci</Button></section>
          </Switcher>
        </ExampleRow>
      </section>

      <SwitcherEdgeCases />
    </div>
  );
}

function SidebarRegions({
  side,
  suffix,
}: {
  side: SidebarSide;
  suffix: string;
}) {
  const rail = (
    <aside className={s.sidebarRail} data-sidebar-region="side" key={`side-${suffix}`}>
      <strong>Kontextový rail</strong>
      <span>Užší podpůrná část</span>
    </aside>
  );
  const content = (
    <article className={s.sidebarContent} data-sidebar-region="content" key={`content-${suffix}`}>
      <strong>Hlavní obsah s garantovaným minimem</strong>
      <p>Obsah je záměrně vyšší a víceřádkový. Zalomení řídí dostupný prostor vlastního rodiče.</p>
      <p className={s.longContent}>pokornydavid.cz/financni-plan/dlouhodoby-scenar-a-navazujici-kroky</p>
    </article>
  );
  return side === "start" ? <>{rail}{content}</> : <>{content}{rail}</>;
}

type SidebarMetrics = {
  available: number;
  content: number;
  derivedThreshold: number;
  gap: number;
  side: number;
  sideTarget: number;
  state: "adjacent" | "stacked";
};

const initialSidebarMetrics: SidebarMetrics = {
  available: 0,
  content: 0,
  derivedThreshold: 0,
  gap: 0,
  side: 0,
  sideTarget: 0,
  state: "stacked",
};

function SidebarEdgeCases() {
  return (
    <details className={s.edgeCases} data-sidebar-edge-cases>
      <summary>Sidebar boundary and role fixtures</summary>
      <div>
        {[495, 497].map((width) => (
          <FixedParent kind="sidebar-boundary" width={width} key={width}>
            <Sidebar data-sidebar-boundary={width} gap="m" side="start" sideWidth="default">
              <SidebarRegions side="start" suffix={`boundary-${width}`} />
            </Sidebar>
          </FixedParent>
        ))}
        <section data-sidebar-edge-case="end">
          <span>Side end / DOM content first</span>
          <Sidebar align="start" gap="m" side="end" sideWidth="compact">
            <SidebarRegions side="end" suffix="end" />
          </Sidebar>
        </section>
        <section data-sidebar-edge-case="intrinsic">
          <span>Intrinsic side width</span>
          <Sidebar gap="m" side="start" sideWidth="intrinsic">
            <SidebarRegions side="start" suffix="intrinsic" />
          </Sidebar>
        </section>
        <section data-sidebar-edge-case="two-thirds" dir="rtl">
          <span>RTL + two-thirds</span>
          <Sidebar contentMin="two-thirds" gap="m" side="start" sideWidth="compact">
            <SidebarRegions side="start" suffix="rtl" />
          </Sidebar>
        </section>
      </div>
    </details>
  );
}

export function SidebarSpecimen({ previewContext }: SpecimenProps) {
  const [parentWidth, setParentWidth] = useParentWidth(previewContext);
  const [side, setSide] = useState<SidebarSide>("start");
  const [sideWidth, setSideWidth] = useState<SidebarWidth>("default");
  const [contentMin, setContentMin] = useState<SidebarContentMin>("half");
  const [align, setAlign] = useState<SidebarAlign>("stretch");
  const [metrics, setMetrics] = useState<SidebarMetrics>(initialSidebarMetrics);
  const sandboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sandbox = sandboxRef.current;
    const sidebar = sandbox?.querySelector<HTMLElement>("[data-sidebar-interactive]");
    const sideRegion = sidebar?.querySelector<HTMLElement>("[data-sidebar-region='side']");
    const contentRegion = sidebar?.querySelector<HTMLElement>("[data-sidebar-region='content']");
    if (!sandbox || !sidebar || !sideRegion || !contentRegion) return;

    const measure = () => {
      const computed = getComputedStyle(sidebar);
      const sideRect = sideRegion.getBoundingClientRect();
      const contentRect = contentRegion.getBoundingClientRect();
      const gap = Number.parseFloat(computed.columnGap) || 0;
      const sideToken = computed.getPropertyValue("--layout-sidebar-size");
      const sideTarget = sideWidth === "intrinsic"
        ? sideRegion.scrollWidth
        : resolvedLength(sideToken);
      const contentRatio = contentMin === "half" ? 0.5 : 2 / 3;
      const next: SidebarMetrics = {
        available: round(sidebar.getBoundingClientRect().width),
        content: round(contentRect.width),
        derivedThreshold: round((sideTarget + gap) / (1 - contentRatio)),
        gap: round(gap),
        side: round(sideRect.width),
        sideTarget: round(sideTarget),
        state: Math.abs(sideRect.top - contentRect.top) < 1 ? "adjacent" : "stacked",
      };
      setMetrics((current) => sameMetrics(current, next) ? current : next);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(sandbox);
    observer.observe(sidebar);
    observer.observe(sideRegion);
    observer.observe(contentRegion);
    measure();
    return () => observer.disconnect();
  }, [align, contentMin, parentWidth, side, sideWidth]);

  const metricsView: Metric[] = [
    { id: "available", label: "Available", value: px(metrics.available) },
    { id: "side-target", label: "Side target", value: `${sideWidth} · ${px(metrics.sideTarget)}` },
    { id: "content-min", label: "Content minimum", value: contentMin === "half" ? "half · 50 %" : "two-thirds · 66.67 %" },
    { id: "gap", label: "Resolved gap", value: `space-m · ${px(metrics.gap)}` },
    { id: "threshold", label: "Derived threshold", value: `≈ ${px(metrics.derivedThreshold)}` },
    { id: "side-resolved", label: "Resolved side", value: px(metrics.side) },
    { id: "content-resolved", label: "Resolved content", value: px(metrics.content) },
    { id: "state", label: "State", value: metrics.state },
  ];

  return (
    <div className={s.specimen} data-sidebar-specimen>
      <div className={s.controls}>
        <WidthControl controls="sidebar-interactive-parent" onChange={setParentWidth} value={parentWidth} />
        <ChoiceControl controls="sidebar-interactive" label="Side" onChange={setSide} options={["start", "end"] as const} value={side} />
        <SelectControl controls="sidebar-interactive" label="Side width" onChange={setSideWidth} options={[
          { label: "Intrinsic", value: "intrinsic" },
          { label: "Compact", value: "compact" },
          { label: "Default", value: "default" },
          { label: "Wide", value: "wide" },
        ] as const} value={sideWidth} />
        <SelectControl controls="sidebar-interactive" label="Content minimum" onChange={setContentMin} options={[
          { label: "Half", value: "half" },
          { label: "Two-thirds", value: "two-thirds" },
        ] as const} value={contentMin} />
        <SelectControl controls="sidebar-interactive" label="Align" onChange={setAlign} options={[
          { label: "Stretch", value: "stretch" },
          { label: "Start", value: "start" },
        ] as const} value={align} />
      </div>

      <ParentSandbox kind="sidebar" parentWidth={parentWidth} sandboxRef={sandboxRef}>
        <Sidebar
          align={align}
          contentMin={contentMin}
          data-sidebar-interactive
          gap="m"
          id="sidebar-interactive"
          side={side}
          sideWidth={sideWidth}
        >
          <SidebarRegions side={side} suffix="interactive" />
        </Sidebar>
      </ParentSandbox>

      <Diagnostics label="Sidebar diagnostics" metrics={metricsView} />

      <ParentProof kind="sidebar">
        {(width) => (
          <Sidebar data-sidebar-parent-proof={width} gap="m" side="start" sideWidth="default">
            <SidebarRegions side="start" suffix={`proof-${width}`} />
          </Sidebar>
        )}
      </ParentProof>

      <section className={s.examples} aria-labelledby="sidebar-example-heading">
        <header><span>Composition example</span><h4 id="sidebar-example-heading">Kontext vedle hlavního rozhodnutí</h4></header>
        <ExampleRow description="A real asymmetric content relationship" label="Planning context">
          <Sidebar align="start" gap="m" side="start" sideWidth="compact">
            <aside className={s.compositionRail}><strong>Kontext</strong><span>Horizont 10 let</span><span>Rizikový profil vyvážený</span></aside>
            <article className={s.compositionContent}><strong>Investiční plán</strong><p>Hlavní část drží vysvětlení, varianty a navazující rozhodnutí.</p></article>
          </Sidebar>
        </ExampleRow>
      </section>

      <SidebarEdgeCases />
    </div>
  );
}
