"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SurfaceRenderer,
  createMortgageIncomeDropCheckDocument,
  mortgageIncomeDropWorkflowHandlers,
  platformManagedCapabilities,
  type PublicRuntimeConfig,
} from "@axiom-dp/surface-engine";

type HarnessWindow = Window & {
  __axiomCanonicalFunnelEvents?: Array<{
    event: string;
    payload?: Record<string, unknown>;
  }>;
  __axiomCanonicalFunnelRoutes?: string[];
};

const document = createMortgageIncomeDropCheckDocument();

const runtimeConfig: PublicRuntimeConfig = {
  apiBaseUrl: "",
  assetBaseUrl: "",
  capabilities: platformManagedCapabilities,
  deploymentMode: "platform_managed",
  endpoints: {
    analytics: "/e2e-runtime/analytics",
    assetResolve: "/e2e-runtime/assets/{projectId}/{assetId}",
    cmsQuery: "/e2e-runtime/cms/{projectId}",
    formSubmit: "/e2e-runtime/forms/{projectId}/{formId}/submit",
    leadIntake: "/e2e-runtime/leads/{projectId}",
    workflowTrigger: "/e2e-runtime/workflows/{projectId}",
  },
  projectId: "70000000-0000-4000-8000-000000000001",
  publicRuntimeKey: "e2e-runtime-key",
  releaseId: "70000000-0000-4000-8000-000000000003",
  requiredCapabilities: platformManagedCapabilities,
  sourceOfTruth: "surface_document",
  workspaceId: "70000000-0000-4000-8000-000000000002",
};

export default function CanonicalFunnelHarness() {
  const [routeId, setRouteId] = useState("lead_capture");

  const handleRouteChange = useCallback((nextRouteId: string) => {
    setRouteId(nextRouteId);
    const harnessWindow = window as HarnessWindow;
    harnessWindow.__axiomCanonicalFunnelRoutes ??= [];
    if (harnessWindow.__axiomCanonicalFunnelRoutes.at(-1) !== nextRouteId) {
      harnessWindow.__axiomCanonicalFunnelRoutes.push(nextRouteId);
    }
  }, []);

  useEffect(() => {
    const harnessWindow = window as HarnessWindow;
    harnessWindow.__axiomCanonicalFunnelEvents = [];
    harnessWindow.__axiomCanonicalFunnelRoutes = ["lead_capture"];
  }, []);

  return (
    <main>
      <output data-testid="canonical-funnel-route">{routeId}</output>
      <SurfaceRenderer
        document={document}
        initialRouteId="lead_capture"
        onRouteChange={handleRouteChange}
        runtimeConfig={runtimeConfig}
        trackingAdapter={{
          track(event, payload) {
            const harnessWindow = window as HarnessWindow;
            harnessWindow.__axiomCanonicalFunnelEvents ??= [];
            harnessWindow.__axiomCanonicalFunnelEvents.push({ event, payload });
          },
        }}
        workflowHandlers={mortgageIncomeDropWorkflowHandlers}
      />
    </main>
  );
}
