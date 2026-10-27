import Badge from "../../../ui/primitives/Badge";
import Link from "../../../ui/primitives/Link";
import { componentRegistry, type MaturityStage } from "../registry";
import s from "./componentWorkspace.module.css";

const badgeTone = (maturity: MaturityStage) => {
  if (maturity === "live") return "success" as const;
  if (maturity === "verified") return "accent" as const;
  if (maturity === "implemented") return "warning" as const;
  return "neutral" as const;
};

export default function RuntimeContractDetail({ componentId }: { componentId: string }) {
  const entry = componentRegistry.runtime.find((item) => item.id === componentId);
  if (!entry) return null;

  return (
    <article className={s.contractDetail} data-component-contract-detail={entry.id}>
      <header className={s.detailHeader}>
        <Link href="/design-language/components/registry/">Zpět do registry</Link>
        <div><Badge tone={badgeTone(entry.maturity)}>{entry.maturity}</Badge><span>{entry.layer} · {entry.kind} · {entry.scope} · {entry.capability}</span></div>
        <h2>{entry.name}</h2>
        <p>{entry.responsibility}</p>
        <code translate="no">{entry.id}</code>
      </header>

      <section><h3>Purpose a anti-use</h3><ul>{entry.antiUse.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section><h3>Anatomy</h3><dl className={s.contractRows}>{entry.anatomy.map((item) => <div key={item.name}><dt>{item.name}<small>{item.required ? "required" : "optional"}</small></dt><dd>{item.description}</dd></div>)}</dl></section>
      <section><h3>Public API</h3><dl className={s.contractRows}>{entry.props.map((item) => <div key={item.name}><dt><code>{item.name}</code><small>{item.type}</small></dt><dd>{item.description}{item.default ? <span>Default: {item.default}</span> : null}</dd></div>)}</dl></section>
      <section><h3>Variants, sizes a states</h3><dl className={s.compactDefinition}><div><dt>Variants</dt><dd>{entry.variants.join(" · ") || "none"}</dd></div><div><dt>Sizes</dt><dd>{entry.sizes.join(" · ") || "single intrinsic size"}</dd></div><div><dt>States</dt><dd>{entry.states.join(" · ") || "static"}</dd></div></dl></section>
      <section><h3>HTML, ARIA a keyboard</h3><dl className={s.compactDefinition}><div><dt>Element</dt><dd>{entry.semantics.element ?? "host-owned"}</dd></div><div><dt>Role</dt><dd>{entry.semantics.role ?? "native semantics"}</dd></div><div><dt>Keyboard</dt><dd>{entry.semantics.keyboard.join(" · ") || "native / not interactive"}</dd></div><div><dt>ARIA</dt><dd>{entry.semantics.aria.join(" · ") || "none"}</dd></div></dl></section>
      <section><h3>Responsive contract</h3><dl className={s.contractRows}><div><dt>Invariant</dt><dd>{entry.responsive.invariant}</dd></div><div><dt>Narrow</dt><dd>{entry.responsive.narrow}</dd></div><div><dt>Wide</dt><dd>{entry.responsive.wide}</dd></div></dl></section>
      <section><h3>Surface a token dependencies</h3><dl className={s.compactDefinition}><div><dt>Supported tones</dt><dd>{entry.supportedTones.join(" · ")}</dd></div><div><dt>Tokens</dt><dd>{entry.tokens.join(" · ") || "inherited aliases"}</dd></div><div><dt>Components</dt><dd>{entry.dependencies.join(" · ") || "none"}</dd></div></dl></section>
      <section><h3>Route coverage a evidence</h3><dl className={s.contractRows}><div><dt>Route intent</dt><dd>{entry.routes.join(" · ") || "No declared route family"}</dd></div><div><dt>Live usage</dt><dd>{entry.usageEvidence.join(" · ") || "Not live yet"}</dd></div><div><dt>Code</dt><dd>{entry.codeRef ?? "Not implemented"}</dd></div></dl></section>
      <section><h3>Test readiness</h3><dl className={s.compactDefinition}><div><dt>Unit</dt><dd>{entry.tests.unit}</dd></div><div><dt>Accessibility</dt><dd>{entry.tests.accessibility}</dd></div><div><dt>Visual</dt><dd>{entry.tests.visual}</dd></div><div><dt>Responsive</dt><dd>{entry.tests.responsive}</dd></div><div><dt>Evidence</dt><dd>{entry.tests.evidence.join(" · ") || "missing"}</dd></div></dl></section>
      <section><h3>Verification facets</h3><dl className={s.compactDefinition}>{Object.entries(entry.verification).map(([facet, status]) => <div key={facet}><dt>{facet}</dt><dd>{status}</dd></div>)}</dl></section>
    </article>
  );
}
