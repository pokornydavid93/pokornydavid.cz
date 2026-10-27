import assert from "node:assert/strict";
import { describe, it } from "node:test";

const {
  buildOverviewHref,
  buildSituationHref,
} = await import("../../lib/homepage/routing.ts");
const {
  createLeadHref,
  normalizePhone,
} = await import("../../lib/leads/lead-contract.ts");

describe("overview query contract", () => {
  it("keeps legacy homepage href builders stable", () => {
    assert.equal(
      buildOverviewHref({
        situation: "financovani",
        source: "home-situations",
      }),
      "/ziskat-prehled/?src=home-situations&situation=financovani",
    );
    assert.equal(
      buildSituationHref({
        path: "/refixace-hypoteky/",
        situation: "refixace",
        source: "home-situations",
      }),
      "/refixace-hypoteky/?src=home-situations&situation=refixace",
    );
  });

  it("emits the canonical intent, topic and source contract", () => {
    assert.equal(
      createLeadHref({
        cta: "service-mortgage",
        intent: "housing",
        source: "service-detail",
        topic: "mortgage",
      }),
      "/ziskat-prehled/?source=service-detail&intent=housing&topic=mortgage&cta=service-mortgage",
    );
  });

  it("keeps broad, specific, unsure and global CTA contexts distinct", () => {
    assert.equal(
      createLeadHref({
        cta: "services-hero",
        source: "services",
      }),
      "/ziskat-prehled/?source=services&cta=services-hero",
    );
    assert.equal(
      createLeadHref({
        cta: "unsure-priorities",
        intent: "unsure",
        source: "homepage",
      }),
      "/ziskat-prehled/?source=homepage&intent=unsure&cta=unsure-priorities",
    );
    assert.equal(
      createLeadHref({
        cta: "header-primary",
        source: "header",
      }),
      "/ziskat-prehled/?source=header&cta=header-primary",
    );
    assert.equal(
      createLeadHref({
        cta: "service-mortgage",
        intent: "protection",
        source: "service-detail",
        topic: "mortgage",
      }),
      "/ziskat-prehled/?source=service-detail&intent=protection&cta=service-mortgage",
    );
  });

  it("normalizes phone only at the payload boundary", () => {
    assert.equal(normalizePhone("+420 731 830 897"), "+420731830897");
    assert.equal(normalizePhone("731 830 897"), "731830897");
  });
});
