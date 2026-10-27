import assert from "node:assert/strict";
import test from "node:test";

import { collectHostedCampaignHandle } from "../../lib/analytics/axiom-first-party.client.ts";

const handle = "abcdefghijklmnopqrstuvwxyz";

test("first-party events carry only one valid hosted campaign handle", () => {
  assert.equal(collectHostedCampaignHandle(new URL(`https://example.test/ziskat-prehled/?axiom_campaign=${handle}`)), handle);
  assert.equal(collectHostedCampaignHandle(new URL("https://example.test/ziskat-prehled/")), null);
  assert.equal(collectHostedCampaignHandle(new URL(`https://example.test/ziskat-prehled/?axiom_campaign=${handle}&axiom_campaign=${handle}`)), null);
  assert.equal(collectHostedCampaignHandle(new URL("https://example.test/ziskat-prehled/?axiom_campaign=../../other")), null);
});
