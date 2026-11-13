# Storefront visual component inventory

`plt-design-system` is the visual authority for the customer site. daisyUI 5 (`d-*`) owns primitive anatomy. PLT defines contracts and renderers only for compositions daisyUI does not provide. `plt-astro-storefront` normalizes data and invokes those renderers; it must not copy markup.

This inventory is the gap list for the website. It does not add schemas, Shopify logic, or application state. New contracts are implemented only when a specific component is requested. Each new contract follows the existing pattern: an entry in `packages/design-system/contracts/components.md`, `plt-*` CSS only when daisyUI is insufficient, equivalent Astro and Liquid renderers, and an anatomy note in `packages/design-system/docs/daisyui-conformance.md`.

Sources:

- Current contracts: `packages/design-system/contracts/components.md`
- Destination site: `plt-astro-storefront`
- Production home: `plt-frontend/templates/index.json`
- Editorial blocks: `plt-editorial` (`hero`, `rich_text`, `product_grid`, `faq`, `promo_strip`)

```text
daisyUI primitives
        +
PLT tokens / theme-*
        +
PLT composite contracts
        +
Astro and Liquid renderers
        +
plt-astro-storefront
```

## Do not define as PLT components

Document these in the catalog as daisyUI plus `theme-*`. Do not add a parallel API (`plt-button`, `plt-card`, and so on).

| Primitive | daisyUI |
| --- | --- |
| Button | `d-btn` |
| Card | `d-card` and parts |
| Badge | `d-badge` |
| Input / select / textarea | `d-input`, `d-select`, `d-textarea` |
| Alert | `d-alert` (form, empty, and error feedback) |
| Divider, link, tabs | `d-divider`, `d-link`, `d-tabs` |
| Collapse / accordion | `d-collapse` (FAQ anatomy) |
| Drawer, menu, modal | `d-drawer`, `d-menu`, `d-modal` |
| Join | `d-join` (quantity, pagination) |
| Rating | `d-rating` (stars, if shown) |

## Already defined — use, do not reimplement

These 23 contracts already have Astro and Liquid renderers. The storefront gap is consumption, not a second definition. `plt-astro-storefront` still keeps local copies under `src/components/commerce/` and `src/components/blocks/` and does not import `@playlovetoys/design-system`.

### Shell

| Component | Role |
| --- | --- |
| `Navbar` | Site chrome. Slots for search, cart, and mobile toggle stay outside the contract. |
| `Footer` | Site chrome. Newsletter markup is injected through a slot. |
| `Breadcrumbs` | Trail of already-resolved links. |
| `CartDrawer` | Drawer shell. Line items are a slot. Cart state stays in the app. |
| `CartLine` | One cart line. Quantity and remove controls are a slot. |

### Marketing / editorial

| Component | Role |
| --- | --- |
| `Hero` | First-screen editorial or campaign section. |
| `PromoStrip` | Campaign, shipping, or compliance strip. |
| `Newsletter` | Signup shell. Submission stays in the app. |
| `SectionHeader` | Eyebrow, title, and description for a section. |
| `EditorialCard` | Article or story summary. |
| `SplitCta` | Copy plus media callout. Not used by the storefront yet. |

### Docs / editorial shell (Astro-only)

Consumed by `plt-docs`. No Liquid renderers until a Liquid consumer exists.

| Component | Role |
| --- | --- |
| `PageOutline` | In-page heading outline (`h2`/`h3`). Optional slot for secondary nav (e.g. `NavTree`). |
| `NavTree` | Grouped documentation navigation tree. |
| `EditorialShell` | Content-region grid (aside / main / rail) with sticky columns. App keeps document header, footer, SourceRepos, and sync. |

### Commerce

| Component | Role |
| --- | --- |
| `ProductCard` | Product summary. Prices arrive already formatted. |
| `CollectionCard` | Collection summary. |
| `ProductGrid` | Grid shell. Children supply cards. |
| `ProductDetail` | PDP copy and gallery slots. |
| `OptionPicker` | Option list. Variant resolution stays outside. |
| `QuantitySelector` | Quantity control. Click handlers stay outside. |
| `CartSummary` | Subtotal and checkout action. |
| `FilterBar` | Facet shell. Facet data stays outside. |
| `SortSelect` | Sort shell. |
| `SearchField` | Search entry. |
| `Pagination` | Page links. |
| `EmptyState` | No-results and fallback. |

## Define next — required by the Astro site

Visual units the storefront already uses on more than one surface, with no design-system contract yet.

| Component | Used for | Notes |
| --- | --- | --- |
| `MegaMenu` | Desktop collections menu | **Defined** — standalone Liquid/Astro renderers; Navbar includes them. Text columns only. |
| `MarketSelector` | Market and locale switch | **Defined** — Liquid/Astro; UI only; market resolution stays in the app. |
| `Price` | Price and compare-at | Storefront: `src/components/commerce/Price.astro`. Formatted strings only, same rule as `ProductCard`. |
| `MediaGallery` | PDP and featured product | Gallery plus thumbnails. Scroll and Alpine stay outside. |
| `Faq` | Canonical editorial block plus home and local pages | **Defined** — `d-collapse` under `.plt-faq`; Liquid + Astro renderers. |
| `RichText` | `rich_text` block | **Defined** — `.plt-prose` wrapper; Liquid + Astro; BlockRenderer consumes it. |
| `AccountNav` | `/account/*` | Storefront: `src/components/account/AccountNav.astro`. Links arrive already resolved. |
| `LocationCard` | Locations index | **Defined** — media-card (`plt-location-card`); not `CollectionCard`. |
| `ChipPills` | Collection pills, related terms, home nav | **Defined** — `{ label, url, current? }[]`; Liquid + Astro. |
| `ListingToolbar` | Index chrome for products, blogs, glossary, and locations | Composes `SearchField`, `FilterBar`, `SortSelect`, and `Pagination` so `ListBrowser` does not copy layout. |

Suggested implementation order when a contract is requested: `Price`, `Faq`, `RichText`, `MegaMenu`, `MarketSelector`, `MediaGallery`, `ChipPills`, `LocationCard`, `AccountNav`, `ListingToolbar`.

## Define for production-home parity

The Astro home is a stub: Hero, FeaturedCollections, NewArrivals, PromoStrip, Newsletter. The production home in `plt-frontend/templates/index.json` adds the pieces below. Several are compositions of contracts that already exist. Only the rows marked **new** need a new contract.

| Production section | Action |
| --- | --- |
| `cms-home-hero` | Use `Hero`. |
| `cms-home-featured-collections` / `shop-by-need` | `SectionHeader` + `CollectionCard` + `ProductGrid`. |
| `cms-home-product-carousel` | **New** `Carousel`: visual shell. Scroll and JS stay in the app. |
| `cms-home-trust-bar` | **New** `TrustBar`: items `{ icon?, label, body? }`. |
| `cms-home-promo-gateway` | `EditorialCard` or `CollectionCard` in a grid. Do not add a fourth card type. |
| `cms-home-editorial-intro` / `brand-story` | `SplitCta`. Already defined; unused on the storefront. |
| `cms-home-education-hub` | `SectionHeader` + `EditorialCard`. |
| `cms-home-market-block` | `SplitCta` or `PromoStrip`. Decide when implementing that section. |
| `cms-home-faq` | `Faq` (see the required list). |
| `cms-home-link-grid` | **New** `LinkGrid`: link columns, reusable on home and 404. Closely related to footer columns. |
| PDP trust badges | Optional `TrustBadges`, or `ChipPills` plus icons. |
| `newsletter` | Use `Newsletter`. |

PDP visuals present in Liquid and missing from the Astro product page, still reusable:

| Component | Role |
| --- | --- |
| `StickyAddToCart` | Fixed bar. Slots for `Price`, quantity, and the add button. |
| `ReviewStars` | `d-rating` plus a label. Review data stays outside. |
| `Swatch` | Color or image presentation only. Availability and variant resolution stay outside. |
| `PredictiveSearch` | Results panel for `SearchField`. The Astro site does not have this yet. |
| `QuickAddModal` | `d-modal` plus a compact `ProductDetail`. |

Home-parity order after the required list: `Carousel`, `TrustBar`, `LinkGrid`. Then PDP extras: `StickyAddToCart`, `ReviewStars`, `Swatch`, `PredictiveSearch`, `QuickAddModal`.

## Keep in the storefront

Page compositions and domain behavior. Build these from the units above; do not add a design-system contract.

- Layout, account layout, password gate, Shopify checkout
- Variant form, gift-card recipient form, profile / address / order CRUD
- Glossary term, glossary index row, local-page FAQs, Wagtail root index, editorial newspaper stack
- Age verification and email popup (theme feature flags)
- Infinite scroll, money math, cart state, predictive fetch, mega-menu data loading
- JSON-LD and meta tags

## Keep in plt-docs

Application orchestration for the documentation portal. Use `PageOutline`, `NavTree`, and `EditorialShell` for chrome; do not reimplement their markup.

- Source manifests, sync, Content Layer, presenters
- `SourceRepos`, `DocNav` / `DocSectionNav`, document header/footer
- Prose / Mermaid app styles, IntersectionObserver scroll-spy (if added later)
