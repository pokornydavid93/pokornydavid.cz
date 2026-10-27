import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  OFFERING_CATALOG_ORIGIN_ENV,
  OFFERING_CATALOG_RUNTIME_MODE_ENV,
  OFFERING_CATALOG_TIMEOUT_ENV,
  OFFERING_CATALOG_WORKSPACE_ID_ENV,
  OFFERING_PUBLIC_CATALOG_ORIGIN_ENV,
  OFFERING_PUBLIC_CATALOG_RUNTIME_MODE_ENV,
  OFFERING_PUBLIC_CATALOG_WORKSPACE_ID_ENV,
  OfferingCatalogRuntimeError,
  createControlApiOfferingRuntimeProvider,
  parseOfferingCatalogProductionConfig,
  projectAxiomOfferingContent,
  resolveOfferingCatalogRuntimeMode,
} from "../../lib/services/offering-runtime-core.ts";
import {
  ServicePresentationIntegrityError,
  assertRepositoryServiceCatalogV1,
} from "../../lib/services/service-presentation-contract.ts";

const workspaceId = "11111111-1111-4111-8111-111111111111";

function offering(overrides = {}) {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    key: "financni-plan",
    name: "Axiom finanční plán",
    description: "Autoritativní popis z Axiom katalogu.",
    kind: "service",
    status: "active",
    version: 2,
    created_at: "2026-09-03T10:00:00Z",
    updated_at: "2026-09-03T11:00:00Z",
    ...overrides,
  };
}

function envelope(items = [offering()], overrides = {}) {
  return {
    schema_version: 1,
    workspace_id: workspaceId,
    items,
    ...overrides,
  };
}

function jsonResponse(value, init = {}) {
  return new Response(JSON.stringify(value), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers ?? {}),
    },
  });
}

function expectRuntimeError(code) {
  return (error) =>
    error instanceof OfferingCatalogRuntimeError && error.code === code;
}

test("runtime mode defaults safely and rejects repository mode in production", () => {
  assert.equal(resolveOfferingCatalogRuntimeMode({ NODE_ENV: "development" }), "repository");
  assert.equal(resolveOfferingCatalogRuntimeMode({ NODE_ENV: "test" }), "repository");
  assert.equal(resolveOfferingCatalogRuntimeMode({ NODE_ENV: "production" }), "control-api");
  assert.equal(
    resolveOfferingCatalogRuntimeMode({
      NODE_ENV: "development",
      [OFFERING_CATALOG_RUNTIME_MODE_ENV]: "control-api",
    }),
    "control-api",
  );
  assert.throws(
    () =>
      resolveOfferingCatalogRuntimeMode({
        NODE_ENV: "production",
        [OFFERING_CATALOG_RUNTIME_MODE_ENV]: "repository",
    }),
    expectRuntimeError("invalid_configuration"),
  );
  for (const environment of [
    {
      NODE_ENV: "development",
      [OFFERING_CATALOG_ORIGIN_ENV]: "https://control.example.test",
    },
    {
      NODE_ENV: "development",
      [OFFERING_CATALOG_RUNTIME_MODE_ENV]: "repository",
      [OFFERING_CATALOG_WORKSPACE_ID_ENV]: workspaceId,
    },
  ]) {
    assert.throws(
      () => resolveOfferingCatalogRuntimeMode(environment),
      expectRuntimeError("invalid_configuration"),
    );
  }
  assert.throws(
    () =>
      resolveOfferingCatalogRuntimeMode({
        NODE_ENV: "development",
        [OFFERING_CATALOG_RUNTIME_MODE_ENV]: " repository",
      }),
    expectRuntimeError("invalid_configuration"),
  );
});

test("production config accepts HTTPS and bounded loopback development origins only", () => {
  const config = parseOfferingCatalogProductionConfig({
    [OFFERING_CATALOG_ORIGIN_ENV]: "https://control.example.test/",
    [OFFERING_CATALOG_WORKSPACE_ID_ENV]: workspaceId,
    [OFFERING_CATALOG_TIMEOUT_ENV]: "2500",
  });

  assert.deepEqual(config, {
    origin: "https://control.example.test",
    workspaceId,
    endpointUrl: `https://control.example.test/public/catalog/workspaces/${workspaceId}/offerings`,
    timeoutMs: 2500,
  });
  assert.doesNotThrow(() =>
    parseOfferingCatalogProductionConfig({
      [OFFERING_CATALOG_ORIGIN_ENV]: "http://127.0.0.1:8080",
      [OFFERING_CATALOG_WORKSPACE_ID_ENV]: workspaceId,
    }),
  );
  for (const origin of [
    "http://control.example.test",
    "https://user@control.example.test",
    "https://control.example.test/base",
  ]) {
    assert.throws(
      () =>
        parseOfferingCatalogProductionConfig({
          [OFFERING_CATALOG_ORIGIN_ENV]: origin,
          [OFFERING_CATALOG_WORKSPACE_ID_ENV]: workspaceId,
        }),
      expectRuntimeError("invalid_configuration"),
    );
  }
});

test("non-secret Project runtime aliases are accepted and conflicts fail closed", () => {
  assert.equal(
    resolveOfferingCatalogRuntimeMode({
      NODE_ENV: "production",
      [OFFERING_PUBLIC_CATALOG_RUNTIME_MODE_ENV]: "control-api",
    }),
    "control-api",
  );
  assert.deepEqual(
    parseOfferingCatalogProductionConfig({
      [OFFERING_PUBLIC_CATALOG_ORIGIN_ENV]: "https://control.example.test",
      [OFFERING_PUBLIC_CATALOG_WORKSPACE_ID_ENV]: workspaceId,
    }),
    {
      origin: "https://control.example.test",
      workspaceId,
      endpointUrl: `https://control.example.test/public/catalog/workspaces/${workspaceId}/offerings`,
      timeoutMs: 3000,
    },
  );
  assert.throws(
    () =>
      parseOfferingCatalogProductionConfig({
        [OFFERING_CATALOG_ORIGIN_ENV]: "https://control.example.test",
        [OFFERING_PUBLIC_CATALOG_ORIGIN_ENV]: "https://other.example.test",
        [OFFERING_CATALOG_WORKSPACE_ID_ENV]: workspaceId,
      }),
    expectRuntimeError("invalid_configuration"),
  );
});

test("HTTP provider performs an anonymous bounded GET and validates the shared active wire", async () => {
  const config = parseOfferingCatalogProductionConfig({
    [OFFERING_CATALOG_ORIGIN_ENV]: "https://control.example.test",
    [OFFERING_CATALOG_WORKSPACE_ID_ENV]: workspaceId,
  });
  const calls = [];
  const provider = createControlApiOfferingRuntimeProvider(
    config,
    async (url, init) => {
      calls.push({ url, init });
      return jsonResponse(envelope());
    },
  );

  const result = await provider.listActiveOfferings();

  assert.equal(result.length, 1);
  assert.equal(result[0].name, "Axiom finanční plán");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, config.endpointUrl);
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(calls[0].init.credentials, "omit");
  assert.equal(calls[0].init.redirect, "error");
  assert.deepEqual(calls[0].init.headers, { Accept: "application/json" });
});

test("HTTP provider fails closed for a mismatched or non-exact catalog response", async () => {
  const config = parseOfferingCatalogProductionConfig({
    [OFFERING_CATALOG_ORIGIN_ENV]: "https://control.example.test",
    [OFFERING_CATALOG_WORKSPACE_ID_ENV]: workspaceId,
  });

  for (const responseBody of [
    envelope([offering({ status: "archived" })]),
    envelope(undefined, {
      workspace_id: "33333333-3333-4333-8333-333333333333",
    }),
    { ...envelope(), unexpected: true },
  ]) {
    const provider = createControlApiOfferingRuntimeProvider(
      config,
      async () => jsonResponse(responseBody),
    );
    await assert.rejects(
      () => provider.listActiveOfferings(),
      expectRuntimeError("invalid_response"),
    );
  }
});

test("Axiom projection changes only mapped copy, requires every repository key, and permits additional catalog entries", () => {
  const repositoryItems = [
    {
      offeringKey: "financni-plan",
      title: "Repository title",
      description: "Repository description",
      slug: "financni-plan",
      presentationMarker: "local",
    },
  ];

  const projected = projectAxiomOfferingContent(repositoryItems, [offering()]);

  assert.deepEqual(projected, [
    {
      offeringKey: "financni-plan",
      title: "Axiom finanční plán",
      description: "Autoritativní popis z Axiom katalogu.",
      slug: "financni-plan",
      presentationMarker: "local",
    },
  ]);
  assert.throws(
    () => projectAxiomOfferingContent(repositoryItems, []),
    expectRuntimeError("incomplete_catalog"),
  );
  assert.throws(
    () =>
      projectAxiomOfferingContent(repositoryItems, [
        offering({ description: null }),
      ]),
    expectRuntimeError("incomplete_catalog"),
  );
  assert.deepEqual(
    projectAxiomOfferingContent(repositoryItems, [
      offering(),
      offering({
        id: "33333333-3333-4333-8333-333333333333",
        key: "dashboard-only-service",
        name: "Dashboard only",
        description: "Samostatná nabídka bez prezentačního bloku této stránky.",
      }),
    ]),
    projected,
  );
});

test("repository bootstrap has nine strict, unique presentation entries", async () => {
  const source = JSON.parse(
    await readFile(
      new URL("../../content/axiom/services.v1.json", import.meta.url),
      "utf8",
    ),
  );
  const catalog = assertRepositoryServiceCatalogV1(source);

  assert.equal(catalog.items.length, 9);
  assert.equal(new Set(catalog.items.map((item) => item.key)).size, 9);
  assert.ok(catalog.items.every((item) => item.presentation.tags.length === 3));

  const invalidSource = structuredClone(source);
  invalidSource.items[0].presentation.unexpected = true;
  assert.throws(
    () => assertRepositoryServiceCatalogV1(invalidSource),
    ServicePresentationIntegrityError,
  );
});

test("environment reads remain behind an explicit server-only module", async () => {
  const source = await readFile(
    new URL("../../lib/services/offering-runtime.server.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /^import "server-only";/u);
  assert.match(source, /resolveOfferingCatalogRuntimeMode\(process\.env\)/u);
  assert.doesNotMatch(source, /catch\s*\([^)]*\)\s*\{[^}]*repository/isu);
});
