# Repository Publication runtime identity

A standalone repository-backed web selects its form authority explicitly with
`AXIOM_HOSTED_RUNTIME_KIND=repository_publication`. The server requires:

- `AXIOM_PROJECT_RELEASE_REF=axiom-release-ref://publication-releases/<release UUID>`
- `AXIOM_PROJECT_ARTIFACT_DIGEST=sha256:<64 lowercase hex characters>`
- `AXIOM_PUBLIC_ARTICLE_RUNTIME_ORIGIN`: canonical control-API origin
- `AXIOM_PUBLIC_ARTICLE_RUNTIME_WORKSPACE_ID`: publication workspace UUID

The environment variable names for release and digest remain compatible with
existing deployment tooling. The ref identifies a genuine canonical Publication
release, and the digest must match the artifact configured by the API operator.
These values are server-only; a browser form cannot supply its own workspace,
release or digest. The API also verifies the configured Publication, its current
published release, and the exact verified hostname with ready website/TLS bindings.

Overview and article screening use the same bounded, uncached canonical intake
and receipt API. Acceptance retains the encrypted CRM and transactional email
workflow. `/healthz` reports the selected immutable identity; application health
alone does not prove an accepted form or email delivery. Refixation is a separate
adapter and must be qualified independently.

With no explicit kind, project hosting retains the
`axiom-release-ref://project-releases/<release UUID>` contract. Unknown kinds,
cross-kind refs, absent identities and malformed digests fail closed.
