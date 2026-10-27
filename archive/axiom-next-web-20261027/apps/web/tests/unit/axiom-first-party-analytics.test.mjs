import assert from "node:assert/strict";
import { describe, it } from "node:test";

const {
  collectAxiomAttribution,
  mapAnalyticsEventToAxiomType,
} = await import("../../lib/analytics/axiom-first-party.client.ts");
const { sanitizeLeadValidationFieldIds } = await import("../../lib/analytics/events.ts");

describe("Axiom first-party analytics contract", () => {
  it("maps visitor actions into the publisher event vocabulary", () => {
    assert.equal(
      mapAnalyticsEventToAxiomType({
        name: "home_primary_cta_click",
        placement: "hero",
      }),
      "cta_clicked",
    );
    assert.equal(
      mapAnalyticsEventToAxiomType({
        name: "lead_form_view",
        source: "homepage",
      }),
      "lead_form_started",
    );
    assert.equal(
      mapAnalyticsEventToAxiomType({
        name: "lead_submit_success",
        source: "homepage",
        intent: "unsure",
      }),
      "lead_form_submitted",
    );
    assert.equal(
      mapAnalyticsEventToAxiomType({
        name: "booking_complete",
        source: "thank-you",
      }),
      "custom",
    );
  });

  it("keeps intermediate form signals separate from accepted leads", () => {
    const base = { source: "homepage", intent: "housing" };
    for (const name of [
      "lead_contact_step_view",
      "lead_submit_attempt",
      "lead_validation_error",
    ]) {
      assert.equal(
        mapAnalyticsEventToAxiomType({ name, ...base, fieldIds: ["phone"] }),
        "custom",
      );
    }
    assert.equal(
      mapAnalyticsEventToAxiomType({ name: "lead_submit_success", ...base }),
      "lead_form_submitted",
    );
  });

  it("keeps only approved field identifiers in validation events", () => {
    assert.deepEqual(
      sanitizeLeadValidationFieldIds([
        "phone",
        "private@example.com",
        "phone",
        "situationNote",
      ]),
      ["phone", "situationNote"],
    );
    assert.deepEqual(sanitizeLeadValidationFieldIds(["731 000 000"]), []);
  });

  it("keeps only explicit campaign attribution keys", () => {
    const url = new URL(
      "https://example.test/?utm_source=meta&utm_campaign=beta&fbclid=fb-1&gclid=g-1&email=private%40example.test",
    );

    assert.deepEqual(collectAxiomAttribution(url), {
      utm: {
        utm_source: "meta",
        utm_campaign: "beta",
      },
    });
  });

  it("omits blank or unrelated query parameters", () => {
    assert.deepEqual(
      collectAxiomAttribution(
        new URL("https://example.test/?utm_source=%20%20&phone=731830897"),
      ),
      {},
    );
  });
});
