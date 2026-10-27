# Performance / Core Web Vitals source audit — 2026-10-08

Scope: `/mnt/projekty/Projekty/Axiom/apps/web`. Source-first audit, preserving the approved DM Sans typography, intro, animations, custom cursor, conversion flows, consent and analytics. Repository `AGENTS.md`, app `AGENTS.md`, repository `react-best-practices` skill, and the installed Next.js 16.3.4 lazy-loading/image/font documentation were read. No new deployment mechanism or image optimizer was introduced.

## Confirmed issues and implemented changes

1. **Oversized review portraits were transferred directly.** `next.config.ts` deliberately sets `images.unoptimized: true` because the standalone host lacks the optimizer/sharp runtime. As a result, the three portrait sources in `app/content/testimonials.ts` were original 1000–1536px-wide JPEGs even when `CinematicHomeHero.tsx` uses `sizes="36px"` and `HomeReferencesNavigator.client.tsx` uses `sizes="52px"`. `sizes` by itself does not create responsive derivatives under `unoptimized`.
   - Added three 256px-wide WebP avatar derivatives, preserving the full original framing/aspect and existing CSS object-position. Quality 90; generated with the available ffmpeg/libwebp. Originals were retained and SHA-256 checked before and after conversion.
   - Updated the existing shared testimonial data source, covering both hero and reference carousel without duplicating component code.
   - Exact source bytes: 476,576 + 90,001 + 182,337 = **748,914**. Derivative bytes: 15,706 + 15,810 + 12,646 = **44,162**. Reduction: **704,752 bytes (94.1%; ~688 KiB)** for the same three portraits. This is an asset-byte comparison, not a claimed field LCP improvement.
   - Source hashes and sizes: `avatar-optimization.json` in this artifact directory.
2. **The closed legacy lead modal loaded its form JavaScript globally.** `RootLayout` wraps every route in `LeadFormModalProvider`, which statically imported `LeadFormCard` and therefore `LeadFormCardClient.client.tsx` (34,281 bytes of source plus dependencies), despite initial `isOpen=false`.
   - Converted only the form import to `next/dynamic`. The existing conditional mount and provider API remain intact. No form field, validation, submission, tracking, scroll lock or close handling changed.
   - This removes the form implementation from the persistent provider's eager dependency graph; production chunk/network checks are still needed for an exact emitted-byte claim. Source bytes must not be presented as minified/transferred savings.
3. **Only the Latin font subset was preloaded on a Czech site.** `DM_Sans({ subsets: ["latin"] })` left the Czech Latin Extended glyph resource to discovery through CSS.
   - Coordinated with metadata owner, who changed the existing layout declaration to `subsets: ["latin", "latin-ext"]`. The family, variable, weights, fallback adjustment and `display: "swap"` are preserved.
   - Verify two font preload resources and rendered Czech text after the production build.

## Existing implementation that is already sound

- Homepage and article content originate in Server Components / server rendering; WebGL only decorates existing semantic DOM. Converting entire pages to clients or hiding text in canvas is unnecessary.
- Homepage article and service requests run through `Promise.all`. Published articles and offerings use `unstable_cache` with 60-second freshness and `React.cache` deduplication. Privacy configuration uses a 60-second cache, a 3.5-second upstream timeout and a safe tracking-disabled fallback. No reason to alter these caching contracts in this SEO task.
- Article archive passes a projection of metadata/search fields to `ArticlesHub`, rather than full article bodies.
- Hero portrait/interior assets are already small AVIFs (roughly 28KiB + 76KiB), have eager/high-priority hints, and render in geometrically reserved wrappers. Mobile `picture/source` deliberately substitutes a tiny transparent image so hidden desktop portraits do not download.
- Article/profile images use dimensions or `fill` within sized wrappers; reserve layout space. Browser geometry/CLS still requires final verification.
- `HomepageDeferredMotion.client.tsx` defers below-fold motion until hero reveal completion and a frame/idle window. `ProcessLiquidLinesBackdrop.client.tsx` uses IntersectionObserver and dynamic loading; reduced-motion and forced-color fallbacks exist.
- Hero WebGL runtime is dynamically loaded, gated by media capability, constrained-device hints, forced colors and reduced motion. Static posters and bounded readiness fallback exist.
- Intro particles reuse fixed banks (6 × 10 SVG particles), rather than allocating particles every frame. The approved intro implementation was preserved.
- `ProcessVideoExperience.client.tsx` uses `preload="none"`; the actual video source is activated by the user flow.
- `AnalyticsLoader.client.tsx` only loads GA with accepted consent and `afterInteractive`; rejection/removal disables providers. This behavior was preserved.

## Remaining measured-work candidates / limitations

- The intentional intro has a minimum duration of 1,720ms and 4,000ms fallback start. It can affect visible LCP even though readable content already exists in HTML. Its timing/design were explicitly protected by the request; do not claim a generic Lighthouse score fix by removing it.
- `LenisProvider` defaults `disableInLab=true`, detects `navigator.webdriver`, Lighthouse UA and explicit lab flags. A stock automated browser may skip desktop smooth scroll. Use the existing test approach that sets `navigator.webdriver=false` when assessing real animation runtime; identify benchmark configuration in conclusions. This is a measurement limitation, not a reason to assert good field INP.
- CustomCursor (60,009 source bytes plus GSAP) remains eagerly imported by its provider, including touch-only visits. A trial import split was removed before completion because hybrid mouse activation can otherwise lose the first mouse movement while the module loads. Any future split should explicitly preserve that input handoff and run the first-entry/hybrid cursor tests.
- `noise.avif` is about 308KiB, used at low opacity in below-fold/home footer and funnel textures. No image change was made without proving identical texture appearance.
- `homepage.module.css` is ~231KiB source and retains extensive overrides. Minified/transfer cost must be measured from the actual release; a broad stylesheet cleanup risks the approved responsive cascade.
- `images.unoptimized` remains the host contract. Future large assets must ship appropriately sized derivatives. Enabling Next's optimizer would require a verified packaging/runtime change and is out of this safe narrow performance patch.
- Preexisting `.next/diagnostics/route-bundle-stats.json` and `.next/server/next-font-manifest.json` are dated September 23 and must not be reported as the current baseline/build.
- No CrUX/RUM percentile dataset was supplied. Lab timings, asset savings and source review do not establish passing field LCP/CLS/INP.

## Files changed by performance owner

- `app/components/Providers/LeadFormModalProvider.tsx` — lazy modal form import.
- `app/content/testimonials.ts` — shared derivative URLs.
- `public/images/testimonials/denisa-reznickova-avatar.webp` — new derivative.
- `public/images/testimonials/stanislav-dvorak-avatar.webp` — new derivative.
- `public/images/testimonials/pavla-kucerova-avatar.webp` — new derivative.
- `tests/e2e/home-mobile-hero-polish.spec.ts` — existing avatar URL contract follows the derivatives.
- `tests/e2e/home-references-reader.spec.ts` — existing avatar URL contract follows the derivatives.
- `tests/e2e/media-performance.spec.ts` — new browser/API test: all three hero portraits decode, retain at least 2× rendered resolution, and total ≤64KiB actual HTTP bodies.
- `app/layout.tsx` — font change implemented by metadata owner.

## Validation state / handoff

- Focused ESLint passed for modal provider, testimonial data and all three touched test files.
- Original asset SHA-256 preservation passed. All derivatives encoded successfully; one derivative visually inspected at full 256px, above actual UI size.
- Root production artifact build `SYHM6IeQKGeK_Uruv3b-Z` passed. The extracted archive was tested locally at `http://localhost:3108/`. User subsequently requested no production deployment; these results are local artifact validation only.
- Suggested focused existing browser tests: `home-mobile-hero-polish` test "keeps one dominant hero action with quiet context and proof"; `home-references-reader` avatar/identity test; `cursor-coverage` first pointer entry and touch conversion; `home-intro` reduced motion and natural intro; `lenis-intro-gate`; overview form and article screening; no-JS readable content. New `media-performance.spec.ts` is mandatory for this patch.
- The extracted production artifact serves all three `/images/testimonials/*-avatar.webp` resources successfully. Public production postflight remains deliberately unrun because deployment was paused by the user.

## Final local artifact verification

- Six focused browser scenarios pass: image decoding/resolution/64KiB budget; hero primary action and photographed proof at 320/390/768/1440px; header-to-overview navigation; photographed reference identities and source links; first-entry custom cursor; touch-only radio selection and next step.
- Initial run: five passed, touch conversion failed because its historical seeded consent policy was obsolete and the live cookie banner intercepted the tap. The failure trace identifies `CookieBanner` interception. Added an explicit tap on the current “Ne, díky” button in that test, then the isolated rerun passed in 3.3s. Only the test was changed; consent/runtime behavior is preserved. Focused ESLint for that extra test edit passed.
- Raw initial HTML has both DM Sans subset preload links. Its 14 script resources total 925,648 decoded bytes. The legacy lead form is emitted as `0u5slyo_o50kd.js` (26,814 bytes), contains the expected form implementation marker, and is absent from the initial HTML script list. See `performance-initial-html.json`.
- A real-browser cold homepage check with `navigator.webdriver=false` after a 6.5-second effect settling window reports 1,611,503 decoded JavaScript bytes at both 390px/touch and 1440px/mouse. Neither requests the deferred lead-form chunk. This is the full downloaded runtime total, distinct from only scripts in initial HTML. These local totals do not prove a net live transfer saving relative to an identically controlled baseline.
- Both visits report no browser errors and no positive horizontal overflow. Custom cursor is absent on touch and mounted on mouse as designed. All three portrait resources decode.
- Browser proof-strip screenshots at 390px and 1440px were inspected and preserve portrait crop, stars, review count and layout. Resources and screenshots are in `performance-browser-resources/`.
- Test output directories: `performance-browser/` (includes original stale-fixture failure evidence), `performance-browser-retry/` (touch correction pass).
- Additional changed test file: `tests/e2e/cursor-coverage.spec.ts` (+5 lines to handle the actual live consent banner before the touch journey). This test-only change occurred after artifact creation and does not alter production code.
