import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Execute the real server action, replacing only its framework/provider imports.
// No Next server, receipt persistence, analytics provider or external call is used.
const directory = mkdtempSync(path.join(tmpdir(), "overview-analytics-claim-"));
const sourcePath = new URL("../../app/ziskat-prehled/dekujeme/analytics-actions.ts", import.meta.url);
const stub = path.join(directory, "dependencies.mjs");
writeFileSync(stub, `
  const fixture = () => globalThis.__overviewAnalyticsClaimTest;
  export async function cookies() { fixture().calls.cookies++; return fixture().cookieStore; }
  export async function getWebPrivacyConfiguration() { fixture().calls.configuration++; return fixture().configuration; }
  export function getOverviewRuntime() { fixture().calls.runtime++; return { receipts: fixture().receipts }; }
  export function isProductionProviderUnavailable(error) { return error.message === 'provider-unavailable'; }
`);
const stubs = new Set(["next/headers", "../../../lib/privacy/webPrivacyRuntime.server", "../../../lib/leads/runtime.server"]);
const imports = (context) => (source) => ts.visitNode(source, function visit(node) {
  if (ts.isImportDeclaration(node)) {
    const specifier = node.moduleSpecifier.text;
    const target = stubs.has(specifier)
      ? pathToFileURL(stub).href
      : new URL(`${specifier}.ts`, sourcePath).href;
    return ts.factory.updateImportDeclaration(node, node.modifiers, node.importClause, ts.factory.createStringLiteral(target), node.attributes);
  }
  return ts.visitEachChild(node, visit, context);
});
const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  transformers: { before: [imports] },
}).outputText;
const actionPath = path.join(directory, "action.mjs");
writeFileSync(actionPath, compiled);
const { claimOverviewSuccessAnalytics } = await import(pathToFileURL(actionPath));
after(() => { delete globalThis.__overviewAnalyticsClaimTest; rmSync(directory, { recursive: true, force: true }); });

let fixture;
const currentConsent = () => ({
  choice: "accepted", version: fixture.configuration.consent_policy_version,
  decidedAt: Date.now() - 1000, expiresAt: Date.now() + 60_000,
});
beforeEach(() => {
  fixture = {
    configuration: { analytics_mode: "disabled", consent_policy_version: "current-notice", consent_grant_ttl_days: 365 },
    calls: { configuration: 0, cookies: 0, runtime: 0, read: 0, claim: 0 },
    values: new Map([["overview_receipt_v1", "test-receipt"]]),
    writes: [],
    cookieStore: {
      get(name) { const value = fixture.values.get(name); return value ? { value } : undefined; },
      set(...args) { fixture.writes.push(args); },
    },
    receipts: {
      async read(id) { fixture.calls.read++; assert.equal(id, "test-receipt"); return { intent: "overview", source: { context: "direct" } }; },
      async claimAnalytics(id, previous) {
        fixture.calls.claim++; assert.equal(id, "test-receipt");
        return previous ? { status: "already-claimed" } : { status: "claimed", marker: { value: "test-marker", maxAge: 900 } };
      },
    },
  };
  globalThis.__overviewAnalyticsClaimTest = fixture;
});

describe("thank-you analytics claim policy boundary", () => {
  it("does not read receipts, claim success or write a cookie in disabled mode, even with accepted consent", async () => {
    assert.deepEqual(await claimOverviewSuccessAnalytics(currentConsent()), { status: "disabled" });
    assert.deepEqual(fixture.calls, { configuration: 1, cookies: 0, runtime: 0, read: 0, claim: 0 });
    assert.deepEqual(fixture.writes, []);
  });

  it("requires an accepted unexpired assertion for the current policy before touching receipts", async () => {
    fixture.configuration.analytics_mode = "ga4_only";
    const now = Date.now();
    for (const consent of [
      null, "accepted", {},
      { ...currentConsent(), choice: "rejected" },
      { ...currentConsent(), version: "previous-notice" },
      { ...currentConsent(), expiresAt: now - 1 },
      { ...currentConsent(), decidedAt: now + 60_000 },
      { ...currentConsent(), expiresAt: now + 366 * 86_400_000 },
      { ...currentConsent(), decidedAt: NaN },
    ]) assert.deepEqual(await claimOverviewSuccessAnalytics(consent), { status: "consent-required" });
    assert.equal(fixture.calls.cookies, 0);
    assert.equal(fixture.calls.runtime, 0);
    assert.equal(fixture.calls.claim, 0);
    assert.deepEqual(fixture.writes, []);
  });

  it("claims only a valid receipt with enabled measurement and current consent", async () => {
    fixture.configuration.analytics_mode = "ga4_only";
    assert.deepEqual(await claimOverviewSuccessAnalytics(currentConsent()), { status: "claimed", source: "direct", intent: "overview" });
    assert.equal(fixture.calls.claim, 1);
    assert.equal(fixture.writes.length, 1);
    assert.deepEqual(fixture.writes[0], ["overview_analytics_claim_v1", "test-marker", {
      httpOnly: true, maxAge: 900, path: "/ziskat-prehled", sameSite: "lax", secure: process.env.NODE_ENV === "production",
    }]);
    fixture.values.set("overview_analytics_claim_v1", "test-marker");
    assert.deepEqual(await claimOverviewSuccessAnalytics(currentConsent()), { status: "already-claimed" });
    assert.equal(fixture.writes.length, 1);
  });

  it("does not claim a missing or unavailable receipt", async () => {
    fixture.configuration.analytics_mode = "axiom_only";
    fixture.values.clear();
    assert.deepEqual(await claimOverviewSuccessAnalytics(currentConsent()), { status: "missing" });
    assert.equal(fixture.calls.runtime, 0);
    fixture.values.set("overview_receipt_v1", "test-receipt");
    fixture.receipts.read = async () => { throw new Error("provider-unavailable"); };
    assert.deepEqual(await claimOverviewSuccessAnalytics(currentConsent()), { status: "missing" });
    assert.equal(fixture.calls.claim, 0);
    assert.deepEqual(fixture.writes, []);
  });
});
