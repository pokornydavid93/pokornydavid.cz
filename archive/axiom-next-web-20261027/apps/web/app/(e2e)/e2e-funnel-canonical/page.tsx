import { notFound } from "next/navigation";
import CanonicalFunnelHarness from "./CanonicalFunnelHarness.client";

export const dynamic = "force-dynamic";

export default function CanonicalFunnelHarnessPage() {
  if (process.env.AXIOM_E2E_CANONICAL_FUNNEL !== "1") notFound();

  return <CanonicalFunnelHarness />;
}
