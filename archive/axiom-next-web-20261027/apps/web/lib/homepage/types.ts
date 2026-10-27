export type SituationId =
  | "plan"
  | "financovani"
  | "ochrana"
  | "rezerva-investice"
  | "mortgage-refixation"
  | "new-housing"
  | "insurance-review"
  | "income-protection"
  | "investing"
  | "refixace"
  | "nova-hypoteka"
  | "kontrola-pojisteni"
  | "vypadek-prijmu"
  | "investice"
  | "orientace";

export type PrimarySituationId =
  | "mortgage-refixation"
  | "new-housing"
  | "insurance-review"
  | "income-protection"
  | "investing";

export type HomeSituationVariant = "default" | "recommended" | "fallback";

export type OverviewSource =
  | "home-header"
  | "home-hero"
  | "home-profile"
  | "home-process"
  | "home-references"
  | "home-situation"
  | "home-situations"
  | "home-final"
  | "direct";

export type OverviewNextStep = "contact-me" | "choose-date";
export type PreferredContactChannel = "email" | "phone";

export type InternalRoute = string & { readonly __brand: "InternalRoute" };
export type AssetRef = string & { readonly __brand: "AssetRef" };
export type SectionIntroContent = {
  eyebrow?: string;
  title: string;
  lead?: string;
};

export type ActionLinkContent = {
  label: string;
  href: InternalRoute;
  source?: OverviewSource;
};

export type OverviewActionLinkContent = {
  label: string;
  href: InternalRoute;
  source: Exclude<OverviewSource, "direct">;
};

export type HomeSituation = {
  id: PrimarySituationId;
  selectorLabel: string;
  eyebrow: string;
  title: string;
  titleLines: readonly [string, string];
  description: string;
  metadata: readonly [string, string, string];
  ctaLabel: string;
  href: InternalRoute;
  routeExplanation: string;
  variant: Exclude<HomeSituationVariant, "fallback">;
};

export type HomeOrientationPath = {
  id: "orientace";
  title: string;
  description: string;
  metadata: readonly string[];
  ctaLabel: string;
  href: InternalRoute;
  routeExplanation: string;
  variant: "fallback";
};

export type HomeFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type EvidenceRef =
  | { id: string; kind: "fact"; factId: string }
  | { id: string; kind: "case"; caseId: string }
  | { id: string; kind: "testimonial"; testimonialId: string };

export type HomePageContent = {
  overviewOfferId: string;
  shell: {
    navigation: Array<{ id: string; label: string; href: InternalRoute }>;
    headerCta: OverviewActionLinkContent & { source: "home-header" };
    footerContentId: string;
  };
  hero: {
    eyebrow?: string;
    title: string;
    titleLines: readonly [string, string];
    titleEmphasis?: string;
    lead: string;
    primaryCta: OverviewActionLinkContent & { source: "home-hero" };
    secondaryCta?: ActionLinkContent;
    media?: {
      asset?: AssetRef;
      kind: "html-specimen" | "image";
      alt: string;
      caption?: string;
    };
  };
  situations: {
    intro: {
      eyebrow: string;
      title: string;
      lead: string;
    };
    items: HomeSituation[];
    orientation: HomeOrientationPath;
    customSituationLink: ActionLinkContent & { context: string };
  };
  references: {
    intro: {
      eyebrow: string;
      title: string;
      description: string;
    };
    reviewIds: readonly string[];
    outro: {
      title: string;
      description: string;
      cta: ActionLinkContent & { source: "home-references" };
    };
  };
  processAndFees: {
    intro: {
      eyebrow: string;
    };
    steps: Array<{
      id: string;
      role: "VY" | "JÁ";
      title: string;
      support: string;
    }>;
    detail: string;
    result: {
      eyebrow: string;
      title: string;
      description: string;
    };
    cta: ActionLinkContent & {
      source: "home-process";
      situation?: SituationId;
    };
    microcopy: string;
  };
  outcome: {
    intro: {
      title: string;
      titleLines: readonly [string, string];
      description: string;
    };
    items: readonly [
      { id: string; index: string; title: string; description: string },
      { id: string; index: string; title: string; description: string },
      { id: string; index: string; title: string; description: string },
    ];
  };
  evidence: {
    intro: SectionIntroContent;
    items: EvidenceRef[];
  };
  profile: {
    intro: {
      title: string;
      titleLines: readonly [string, string, string];
      introduction: string;
      statement: readonly [string];
    };
    roleFactId: string;
    aboutLink: {
      label: string;
      href: InternalRoute;
    };
    portrait: AssetRef;
    portraitAlt: string;
  };
  insights?: {
    intro: SectionIntroContent;
    allArticlesLabel: string;
    articleIds: [string, string, string];
    articleCopy?: Partial<Record<string, {
      title: string;
      excerpt: string;
      categoryLabel?: string;
      readingTime?: string;
    }>>;
  };
  faq: {
    intro: SectionIntroContent;
    items: HomeFaqItem[];
    privacyNote: {
      text: string;
      linkLabel: string;
      href: InternalRoute;
    };
  };
  finalCta: {
    eyebrow: string;
    title: string;
    description: string;
    microcopy: string;
    primaryCta: {
      label: string;
      href: InternalRoute;
      source: "home-final";
    };
  };
};

export type OverviewOfferContract = {
  id: string;
  ctaLabel: "Získat přehled";
  immediateOutcome: string;
  firstHumanStep: string;
  actualDeliverable: string;
  deliveryMoment: string;
  deliveryFormat: string;
  priceDisclosure: string;
  owner: string;
  status: "draft" | "approved" | "expired" | "blocked";
  approvedBy?: string;
  approvedAt?: string;
  reviewAt: string;
};

export type OverviewFlowContent = {
  intro: { title: string; lead: string };
  collectionNotice: {
    shortText: string;
    detailHref: InternalRoute;
    version: string;
  };
  fields: Record<
    | "intent"
    | "situationNote"
    | "phone"
    | "email"
    | "firstName",
    { label: string; hint?: string; requiredText?: string }
  >;
  errorSummaryTitle: string;
  validation: {
    intent: string;
    situationNote: string;
    phone: string;
    email: string;
    firstName: string;
    preferredCallTime: string;
  };
  messages: {
    providerUnavailable: string;
    rateLimited: string;
    duplicateOrAmbiguous: string;
    requestReceived: string;
  };
};

export type ClaimStatus = "draft" | "verified" | "expired" | "blocked";
export type ClaimKind =
  | "identity"
  | "role"
  | "experience"
  | "client-base"
  | "availability"
  | "service-scope"
  | "process"
  | "deliverable"
  | "remuneration";

export type VerifiedFactEvidence = {
  id: string;
  kind: ClaimKind;
  label: string;
  value: string;
  publicExplanation?: string;
  source: string;
  sourceUrl?: string;
  verifiedAt: string;
  reviewAt: string;
  expiresAt?: string;
  owner: string;
  status: ClaimStatus;
  allowedPlacements: Array<"home" | "profile" | "footer" | "structured-data">;
};

export type PublicVerifiedFact = {
  id: string;
  label: string;
  value: string;
  publicExplanation?: string;
  publicSourceLabel?: string;
  publicSourceUrl?: string;
  publicVerifiedAt: string;
};
