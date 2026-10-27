# Single Palette Refactor Report

## Summary

PokornyDavid.cz byl převeden z multi-palette/theme-switch přístupu na jeden brand color systém založený na:

- Lime Green `#B0E454`
- Forest Green `#224F10`
- Soft Ivory `#EAFFD0`
- Jet Black `#0D0D0D`

Aktivní produkční cesta je nyní jediný `:root` token system. Web už nenastavuje `data-color-palette`, `data-color-mode`, nemigruje staré palette hodnoty a nemá runtime palette switch.

## Files Changed

- `app/theme/color-palette.css`
- `app/theme/theme-tokens.ts`
- `app/layout.tsx`
- `app/components/devSettings/DevSettingsProvider.client.tsx`
- `app/components/nav/Nav.tsx`
- `app/home.critical.module.css`
- `app/ui/cta/button.module.css`
- `app/ui/animations/GoalsVelocityMarquee.tsx`
- `app/ui/animations/textMarquee.module.css`
- `app/sluzby/servicesPage.module.css`
- `app/jak-pracuji/processPage.module.css`
- `app/reference/references.module.css`
- `app/osvedceni-a-certifikace/certificatesPage.module.css`
- `app/components/sections/footer/footer.module.css`
- `app/components/sections/process/process.module.css`
- `app/components/sections/process/ProcessHandoff.module.css`
- `app/components/sections/testimonials/testimonials.module.css`
- `app/components/sections/leadForm/leadform.module.css`
- `app/globals.css`
- `docs/design/color-system.md`
- `SINGLE_PALETTE_REFACTOR_REPORT.md`

Removed files:

- `app/theme/color-palettes.ts`
- `app/theme/ColorPalettePanel.client.tsx`
- `app/theme/ColorPalettePanel.module.css`

## Removed Palette Variant Logic

Removed or deactivated:

- `dp-emerald-classic`
- `dp-emerald-professional`
- `ColorPaletteId`
- `COLOR_PALETTES`
- palette storage keys
- palette migration script
- `data-color-palette`
- `data-color-mode`
- standalone `ColorPalettePanel`
- color palette controls inside dev settings
- `data-nav-theme="light-editorial"` mini theme path

`layout.tsx` now renders a normal `<html lang="cs">` without palette/mode data attributes and without localStorage palette bootstrap.

## New Foundation Tokens

Foundation lives in `app/theme/color-palette.css`:

```css
--brand-lime: #B0E454;
--brand-forest: #224F10;
--brand-ivory: #EAFFD0;
--brand-jet: #0D0D0D;
```

RGB foundation tokens were added for alpha usage:

- `--brand-lime-rgb`
- `--brand-forest-rgb`
- `--brand-ivory-rgb`
- `--brand-jet-rgb`

## Semantic Tokens

Added/normalized semantic roles:

- `--surface-page`
- `--surface-hero`
- `--surface-section-dark`
- `--surface-section-dark-deep`
- `--surface-section-light`
- `--surface-paper`
- `--surface-card-dark`
- `--surface-card-light`
- `--text-on-dark-primary`
- `--text-on-dark-secondary`
- `--text-on-light-primary`
- `--text-on-accent`
- `--accent-primary`
- `--border-on-dark-subtle`
- `--border-accent-subtle`
- `--glow-lime-soft`

## Component Tokens

Canonical component tokens now derive from the semantic layer:

- `--cta-primary-*`
- `--cta-secondary-*`
- `--hero-*`
- `--nav-*`
- `--trust-*`
- `--form-*`
- `--editorial-*`
- `--status-*`

`--btn-*`, `--button-*`, `--palette-*`, `--color-*` and old `--brand-*` names remain only as compatibility aliases.

## Compatibility Aliases Kept

Compatibility aliases remain for older components:

- `--palette-green-*`
- `--palette-lime-*`
- `--palette-paper-50`
- `--color-rich-black`
- `--color-dark-green`
- `--color-pine`
- `--color-basil`
- `--color-mountain-meadow`
- `--brand-primary`
- `--brand-tertiary`
- `--btn-*`
- `--button-*`

These are mapped to the new single brand system and are not separate palettes.

## Hero Updates

Hero tokens now use:

- Jet Black as base
- Forest Green as depth layer
- Lime only as CTA/highlight/glow
- Soft Ivory as text

Updated hero areas:

- cinematic background and overlay tokens
- depth overlay
- portrait shell and portrait frame colors
- hero trust card background, border, text and hover states
- hero CTA inherited from canonical CTA tokens

## Navbar Updates

Navbar now uses one token family:

- `--nav-shell-bg`
- `--nav-shell-border`
- `--nav-pill-bg`
- `--nav-pill-bg-hover`
- `--nav-text`
- `--nav-active-text`
- `--nav-primary-cta-*`

The article `light-editorial` nav theme path was removed from `Nav.tsx` and the corresponding hardcoded CSS block was removed from `home.critical.module.css`.

## CTA Updates

Canonical CTA tokens are:

- `--cta-primary-bg`
- `--cta-primary-bg-hover`
- `--cta-primary-bg-active`
- `--cta-primary-text`
- `--cta-secondary-bg`
- `--cta-secondary-text`
- `--cta-focus-ring`

The shared CTA module no longer uses `transition: all`, and loader/secondary button colors now use brand tokens.

Legacy `--btn-cta-gradient` remains as a gradient compatibility alias because some older CSS uses it as `background-image`.

## Standalone Page Cleanup

Cleaned explicit old emerald/lime hexcodes from:

- `app/sluzby/servicesPage.module.css`
- `app/jak-pracuji/processPage.module.css`
- `app/reference/references.module.css`
- `app/osvedceni-a-certifikace/certificatesPage.module.css`

Also mapped related legacy colors in:

- footer
- process section
- process handoff
- text marquee
- testimonials selected old accents
- GoalsVelocityMarquee TSX arbitrary Tailwind colors

## Remaining Raw Colors

Known remaining raw colors are not palette variants, but still need future polish if the goal is absolute zero raw values outside foundation:

- `app/globals.css`: neutral gray scale and shadcn/Tailwind compatibility tokens.
- `app/home.critical.module.css`: technical mask colors (`#000`, `#fff`) and older local shadow/highlight literals.
- `app/components/sections/story/storyFlow.module.css`: mask colors and old fallback values inside `var()` fallbacks.
- `app/components/sections/processTimeline/process.module.css`: mask colors.
- `app/components/route-transition/RouteTransition.module.css`: mask colors.
- `app/components/sections/testimonials/testimonials.module.css`: star/gold rating color and light card literals.
- `app/components/sections/leadForm/leadform.module.css`: old blue/red notification banner colors remain near the top of the file; field/status states are now tokenized.
- `apps/web/src/app/ui/privacy/CookieSettingsButton.module.css`: privacy button local rgba/hex styling remains outside the main app token pass.
- `app/runtime/.../SurfacePublicationRuntime.client.tsx`, `Squares.tsx`, `GradientText.css`: generic runtime/animation defaults.
- `app/layout.tsx`: `theme-color` meta must use a literal browser color value and is set to `#0D0D0D`.

Allowed foundation hexes remain in `app/theme/color-palette.css`.

## Known Follow-Up Polish Items

- Replace remaining technical mask literals with named utility tokens where practical.
- Tokenize testimonials rating/gold state if rating color should stay in the brand system.
- Tokenize privacy/cookie settings surface colors.
- Remove old neutral gray fallback scale from `globals.css` once Tailwind/shadcn compatibility is audited.
- Continue replacing `rgba(0, 0, 0, ...)` and `rgba(255, 255, 255, ...)` shadows with `--brand-jet-rgb` and `--brand-ivory-rgb` where it improves consistency.

## Verification

Passed:

- `pnpm --dir apps/web typecheck`
- `pnpm --dir apps/web lint`
- `pnpm --dir apps/web build`
- Playwright route smoke on existing dev server `http://127.0.0.1:3000` for `/`, `/sluzby`, `/jak-pracuji`, `/reference`, `/osvedceni-a-certifikace`
- Playwright mobile smoke for `/` and `/sluzby`

Known unrelated browser warning:

- Homepage logs an existing React hydration mismatch in the lead form around `caret-color: transparent` on form fields. This was ignored for the color-system smoke test because it is unrelated to this refactor.
