import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import {
  serviceItems as repositoryServiceItems,
  type ServiceItem,
} from "@/app/content/services";
import {
  OFFERING_CATALOG_ORIGIN_ENV,
  OFFERING_CATALOG_TIMEOUT_ENV,
  OFFERING_CATALOG_WORKSPACE_ID_ENV,
  createControlApiOfferingRuntimeProvider,
  parseOfferingCatalogProductionConfig,
  projectAxiomOfferingContent,
  resolveOfferingCatalogRuntimeMode,
} from "./offering-runtime-core";

// The catalog is public and the Control API advertises the same 60-second
// freshness window. Keeping the raw response in Next's shared cache avoids
// duplicate reads from separate route/build workers while the repository
// presentation contract is still projected fresh by the current deployment.
const loadControlApiOfferingsCached = unstable_cache(
  async (origin: string, workspaceId: string, timeoutMs: number) => {
    const config = parseOfferingCatalogProductionConfig({
      [OFFERING_CATALOG_ORIGIN_ENV]: origin,
      [OFFERING_CATALOG_WORKSPACE_ID_ENV]: workspaceId,
      [OFFERING_CATALOG_TIMEOUT_ENV]: String(timeoutMs),
    });
    return createControlApiOfferingRuntimeProvider(
      config,
    ).listActiveOfferings();
  },
  ["axiom-active-offering-catalog-v1"],
  { revalidate: 60, tags: ["axiom-active-offerings"] },
);

async function loadServiceItems(): Promise<readonly ServiceItem[]> {
  const mode = resolveOfferingCatalogRuntimeMode(process.env);
  if (mode === "repository") return repositoryServiceItems;

  const config = parseOfferingCatalogProductionConfig(process.env);
  const offerings = await loadControlApiOfferingsCached(
    config.origin,
    config.workspaceId,
    config.timeoutMs,
  );
  return projectAxiomOfferingContent(repositoryServiceItems, offerings);
}

export const getServiceItems = cache(loadServiceItems);
