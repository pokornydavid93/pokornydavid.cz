# Homepage implementation audit

Date: 2026-07-14

## Route and canonical decisions

- Homepage: `/`
- Overview flow: `/ziskat-prehled/`
- Confirmation: `/ziskat-prehled/dekujeme/`
- Services: `/sluzby/`
- Process: `/jak-pracuji/`
- References: `/reference/`
- Profile: `/kdo-jsem/`
- Articles: `/clanky/`
- Privacy: `/zasady-zpracovani-osobnich-udaju/`
- Cookies: `/cookies-a-mereni/`
- `overviewIndexable`: `false` until the route has approved standalone content.

## Canonical contracts available

The repository already contains `HomeTemplate`, `ConversionTemplate`, the layout primitives, the three surface-tone contracts, shell components, domain components, form controls and all patterns required by the homepage blueprint. No homepage-only public runtime component is justified.

## Verified repository facts used

- Public name and contact details already published in legal/contact routes.
- Existing role wording: vázaný zástupce společnosti SAB servis s.r.o.
- Existing direct JERRS record URL last verified by repository content on 2026-05-06; review required by 2026-08-06.
- Existing authentic portrait asset: `/who.png`, 1254 x 1254.

No years-of-practice, client-count, case-study or testimonial claim is approved for the homepage.

## Unresolved launch blockers

1. `OverviewOfferContract` has no approved deliverable, delivery moment, format, owner or price disclosure.
2. Homepage remuneration copy has no compliance approval record.
3. The conflict between `5+` and `10+` years remains unresolved; neither value may be published.
4. The legal role map for site operator, controller, regulated provider, processor and represented entity needs explicit sign-off.
5. Collection notice and retention need DPO/legal sign-off against the implemented fields.
6. No production `LeadSink`, atomic idempotency/rate-limit store or receipt store is configured.
7. No lead/calendar/video provider DPA, transfer and retention record is available.
8. No consented case study or testimonial evidence is available.
9. The existing global root shell still carries legacy providers and client JavaScript; route-level performance must be measured after implementation.

## Baseline

- `pnpm --filter @axiom-dp/web build`: passed before homepage changes.
- Next.js 16.0.7, 83 generated routes, baseline compile 34.1 s.
- Homepage baseline output: static.
- Client JavaScript gate: route-specific post-change delta must stay at or below 20 KiB gzip. Shared legacy shell cost is tracked separately and must not increase.

The implementation may be structurally complete while these blockers remain. It must not be described as launch-ready until `pnpm homepage:validate:release` passes with approved records and production integrations.

## Implemented route map

| Route / module | Canonical contract |
| --- | --- |
| `/` | `HomeTemplate` |
| Hero | `Hero` + `Cluster` |
| Situations | `SectionIntro` + `Grid` + semantic links |
| Outcome | `SectionIntro` + `Switcher` |
| Process and fees | `ProcessAndFees` |
| Evidence | `TrustBlock` + `ProofItem` |
| Profile | `SplitNarrative` + `ProfileCard` |
| FAQ | `FAQSection` |
| Final action | `ActionBand` |
| `/ziskat-prehled/` | `ConversionTemplate` + `FormContactSplit` + internal Field contracts |
| `/ziskat-prehled/dekujeme/` | guarded `ConversionTemplate` completion state + optional blocked `BookingPanel` |

The composition route-source registry now describes these exact modules. Removed legacy homepage video, carousel, testimonial, service and embedded lead-form declarations are no longer reported as current route evidence.

## Form and receipt behavior

- Server validation normalizes a closed situation/source allowlist and rejects invalid idempotency keys and the honeypot.
- The request collects only situation, optional name, e-mail and/or phone, preferred channel when needed, and the requested next step.
- Form values never enter the URL, analytics payload or public logs.
- A confirmed sink write is separated from receipt creation. Any uncertainty after sink acceptance keeps the idempotency lock and cannot create an automatic duplicate retry.
- The opaque receipt is stored in an `HttpOnly`, `SameSite=Lax`, short-lived cookie.
- Direct or expired thank-you visits redirect to `/ziskat-prehled/`.
- A refreshed valid receipt remains truthful without submitting another lead.
- `choose-date` produces a booking-pending state; no calendar iframe or confirmed appointment exists without an approved provider path.
- Development and test use an in-memory adapter that discards payloads and emits no payload logs. Production fails closed until approved shared stores and a production `LeadSink` are configured.

## Verification on 2026-07-14

- `pnpm typecheck`: pass.
- Targeted ESLint for homepage, flow, analytics, shell and tests: pass.
- `pnpm design:audit`: pass, 0 findings.
- `pnpm design:surfaces`: pass, all tone-family contracts validated.
- `pnpm design:components`: pass, 42 runtime contracts.
- `pnpm design:compositions`: pass, 19/19 route manifests and 0 unmapped sections.
- `pnpm homepage:validate`: structural pass, launch blocked.
- `pnpm homepage:validate:release`: expected fail on the explicit approval/integration blockers above.
- Targeted Playwright: 10/10 pass in Chromium.
- E2E coverage includes 320/375/768/1024/1440 reflow, module order, keyboard menu and FAQ, forced colors, no-JS header and submit, ErrorSummary focus/links, server confirmation, refresh, direct thank-you guard, booking pending, and pre-consent network isolation.
- Axe WCAG 2 A/AA and 2.1 A/AA tags: 0 violations on the tested homepage and invalid form states.
- Production build: pass; final Next.js 16.0.7 build compiled in 15.9 s and generated 83 routes.

## Production lab diagnostic

Measured against `next start` on localhost without CPU or network throttling. These numbers are repeatable lab diagnostics, not field CWV evidence.

| Viewport | LCP | CLS | Horizontal overflow |
| --- | ---: | ---: | ---: |
| 320 x 900 | 340 ms | 0 | 0 px |
| 768 x 900 | 304 ms | 0 | 0 px |
| 1440 x 900 | 280 ms | 0 | 0 px |

- Initial HTML encoded body: about 20.0 KiB.
- Homepage-only client chunk above the shared layout: 7,218 bytes gzip, below the 20 KiB route-specific budget.
- Total initial JavaScript network transfer: about 266 KiB across 20 requests. Most is inherited from global providers in `app/layout.tsx`; this remains a separate performance debt and must not be represented as homepage-only cost.
- No page/console errors were observed.
- Responsive screenshots were inspected at 320, 768 and 1440 CSS px after lazy media activation; all media dimensions remained reserved and the profile image loaded at its intrinsic 1254 x 1254 source size.

## Privacy, network and SEO result

- No third-party request occurred before analytics consent in the tested homepage-to-flow navigation.
- Analytics events use a typed allowlist and exclude contact values. Financial intent is disabled as a dimension unless the explicit approval environment flag is present.
- Success analytics is available only after a valid receipt and atomic analytics claim.
- `/` has canonical metadata, one server-rendered `h1`, and visible key copy in initial HTML.
- Structured data is limited to visible `WebPage`, `Person` and `WebSite` facts. The previous unsupported `FinancialService` / `LocalBusiness` graph entries were removed.
- Both overview routes are `noindex`; the thank-you route is guarded and absent from the sitemap.
- `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff` and a 64 KiB Server Action body limit are configured.
- A production CSP has not been introduced because the inherited global shell still requires a nonce-compatible rollout. This remains a security hardening item, not a reason to claim launch readiness.

## Remaining release work

The code and repeatable technical gates are implemented. Launch readiness still requires approved offer/remuneration copy and ownership metadata, the production lead/receipt/idempotency/rate-limit infrastructure, DPO/legal role and retention sign-off, resolution of the years-of-practice conflict, and any consented testimonial/case evidence. Manual screen-reader review, throttled performance testing, field CWV monitoring and CSP rollout also remain pre-launch operational gates.
