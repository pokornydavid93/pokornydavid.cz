import assert from "node:assert/strict";
import test from "node:test";

import {
  isFunnelRuntimePath,
  knownMainSiteHref,
  mainSiteHref,
  routeForSiteMode,
  siteMode,
} from "../../lib/site-mode-routes.ts";

test("the existing full web remains unchanged", () => {
  assert.equal(siteMode("full"), "full");
  assert.equal(routeForSiteMode("full", "/"), "allow");
  assert.equal(routeForSiteMode("full", "/refixace-hypoteky/"), "allow");
});

test("missing or malformed mode cannot silently expose the entire web", () => {
  for (const mode of [undefined, "", "funnel", "FULL"]) {
    assert.equal(siteMode(mode), "invalid");
    assert.equal(routeForSiteMode(siteMode(mode), "/"), "not-found");
    assert.equal(routeForSiteMode(siteMode(mode), "/ziskat-prehled/"), "not-found");
  }
});

test("a funnel build exposes only funnel and required privacy routes", () => {
  assert.equal(siteMode("funnels"), "funnels");
  for (const path of [
    "/ziskat-prehled/",
    "/ziskat-prehled/dekujeme/",
    "/zasady-zpracovani-osobnich-udaju/",
    "/cookies-a-mereni/",
    "/noise.avif",
    "/david-profile-cutout.webp",
    "/hero-silk-frame-zero.avif",
    "/hero-silk-home-frame-zero.avif",
  ]) {
    assert.equal(routeForSiteMode("funnels", path), "allow", path);
  }
  for (const path of ["/", "/clanky/", "/sluzby/", "/refixace-hypoteky/", "/robots.txt", "/sitemap.xml", "/refixace-hypoteky-spoof/", "//refixace-hypoteky/"]) {
    assert.equal(routeForSiteMode("funnels", path), "not-found", path);
  }
  assert.equal(isFunnelRuntimePath("/refixace-hypoteky-spoof"), false);
});

test("funnel links leave the fallback host while website links remain local", () => {
  assert.equal(mainSiteHref("/reference/", "full", undefined), "/reference/");
  assert.equal(
    mainSiteHref("/reference/", "funnels", "https://pokornydavid.cz"),
    "https://pokornydavid.cz/reference/",
  );
  assert.throws(() => mainSiteHref("/", "funnels", undefined));
  assert.throws(() => mainSiteHref("/", "funnels", "javascript:alert(1)"));
  assert.throws(() => mainSiteHref("//example.com", "funnels", "https://pokornydavid.cz"));
  assert.equal(knownMainSiteHref("/", "funnels", undefined), null);
  assert.equal(knownMainSiteHref("/", "funnels", "http://unverified.example"), null);
  assert.equal(knownMainSiteHref("/", "full", undefined), "/");
});
