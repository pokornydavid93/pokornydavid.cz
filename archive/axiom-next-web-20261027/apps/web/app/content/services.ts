import {
  Building2,
  Car,
  Compass,
  Home,
  Landmark,
  LineChart,
  ShieldAlert,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { LeadTopic } from "@/lib/api";
import type { LeadTopic as CanonicalLeadTopic } from "@/lib/leads/lead-contract";
import {
  assertRepositoryServiceCatalogV1,
  type ServicePresentationIconKey,
} from "@/lib/services/service-presentation-contract";
import repositoryServiceSource from "../../content/axiom/services.v1.json";

export { SERVICE_CONFIG, type ServiceKey } from "./service-labels";

export type ServiceItem = {
  offeringKey: string;
  title: string;
  slug: string;
  topic: LeadTopic;
  leadTopic: CanonicalLeadTopic;
  icon: LucideIcon;
  shortDescription: string;
  description: string;
  tags: readonly [string, string, string];
  ctaLabel: string;
  featuredOnLanding: boolean;
  badge?: string;
};

const serviceIcons = {
  "building-2": Building2,
  car: Car,
  compass: Compass,
  home: Home,
  landmark: Landmark,
  "line-chart": LineChart,
  "shield-alert": ShieldAlert,
  "shield-check": ShieldCheck,
  "wallet-cards": WalletCards,
} as const satisfies Record<ServicePresentationIconKey, LucideIcon>;

const repositoryServiceCatalog =
  assertRepositoryServiceCatalogV1(repositoryServiceSource);

export const serviceItems: readonly ServiceItem[] = Object.freeze(
  repositoryServiceCatalog.items.map((service) =>
    Object.freeze({
      offeringKey: service.key,
      title: service.name,
      slug: service.key,
      topic: service.presentation.legacy_lead_topic,
      leadTopic: service.presentation.lead_topic,
      icon: serviceIcons[service.presentation.icon_key],
      shortDescription: service.presentation.short_description,
      description: service.description,
      tags: service.presentation.tags,
      ctaLabel: service.presentation.cta_label,
      featuredOnLanding: service.presentation.featured_on_landing,
      ...(service.presentation.badge
        ? { badge: service.presentation.badge }
        : {}),
    }),
  ),
);

export const landingFeaturedServices = serviceItems.filter(
  (service) => service.featuredOnLanding,
);

export const landingSecondaryServices = serviceItems.filter(
  (service) => !service.featuredOnLanding,
);
