# daisyUI conformance

This repository treats daisyUI 5 as the component foundation. PLT does not maintain a parallel primitive library.

Supported baseline: daisyUI `>=5.7.8 <6` with Tailwind CSS `>=4 <5`.

## Required mapping

| PLT need | daisyUI base |
| --- | --- |
| Button / CTA | `d-btn` |
| Card | `d-card`, with `d-card-body`, `d-card-title`, `d-card-actions` as applicable |
| Badge | `d-badge` |
| Text input | `d-input` |
| Select | `d-select` |
| Textarea | `d-textarea` |
| Divider | `d-divider` |
| Alert / Notice | `d-alert` |
| Links | `d-link` |
| Tabs | `d-tabs` + `d-tab` |
| Hero | `d-hero` + `d-hero-content` + `d-hero-overlay` |
| Breadcrumbs | `d-breadcrumbs` |
| Navbar | `d-navbar` + `d-menu` |
| MegaMenu | `plt-megamenu` panel inside `d-navbar`; lists follow `d-menu` spacing, links use `theme-*` type |
| Market selector | `d-dropdown` + `d-badge` + `d-menu` inside `.plt-market-selector` |
| Footer | `d-footer` + `d-menu` |
| Cart drawer | `d-drawer` + `d-drawer-toggle` + `d-drawer-side` |
| Join groups (qty, pagination) | `d-join` |
| FAQ | `d-collapse` + `d-collapse-arrow` / title / content inside `.plt-faq` |
| Rich text | `.plt-prose` (PLT composition; no daisyUI prose part) |
| Chip pills | `d-badge` links inside `.plt-chip-pills` |
| Location card | `d-card` + `.plt-media-card` / `.plt-location-card` |
| Carousel | `.plt-carousel` track + `d-btn d-btn-square` nav (scroll in app) |
| Trust bar | `.plt-trust-bar` items with `theme-bordered` |
| Link grid | `.plt-link-grid` columns + `d-menu` (same shape as Footer columns) |
| Sticky add to cart | `.plt-buy-bar` fixed bar (visibility in app) |
| Swatch | `.plt-swatch` colour/image chip |
| Docs nav tree | `d-menu` inside `plt-docs-nav-tree` |
| Docs page outline | `plt-docs-toc` with native `details` / chevron (`plt-docs-toc__*`); no daisyUI TOC part |
| Editorial docs shell | `plt-editorial-shell` grid + sticky columns; app owns document header/footer |

Current daisyUI 5 form controls are bordered by default. Removed modifiers such as `d-input-bordered`, `d-select-bordered`, `d-textarea-bordered`, and the old `d-card-bordered` spelling must not be used.

## PLT-owned layers

PLT may own:

- `--plt-*` design tokens
- the daisyUI `brand` theme mapping
- `theme-*` typography, border and hard-shadow treatment
- `plt-*` composition classes only when there is no corresponding daisyUI component/part

Examples of valid PLT composition classes are `plt-media-card`, `plt-product-card`, `plt-split-cta`, `plt-promo-strip`, and `plt-newsletter`.

## Prohibited parallel APIs

The following class families must not return:

- `plt-button`
- `plt-card`
- `plt-badge`
- `plt-field`, `plt-input`, `plt-select`, `plt-textarea`
- `plt-alert`
- `plt-divider`
- `plt-nav-link`
- `plt-headline-*`, `plt-body-*`, `plt-meta`
- `plt-bordered`, `plt-elevated`, `plt-sidebar-shadow`

Typography and brand modifiers use `theme-*` instead.

## Automated guard

Run:

```bash
npm run check
```

`check:conformance` scans runtime CSS, adapters, renderers and the catalog for prohibited parallel or obsolete classes; verifies the required daisyUI anatomy of every current renderer; and verifies mandatory theme configuration. `build:demo` then compiles the Tailwind CSS 4 + daisyUI 5 catalog. GitHub Actions runs the same complete check for pull requests and pushes to `main`.
