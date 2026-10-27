"use client";

import { Tag } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import Cluster, {
  type ClusterAlign,
  type ClusterGap,
  type ClusterJustify,
} from "../../ui/layout/Cluster";
import Stack, { type StackAlign, type StackGap } from "../../ui/layout/Stack";
import Badge from "../../ui/primitives/Badge";
import Button from "../../ui/primitives/Button";
import type { ContainerPreviewContext } from "./ContainerSpecimen.client";
import s from "./stackClusterSpecimens.module.css";

type SpecimenProps = {
  previewContext: ContainerPreviewContext;
};

type Metric = {
  id: string;
  label: string;
  value: string;
};

const gapOptions = [
  { id: "none", label: "None", token: "space-0" },
  { id: "s", label: "S", token: "space-s" },
  { id: "m", label: "M", token: "space-m" },
  { id: "l", label: "L", token: "space-l" },
] as const satisfies ReadonlyArray<{
  id: StackGap;
  label: string;
  token: string;
}>;

const contextLabels: Record<ContainerPreviewContext, string> = {
  narrow: "Narrow",
  medium: "Medium",
  wide: "Wide",
};

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function px(value: number) {
  return `${round(value)} px`;
}

function metricsEqual<TValue extends object>(current: TValue, next: TValue) {
  return JSON.stringify(current) === JSON.stringify(next);
}

function GapControl({
  controls,
  label,
  onChange,
  value,
}: {
  controls: string;
  label: string;
  onChange: (value: StackGap) => void;
  value: StackGap;
}) {
  return (
    <div className={s.controlGroup}>
      <span>{label}</span>
      <div aria-label={label} className={s.gapControl} role="group">
        {gapOptions.map((option) => (
          <button
            aria-controls={controls}
            aria-pressed={value === option.id}
            data-active={value === option.id || undefined}
            key={option.id}
            onClick={() => onChange(option.id)}
            title={option.token}
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
  options: readonly TValue[];
  value: TValue;
}) {
  return (
    <label className={s.controlGroup}>
      <span>{label}</span>
      <select
        aria-controls={controls}
        onChange={(event) => onChange(event.target.value as TValue)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function PreviewSandbox({
  children,
  kind,
  previewContext,
  sandboxRef,
}: {
  children: ReactNode;
  kind: "stack" | "cluster";
  previewContext: ContainerPreviewContext;
  sandboxRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className={s.previewFrame}>
      <div
        className={s.previewSandbox}
        data-flow-preview-context={previewContext}
        data-flow-preview-kind={kind}
        ref={sandboxRef}
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
          <dd data-flow-metric={metric.id}>{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ExampleSection({
  children,
  description,
  label,
}: {
  children: ReactNode;
  description: string;
  label: string;
}) {
  return (
    <article className={s.exampleRow}>
      <div className={s.exampleMeta}>
        <code translate="no">{label}</code>
        <span>{description}</span>
      </div>
      <div className={s.exampleRunway}>{children}</div>
    </article>
  );
}

type StackMetrics = {
  align: string;
  available: number;
  childHeights: number[];
  childMargin: number;
  children: number;
  direction: string;
  gap: number;
  outerEnd: number;
  outerStart: number;
  sandbox: number;
};

const initialStackMetrics: StackMetrics = {
  align: "stretch",
  available: 0,
  childHeights: [],
  childMargin: 0,
  children: 0,
  direction: "block",
  gap: 0,
  outerEnd: 0,
  outerStart: 0,
  sandbox: 0,
};

function StackExamples() {
  return (
    <section className={s.examples} aria-labelledby="stack-examples-heading">
      <header>
        <span>Composition examples</span>
        <h4 id="stack-examples-heading">Rytmus v reálném obsahu</h4>
      </header>

      <ExampleSection description="Eyebrow + heading + body + actions" label="Content intro">
        <Stack data-stack-composition="content-intro" gap="m">
          <Stack gap="s">
            <span className={s.eyebrow}>Finanční plán</span>
            <h5>Rozhodnutí začíná přehledem</h5>
            <p>Nejdřív srovnáme cíle, rezervu a rizika. Potom vznikne plán dalších kroků.</p>
          </Stack>
          <Cluster gap="s">
            <Button>Domluvit konzultaci</Button>
            <Button variant="secondary">Jak spolupráce probíhá</Button>
          </Cluster>
        </Stack>
      </ExampleSection>

      <ExampleSection description="Labels, controls and one explicit action" label="Form group">
        <Stack
          aria-label="Ukázková kontaktní skupina"
          as="form"
          data-stack-composition="form-group"
          gap="m"
        >
          <Stack gap="s">
            <label htmlFor="stack-specimen-email">E-mail</label>
            <input
              autoComplete="email"
              id="stack-specimen-email"
              name="email"
              placeholder="např. jmeno@example.cz…"
              spellCheck={false}
              type="email"
            />
          </Stack>
          <Stack gap="s">
            <label htmlFor="stack-specimen-goal">Co chcete vyřešit</label>
            <input
              autoComplete="off"
              id="stack-specimen-goal"
              name="goal"
              placeholder="Například dlouhodobé investice…"
            />
          </Stack>
          <Button type="button">Zkontrolovat plán</Button>
        </Stack>
      </ExampleSection>
    </section>
  );
}

function StackEdgeCases() {
  return (
    <details className={s.edgeCases} data-stack-edge-cases>
      <summary>Stack edge-case fixtures</summary>
      <div className={s.edgeGrid}>
        <section>
          <span>Empty</span>
          <Stack className={s.emptyFixture} data-stack-edge-case="empty" gap="m">{null}</Stack>
        </section>
        <section>
          <span>Single</span>
          <Stack data-stack-edge-case="single" gap="m">
            <div className={s.edgeItem}>Jediný child, žádný gap</div>
          </Stack>
        </section>
        <section>
          <span>Multiple / child margins 0</span>
          <Stack data-stack-edge-case="multiple" gap="m">
            <div className={s.edgeItem}>První</div>
            <div className={s.edgeItem}>Druhý</div>
            <div className={s.edgeItem}>Třetí</div>
          </Stack>
        </section>
        <section>
          <span>Nested / m outside, s inside</span>
          <Stack data-stack-edge-case="nested-outer" gap="m">
            <div className={s.edgeItem}>Vnější začátek</div>
            <Stack data-stack-edge-case="nested-inner" gap="s">
              <div className={s.edgeItem}>Vnitřní A</div>
              <div className={s.edgeItem}>Vnitřní B</div>
            </Stack>
            <div className={s.edgeItem}>Vnější konec</div>
          </Stack>
        </section>
      </div>
    </details>
  );
}

export function StackSpecimen({ previewContext }: SpecimenProps) {
  const [gap, setGap] = useState<StackGap>("m");
  const [align, setAlign] = useState<StackAlign>("stretch");
  const [metrics, setMetrics] = useState<StackMetrics>(initialStackMetrics);
  const sandboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sandbox = sandboxRef.current;
    const stack = sandbox?.querySelector<HTMLOListElement>("[data-stack-interactive]");
    if (!sandbox || !stack) return;

    const measure = () => {
      const children = Array.from(stack.children) as HTMLElement[];
      const stackRect = stack.getBoundingClientRect();
      const firstRect = children.at(0)?.getBoundingClientRect();
      const lastRect = children.at(-1)?.getBoundingClientRect();
      const computed = getComputedStyle(stack);
      const childMargins = children.flatMap((child) => {
        const style = getComputedStyle(child);
        return [
          Number.parseFloat(style.marginBlockStart) || 0,
          Number.parseFloat(style.marginBlockEnd) || 0,
        ];
      });
      const next: StackMetrics = {
        align: align,
        available: round(stackRect.width),
        childHeights: children.map((child) => round(child.getBoundingClientRect().height)),
        childMargin: round(Math.max(0, ...childMargins)),
        children: children.length,
        direction: computed.flexDirection === "column" ? "block" : computed.flexDirection,
        gap: round(Number.parseFloat(computed.rowGap) || 0),
        outerEnd: round(lastRect ? stackRect.bottom - lastRect.bottom : 0),
        outerStart: round(firstRect ? firstRect.top - stackRect.top : 0),
        sandbox: round(sandbox.getBoundingClientRect().width),
      };
      setMetrics((current) => metricsEqual(current, next) ? current : next);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(sandbox);
    observer.observe(stack);
    Array.from(stack.children).forEach((child) => observer.observe(child));
    measure();
    return () => observer.disconnect();
  }, [align, gap, previewContext]);

  const activeGap = gapOptions.find((option) => option.id === gap);
  const diagnosticMetrics: Metric[] = [
    { id: "context", label: "Context", value: `${contextLabels[previewContext]} · ${px(metrics.sandbox)}` },
    { id: "available", label: "Available inline", value: px(metrics.available) },
    { id: "gap", label: "Gap", value: `${activeGap?.token} · ${px(metrics.gap)}` },
    { id: "children", label: "Direct children", value: String(metrics.children) },
    { id: "direction", label: "Direction", value: metrics.direction },
    { id: "outer-gap", label: "Outer gap", value: `${px(metrics.outerStart)} / ${px(metrics.outerEnd)}` },
    { id: "align", label: "Align", value: metrics.align },
    { id: "child-heights", label: "Child heights", value: metrics.childHeights.map(px).join(" / ") },
    { id: "child-margins", label: "Child margins", value: `${px(metrics.childMargin)} required` },
  ];

  return (
    <div className={s.specimen} data-stack-specimen>
      <div className={s.controls}>
        <GapControl controls="stack-interactive-stage" label="Stack gap" onChange={setGap} value={gap} />
        <SelectControl
          controls="stack-interactive-stage"
          label="Stack align"
          onChange={setAlign}
          options={["start", "center", "end", "stretch"] as const}
          value={align}
        />
      </div>

      <PreviewSandbox kind="stack" previewContext={previewContext} sandboxRef={sandboxRef}>
        <Stack
          align={align}
          as="ol"
          className={s.stackProbe}
          data-stack-interactive
          gap={gap}
          id="stack-interactive-stage"
        >
          <li className={s.stackProbeItem} data-stack-item="1">
            <strong>1</strong><span>Krátký obsah</span>
          </li>
          <li className={s.stackProbeItem} data-stack-item="2">
            <strong>2</strong><span>Víceřádkový obsah pokračuje na druhém řádku a mění vlastní výšku.</span>
          </li>
          <li className={s.stackProbeItem} data-stack-item="3">
            <strong>3</strong><span>Jiná výška</span>
          </li>
        </Stack>
      </PreviewSandbox>

      <Diagnostics label="Stack diagnostics" metrics={diagnosticMetrics} />
      <StackExamples />
      <StackEdgeCases />
    </div>
  );
}

type ClusterMetrics = {
  align: string;
  available: number;
  gap: number;
  itemHeights: number[];
  justify: string;
  lines: number;
  order: string;
  sandbox: number;
};

const initialClusterMetrics: ClusterMetrics = {
  align: "center",
  available: 0,
  gap: 0,
  itemHeights: [],
  justify: "start",
  lines: 0,
  order: "",
  sandbox: 0,
};

function countFlexLines(children: HTMLElement[]) {
  const rows: Array<{ bottom: number; top: number }> = [];
  const rectangles = children
    .map((child) => child.getBoundingClientRect())
    .sort((first, second) => first.top - second.top);

  for (const rectangle of rectangles) {
    const row = rows.find(
      (candidate) => rectangle.top < candidate.bottom && rectangle.bottom > candidate.top,
    );
    if (row) {
      row.top = Math.min(row.top, rectangle.top);
      row.bottom = Math.max(row.bottom, rectangle.bottom);
    } else {
      rows.push({ top: rectangle.top, bottom: rectangle.bottom });
    }
  }

  return rows.length;
}

function ClusterItems({ edge = false }: { edge?: boolean }) {
  return (
    <>
      <li className={edge ? s.edgeItem : s.clusterProbeItem} data-cluster-item="1">1</li>
      <li className={edge ? s.edgeItem : s.clusterProbeItem} data-cluster-item="2">2 · delší položka</li>
      <li className={edge ? s.edgeItem : s.clusterProbeItem} data-cluster-item="3">3</li>
      <li className={edge ? s.edgeItem : s.clusterProbeItem} data-cluster-item="4">
        <Tag aria-hidden="true" />4 · s ikonou
      </li>
      <li className={edge ? s.edgeItem : s.clusterProbeItem} data-cluster-item="5">5 · velmi dlouhý label</li>
    </>
  );
}

function ClusterExamples() {
  return (
    <section className={s.examples} aria-labelledby="cluster-examples-heading">
      <header>
        <span>Composition examples</span>
        <h4 id="cluster-examples-heading">Inline skupiny v reálném obsahu</h4>
      </header>

      <ExampleSection description="Category, date and reading time" label="Metadata">
        <Cluster data-cluster-composition="metadata" gap="s">
          <span>Investice</span><time dateTime="2026-06-12">12. června 2026</time><span>6 minut čtení</span>
        </Cluster>
      </ExampleSection>

      <ExampleSection description="Static labels keep their own intrinsic width" label="Tags">
        <Cluster data-cluster-composition="tags" gap="s">
          <Badge tone="accent">Dlouhodobý plán</Badge>
          <Badge>Rezerva</Badge>
          <Badge>Investice</Badge>
          <Badge>Ochrana příjmu</Badge>
        </Cluster>
      </ExampleSection>

      <ExampleSection description="Real controls wrap without changing order" label="Action group">
        <Cluster data-cluster-composition="actions" gap="s">
          <Button>Domluvit konzultaci</Button>
          <Button variant="secondary">Zobrazit postup</Button>
          <Button variant="quiet">Odložit</Button>
        </Cluster>
      </ExampleSection>
    </section>
  );
}

function ClusterEdgeCases() {
  return (
    <details className={s.edgeCases} data-cluster-edge-cases>
      <summary>Cluster edge-case fixtures</summary>
      <div className={s.edgeGrid}>
        <section>
          <span>Baseline</span>
          <Cluster align="baseline" data-cluster-edge-case="baseline" gap="s">
            <strong className={s.baselineValue}>24</strong>
            <span>let horizontu</span>
            <span>jeden plán</span>
          </Cluster>
        </section>
        <section dir="rtl">
          <span>RTL / DOM order unchanged</span>
          <Cluster as="ol" className={s.edgeCluster} data-cluster-edge-case="rtl" gap="s">
            <ClusterItems edge />
          </Cluster>
        </section>
      </div>
    </details>
  );
}

export function ClusterSpecimen({ previewContext }: SpecimenProps) {
  const [gap, setGap] = useState<ClusterGap>("s");
  const [align, setAlign] = useState<ClusterAlign>("center");
  const [justify, setJustify] = useState<ClusterJustify>("start");
  const [metrics, setMetrics] = useState<ClusterMetrics>(initialClusterMetrics);
  const sandboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sandbox = sandboxRef.current;
    const cluster = sandbox?.querySelector<HTMLUListElement>("[data-cluster-interactive]");
    if (!sandbox || !cluster) return;

    const measure = () => {
      const children = Array.from(cluster.children) as HTMLElement[];
      const computed = getComputedStyle(cluster);
      const next: ClusterMetrics = {
        align,
        available: round(cluster.getBoundingClientRect().width),
        gap: round(Number.parseFloat(computed.rowGap) || 0),
        itemHeights: children.map((child) => round(child.getBoundingClientRect().height)),
        justify,
        lines: countFlexLines(children),
        order: children.map((child) => child.dataset.clusterItem).filter(Boolean).join(" → "),
        sandbox: round(sandbox.getBoundingClientRect().width),
      };
      setMetrics((current) => metricsEqual(current, next) ? current : next);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(sandbox);
    observer.observe(cluster);
    Array.from(cluster.children).forEach((child) => observer.observe(child));
    measure();
    return () => observer.disconnect();
  }, [align, gap, justify, previewContext]);

  const activeGap = gapOptions.find((option) => option.id === gap);
  const diagnosticMetrics: Metric[] = [
    { id: "context", label: "Context", value: `${contextLabels[previewContext]} · ${px(metrics.sandbox)}` },
    { id: "available", label: "Available inline", value: px(metrics.available) },
    { id: "gap", label: "Gap", value: `${activeGap?.token} · ${px(metrics.gap)}` },
    { id: "lines", label: "Lines", value: String(metrics.lines) },
    { id: "wrapped", label: "Wrapped", value: metrics.lines > 1 ? "yes" : "no" },
    { id: "dom-order", label: "DOM order", value: metrics.order },
    { id: "align", label: "Align", value: metrics.align },
    { id: "justify", label: "Justify", value: metrics.justify },
    { id: "item-heights", label: "Item heights", value: metrics.itemHeights.map(px).join(" / ") },
  ];

  return (
    <div className={s.specimen} data-cluster-specimen>
      <div className={s.controls}>
        <GapControl controls="cluster-interactive-stage" label="Cluster gap" onChange={setGap} value={gap} />
        <SelectControl
          controls="cluster-interactive-stage"
          label="Cluster align"
          onChange={setAlign}
          options={["start", "center", "end", "baseline"] as const}
          value={align}
        />
        <SelectControl
          controls="cluster-interactive-stage"
          label="Cluster justify"
          onChange={setJustify}
          options={["start", "center", "end"] as const}
          value={justify}
        />
      </div>

      <PreviewSandbox kind="cluster" previewContext={previewContext} sandboxRef={sandboxRef}>
        <Cluster
          align={align}
          as="ul"
          className={s.clusterProbe}
          data-cluster-interactive
          gap={gap}
          id="cluster-interactive-stage"
          justify={justify}
        >
          <ClusterItems />
        </Cluster>
      </PreviewSandbox>

      <Diagnostics label="Cluster diagnostics" metrics={diagnosticMetrics} />
      <ClusterExamples />
      <ClusterEdgeCases />
    </div>
  );
}
