# Color System Audit

## Executive summary

Audit byl proveden bez změn komponent, CSS výstupu nebo aktivní palety.

Současný color systém má použitelný základ pro theme switch, ale není dost čistý na bezpečný přechod na `dp-lime-finance` jen přidáním nové varianty. Existuje foundation vrstva v `app/theme/color-palette.css`, semantic/component tokeny i typový registr v `app/theme/theme-tokens.ts`, ale velká část komponent stále používá lokální `rgba()`, raw hex hodnoty, legacy aliasy a fallbacky. To znamená, že nová paleta by se propisovala nerovnoměrně: hero a centrální CTA by šly přemapovat relativně dobře, ale multipage sekce, služby, proces, reference, testimonials a některé formulářové stavy by zůstaly emerald/lime hardcoded.

Důležitá korekce zadání: `dp-emerald-classic` je CSS fallback na `:root`, ale aplikační default je nyní `dp-emerald-professional` v `app/theme/color-palettes.ts`. `layout.tsx` navíc migruje uloženou hodnotu `dp-emerald-classic` na professional, pokud migrace ještě neproběhla.

Doporučení: před přechodem na `dp-lime-finance` zvolit variantu B, tedy zpevnit semantic token layer a vyčistit nejrizikovější komponentové hardcoded barvy. Není potřeba dělat kompletní redesign ani přepis architektury.

## Current source of truth

Relevantní soubory:

| Soubor | Role |
|---|---|
| `app/theme/color-palette.css` | Hlavní source of truth pro palety, raw tokeny, semantic tokeny, component tokeny a compatibility aliasy. |
| `app/theme/color-palettes.ts` | TypeScript seznam povolených palet, default paleta, mode storage keys a normalizace. |
| `app/layout.tsx` | Importuje `globals.css` a `color-palette.css`, nastavuje `data-color-palette`, `data-color-mode` a bootstrapuje localStorage. |
| `app/theme/ColorPalettePanel.client.tsx` | Dev/runtime panel pro přepínání palety a dark/light mode, gated přes `NEXT_PUBLIC_ENABLE_COLOR_PALETTE_PANEL`. |
| `app/theme/theme-tokens.ts` | Typový/dokumentační registr tokenů. Není primární runtime resolver. |
| `app/globals.css` | Legacy brand aliasy, global layout tokeny, `premiumGreenBackground`, scrollbar styling a některé starší tokeny. |
| `docs/design/color-system.md` | Dokumentace, ale je zastaralá vůči aktuální `color-palette.css`. |

Hlavní paleta je definovaná v `app/theme/color-palette.css`. Soubor obsahuje:

- `:root, :root[data-color-palette="dp-emerald-classic"]`
- `:root[data-color-palette="dp-emerald-professional"]`
- light mode varianty pro obě palety
- compatibility aliases pro dark mode: `--color-*`, `--bg-*`, `--surface-*`, `--accent-*`, `--button-*`, `--article-*`, `--nav-*`, `--hero-*`

Aktuální raw barvy pro `dp-emerald-classic`:

| Token | Hex |
|---|---|
| `--palette-green-950` | `#031b15` |
| `--palette-green-900` | `#062c22` |
| `--palette-green-850` | `#073828` |
| `--palette-green-800` | `#0b4632` |
| `--palette-green-750` | `#0c4634` |
| `--palette-green-700` | `#0f3a2f` |
| `--palette-green-600` | `#185846` |
| `--palette-lime-400` | `#79eb93` |
| `--palette-lime-300` | `#d6ffad` |
| `--palette-mint-200` | `#cfffd9` |
| `--palette-paper-50` | `#f3f5f4` |

Aktuální aplikační default `dp-emerald-professional`:

| Token | Hex |
|---|---|
| `--palette-green-950` | `#021711` |
| `--palette-green-900` | `#06251d` |
| `--palette-green-850` | `#083025` |
| `--palette-green-800` | `#0a3a2c` |
| `--palette-green-750` | `#0b3f30` |
| `--palette-green-700` | `#0d342a` |
| `--palette-green-600` | `#164f3f` |
| `--palette-lime-400` | `#8edb9b` |
| `--palette-lime-300` | `#c7eaa2` |
| `--palette-mint-200` | `#d8efdc` |
| `--palette-paper-50` | `#f4f6f1` |

Plánovanou `dp-lime-finance` lze přidat technicky bez změny komponent, ale jen pokud bude nová varianta definovat všechny stejné raw, semantic, component a compatibility aliasy. Vizuálně to samo o sobě nestačí, protože některé sekce obsahují pevné emerald/lime hodnoty mimo theme soubor.

## Active palette mechanism

Mechanismus výběru:

1. `app/layout.tsx` importuje `./globals.css` a potom `./theme/color-palette.css`.
2. `<html>` dostává `data-color-palette={DEFAULT_COLOR_PALETTE_ID}` a `data-color-mode={DEFAULT_COLOR_PALETTE_MODE}`.
3. `DEFAULT_COLOR_PALETTE_ID` je v `app/theme/color-palettes.ts` nastavený na `dp-emerald-professional`.
4. Inline bootstrap script v `layout.tsx` čte `localStorage` klíče `dp.colorPalette` a `dp.colorMode`.
5. Pokud je uložené `dp-emerald-classic` a není hotová migrace `dp.colorPalette.defaultProfessional.v1`, script přepne na `dp-emerald-professional`.
6. `ColorPalettePanel.client.tsx` umí paletu a mode přepínat přes `document.documentElement.dataset`.

Současné omezení:

- `ColorPaletteId` union dovoluje jen `dp-emerald-classic` a `dp-emerald-professional`.
- `isColorPaletteId()` explicitně kontroluje jen tyto dvě hodnoty.
- CSS má jen dvě palety a dvě light mode varianty.
- `dp-lime-finance` by vyžadovala úpravu `color-palettes.ts`, `ColorPalettePanel` dat a nové CSS bloky v `color-palette.css`.

## Token architecture

Systém už má tři vrstvy, ale nejsou důsledně oddělené.

Foundation tokens:

- `--palette-green-950` až `--palette-green-600`
- `--palette-lime-400`, `--palette-lime-300`
- `--palette-mint-200`
- `--palette-paper-50`
- RGB dvojice ke každému foundation tokenu

Semantic tokens:

- text: `--text-on-dark-primary`, `--text-on-dark-secondary`, `--text-on-light-primary`, `--text-on-light-secondary`
- surface: `--surface-dark-base`, `--surface-dark-elevated`, `--surface-light-base`, `--surface-light-section`
- app aliases: `--color-bg-page`, `--color-bg-section`, `--color-bg-surface`, `--color-text-primary`
- border/accent: `--border-on-dark-soft`, `--border-on-light-soft`, `--color-accent`, `--color-accent-soft`, `--color-glow-soft`
- editorial: `--editorial-bg`, `--editorial-surface`, `--editorial-text`, `--editorial-accent`

Component tokens:

- hero: `--hero-bg`, `--hero-headline-accent`, `--hero-primary-cta-bg`, `--hero-cinematic-overlay`
- nav: `--nav-shell-bg`, `--nav-pill-bg`, `--nav-shell-border`, `--nav-primary-cta-*`
- CTA/button: `--cta-primary-bg`, `--cta-primary-bg-hover`, `--cta-secondary-bg`, `--button-primary-bg`
- form/trust/article: `--form-shell-bg`, `--trust-strip-bg`, `--article-quiet-bg`, `--article-conversion-bg`
- global section: `--premium-green-bg-subtle`, `--premium-green-bg-medium`, `--premium-green-bg-hero`

Compatibility alias layer:

- Legacy aliases such as `--color-rich-black`, `--color-dark-green`, `--color-pine`, `--color-basil`, `--color-bangladesh-green`, `--color-mountain-meadow`.
- Brand aliases such as `--brand-primary`, `--brand-tertiary`, `--brand-light`, `--brand-white`.
- App aliases such as `--bg-canvas`, `--bg-page`, `--bg-page-soft`, `--surface-support-rgb`.

Problems in architecture:

- Components often use compatibility aliases directly, for example `--color-basil-rgb`, `--color-bangladesh-green-rgb`, `--bg-canvas-rgb`.
- Component-local token systems exist, for example `--service-*`, `--faq-*`, `--credentials-*`, but they often mix semantic tokens with raw RGBA values.
- There are duplicate names for the same role: `--cta-primary-bg`, `--btn-primary-bg`, `--button-primary-bg`, `--nav-primary-cta-bg`, `--hero-primary-cta-bg`.
- `theme-tokens.ts` describes many tokens, but components do not import/use it as enforcement. It is useful documentation/tooling, not a runtime boundary.
- `docs/design/color-system.md` still documents an older palette (`#021B1A`, `#032221`, `#03624C`, etc.) and should not be treated as authoritative.

## Hardcoded colors

Search scope:

- `.css`
- `.scss`
- `.module.scss`
- `.tsx`
- `.ts`
- `.jsx`
- `.js`

Search patterns:

- hex: `#[0-9a-fA-F]{3,8}`
- raw `rgb()` / `rgba()` / `hsl()` / `hsla()` not based on CSS vars
- `color-mix()`
- Tailwind arbitrary color classes like `from-[#...]`
- inline `style={{ ... }}`

Count summary:

| Pattern | Highest density files |
|---|---|
| Hex values | `theme/color-palette.css` 110, `home.critical.module.css` 34, `reference/references.module.css` 28, `globals.css` 26, `jak-pracuji/processPage.module.css` 26, `sluzby/servicesPage.module.css` 21 |
| Raw `rgba()` / `rgb()` | `home.critical.module.css` 255 raw instances, `processTimeline/process.module.css` 135, `jak-pracuji/processPage.module.css` 130, `reference/references.module.css` 108, `services.module.css` 96 |
| Inline styles / arbitrary Tailwind colors | `SurfacePublicationRuntime.client.tsx`, `GoalsVelocityMarquee.tsx`, `Process.tsx`, `ProcessHandoff.client.tsx`, `Squares.tsx` |
| `color-mix()` | No matches found in audited scope. |

Files with hardcoded colors outside `theme/color-palette.css` and `globals.css`:

| File | Approx role | Tokenization recommendation |
|---|---|---|
| `app/home.critical.module.css` | Hero, nav, CTA, portrait frame, masks, shadows | Tokenize hero trust chips, nav light overrides, repeated dark overlays. Structural mask `#000/#fff` can remain. |
| `app/components/sections/services/services.module.css` | Service cards and CTA band | Cleanup before palette switch; many local neon-lime RGBA values. |
| `app/components/sections/faq/faq.module.css` | FAQ cards | Same visual system as services; tokenizable via section/card tokens. |
| `app/components/sections/articlesPreview/articlesPreview.module.css` | Homepage article cards | Uses global section token but many hardcoded card/glow values. |
| `app/components/sections/processTimeline/process.module.css` | Homepage process timeline | Mostly brand-tokenized but many fixed dark-green/white/lime rgba values in cards. |
| `app/components/sections/testimonials/testimonials.module.css` | Testimonials, reference cards, stars | Mixed; `#f5c644` star color and raw green gradients should become tokens. |
| `app/components/sections/leadForm/leadform.module.css` | Lead form and modal | Mostly tokenized, but info/error/success states and scrollbar borders are hardcoded. |
| `app/components/sections/footer/footer.module.css` | Footer and map dialog | Mixed brand tokens plus hardcoded footer gradients. |
| `app/sluzby/servicesPage.module.css` | Services standalone page | Heavily hardcoded, should be tokenized before palette switch. |
| `app/jak-pracuji/processPage.module.css` | Process standalone page | Heavily hardcoded, should be tokenized before palette switch. |
| `app/reference/references.module.css` | References standalone page | Heavily hardcoded, should be tokenized before palette switch. |
| `app/osvedceni-a-certifikace/certificatesPage.module.css` | Certificates page | Heavily hardcoded, should be tokenized before palette switch. |
| `app/clanky/articles.module.css` | Article hub/detail | Better tokenized than most; uses `--article-*` extensively. |
| `app/components/multipage/marketingPage.module.css` | Marketing page layout | Some raw overlays; moderate cleanup. |
| `src/app/ui/privacy/CookieSettingsButton.module.css` | Cookie settings panel | Uses brand tokens but has fixed dark surfaces. |
| `app/ui/animations/GoalsVelocityMarquee.tsx` | Marquee visual | Inline raw gradients and Tailwind arbitrary `#0c2820`. |
| `app/components/sections/process/Process.tsx` | Process image overlay | Inline `rgba(12, 42, 34, ...)`. |
| `app/components/sections/process/ProcessHandoff.client.tsx` | Process handoff inline styles | Inline raw green/black gradients. |
| `app/runtime/.../SurfacePublicationRuntime.client.tsx` | Runtime error fallback | Inline slate/red colors; acceptable as isolated fallback, but can be tokenized as status tokens. |
| `app/ui/animations/Squares.tsx` | Canvas-style animation defaults | Hardcoded `#999` and `#222`; low priority unless reused in public UI. |

Representative unique hardcoded hex values outside theme/global:

`#052b21`, `#04251f`, `#021718`, `#01090d`, `#102f27`, `#0a241e`, `#0b2b24`, `#0c2820`, `#10251b`, `#b9fb90`, `#93eb78`, `#abf38c`, `#b8fa87`, `#bdfb8e`, `#caff9b`, `#d6ffad`, `#fbfff7`, `#f5c644`, `#1b5f7a`, `#134a63`, `#962929`, `#963434`, `#ffecec`, `#e6f6ff`.

Not every hardcoded value is equally bad:

- `#000` / `#fff` used in CSS masks can stay because mask color is structural, not brand color.
- Black/white shadows may stay short term, but recurring values should move to `--shadow-*` / `--overlay-*`.
- Error/success/info colors should become semantic status tokens.
- Section-specific greens and limes should move before switching to `dp-lime-finance`.

## Component usage map

| Area | Main files | Color mechanism | Status |
|---|---|---|---|
| Hero | `home.critical.module.css`, `Hero.tsx` | `--hero-cinematic-bg`, `--hero-cinematic-overlay`, `--cta-*`, `--accent-*`, `--surface-*`, plus local raw overlays | Potřebuje cleanup |
| Navbar/header | `home.critical.module.css`, `Nav.tsx` | `--nav-*`, `--cta-*`, `--accent-*`, plus light-editorial local overrides | Potřebuje cleanup |
| Primary CTA | `ui/cta/button.module.css`, `home.critical.module.css` | Central `--cta-primary-*`, `--button-primary-*`, hero/nav-specific wrappers | OK with duplication |
| Secondary buttons | `button.module.css`, hero/nav overrides | `--cta-secondary-*`, local shadows | Potřebuje cleanup |
| Cards/panels | services, FAQ, testimonials, process, lead form | Local component tokens plus many raw RGBA values | Potřebuje cleanup |
| Image frame | `home.critical.module.css` | Mostly `--accent-*`, `--surface-*`, `--bg-canvas-*`, `--color-basil-*` | Potřebuje cleanup |
| Service section | `services.module.css`, `servicesPage.module.css` | Homepage section partly tokenized; standalone page hardcoded | Hardcoded |
| Process section | `processTimeline/process.module.css`, `jak-pracuji/processPage.module.css` | Homepage partly tokenized; standalone page hardcoded | Hardcoded |
| References/testimonials | `testimonials.module.css`, `reference/references.module.css` | Mixed tokens and raw colors; star gold hardcoded | Hardcoded |
| Article pages | `clanky/articles.module.css` | Strong `--article-*` layer, fewer raw brand colors | OK / light cleanup |
| Forms | `leadform.module.css` | Good `--form-*`, `--trust-*`, `--cta-*`; hardcoded status colors | Potřebuje cleanup |
| Footer | `footer.module.css` | Brand tokens plus hardcoded dark gradients | Potřebuje cleanup |
| Cookie/privacy UI | `src/app/ui/privacy/*.module.css` | Brand token borders plus fixed surfaces | Potřebuje cleanup |

## Hero audit

Hero source:

- `Hero.tsx` renders semantic DOM content and decorative SVG orbit layers.
- `home.critical.module.css` controls the full visual system.
- Main background is `.heroCont { background: var(--hero-cinematic-bg); }`.
- `--hero-cinematic-bg` maps to `--hero-bg` in `globals.css` / `color-palette.css`.
- Main overlay is `.heroCont::before { background: var(--hero-cinematic-overlay); }`.
- Additional right-side darkening is `.bgLayer` with hardcoded raw `rgba(0, 13, 9, ...)` and `rgba(1, 20, 16, ...)`.

For `dp-emerald-professional`, hero background currently uses:

- radial `rgba(var(--palette-lime-300-rgb), 0.075)` where lime-300 is `#c7eaa2`
- radial `rgba(var(--palette-lime-400-rgb), 0.048)` where lime-400 is `#8edb9b`
- black depth `rgba(0, 0, 0, 0.24)`
- linear base `#0b3f30` -> `#06251d` -> `#0a3a2c`

Hero text:

- container color: `var(--brand-white)`, mapped in dark mode to the on-dark primary text
- eyebrow: `var(--hero-cinematic-kicker)`
- body copy: `var(--hero-cinematic-muted)`
- headline accent logic exists via `--text-gradient-hero` / `--hero-headline-accent`, though current headline line styling is mostly direct text color and inherited tokens

Hero CTA:

- primary button: `--cta-primary-bg`, `--cta-primary-bg-hover`, `--hero-primary-cta-border`, `--hero-primary-cta-shadow`
- primary text: `--cta-primary-text`
- icon shell: `--cta-icon-bg`, `--cta-icon-border`, `--cta-icon-color`, `--cta-icon-color-hover`
- secondary CTA: `--cta-secondary-bg`, `--cta-secondary-border`, `--cta-secondary-text`

Portrait frame:

- shell border: `rgba(var(--accent-soft-rgb), 0.18)`
- shell background: `rgba(var(--color-basil-rgb), 0.42)` + `rgba(var(--bg-canvas-rgb), 0.72)`
- inner frame: `rgba(var(--color-basil-rgb), 0.34)` + `rgba(var(--bg-canvas-rgb), 0.66)`
- portrait background: `rgba(var(--color-bangladesh-green-rgb), 0.18)`, `rgba(var(--accent-secondary-rgb), ...)`, `rgba(var(--surface-strong-rgb), ...)`
- contour overlay asset: `/patterns/hero-portrait-contours.svg`

Orbit layer:

- decorative SVG only, no canvas
- strokes use `--brand-tertiary-rgb`, `--accent-secondary-rgb`, `--color-pistachio-rgb`, `--text-primary-rgb`
- responsive mobile simplification is controlled in CSS
- reduced motion disables orbit animation

Hero problems:

- Main background is tokenized enough to map to `dp-lime-finance`.
- The hero is still visually dominated by many close green layers: `--hero-bg`, `--hero-cinematic-overlay`, `.bgLayer`, `.heroSurfaceGlow`, `.heroMediaCol::before`, portrait glows and orbit strokes.
- `.bgLayer` uses hardcoded dark RGBA instead of a token such as `--hero-depth-overlay`.
- `.heroCtaTrustCard` uses fixed values like `rgba(15, 80, 50, 0.78)`, `rgba(7, 48, 34, 0.88)`, `rgba(182, 255, 188, 0.18)`.
- Portrait frame uses compatibility aliases (`--color-basil-*`, `--bg-canvas-*`) instead of hero component tokens.

Can hero move to `dp-lime-finance` by tokens only?

Partially. Background, text, primary CTA and orbits can follow new palette if `color-palette.css` defines complete aliases. The portrait frame, trust chips and depth overlays should be locally refactored first into hero component tokens to avoid keeping emerald fog after the switch.

## Navbar audit

Navbar source:

- `Nav.tsx` renders `<nav className={s.navCont}>`.
- `home.critical.module.css` owns header styles.
- `Nav.tsx` sets `data-nav-surface` and `data-nav-theme` based on route/scroll section detection.

Tokenized parts:

- shell: `--nav-shell-bg`, `--nav-shell-border`
- nav pill: `--nav-pill-bg`, `--nav-item-border`, `--nav-item-active-bg`, `--nav-item-active-border`
- icons: `--accent-secondary`, `--accent-secondary-rgb`
- nav CTA: `--nav-primary-cta-bg`, `--nav-primary-cta-bg-hover`, `--nav-primary-cta-icon-bg`

Hardcoded/local parts:

- base header shadow: `#000000e0`
- light nav ambient glows: `rgba(47, 169, 140, 0.045)`, `rgba(44, 194, 149, 0.04)`
- logo shadows: `rgba(236, 255, 218, ...)`, `rgba(2, 18, 13, ...)`, `rgba(194, 255, 176, ...)`
- `data-nav-theme="light-editorial"` locally remaps brand tokens and uses hardcoded ivory surfaces such as `rgba(255, 252, 244, 0.5)` and `rgba(255, 253, 247, 0.78)`

Assessment:

Navbar is close to themeable but has a special light-editorial mini-theme inside `home.critical.module.css`. Before `dp-lime-finance`, move those into nav component tokens, for example `--nav-light-shell-bg`, `--nav-light-pill-bg`, `--nav-light-ink`, `--nav-logo-shadow`.

## Button / CTA audit

Button systems found:

| System | File | Notes |
|---|---|---|
| Generic Button component | `app/ui/cta/Button.tsx`, `button.module.css` | Uses `primary`, `secondary`, `ghost`, `cta`. Most colors are tokenized. |
| Hero CTA override | `home.critical.module.css` | Uses central CTA tokens but adds hero-specific icon, shadow and layout. |
| Nav CTA override | `home.critical.module.css` | Uses nav-specific `--nav-primary-cta-*`, falls back to central CTA tokens. |
| Section-local CTAs | `services.module.css`, `articlesPreview.module.css`, `leadform.module.css`, `footer.module.css` | Often use central CTA fill but add local hardcoded surfaces/shadows. |
| Standalone page CTAs | `sluzby`, `jak-pracuji`, `reference`, `certificates` page modules | Many hardcoded lime gradients like `#b9fb90` -> `#93eb78`. |

Good:

- Primary CTA has a central token family: `--cta-primary-bg`, `--cta-primary-bg-hover`, `--cta-primary-bg-active`, `--cta-primary-text`, `--cta-primary-border`, `--cta-primary-shadow`.
- Focus ring token exists: `--cta-focus-ring`.
- Hero and nav CTA can be made to follow a new palette via token mapping.

Problems:

- `--cta-primary-bg`, `--btn-primary-bg`, `--button-primary-bg`, `--nav-primary-cta-bg`, `--hero-primary-cta-bg` overlap.
- `button.module.css` secondary variant still has `transition: all .25s ease`; this is not color-specific but should be cleaned in the same pass.
- Standalone pages duplicate CTA gradients with fixed lime values.
- Info/error/success states in lead form are not semantic tokens.

Recommended CTA prep:

1. Keep `--cta-primary-*` as the canonical CTA semantic/component layer.
2. Keep `--hero-primary-cta-*` and `--nav-primary-cta-*` only for placement-specific treatment, not independent palettes.
3. Introduce `--status-success-*`, `--status-error-*`, `--status-info-*`.
4. Replace standalone page CTA gradients with `--cta-primary-bg` and `--cta-primary-bg-hover`.

## Light sections audit

Current light/off-white tokens:

- `--palette-paper-50`
- `--surface-light-base`
- `--surface-light-section`
- `--surface-light-card`
- `--editorial-bg`
- `--editorial-bg-soft`
- `--editorial-surface`
- `--editorial-surface-strong`
- legacy `--brand-light`
- legacy `--bg-section`, `--bg-section-alt`

Current values:

- `dp-emerald-classic`: `--palette-paper-50: #f3f5f4`
- `dp-emerald-professional`: `--palette-paper-50: #f4f6f1`
- professional light mode: `--palette-paper-50: #f5f5ec`
- many local whites: `#ffffff`, `rgba(255, 255, 255, ...)`, `#fffefa`

Light section behavior:

- Homepage is currently mostly dark/premium-green, including services, process, testimonials, articles preview, FAQ and lead form.
- Legal pages use `--bg-section-alt` and are closer to old light system.
- Article pages have a strong `--article-*` dark reading layer.
- Light mode exists in `color-palette.css`, but many components still assume dark surfaces through `--text-on-dark-*`, black shadows and dark-green local backgrounds.

Soft Ivory mapping for `#EAFFD0`:

- Map `--palette-paper-50` to `#EAFFD0` only if the target is a strongly lime-tinted page. This will affect editorial surfaces heavily.
- Safer mapping: `--surface-light-base: #EAFFD0`, but keep `--editorial-surface-strong` near white/ivory for cards.
- Add `--surface-ivory-soft` or use `--editorial-bg` as the canonical Soft Ivory role.
- Audit text contrast carefully: `Forest Green #224F10` on `Soft Ivory #EAFFD0` should work well, but lime CTA on Soft Ivory may need a darker text/border strategy.

## Problems found

1. Active default mismatch with assumption

   `dp-emerald-classic` is not the current application default. The CSS fallback is classic, but `DEFAULT_COLOR_PALETTE_ID` is `dp-emerald-professional`.

2. Source of truth is split between CSS and TS

   `color-palette.css` is visual source of truth, while `color-palettes.ts` controls allowed palette IDs. A new palette must be added in both.

3. Semantic layer exists but is porous

   Components frequently skip semantic/component tokens and use compatibility aliases or raw values.

4. Legacy aliases are still central

   `--color-mountain-meadow`, `--color-bangladesh-green`, `--color-basil`, `--color-pine` are compatibility aliases, but many components treat them as stable design tokens.

5. Duplicate CTA/button tokens

   The button system has multiple names for the same role. This increases the risk that `dp-lime-finance` changes one CTA but not another.

6. Hardcoded standalone pages

   `sluzby`, `jak-pracuji`, `reference`, and `osvedceni-a-certifikace` contain many fixed dark-green and lime values. These will not follow a palette switch.

7. Hero has layered green fog

   Hero uses tokenized green layers plus local overlays and portrait glows. This creates the current emerald/pine atmospheric density and will need local hero token cleanup.

8. Documentation is stale

   `docs/design/color-system.md` describes an older raw palette and should be updated after the next token pass.

9. Status colors are not semantic

   Lead form info/error/success colors are hardcoded. They should become status tokens before a broader theme switch.

10. Light mode is not a complete product path

   Light mode token definitions exist, but many components assume dark mode. It should not be treated as fully validated.

## Refactor recommendation

Answer: přechod na `dp-lime-finance` pouze přidáním nové varianty je technicky možný, ale nedoporučený pro produkční vizuál. Komponenty s hardcoded emerald/lime hodnotami by novou paletu částečně ignorovaly. Doporučený postup je nejdřív menší refactor token layeru a nejrizikovějších komponent.

### Varianta A — safe minimal

Rozsah:

- Přidat `dp-lime-finance` do `ColorPaletteId`, `COLOR_PALETTES`, `isColorPaletteId()`.
- Přidat CSS blok `:root[data-color-palette="dp-lime-finance"]`.
- Definovat všechny existující foundation tokeny přes novou paletu:
  - Lime Green `#B0E454`
  - Forest Green `#224F10`
  - Soft Ivory `#EAFFD0`
  - Jet Black `#0D0D0D`
- Namapovat compatibility aliasy, aby starší komponenty nespadly.

Dotčené soubory:

- `app/theme/color-palettes.ts`
- `app/theme/color-palette.css`
- volitelně `app/theme/ColorPalettePanel.client.tsx` jen pokud bude potřeba upravit label/description

Co zůstane kompatibilní:

- Hero background a CTA tokeny se přepnou.
- Nav a články z velké části dostanou nové hodnoty.
- Komponenty používající `--brand-*`, `--accent-*`, `--article-*`, `--cta-*` budou fungovat.

Rizika:

- Standalone stránky a některé sekce zůstanou vizuálně emerald.
- Hero portrait/trust chips a services cards si ponechají staré lokální zelené.
- Nová paleta bude působit jako hybrid, ne jako promyšlený color system.

Odhad náročnosti:

- Nízká technická náročnost, střední vizuální riziko.

### Varianta B — recommended

Rozsah:

- Nejprve zavést/zpevnit jasnější semantic vrstvu pro:
  - `--surface-page-*`
  - `--surface-section-*`
  - `--surface-card-*`
  - `--text-on-dark-*`
  - `--text-on-light-*`
  - `--border-*`
  - `--accent-*`
  - `--cta-*`
  - `--hero-*`
  - `--status-*`
- Přemapovat nejvíc problematické sekce z raw RGBA/hex na tyto tokeny.
- Potom přidat `dp-lime-finance`.

Prioritní cleanup soubory:

- `app/home.critical.module.css`
- `app/components/sections/services/services.module.css`
- `app/components/sections/faq/faq.module.css`
- `app/components/sections/articlesPreview/articlesPreview.module.css`
- `app/components/sections/processTimeline/process.module.css`
- `app/components/sections/testimonials/testimonials.module.css`
- `app/components/sections/leadForm/leadform.module.css`
- `app/components/sections/footer/footer.module.css`
- `app/sluzby/servicesPage.module.css`
- `app/jak-pracuji/processPage.module.css`
- `app/reference/references.module.css`
- `app/osvedceni-a-certifikace/certificatesPage.module.css`

Co by se měnilo:

- Raw neon-lime RGBA hodnoty v cards/panels na `--accent-*`, `--surface-card-*`, `--border-*`.
- Hardcoded page backgrounds na `--premium-green-*` nebo novější section tokens.
- Hero trust chips a portrait overlays na `--hero-*`.
- Status colors na `--status-info-*`, `--status-success-*`, `--status-error-*`.
- Standalone CTA gradients na centrální `--cta-*`.

Co zůstane kompatibilní:

- Stávající vizuál lze udržet nastavením tokenů na aktuální hodnoty.
- Komponentová struktura a routing se nemění.
- `dp-emerald-classic` a `dp-emerald-professional` mohou zůstat funkční.

Odhad náročnosti:

- Střední. Nejlepší poměr dopad/riziko.

### Varianta C — deeper refactor

Rozsah:

- Přestavět color systém jako striktní foundation / semantic / component vrstvy.
- Omezit přímé použití `--palette-*` a legacy `--color-*` mimo theme soubor.
- Vynutit token usage lintem nebo stylelint custom pravidlem.
- Aktualizovat `theme-tokens.ts` tak, aby byl skutečným registry zdrojem pro dokumentaci i audit.
- Aktualizovat `docs/design/color-system.md` po skutečném token modelu.

Dotčené soubory:

- `app/theme/color-palette.css`
- `app/theme/color-palettes.ts`
- `app/theme/theme-tokens.ts`
- většina `*.module.css` ve `app/components/sections`
- standalone page modules
- docs/design

Co by se měnilo:

- Každá komponenta by používala pouze component/semantic tokeny.
- Legacy aliases by zůstaly jen compatibility vrstva s deprecation plánem.
- Raw colors by byly povolené jen v palette souboru a pro strukturální masky.

Co zůstane kompatibilní:

- Public UI může zůstat vizuálně stejný, pokud se refactor dělá po sekcích.
- Palety mohou zůstat zpětně kompatibilní přes alias mapu.

Odhad náročnosti:

- Vyšší. Vhodné, pokud se plánuje dlouhodobý theme editor nebo více brandů, ne nutně nutné pro jednu novou paletu.

## Suggested next step

Nejbližší bezpečný krok je varianta B ve zúženém rozsahu: před přidáním `dp-lime-finance` nejdřív tokenizovat hero local overlays/trust chips, nav light-editorial mini-theme, services/FAQ card surfaces, standalone page CTA gradients a lead form status colors. Potom přidat novou paletu jako čisté přemapování tokenů.
