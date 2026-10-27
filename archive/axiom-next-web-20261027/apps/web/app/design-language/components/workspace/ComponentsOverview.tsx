import Link from "../../../ui/primitives/Link";
import {
  componentRegistry,
  componentRegistrySummary,
  getRuntimeEntriesByLayer,
  runtimeRegistryGroups,
} from "../registry";
import s from "./componentWorkspace.module.css";

const labLinks = [
  { href: "/design-language/components/labs/layout/", label: "Layout", count: 9, note: "Intrinsic algoritmy v narrow, medium a wide kontextu." },
  { href: "/design-language/components/labs/ui-forms/", label: "UI & Forms", count: 15, note: "Osm UI, šest form a jeden interní Field/FieldGroup kontrakt." },
  { href: "/design-language/components/labs/shell-domain/", label: "Shell & Domain", count: 15, note: "Navigace, doménová anatomie a integrační hranice." },
  { href: "/design-language/components/labs/patterns/", label: "Patterns & Templates", count: 16, note: "Devět recipes a sedm route shells bez nové vizuální vrstvy." },
] as const;

export default function ComponentsOverview() {
  const liveEntries = [...componentRegistry.runtime, ...componentRegistry.patterns, ...componentRegistry.templates]
    .filter((entry) => entry.maturity === "live");
  const uncoveredRuntime = componentRegistry.runtime.filter((entry) => entry.routes.length === 0);

  return (
    <div className={s.viewStack} data-components-overview>
      <section className={s.workspaceSection}>
        <header className={s.sectionIntro}>
          <span>Registry overview</span>
          <h2>Systém na první pohled</h2>
          <p>Přehled ukazuje rozsah, zralost a místa vyžadující route adoption. Detailní data jsou na samostatných pracovních routách.</p>
        </header>
        <div className={s.summaryStrip} data-component-summary>
          <article data-registry-summary="runtime"><span>Runtime contracts</span><strong>{componentRegistrySummary.runtimeContracts}</strong><small>9 + 11 + 7 + 6 + 9</small></article>
          <article data-registry-summary="patterns"><span>Composition patterns</span><strong>{componentRegistrySummary.patterns}</strong><small>task-oriented recipes</small></article>
          <article data-registry-summary="templates"><span>Page templates</span><strong>{componentRegistrySummary.templates}</strong><small>route shells</small></article>
          <article data-registry-summary="routes"><span>Route families</span><strong>{componentRegistrySummary.routeFamilies}</strong><small>current + planned</small></article>
        </div>
        <div className={s.maturityStrip} aria-label="Registry maturity distribution">
          {componentRegistrySummary.maturity.map(({ stage, count }) => (
            <div data-maturity-stage={stage} key={stage}><span>{stage}</span><strong>{count}</strong></div>
          ))}
        </div>
      </section>

      <section className={s.workspaceSection}>
        <header className={s.sectionIntro}>
          <span>Runtime layers</span>
          <h2>Pět odpovědnostních vrstev</h2>
          <p>Každá vrstva vede do filtrovatelného registry seznamu; workbenche už hlavní přehled nezatěžují.</p>
        </header>
        <div className={s.layerList}>
          {runtimeRegistryGroups.map((group) => {
            const entries = getRuntimeEntriesByLayer(group.id);
            const live = entries.filter((entry) => entry.maturity === "live").length;
            return (
              <article key={group.id}>
                <div><span>{group.id}</span><h3>{group.label}</h3></div>
                <p>{entries.length} contracts · {live} live</p>
                <Link href={`/design-language/components/registry/#${group.id}`}>Otevřít vrstvu</Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className={s.workspaceSection}>
        <header className={s.sectionIntro}>
          <span>Foundation labs</span>
          <h2>Každý workbench má vlastní URL</h2>
          <p>Načte se pouze laboratoř potřebná pro danou kontrolu.</p>
        </header>
        <div className={s.labList}>
          {labLinks.map((lab) => (
            <article key={lab.href}>
              <div><strong>{lab.label}</strong><span>{lab.count} contracts</span></div>
              <p>{lab.note}</p>
              <Link href={lab.href}>Otevřít laboratoř</Link>
            </article>
          ))}
        </div>
      </section>

      <section className={s.workspaceSection}>
        <header className={s.sectionIntro}>
          <span>Evidence health</span>
          <h2>Pravdivý stav nasazení</h2>
        </header>
        <div className={s.healthRows}>
          <div><span>Live contracts</span><strong>{liveEntries.length}</strong><small>{liveEntries.map((entry) => entry.id).join(" · ")}</small></div>
          <div><span>Verified, waiting for route adoption</span><strong>{componentRegistrySummary.maturity.find((item) => item.stage === "verified")?.count ?? 0}</strong><small>Code and tests exist; production import remains required.</small></div>
          <div><span>Runtime contracts without route intent</span><strong>{uncoveredRuntime.length}</strong><small>Visible in Coverage for triage, not silently labelled live.</small></div>
        </div>
        <Link href="/design-language/components/coverage/">Otevřít coverage audit</Link>
      </section>
    </div>
  );
}
