# PokornyDavid.cz Color System

PokornyDavid.cz používá jeden sémantický color systém se dvěma volitelnými
barevnými tématy. Nejde o globální light/dark režim: kontrast sekcí dál řídí
lokální `data-surface-tone` a navigace reaguje na právě čtenou scénu.

Výchozí `Verdant` se aplikuje přes `data-color-theme="verdant"` na `<html>` a
ukládá se pod verzovaným klíčem `dp.siteTheme.v2`. Allowlistovaný bootstrap v
`<head>` obnoví případnou vývojovou volbu ještě před
hydratací, takže při reloadu neproblikne jiné téma.

## Foundation Themes

Raw brand hexy jsou definované pouze ve foundation/theme vrstvě v
`app/theme/color-palette.css`. Komponenty konzumují sémantické role, ne názvy
zdrojových design tokenů.

### Signature

| Role | Token | Hex |
|---|---|---|
| Action/highlight | `--brand-lime` | `#B0E454` |
| Trust/depth | `--brand-forest` | `#224F10` |
| Editorial/readable | `--brand-ivory` | `#EAFFD0` |
| Cinematic base | `--brand-jet` | `#0D0D0D` |

### Verdant (default)

| Role | Semantic use | Value |
|---|---|---|
| Action/highlight | CTA, active state, focus on dark | `#CBEC10` |
| Trust/depth | Brand, trust layer, focus on light | `#116E1C` |
| Editorial paper | Light section background | `#F6F4E8` |
| Cinematic base | Hero, dark section, mobile menu | `#022C12` |
| Light card/highlight | Elevated editorial card | `#FFF` |
| Secondary light copy | Body copy on paper | `#39463E` |
| Light hairline | Border on paper | `#022C121A` |
| Dark hairline | Border on deep surfaces | `#FFF3` |
| Primary dark copy | High-emphasis copy | `#FFFFFFD9` / `#FFF` |
| Muted dark copy | Supporting copy | `#FFFFFFA6` |
| Informational indicator | Icon, border or status marker only | `#007CDC` |
| Transparent stop | Gradients and overlays | `#0000` |

`#007CDC` se nepoužívá pro malý text: na papíru ani bílé nedosahuje 4.5:1.
Bezpečná je role doprovodné informační ikony, linky nebo geometrického markeru.

## Token Architecture

Tokeny se používají v tomto pořadí:

1. Theme foundation tokens: `--brand-*`
2. Semantic tokens: `--surface-*`, `--text-*`, `--accent-*`, `--border-*`, `--status-*`
3. Component tokens: `--cta-*`, `--hero-*`, `--nav-*`, `--trust-*`, `--form-*`, `--editorial-*`
4. Component styles

Komponenty nepoužívají raw hex hodnoty. Používají semantic nebo component
tokeny, takže se obě témata přepnou jako jeden konzistentní systém.

## Surface And Edge Contract

Kanonické surfaces zůstávají `--surface-page`, `--surface-card-dark`,
`--surface-paper`, `--surface-card-light`, `--surface-action` a
`--surface-action-dark`. Jejich kontrastní role se validují proti všem surfaces
v příslušné dark, light nebo action tone family a dokumentuje se nejnižší
naměřený kontrast, ne hodnota reprezentativní plochy.

`--surface-*-edge` slouží výhradně jako vlastní perimeter odpovídající surface.
Vnořené komponenty jej nesmějí přímo používat. Pro pasivní strukturu používají
`--border-subtle`, `--border-default` nebo `--border-emphasis`.

Strukturální border nesmí být jediným indikátorem interaktivního controlu nebo
stavu. Takový případ používá `--border-control`, `--border-state` nebo jiný
existující indikátor s kontrastem alespoň `3:1` proti každé surface v tone
family. Keyboard focus používá samostatný `--focus-ring`.

## Color Roles

Jet Black je hlavní cinematic base pro hero, tmavé sekce, footer a hloubku.

Forest Green je trust/depth layer. Patří do tmavých card surfaces, gradient depth vrstev, linek a podporujících ploch.

Soft Ivory je premium čitelný povrch a text. Používá se jako text na dark sekcích a jako základ light/editorial sekcí.

Lime Green je CTA/accent/action. Patří na primární CTA, active states, drobné ikony, focus stavy a jemný glow.

## Usage Rules

Lime se nepoužívá jako velká plošná mlha. Má být akcent, CTA, active state nebo velmi jemný glow.

Forest drží hloubku a důvěru. Nemá nahrazovat Jet jako hlavní hero base.

Jet je výchozí dark base. Hero má stát primárně na Jet a Forest, Lime pouze vede pozornost.

Ivory/paper je text na darku a light editorial surface. Čistá bílá je drobný
highlight nebo zvýšená karta, ne hlavní section background.

## Runtime Selection

- Registr témat: `app/theme/site-themes.ts`
- CSS kontrakt: `:root` pro `Signature`,
  `:root[data-color-theme="verdant"]` pro `Verdant`
- Ovládání: interní vývojový panel; veřejný root layout jej nevykresluje
- Persistence: `localStorage`, pouze allowlist `signature | verdant`
- Browser chrome: `meta[name="theme-color"]` se aktualizuje podle volby
- Canvas vrstvy dostanou `dp:site-theme-change` a znovu načtou accent RGB

Legacy aliases jako `--palette-green-*`, `--color-*`, `--brand-primary` nebo `--btn-*` jsou pouze compatibility vrstva. Nový kód má používat semantic/component tokeny.

## Canonical Component Tokens

CTA:

- `--cta-primary-bg`
- `--cta-primary-bg-hover`
- `--cta-primary-bg-active`
- `--cta-primary-text`
- `--cta-secondary-bg`
- `--cta-secondary-text`
- `--cta-focus-ring`

Hero:

- `--hero-cinematic-bg`
- `--hero-cinematic-overlay`
- `--hero-headline`
- `--hero-copy`
- `--hero-kicker`
- `--hero-portrait-shell-bg`
- `--hero-trust-card-bg`

Navigation:

- `--nav-shell-bg`
- `--nav-pill-bg`
- `--nav-text`
- `--nav-active-text`
- `--nav-primary-cta-bg`

Editorial:

- `--surface-section-light`
- `--surface-paper`
- `--surface-card-light`
- `--text-on-light-primary`
- `--text-on-light-secondary`

Status:

- `--status-info-*`
- `--status-success-*`
- `--status-error-*`
