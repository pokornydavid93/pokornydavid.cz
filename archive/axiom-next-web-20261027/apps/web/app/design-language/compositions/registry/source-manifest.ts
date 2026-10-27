import {
  asCompositionInstanceId,
} from "./helpers";
import type { RouteSourceManifest, RouteSourceSection } from "./types";

type SectionInput = {
  sectionKey: string;
  instanceId?: string;
  exceptionId?: string;
  sourceFiles: string[];
  fixtureOrDataVariants?: string[];
};

type ManifestInput = {
  routePattern: string;
  kind?: RouteSourceManifest["kind"];
  entryFile: string;
  sourceManifest?: string;
  dynamic?: boolean;
  sourceFiles?: string[];
  fixtureOrDataVariants?: string[];
  sections: SectionInput[];
};

function section(input: SectionInput): RouteSourceSection {
  return {
    sectionKey: input.sectionKey,
    instanceId: input.instanceId
      ? asCompositionInstanceId(input.instanceId)
      : undefined,
    exceptionId: input.exceptionId,
    sourceFiles: input.sourceFiles,
    fixtureOrDataVariants: input.fixtureOrDataVariants,
  };
}

function manifest(input: ManifestInput): RouteSourceManifest {
  return {
    routePattern: input.routePattern,
    kind: input.kind ?? "public",
    entryFile: input.entryFile,
    sourceManifest: input.sourceManifest ?? input.entryFile,
    dynamic: input.dynamic ?? false,
    sourceFiles: input.sourceFiles ?? [input.entryFile],
    fixtureOrDataVariants: input.fixtureOrDataVariants,
    sections: input.sections.map(section),
  };
}

export const internalRouteSourcePrefixes = [
  "app/design-language/",
] as const satisfies readonly string[];

export const routeSourceManifests = [
  manifest({
    routePattern: "/",
    entryFile: "app/page.tsx",
    sourceFiles: ["app/page.tsx"],
    sections: [
      {
        sectionKey: "hero",
        instanceId: "instance.home.hero",
        sourceFiles: ["app/page.tsx", "app/ui/domain/Hero.tsx"],
      },
      {
        sectionKey: "situations",
        instanceId: "instance.home.situations",
        sourceFiles: ["app/page.tsx", "app/ui/patterns/SectionIntro.tsx"],
      },
      {
        sectionKey: "references",
        instanceId: "instance.home.references",
        sourceFiles: [
          "app/page.tsx",
          "app/content/homepage.ts",
          "app/content/testimonials.ts",
          "app/_components/homepage/HomeReferencesNavigator.client.tsx",
        ],
      },
      {
        sectionKey: "process",
        instanceId: "instance.home.process",
        sourceFiles: [
          "app/page.tsx",
          "app/content/homepage.ts",
          "app/ui/animations/RevealClient.tsx",
        ],
      },
      {
        sectionKey: "evidence",
        instanceId: "instance.home.evidence",
        sourceFiles: ["app/page.tsx", "app/ui/patterns/TrustBlock.tsx"],
      },
      {
        sectionKey: "profile",
        instanceId: "instance.home.profile",
        sourceFiles: [
          "app/page.tsx",
          "app/ui/patterns/SplitNarrative.tsx",
          "app/ui/domain/ProfileCard.tsx",
        ],
      },
      {
        sectionKey: "faq",
        instanceId: "instance.home.faq",
        sourceFiles: ["app/page.tsx", "app/ui/patterns/FAQSection.tsx"],
      },
      {
        sectionKey: "finalAction",
        instanceId: "instance.home.finalAction",
        sourceFiles: ["app/page.tsx", "app/ui/patterns/ActionBand.tsx"],
      },
    ],
  }),
  manifest({
    routePattern: "/ziskat-prehled/",
    entryFile: "app/ziskat-prehled/page.tsx",
    sections: [
      {
        sectionKey: "entry",
        instanceId: "instance.overview.entry",
        sourceFiles: ["app/ziskat-prehled/page.tsx", "app/ui/domain/Hero.tsx"],
      },
      {
        sectionKey: "leadCapture",
        instanceId: "instance.overview.leadCapture",
        sourceFiles: [
          "app/ziskat-prehled/page.tsx",
          "app/ziskat-prehled/OverviewRequestForm.client.tsx",
          "app/ui/patterns/FormContactSplit.tsx",
        ],
      },
    ],
  }),
  manifest({
    routePattern: "/ziskat-prehled/dekujeme/",
    entryFile: "app/ziskat-prehled/dekujeme/page.tsx",
    sections: [
      {
        sectionKey: "entry",
        instanceId: "instance.overviewThankYou.entry",
        sourceFiles: [
          "app/ziskat-prehled/dekujeme/page.tsx",
          "app/ui/domain/Hero.tsx",
        ],
      },
      {
        sectionKey: "completion",
        instanceId: "instance.overviewThankYou.completion",
        sourceFiles: ["app/ziskat-prehled/dekujeme/page.tsx"],
      },
      {
        sectionKey: "booking",
        instanceId: "instance.overviewThankYou.booking",
        sourceFiles: [
          "app/ziskat-prehled/dekujeme/page.tsx",
          "app/ui/domain/BookingPanel.tsx",
        ],
      },
    ],
  }),
  manifest({
    routePattern: "/sluzby/",
    entryFile: "app/sluzby/page.tsx",
    sections: [
      {
        sectionKey: "hero",
        instanceId: "instance.services.hero",
        sourceFiles: ["app/sluzby/page.tsx"],
      },
      {
        sectionKey: "metrics",
        instanceId: "instance.services.metrics",
        sourceFiles: ["app/sluzby/page.tsx"],
      },
      {
        sectionKey: "catalog",
        instanceId: "instance.services.catalog",
        sourceFiles: ["app/sluzby/page.tsx"],
      },
      {
        sectionKey: "cta",
        instanceId: "instance.services.cta",
        sourceFiles: ["app/sluzby/page.tsx"],
      },
    ],
  }),
  manifest({
    routePattern: "/jak-pracuji/",
    entryFile: "app/jak-pracuji/page.tsx",
    sections: [
      {
        sectionKey: "hero",
        instanceId: "instance.process.hero",
        sourceFiles: ["app/jak-pracuji/page.tsx"],
      },
      {
        sectionKey: "journey",
        instanceId: "instance.process.journey",
        sourceFiles: ["app/jak-pracuji/page.tsx"],
      },
      {
        sectionKey: "outcome",
        instanceId: "instance.process.outcome",
        sourceFiles: ["app/jak-pracuji/page.tsx"],
      },
      {
        sectionKey: "cta",
        instanceId: "instance.process.cta",
        sourceFiles: ["app/jak-pracuji/page.tsx"],
      },
    ],
  }),
  manifest({
    routePattern: "/kdo-jsem/",
    entryFile: "app/kdo-jsem/page.tsx",
    sections: [
      {
        sectionKey: "hero",
        instanceId: "instance.about.hero",
        sourceFiles: ["app/kdo-jsem/page.tsx"],
      },
      {
        sectionKey: "trust",
        instanceId: "instance.about.trust",
        sourceFiles: ["app/kdo-jsem/page.tsx"],
      },
      {
        sectionKey: "method",
        instanceId: "instance.about.method",
        sourceFiles: ["app/kdo-jsem/page.tsx"],
      },
      {
        sectionKey: "credentials",
        instanceId: "instance.about.credentials",
        sourceFiles: ["app/kdo-jsem/page.tsx"],
      },
      {
        sectionKey: "cta",
        sourceFiles: ["app/kdo-jsem/page.tsx"],
      },
    ],
  }),
  manifest({
    routePattern: "/reference/",
    entryFile: "app/reference/page.tsx",
    sourceManifest: "app/reference/ReferencesExperience.client.tsx",
    sourceFiles: ["app/reference/page.tsx", "app/reference/ReferencesExperience.client.tsx"],
    sections: [
      {
        sectionKey: "hero",
        instanceId: "instance.references.hero",
        sourceFiles: ["app/reference/page.tsx", "app/reference/ReferencesExperience.client.tsx"],
      },
      {
        sectionKey: "reviews",
        instanceId: "instance.references.reviews",
        sourceFiles: ["app/reference/page.tsx", "app/reference/ReferencesExperience.client.tsx"],
      },
      {
        sectionKey: "cta",
        instanceId: "instance.references.cta",
        sourceFiles: ["app/reference/page.tsx", "app/reference/ReferencesExperience.client.tsx"],
      },
    ],
  }),
  manifest({
    routePattern: "/clanky/",
    entryFile: "app/clanky/page.tsx",
    sourceManifest: "app/clanky/ArticlesHub.client.tsx",
    sourceFiles: ["app/clanky/page.tsx", "app/clanky/ArticlesHub.client.tsx"],
    sections: [
      {
        sectionKey: "feature",
        instanceId: "instance.articlesHub.feature",
        sourceFiles: ["app/clanky/page.tsx", "app/clanky/ArticlesHub.client.tsx"],
      },
      {
        sectionKey: "browser",
        instanceId: "instance.articlesHub.browser",
        sourceFiles: ["app/clanky/page.tsx", "app/clanky/ArticlesHub.client.tsx"],
      },
    ],
  }),
  manifest({
    routePattern: "/clanky/[slug]/",
    entryFile: "app/clanky/[slug]/page.tsx",
    dynamic: true,
    fixtureOrDataVariants: ["canonical", "edge-long-title"],
    sections: [
      {
        sectionKey: "articleHeader",
        instanceId: "instance.articleDetail.header",
        sourceFiles: ["app/clanky/[slug]/page.tsx"],
        fixtureOrDataVariants: ["canonical", "edge-long-title"],
      },
      {
        sectionKey: "articleShell",
        instanceId: "instance.articleDetail.shell",
        sourceFiles: ["app/clanky/[slug]/page.tsx"],
        fixtureOrDataVariants: ["canonical", "long-content"],
      },
      {
        sectionKey: "relatedContent",
        instanceId: "instance.articleDetail.related",
        sourceFiles: ["app/clanky/[slug]/page.tsx"],
      },
    ],
  }),
  manifest({
    routePattern: "/funnels/mortgage-income-drop-check/",
    entryFile: "app/funnels/mortgage-income-drop-check/page.tsx",
    sections: [
      {
        sectionKey: "screeningFlow",
        instanceId: "instance.screening.flow",
        sourceFiles: ["app/funnels/mortgage-income-drop-check/page.tsx"],
      },
    ],
  }),
  manifest({
    routePattern: "/osvedceni-a-certifikace/",
    entryFile: "app/osvedceni-a-certifikace/page.tsx",
    sections: [
      {
        sectionKey: "credentialRegistry",
        instanceId: "instance.credentials.registry",
        sourceFiles: ["app/osvedceni-a-certifikace/page.tsx"],
      },
    ],
  }),
  manifest({
    routePattern: "/pravni-informace/",
    entryFile: "app/pravni-informace/page.tsx",
    sections: [
      {
        sectionKey: "legalFlow",
        instanceId: "instance.utility.legalFlow",
        sourceFiles: ["app/pravni-informace/page.tsx"],
      },
    ],
  }),
  manifest({
    routePattern: "/cookies-a-mereni/",
    entryFile: "app/cookies-a-mereni/page.tsx",
    sections: [
      {
        sectionKey: "legalFlow",
        instanceId: "instance.utility.cookiesFlow",
        sourceFiles: ["app/cookies-a-mereni/page.tsx"],
      },
    ],
  }),
  manifest({
    routePattern: "/zasady-zpracovani-osobnich-udaju/",
    entryFile: "app/zasady-zpracovani-osobnich-udaju/page.tsx",
    sections: [
      {
        sectionKey: "legalFlow",
        instanceId: "instance.utility.privacyFlow",
        sourceFiles: ["app/zasady-zpracovani-osobnich-udaju/page.tsx"],
      },
    ],
  }),
  manifest({
    routePattern: "/blog/",
    kind: "redirect",
    entryFile: "app/blog/page.tsx",
    sections: [
      {
        sectionKey: "redirect",
        exceptionId: "exception.route.blogRedirect",
        sourceFiles: ["app/blog/page.tsx"],
      },
    ],
  }),
  manifest({
    routePattern: "/blog/[slug]/",
    kind: "redirect",
    entryFile: "app/blog/[slug]/page.tsx",
    dynamic: true,
    fixtureOrDataVariants: ["canonical-redirect", "encoded-slug"],
    sections: [
      {
        sectionKey: "redirect",
        exceptionId: "exception.route.blogSlugRedirect",
        sourceFiles: ["app/blog/[slug]/page.tsx"],
        fixtureOrDataVariants: ["canonical-redirect", "encoded-slug"],
      },
    ],
  }),
  manifest({
    routePattern: "/runtime/[channel]/publications/[publicationId]/[[...path]]/",
    kind: "runtime",
    entryFile: "app/runtime/[channel]/publications/[publicationId]/[[...path]]/page.tsx",
    dynamic: true,
    sections: [
      {
        sectionKey: "runtime-publication",
        exceptionId: "exception.route.runtimePublication",
        sourceFiles: [
          "app/runtime/[channel]/publications/[publicationId]/[[...path]]/page.tsx",
        ],
      },
    ],
  }),
  manifest({
    routePattern: "/404/",
    kind: "not-found",
    entryFile: "app/not-found.tsx",
    sections: [
      {
        sectionKey: "not-found",
        exceptionId: "exception.route.notFound",
        sourceFiles: ["app/not-found.tsx"],
      },
    ],
  }),
] as const satisfies ReadonlyArray<RouteSourceManifest>;

export const routeSourceManifestByPattern = new Map(
  routeSourceManifests.map((item) => [item.routePattern, item])
);

export function getRouteSourceManifest(routePattern: string) {
  return routeSourceManifestByPattern.get(routePattern);
}

export function sourceManifestForRoute(routePattern: string) {
  return getRouteSourceManifest(routePattern)?.sourceManifest ?? "";
}

export function sourceFilesForRouteSection(
  routePattern: string,
  sectionKey: string
) {
  const route = getRouteSourceManifest(routePattern);
  const sectionSource = route?.sections.find(
    (section) => section.sectionKey === sectionKey
  );

  return sectionSource?.sourceFiles ?? route?.sourceFiles ?? [];
}

export function fixtureVariantsForRouteSection(
  routePattern: string,
  sectionKey: string
) {
  const route = getRouteSourceManifest(routePattern);
  const sectionSource = route?.sections.find(
    (section) => section.sectionKey === sectionKey
  );

  return sectionSource?.fixtureOrDataVariants ?? route?.fixtureOrDataVariants;
}
