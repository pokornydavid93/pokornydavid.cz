import assert from "node:assert/strict";
import test from "node:test";

import { hostedRuntimeIdentityFromEnvironment } from "../../lib/leads/hosted-runtime-identity.ts";

const releaseId = "11111111-1111-4111-8111-111111111111";
const artifactDigest = `sha256:${"a".repeat(64)}`;
const projectRef = `axiom-release-ref://project-releases/${releaseId}`;
const publicationRef = `axiom-release-ref://publication-releases/${releaseId}`;
const environment = (releaseRef, kind) => ({
  AXIOM_PROJECT_RELEASE_REF: releaseRef,
  AXIOM_PROJECT_ARTIFACT_DIGEST: artifactDigest,
  ...(kind === undefined ? {} : { AXIOM_HOSTED_RUNTIME_KIND: kind }),
});

test("existing project identities stay compatible without explicit runtime kind", () => {
  const expected = { kind: "project_release", releaseRef: projectRef, releaseId, artifactDigest };
  assert.deepEqual(hostedRuntimeIdentityFromEnvironment(environment(projectRef)), expected);
  assert.deepEqual(hostedRuntimeIdentityFromEnvironment(environment(projectRef, "project_release")), expected);
});

test("repository identities require explicit supported kind and genuine publication release", () => {
  assert.deepEqual(hostedRuntimeIdentityFromEnvironment(environment(publicationRef, "repository_publication")), {
    kind: "repository_publication", releaseRef: publicationRef, releaseId, artifactDigest,
  });
  for (const value of [
    environment(publicationRef),
    environment(publicationRef, "project_release"),
    environment(projectRef, "repository_publication"),
    environment(publicationRef, "unknown"),
    environment(publicationRef, ""),
    environment(publicationRef, " repository_publication"),
  ]) assert.equal(hostedRuntimeIdentityFromEnvironment(value), null);
});

test("private identities reject malformed releases/digests without normalization", () => {
  for (const ref of [
    undefined, "", `${publicationRef}/extra`, `${publicationRef}?x=1`, `${publicationRef}\n`,
    publicationRef.toUpperCase(), "axiom-release-ref://publication-releases/not-a-uuid",
    "axiom-release-ref://publication-releases/00000000-0000-0000-0000-000000000000",
  ]) assert.equal(hostedRuntimeIdentityFromEnvironment(environment(ref, "repository_publication")), null);
  for (const digest of [undefined, "", "sha256:abc", artifactDigest.toUpperCase(), `${artifactDigest} `]) {
    assert.equal(hostedRuntimeIdentityFromEnvironment({
      ...environment(publicationRef, "repository_publication"), AXIOM_PROJECT_ARTIFACT_DIGEST: digest,
    }), null);
  }
});
