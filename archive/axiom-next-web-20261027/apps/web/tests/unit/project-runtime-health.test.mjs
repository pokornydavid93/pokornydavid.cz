import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { GET } from "../../app/healthz/route.ts";

const previousRelease = process.env.AXIOM_PROJECT_RELEASE_REF;
const previousArtifact = process.env.AXIOM_PROJECT_ARTIFACT_DIGEST;
const previousKind = process.env.AXIOM_HOSTED_RUNTIME_KIND;

afterEach(() => {
  if (previousRelease === undefined) delete process.env.AXIOM_PROJECT_RELEASE_REF;
  else process.env.AXIOM_PROJECT_RELEASE_REF = previousRelease;
  if (previousArtifact === undefined) delete process.env.AXIOM_PROJECT_ARTIFACT_DIGEST;
  else process.env.AXIOM_PROJECT_ARTIFACT_DIGEST = previousArtifact;
  if (previousKind === undefined) delete process.env.AXIOM_HOSTED_RUNTIME_KIND;
  else process.env.AXIOM_HOSTED_RUNTIME_KIND = previousKind;
});

test("health is bound to exact immutable release and artifact identities", async () => {
  delete process.env.AXIOM_HOSTED_RUNTIME_KIND;
  process.env.AXIOM_PROJECT_RELEASE_REF = "axiom-release-ref://project-releases/11111111-1111-4111-8111-111111111111";
  process.env.AXIOM_PROJECT_ARTIFACT_DIGEST = "sha256:" + "a".repeat(64);

  const response = GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
  assert.deepEqual(await response.json(), {
    schema_id: "professional_nextjs_runtime_health@1",
    schema_version: 1,
    health: "healthy",
    readiness: "ready",
    runtime_profile_id: "node-server",
    release_ref: process.env.AXIOM_PROJECT_RELEASE_REF,
    artifact_digest: process.env.AXIOM_PROJECT_ARTIFACT_DIGEST,
  });
});

test("health fails closed when target release identity is absent or malformed", async () => {
  delete process.env.AXIOM_HOSTED_RUNTIME_KIND;
  delete process.env.AXIOM_PROJECT_RELEASE_REF;
  process.env.AXIOM_PROJECT_ARTIFACT_DIGEST = "sha256:" + "b".repeat(64);
  let response = GET();
  assert.equal(response.status, 503);
  assert.equal((await response.json()).reason_code, "PROJECT_RELEASE_IDENTITY_UNAVAILABLE");

  process.env.AXIOM_PROJECT_RELEASE_REF = "https://example.invalid/release";
  response = GET();
  assert.equal(response.status, 503);
});

test("native publication health reports only an explicitly selected genuine publication identity", async () => {
  process.env.AXIOM_HOSTED_RUNTIME_KIND = "repository_publication";
  process.env.AXIOM_PROJECT_RELEASE_REF = "axiom-release-ref://publication-releases/11111111-1111-4111-8111-111111111111";
  process.env.AXIOM_PROJECT_ARTIFACT_DIGEST = `sha256:${"c".repeat(64)}`;
  const response = GET();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).release_ref, process.env.AXIOM_PROJECT_RELEASE_REF);
  delete process.env.AXIOM_HOSTED_RUNTIME_KIND;
  assert.equal(GET().status, 503, "a publication ref never implicitly switches hosting class");
  process.env.AXIOM_HOSTED_RUNTIME_KIND = "repository_publication";
  process.env.AXIOM_PROJECT_RELEASE_REF = "axiom-release-ref://project-releases/11111111-1111-4111-8111-111111111111";
  assert.equal(GET().status, 503);
  process.env.AXIOM_HOSTED_RUNTIME_KIND = "other";
  assert.equal(GET().status, 503);
});
