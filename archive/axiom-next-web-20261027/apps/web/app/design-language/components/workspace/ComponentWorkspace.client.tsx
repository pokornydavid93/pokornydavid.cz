"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";
import ComponentsOverview from "./ComponentsOverview";
import s from "./componentWorkspace.module.css";

export type ComponentsWorkspaceView =
  | "overview"
  | "registry"
  | "detail"
  | "coverage"
  | "lab-layout"
  | "lab-ui-forms"
  | "lab-shell-domain"
  | "lab-patterns";

type ComponentWorkspaceProps = {
  view: ComponentsWorkspaceView;
  componentId?: string;
};

const RuntimeRegistryView = dynamic(() => import("./RuntimeRegistryView.client"), {
  loading: () => <p className={s.loadingState}>Načítám registry…</p>,
});
const RuntimeContractDetail = dynamic(() => import("./RuntimeContractDetail"), {
  loading: () => <p className={s.loadingState}>Načítám kontrakt…</p>,
});
const ComponentCoverageView = dynamic(() => import("./ComponentCoverageView"), {
  loading: () => <p className={s.loadingState}>Načítám coverage…</p>,
});
const LayoutFoundationPreview = dynamic(() => import("../LayoutFoundationPreview"), {
  loading: () => <p className={s.loadingState}>Načítám layout laboratoř…</p>,
});
const UIFormsFoundationPreview = dynamic(() => import("../UIFormsFoundationPreview"), {
  loading: () => <p className={s.loadingState}>Načítám UI a forms laboratoř…</p>,
});
const ShellDomainFoundationPreview = dynamic(() => import("../ShellDomainFoundationPreview"), {
  loading: () => <p className={s.loadingState}>Načítám shell a domain laboratoř…</p>,
});
const PatternTemplateFoundationPreview = dynamic(() => import("../PatternTemplateFoundationPreview"), {
  loading: () => <p className={s.loadingState}>Načítám patterns laboratoř…</p>,
});

const primaryNavigation = [
  { id: "overview", href: "/design-language/components/", label: "Overview" },
  { id: "registry", href: "/design-language/components/registry/", label: "Registry" },
  { id: "coverage", href: "/design-language/components/coverage/", label: "Coverage" },
] as const;

const labNavigation = [
  { id: "lab-layout", href: "/design-language/components/labs/layout/", label: "Layout" },
  { id: "lab-ui-forms", href: "/design-language/components/labs/ui-forms/", label: "UI & Forms" },
  { id: "lab-shell-domain", href: "/design-language/components/labs/shell-domain/", label: "Shell & Domain" },
  { id: "lab-patterns", href: "/design-language/components/labs/patterns/", label: "Patterns" },
] as const;

const labCopy = {
  "lab-layout": {
    eyebrow: "Layout foundation",
    heading: "Devět algoritmů, tři šířkové kontexty",
    description: "Narrow, medium a wide mění dostupný prostor. Runtime primitives zachovávají stejné pořadí DOM.",
  },
  "lab-ui-forms": {
    eyebrow: "UI and forms foundation",
    heading: "Jeden kontrakt, tři surface kontexty.",
    description: "Contract Lab izoluje stavy, Composition Lab skládá realistickou obrazovku a Form Journey dokazuje celý validační tok.",
  },
  "lab-shell-domain": {
    eyebrow: "Shell and domain foundation",
    heading: "Orientace, obsah a integrační hranice",
    description: "Navigace používá skutečné URL, doménové komponenty drží stabilní anatomii a integrace zůstávají izolované.",
  },
  "lab-patterns": {
    eyebrow: "Patterns and templates foundation",
    heading: "Recipes skládají route bez nové vizuální vrstvy",
    description: "Devět patterns používá existující layout, surface a component contracts; sedm templates vlastní pouze landmarky a slot order.",
  },
} as const;

function WorkspaceNavigation({ view }: { view: ComponentsWorkspaceView }) {
  const primaryView = view === "detail" ? "registry" : view;
  return (
    <nav className={s.workspaceNavigation} aria-label="Component workspace">
      <div>
        {primaryNavigation.map((item) => <Link aria-current={primaryView === item.id ? "page" : undefined} href={item.href} key={item.id}>{item.label}</Link>)}
      </div>
      <div aria-label="Foundation labs">
        <span>Labs</span>
        {labNavigation.map((item) => <Link aria-current={view === item.id ? "page" : undefined} href={item.href} key={item.id}>{item.label}</Link>)}
      </div>
    </nav>
  );
}

function LabHeader({ view }: { view: keyof typeof labCopy }) {
  const copy = labCopy[view];
  return <header className={s.labHeader}><span>{copy.eyebrow}</span><h2>{copy.heading}</h2><p>{copy.description}</p></header>;
}

export default function ComponentWorkspace({ componentId, view }: ComponentWorkspaceProps) {
  return (
    <div className={s.workspace} data-components-view={view}>
      <WorkspaceNavigation view={view} />
      {view === "overview" ? <ComponentsOverview /> : null}
      {view === "registry" ? <Suspense fallback={<p className={s.loadingState}>Načítám registry…</p>}><RuntimeRegistryView /></Suspense> : null}
      {view === "detail" && componentId ? <RuntimeContractDetail componentId={componentId} /> : null}
      {view === "coverage" ? <ComponentCoverageView /> : null}
      {view === "lab-layout" ? <section className={s.labView}><LabHeader view={view} /><LayoutFoundationPreview /></section> : null}
      {view === "lab-ui-forms" ? <section className={s.labView}><LabHeader view={view} /><UIFormsFoundationPreview /></section> : null}
      {view === "lab-shell-domain" ? <section className={s.labView}><LabHeader view={view} /><ShellDomainFoundationPreview /></section> : null}
      {view === "lab-patterns" ? <section className={s.labView}><LabHeader view={view} /><PatternTemplateFoundationPreview /></section> : null}
    </div>
  );
}
