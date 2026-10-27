import "server-only";
import { AxiomRuntimeError } from "@axiom/web-core/runtime";
import { projectFormClientFromEnvironment } from "./project-form-runtime.server";
import { acceptIncomeTest } from "./income-test-service";
import type { IncomeTestRequest, IncomeTestSubmitResult } from "./income-test-request";
import { isCanonicalProjectPublicHost } from "./project-public-host";

export async function submitIncomeTest(request: IncomeTestRequest, publicHostname: string): Promise<IncomeTestSubmitResult> {
  // Private SDK credentials and release authority are mandatory in every environment.
  // There is no legacy API or in-memory fallback pretending to accept a CRM inquiry.
  if (!isCanonicalProjectPublicHost(publicHostname)) return { status: "error", reason: "unavailable" };
  try {
    return await acceptIncomeTest(request, {
      publicHostname,
      intake: projectFormClientFromEnvironment(),
    });
  } catch (error) {
    if (error instanceof AxiomRuntimeError) {
      if (error.status === 400) return { status: "error", reason: "invalid" };
      if (error.status === 409) return { status: "error", reason: "conflict" };
      if (error.status === 429) return { status: "error", reason: "rate-limited" };
    }
    return { status: "error", reason: "unavailable" };
  }
}
