# Design Language Dashboard Report

## Summary

Created an isolated internal `/design-language` route for auditing and shaping the PokornyDavid.cz visual system. The dashboard is a client-side design-system lab focused on foundation colors, surfaces, text contrast, action language, borders, and future component primitives.

Updated the surface grammar so `--surface-section-dark-deep` is the first green-depth step after the page base, while `--surface-hero` is documented as an intentional alias of `--surface-page`.

Refined the structural surface documentation into explicit Base, Dark Structural, Light Content, and Interaction State groups. Each surface now documents semantic role, source/mix, resolved value, text family, type, and accent coverage.

Added a dedicated Action Surfaces subsection for CTA blocks, conversion moments, callouts, and trust-led decision surfaces.

Refined Action Surfaces so Primary and Dark are documented as foundation aliases, Soft Action is a softer lime/ivory mix, and each card lists its recommended foreground text branch.

Added an internal `/design-language/system-preview` route as a full-page reference composition for validating surfaces, components, typography, and layout rhythm together.

Refactored the Text on Surfaces section into a true 3 × 3 readability matrix: Dark, Light, and Action surfaces each validate primary, secondary, and muted text roles with surface and contrast metadata.

Extended the text system into four distinct layers: hierarchy by surface, emphasis by surface, typography roles, and realistic text compositions.

Added surface-aware text aliases (`--text-primary`, `--text-secondary`, `--text-muted`, `--text-emphasis`) driven by `data-surface-tone="dark|light|action"` so reusable components can inherit the correct foreground system from their parent surface.

Added Typography Roles documentation with a Dark / Light / Action surface switcher. The preview proves that display, heading, lead, body, eyebrow, label, caption, metadata, and inline link roles keep their scale while recoloring through local text aliases.

Added Text Compositions in Use: hero introduction, section introduction, editorial block, dark and light card content, and action block previews.

Refined Accent / Action language into three semantic columns: Decision Actions, State Signals, and Interaction Feedback. The section now documents usage/avoidance rules, primary and secondary CTA state strips, and grouped token references for Accent core, Action components, and Feedback.

Refined Borders / Separation into a complete surface-aware matrix: Borders on Dark, Accent Borders on Dark, Borders on Light, and Accent Borders on Light. Structural borders remain Ivory on dark and Jet on light, while semantic emphasis uses Lime on dark and Forest on light. Focus ring remains a separate interaction visibility system.

## Files created

- `app/design-language/page.tsx`
- `app/design-language/DesignLanguageDashboard.client.tsx`
- `app/design-language/designLanguage.module.css`
- `app/design-language/DESIGN_LANGUAGE_DASHBOARD_REPORT.md`
- `app/design-language/system-preview/page.tsx`
- `app/design-language/system-preview/SystemPreview.client.tsx`
- `app/design-language/system-preview/SystemPreview.module.css`
- `app/design-language/system-preview/components/*`

## Sections implemented

- Overview
- Foundation palette
- Surfaces
- Surface alias and resolved value display
- Structural surface hierarchy groups
- Surface source/mix and resolved value metadata
- Surface text family and accent coverage metadata
- Action surfaces
- Color grammar summary
- Text on surfaces
- Text hierarchy by surface matrix
- Text emphasis by surface
- Typography roles
- Surface tone switcher for text roles
- Text compositions in use
- Accent / Action language
- Borders / separation
- Component primitives placeholder
- Token health / missing tokens
- System Preview dashboard panel

## System Preview route

Route: `/design-language/system-preview`

Purpose: full-page composition for validating surfaces, components, typography, and layout rhythm together.

Indexing: disabled with page metadata. The route is not included in `app/sitemap.ts` and is linked only from the internal design-language dashboard.

Production overlays: analytics, cookie controls, and mobile call FAB are suppressed on `/design-language` routes so the lab remains a clean internal reference surface.

Sections:

- Preview control header
- Hero composition
- Trust strip
- Dark cards
- Light editorial
- Process composition
- Action surfaces
- Form / interaction preview
- Final CTA
- Reference footer

## Tokens displayed

Foundation:

- `--brand-lime`
- `--brand-forest`
- `--brand-ivory`
- `--brand-jet`

Surfaces:

- `--surface-page`
- `--surface-hero`
- `--surface-section-dark-deep`
- `--surface-section-dark`
- `--surface-card-dark`
- `--surface-card-dark-hover`
- `--surface-section-light`
- `--surface-paper`
- `--surface-card-light`
- `--surface-card-light-hover`
- `--surface-action`
- `--surface-action-soft`
- `--surface-action-dark`

Text:

- `--text-on-dark-primary`
- `--text-on-dark-secondary`
- `--text-on-dark-muted`
- `--text-on-light-primary`
- `--text-on-light-secondary`
- `--text-on-light-muted`
- `--text-on-accent-primary`
- `--text-on-accent-secondary`
- `--text-on-accent-muted`
- `--text-on-accent`
- `--text-emphasis-on-dark`
- `--text-emphasis-on-light`
- `--text-emphasis-on-action`
- `--text-primary`
- `--text-secondary`
- `--text-muted`
- `--text-emphasis`

Typography:

- `--type-display-*`
- `--type-heading-*`
- `--type-lead-*`
- `--type-body-*`
- `--type-eyebrow-*`
- `--type-label-*`
- `--type-caption-*`
- `--type-metadata-*`
- `--type-link-weight`

Action:

- `--accent-primary`
- `--accent-primary-hover`
- `--accent-primary-active`
- `--accent-primary-muted`
- `--focus-ring`
- `--cta-primary-bg`
- `--cta-primary-text`
- `--cta-secondary-bg`
- `--cta-secondary-text`
- `--cta-focus-ring`

Borders:

- `--border-on-dark-subtle`
- `--border-on-dark-medium`
- `--border-accent-on-dark-subtle`
- `--border-on-dark-emphasis`
- `--border-accent-on-light-subtle`
- `--border-accent-on-light-emphasis`
- `--border-accent-subtle`
- `--border-accent-emphasis`
- `--border-on-light-subtle`
- `--border-on-light-medium`
- `--border-subtle`
- `--border-medium`
- `--border-emphasis-subtle`
- `--border-emphasis`

## Missing tokens found

No missing requested tokens were found in the current `color-palette.css` foundation at implementation time.

## Surface hierarchy

- Page Base: `--surface-page`
- Hero Base: `--surface-hero` as alias of `--surface-page`
- Deep Section: `--surface-section-dark-deep`
- Dark Section: `--surface-section-dark`
- Dark Card: `--surface-card-dark`
- Dark Card Hover: `--surface-card-dark-hover`
- Light Card Hover: `--surface-card-light-hover`

Structural surface groups:

- Base Surfaces: Page Base / Hero Base / Deep Section
- Dark Structural Surfaces: Dark Section / Dark Card / Dark Card Hover
- Light Content Surfaces: Light Section / Editorial Paper / Light Card
- Interaction States: Dark Card Hover / Light Card Hover

Action surfaces:

- Primary Action: `--surface-action` as alias of `--brand-lime`
- Soft Action: `--surface-action-soft` as `--brand-lime 40% + --brand-ivory 60%`
- Dark Action: `--surface-action-dark` as alias of `--brand-forest`

Text hierarchy matrix:

- Dark Surface: primary / secondary / muted on `--surface-card-dark`
- Light Surface: primary / secondary / muted on `--surface-section-light`
- Action Surface: primary / secondary / muted on `--surface-action`

Text emphasis:

- Emphasis on Dark: `--text-emphasis-on-dark` as alias of `--brand-lime`
- Emphasis on Light: `--text-emphasis-on-light` as alias of `--brand-forest`
- Emphasis on Action: `--text-emphasis-on-action` as alias of `--brand-jet`

Surface tone contract:

- Dark tone: page, hero, deep/dark sections, dark cards, dark action
- Light tone: light section, paper, light cards
- Action tone: primary and soft lime action surfaces only

Typography roles:

- Display / Heading: `--text-primary`, with nested emphasis support
- Lead / Body: `--text-secondary`
- Eyebrow: `--text-emphasis`
- Label: `--text-primary`
- Caption / Metadata: `--text-muted`
- Inline Link: `--text-emphasis` with tokenized hover and focus states

Accent / Action language:

- Decision Actions: Primary action / Secondary action
- State Signals: Current nav item / Status badge
- Interaction Feedback: Keyboard focus / Emphasis border
- Token groups: Accent core / Action components / Feedback
- Canonical mappings: `--cta-focus-ring` maps to `--focus-ring`; `--border-accent-active` maps to `--border-emphasis`

Border hierarchy:

- Borders on Dark: subtle / medium
- Accent Borders on Dark: Lime subtle / Lime emphasis
- Borders on Light: subtle / medium
- Accent Borders on Light: Forest subtle / Forest emphasis
- Contextual aliases: `--border-subtle`, `--border-medium`, `--border-emphasis-subtle`, `--border-emphasis`
- Action surfaces: lime action surfaces use light border context; `--surface-action-dark` uses dark border context.
- Structural borders separate space, accent borders communicate semantic state, and focus ring guarantees interaction visibility without changing layout.

## Color grammar

Jet Black defines space. Forest Green creates depth. Soft Ivory opens a readable editorial layer. Lime Green signals action.

## Recommended next step

Add the first real primitive definitions for `Button`, `Card`, `Badge`, `Input`, and `Navigation pill`, with approved default, hover, active, focus, disabled, dark, and light variants.
