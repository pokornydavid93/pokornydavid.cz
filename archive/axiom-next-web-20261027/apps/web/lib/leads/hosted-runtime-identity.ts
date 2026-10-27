export type HostedRuntimeKind = "project_release" | "repository_publication";

export type HostedRuntimeIdentity = Readonly<{
  kind: HostedRuntimeKind;
  releaseRef: string;
  releaseId: string;
  artifactDigest: string;
}>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const RELEASE_PREFIXES = {
  project_release: "axiom-release-ref://project-releases/",
  repository_publication: "axiom-release-ref://publication-releases/",
} as const;

/** Reads private deployment identity without inferring a runtime from its ref. */
export function hostedRuntimeIdentityFromEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): HostedRuntimeIdentity | null {
  const kind = environment.AXIOM_HOSTED_RUNTIME_KIND ?? "project_release";
  if (kind !== "project_release" && kind !== "repository_publication") return null;
  const releaseRef = environment.AXIOM_PROJECT_RELEASE_REF;
  const artifactDigest = environment.AXIOM_PROJECT_ARTIFACT_DIGEST;
  const prefix = RELEASE_PREFIXES[kind];
  if (!releaseRef?.startsWith(prefix) || !artifactDigest || !DIGEST_PATTERN.test(artifactDigest)) return null;
  const releaseId = releaseRef.slice(prefix.length);
  if (!UUID_PATTERN.test(releaseId)) return null;
  return Object.freeze({ kind, releaseRef, releaseId, artifactDigest });
}
