import Link from "../../../ui/primitives/Link";
import { componentRegistry } from "../registry";
import s from "./componentWorkspace.module.css";

export default function ComponentCoverageView() {
  const uncovered = componentRegistry.runtime.filter((entry) => entry.routes.length === 0);
  const invalidLive = [...componentRegistry.runtime, ...componentRegistry.patterns, ...componentRegistry.templates]
    .filter((entry) => entry.maturity === "live" && entry.usageEvidence.length === 0);
  const missingCurrentSources = componentRegistry.routeFamilies.filter((route) => route.status === "current" && route.sourceFiles.length === 0);
  const usedPatternIds = new Set(componentRegistry.templates.flatMap((template) => template.allowedPatterns));
  const orphanPatterns = componentRegistry.patterns.filter((pattern) => !usedPatternIds.has(pattern.id));

  return (
    <div className={s.viewStack} data-component-coverage>
      <section className={s.workspaceSection}>
        <header className={s.sectionIntro}><span>Coverage health</span><h2>Route evidence bez falešného live statusu</h2><p>Audit spojuje route, template, patterns a runtime kontrakty. Nulové kritické počty znamenají platný graf, ne absenci migračního backlogu.</p></header>
        <div className={s.coverageHealth}>
          <article><span>Live without evidence</span><strong>{invalidLive.length}</strong><small>must remain zero</small></article>
          <article><span>Current routes without source</span><strong>{missingCurrentSources.length}</strong><small>must remain zero</small></article>
          <article><span>Patterns outside templates</span><strong>{orphanPatterns.length}</strong><small>must remain zero</small></article>
          <article><span>Runtime without route intent</span><strong>{uncovered.length}</strong><small>triage backlog</small></article>
        </div>
      </section>

      <section className={s.workspaceSection}>
        <header className={s.sectionIntro}><span>Route → template → patterns</span><h2>Jedenáct route families</h2></header>
        <div className={s.routeCoverageRows}>
          {componentRegistry.routeFamilies.map((route) => (
            <article data-route-family={route.id} key={route.id}>
              <div><span>{route.status}</span><h3>{route.label}</h3><code>{route.id}</code></div>
              <dl><div><dt>Template</dt><dd>{route.templateId}</dd></div><div><dt>Required</dt><dd>{route.requiredPatternIds.join(" · ")}</dd></div><div><dt>Optional</dt><dd>{route.optionalPatternIds.join(" · ") || "none"}</dd></div><div><dt>Sources</dt><dd>{route.sourceFiles.join(" · ") || "planned"}</dd></div></dl>
            </article>
          ))}
        </div>
      </section>

      <section className={s.workspaceSection}>
        <header className={s.sectionIntro}><span>Uncovered runtime</span><h2>{uncovered.length} kontraktů bez route intent</h2><p>Tyto položky mohou být interní primitives, ale musí zůstat viditelné pro budoucí rozhodnutí.</p></header>
        <div className={s.uncoveredList}>{uncovered.map((entry) => <article key={entry.id}><div><strong>{entry.name}</strong><code>{entry.id}</code></div><span>{entry.layer} · {entry.kind} · {entry.scope}</span><Link href={`/design-language/components/registry/${entry.id}/`}>Detail</Link></article>)}</div>
      </section>
    </div>
  );
}
