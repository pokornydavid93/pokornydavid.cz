import assert from "node:assert/strict";
import test from "node:test";
import { isCanonicalProjectPublicHost } from "../../lib/leads/project-public-host.ts";

test("platform and custom domain syntax preserves the actual public hostname", () => {
  for (const hostname of ["p-7eaon7ah22pzd6ydy7iq.syllcode.com", "pokornydavid.cz", "www.pokornydavid.cz", "xn--mnich-kva.example"]) {
    assert.equal(isCanonicalProjectPublicHost(hostname), true, hostname);
  }
});

test("public host syntax rejects caller routing authority and ambiguous host representations", () => {
  for (const hostname of ["", "localhost", "127.0.0.1", "[::1]", "Pokornydavid.cz", "pokornydavid.cz:443",
    "pokornydavid.cz/evil", "https://pokornydavid.cz", "*.pokornydavid.cz", "pokornydavid.cz.", "pokornydavid..cz",
    "-site.example", "site-.example", " site.example", "site.example\n", "site.123", `${"a".repeat(64)}.cz`]) {
    assert.equal(isCanonicalProjectPublicHost(hostname), false, JSON.stringify(hostname));
  }
});
