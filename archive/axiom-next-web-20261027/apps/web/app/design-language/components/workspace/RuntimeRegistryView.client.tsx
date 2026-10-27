"use client";

import { Search } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import Badge from "../../../ui/primitives/Badge";
import Link from "../../../ui/primitives/Link";
import {
  componentRegistry,
  runtimeRegistryGroups,
  type MaturityStage,
  type RegistryKind,
  type RegistryScope,
  type RouteFamilyId,
  type RuntimeRegistryLayer,
  type SurfaceTone,
} from "../registry";
import s from "./componentWorkspace.module.css";

type FilterValue<T extends string> = "all" | T;

const maturityOptions = ["specified", "implemented", "verified", "live"] as const;
const toneOptions = ["dark", "light", "action"] as const;
const kindOptions = ["primitive", "compound", "composition", "integration"] as const;
const scopeOptions = ["global", "shell", "domain"] as const;
const capabilityOptions = [...new Set(componentRegistry.runtime.map((entry) => entry.capability))].sort();

type RegistryFilterState = {
  query: string;
  layer: FilterValue<RuntimeRegistryLayer>;
  kind: FilterValue<RegistryKind>;
  scope: FilterValue<RegistryScope>;
  capability: string;
  maturity: FilterValue<MaturityStage>;
  tone: FilterValue<SurfaceTone>;
  route: FilterValue<RouteFamilyId>;
};

function readFilter<T extends string>(value: string | null, options: readonly T[]): FilterValue<T> {
  return value && options.includes(value as T) ? value as T : "all";
}

function readRegistryFilters(params: { get(name: string): string | null }): RegistryFilterState {
  return {
    query: params.get("q") ?? "",
    layer: readFilter(params.get("layer"), runtimeRegistryGroups.map((group) => group.id)),
    kind: readFilter(params.get("kind"), kindOptions),
    scope: readFilter(params.get("scope"), scopeOptions),
    capability: readFilter(params.get("capability"), capabilityOptions),
    maturity: readFilter(params.get("maturity"), maturityOptions),
    tone: readFilter(params.get("tone"), toneOptions),
    route: readFilter(params.get("route"), componentRegistry.routeFamilies.map((item) => item.id)),
  };
}

const badgeTone = (maturity: MaturityStage) => {
  if (maturity === "live") return "success" as const;
  if (maturity === "verified") return "accent" as const;
  if (maturity === "implemented") return "warning" as const;
  return "neutral" as const;
};

export default function RuntimeRegistryView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<RegistryFilterState>(() => readRegistryFilters(searchParams));
  const deferredQuery = useDeferredValue(filters.query.trim().toLowerCase());

  const replaceFilter = useCallback(<TKey extends keyof RegistryFilterState>(
    name: TKey,
    value: RegistryFilterState[TKey],
  ) => setFilters((current) => ({ ...current, [name]: value })), []);

  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.query) next.set("q", filters.query);
    if (filters.layer !== "all") next.set("layer", filters.layer);
    if (filters.kind !== "all") next.set("kind", filters.kind);
    if (filters.scope !== "all") next.set("scope", filters.scope);
    if (filters.capability !== "all") next.set("capability", filters.capability);
    if (filters.maturity !== "all") next.set("maturity", filters.maturity);
    if (filters.tone !== "all") next.set("tone", filters.tone);
    if (filters.route !== "all") next.set("route", filters.route);
    const suffix = next.size > 0 ? `?${next.toString()}` : "";
    window.history.replaceState(window.history.state, "", `${pathname}${suffix}`);
  }, [filters, pathname]);

  const filteredEntries = componentRegistry.runtime.filter((entry) => {
    const searchable = [entry.id, entry.name, entry.capability, entry.responsibility].join(" ").toLowerCase();
    return (deferredQuery.length === 0 || searchable.includes(deferredQuery))
      && (filters.layer === "all" || entry.layer === filters.layer)
      && (filters.kind === "all" || entry.kind === filters.kind)
      && (filters.scope === "all" || entry.scope === filters.scope)
      && (filters.capability === "all" || entry.capability === filters.capability)
      && (filters.maturity === "all" || entry.maturity === filters.maturity)
      && (filters.tone === "all" || entry.supportedTones.includes(filters.tone))
      && (filters.route === "all" || entry.routes.includes(filters.route));
  });

  return (
    <div className={s.viewStack} data-runtime-registry>
      <section className={s.workspaceSection}>
        <header className={s.sectionIntro}>
          <span>Runtime registry</span>
          <h2>42 kontraktů s vlastním detailem</h2>
          <p>Vyhledávání a filtry pracují nad jediným typed datasetem. Detail je sdílitelná URL, nikoliv další dlouhý blok na této stránce.</p>
        </header>

        <div className={s.registryFilters}>
          <label className={s.searchField}><span>Hledat kontrakt</span><span><Search aria-hidden="true" /><input autoComplete="off" name="query" onChange={(event) => replaceFilter("query", event.target.value)} placeholder="Název, ID, capability…" spellCheck={false} translate="no" type="search" value={filters.query} /></span></label>
          <label><span>Layer</span><select autoComplete="off" name="layer" onChange={(event) => replaceFilter("layer", event.target.value as RegistryFilterState["layer"])} value={filters.layer}><option value="all">Všechny vrstvy</option>{runtimeRegistryGroups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label>
          <label><span>Kind</span><select autoComplete="off" name="kind" onChange={(event) => replaceFilter("kind", event.target.value as RegistryFilterState["kind"])} value={filters.kind}><option value="all">Všechny druhy</option>{kindOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Scope</span><select autoComplete="off" name="scope" onChange={(event) => replaceFilter("scope", event.target.value as RegistryFilterState["scope"])} value={filters.scope}><option value="all">Všechny scopes</option>{scopeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Capability</span><select autoComplete="off" name="capability" onChange={(event) => replaceFilter("capability", event.target.value)} translate="no" value={filters.capability}><option value="all">Všechny capabilities</option>{capabilityOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Maturity</span><select autoComplete="off" name="maturity" onChange={(event) => replaceFilter("maturity", event.target.value as RegistryFilterState["maturity"])} value={filters.maturity}><option value="all">Všechny stavy</option>{maturityOptions.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></label>
          <label><span>Surface tone</span><select autoComplete="off" name="tone" onChange={(event) => replaceFilter("tone", event.target.value as RegistryFilterState["tone"])} value={filters.tone}><option value="all">Všechny tones</option>{toneOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Route family</span><select autoComplete="off" name="route" onChange={(event) => replaceFilter("route", event.target.value as RegistryFilterState["route"])} value={filters.route}><option value="all">Všechny routes</option>{componentRegistry.routeFamilies.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        </div>
        <output aria-live="polite" className={s.resultCount}>{filteredEntries.length} odpovídajících kontraktů</output>
      </section>

      <div className={s.registryGroups}>
        {runtimeRegistryGroups.map((group) => {
          const entries = filteredEntries.filter((entry) => entry.layer === group.id);
          if (entries.length === 0) return null;

          return (
            <section className={s.registryGroup} data-component-kind={group.id} id={group.id} key={group.id}>
              <header><div><span>{group.id}</span><h2>{group.label}</h2></div><strong>{entries.length}</strong></header>
              <div className={s.registryRows}>
                {entries.map((entry) => {
                  const relevantTests = [entry.tests.unit, entry.tests.accessibility, entry.tests.visual, entry.tests.responsive].filter((status) => status !== "not-applicable");
                  const passingTests = relevantTests.filter((status) => status === "passing").length;
                  const relevantFacets = Object.values(entry.verification).filter((status) => status !== "not-applicable");
                  const passingFacets = relevantFacets.filter((status) => status === "passing").length;
                  return (
                    <article data-capability={entry.capability} data-component-id={entry.id} data-kind={entry.kind} data-maturity={entry.maturity} data-scope={entry.scope} key={entry.id}>
                      <Badge tone={badgeTone(entry.maturity)}>{entry.maturity}</Badge>
                      <div className={s.registryIdentity}><span>{entry.kind} · {entry.scope} · {entry.capability}</span><h3>{entry.name}</h3><p>{entry.responsibility}</p></div>
                      <div className={s.registryEvidence}><span>{entry.routes.length} route families</span><span>{entry.supportedTones.join(" / ")}</span><span>{passingTests}/{relevantTests.length} tests</span><span>{passingFacets}/{relevantFacets.length} facets</span></div>
                      <code translate="no">{entry.id}</code>
                      <Link href={`/design-language/components/registry/${entry.id}/`}>Detail kontraktu</Link>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {filteredEntries.length === 0 ? <p className={s.emptyState}>Žádný kontrakt neodpovídá zvoleným filtrům. Upravte hledaný výraz nebo některý filtr.</p> : null}
    </div>
  );
}
