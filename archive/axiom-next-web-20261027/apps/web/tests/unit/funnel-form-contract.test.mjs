import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createIntegrationManifest,
  defineFormsCapabilityContract,
} from "@axiom/web-core/manifest";

test("the funnel-only SDK form contract matches the exact durable intake allowlist", async () => {
  const manifest = await createIntegrationManifest({
    content_delivery_mode: "none",
    capability_contracts: [
      defineFormsCapabilityContract([
        { form_id: "phone-first-consultation", route_path: "/ziskat-prehled" },
      ]),
    ],
  });
  const form = manifest.capability_contracts.find((contract) => contract.capability_id === "forms");
  assert.ok(form);
  assert.equal(form.item_count, 1);
  const intake = readFileSync(
    new URL("../../../../services/control-api/internal/projectformintake/service.go", import.meta.url),
    "utf8",
  );
  assert.ok(intake.includes(`FunnelFormsContractDigest = "${form.contract_digest}"`));
});
