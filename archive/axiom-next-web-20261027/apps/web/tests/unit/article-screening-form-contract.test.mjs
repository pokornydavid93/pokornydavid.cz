import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createIntegrationManifest, defineFormsCapabilityContract } from "@axiom/web-core/manifest";

test("the website admits the exact shared article screening form without broadening the funnel contract", async () => {
  const manifest = await createIntegrationManifest({
    content_delivery_mode: "none",
    capability_contracts: [defineFormsCapabilityContract([
      { form_id: "phone-first-consultation", route_path: "/ziskat-prehled" },
      { form_id: "article-screening", route_prefix: "/clanky" },
    ])],
  });
  const forms = manifest.capability_contracts.find(({ capability_id }) => capability_id === "forms");
  assert.ok(forms);
  assert.equal(forms.item_count, 2);
  const backend = readFileSync(new URL("../../../../services/control-api/internal/projectformintake/service.go", import.meta.url), "utf8");
  const websiteDigest = backend.match(/FormsContractDigest\s*=\s*"([^"]+)"/u)?.[1];
  assert.equal(forms.contract_digest, websiteDigest);
});
