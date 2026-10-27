import { hostedRuntimeIdentityFromEnvironment } from "../../lib/leads/hosted-runtime-identity.ts";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
} as const;

export function GET() {
  const identity = hostedRuntimeIdentityFromEnvironment(process.env);

  return Response.json(
    identity
      ? {
          schema_id: "professional_nextjs_runtime_health@1",
          schema_version: 1,
          health: "healthy",
          readiness: "ready",
          runtime_profile_id: "node-server",
          release_ref: identity.releaseRef,
          artifact_digest: identity.artifactDigest,
        }
      : {
          schema_id: "professional_nextjs_runtime_health@1",
          schema_version: 1,
          health: "degraded",
          readiness: "not_ready",
          runtime_profile_id: "node-server",
          reason_code: "PROJECT_RELEASE_IDENTITY_UNAVAILABLE",
        },
    {
      status: identity ? 200 : 503,
      headers: noStoreHeaders,
    },
  );
}
