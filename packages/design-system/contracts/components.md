# PLT component contracts

These contracts define platform-neutral inputs for the visual renderers. They intentionally exclude Shopify objects, Astro content collections and runtime state.

Liquid renderers use snake_case names; Astro renderers expose the same conceptual inputs in camelCase.

## ProductCard

Required: `title`, `url`, `price`.

Optional: `image_url`, `image_alt`, `vendor`, `compare_at_price`, `badge`, `action_label`, `action_url`.

The renderer receives already formatted price strings. Secondary-image selection, variants, money formatting, reviews, swatches and quick-add behavior stay outside the contract because they are platform/application behavior.

Style hooks the stylesheet owns (an application can add them to its markup; the Astro and Liquid renderers do not need them):

- `plt-product-card__hover-media`: a second image layered over the photo, shown on hover and focus on devices that can hover.
- `plt-media-card__actions`: the price/action row; it wraps under a long price, and the button takes the full width when the card is narrow (14rem or less). `plt-product-card` is an inline-size container (`plt-product-card`), so this follows the card's own width, not the viewport; give the card a width from its parent (a grid cell or a column).
- `plt-product-card--row`: row layout on phones (photo left, details right) inside a `plt-product-grid`, which then goes to one column.

## Cart

Style hooks only (the cart itself is application behavior): `plt-cart-lines` (the list of lines), `plt-cart-line` with `plt-cart-line__controls` (forms inside it add no box), `plt-cart-line-children` (lines nested under a parent line) and `plt-free-shipping` with `plt-free-shipping__message` (a message above a `d-progress` bar). Page-level layout, such as a two-column cart with a sticky summary, stays in the application.

## Search results

Style hooks only (no renderer): a `plt-result-list` (`ul` or `div`) of `plt-result-item` rows, each with a link `a` that may hold a 3.5rem product `img`. The photo sits on `--plt-media-background` and follows `--plt-media-fit`.

## CollectionCard

Required: `title`, `url`.

Optional: `image_url`, `image_alt`, `description`.

Collection lookup, deferred menu-image loading and CMS resolution stay outside the contract.

## Hero

Required: `heading`.

Optional: `eyebrow`, `body`, `image_url`, `image_alt`, `primary_label`, `primary_url`, `secondary_label`, `secondary_url`.

The presence of `image_url` selects the media presentation. Media acquisition, video lifecycle and CMS schema stay outside the contract.

## PromoStrip

Required: `heading`.

Optional: `body`, `action_label`, `action_url`, `tone` (`primary|warning`).

## ProductQuickView

Required: same as `ProductDetail`.

Optional: `trigger_label` (defaults to "Quick View").

Presents a modal wrapping a `ProductDetail` renderer. Focus management and escape behavior are handled natively by HTML `<dialog>` and `<plt-quick-view>` (`@playlovetoys/web-components`, Lit): `[data-quick-view-open]` opens it with `showModal()`, `[data-quick-view-close]` and backdrop clicks close it, page scroll is locked while any modal is open and focus returns to the trigger. Emits `plt:quick-view-open` / `plt:quick-view-close`; `open` property.

## Reviews

- **ReviewRating**: Required `rating`. Optional `max_rating` (defaults to 5), `count`. Displays a visual star rating.
- **ReviewSummary**: Required `rating`, `count`. Optional `distribution` (array of objects with `stars`, `count`, `percentage`). Shows aggregate review metrics.
- **ReviewCard**: Required `author`, `date`, `rating`, `body`. Optional `title`. Displays a single customer review.

## IncentiveBar

Required: `incentives` (array of objects with `title` and `description`).
Optional: `icon` per incentive (HTML/SVG string).

Displays a banner or grid of feature promos/incentives (e.g. Free Shipping, 24/7 Support).

Promotions, eligibility and localization stay outside the contract.

## Newsletter

Required: `heading`.

Optional: `body`, `form_action`, `method`, `input_name`, `input_placeholder`, `action_label`.

Submission handling, customer tagging, validation services and persistence stay outside the contract.

## SectionHeader

Required: `title`.

Optional: `eyebrow`, `description`, `as` (`h1|h2|h3`, default `h1`).

## EditorialCard

Required: `title`, `url`.

Optional: `image_url`, `image_alt`, `meta`, `excerpt`, `action_label`.

## SplitCta

Required: `heading`.

Optional: `eyebrow`, `body`, `image_url`, `image_alt`, `action_label`, `action_url`, `media_left` (boolean).

## Breadcrumbs

Required: `items` — array of `{ label, url? }`. The last item is the current page.

Optional: `aria_label`.

Route construction stays outside the contract.

## Navbar

Required: `site_name`, `links` — array of `{ label, url, current?, columns? }`. A link with `columns` (MegaMenu contract) opens a mega menu panel.

Optional: `logo_url`, `logo_alt`, `home_url`.

Interactive slots (search, cart) stay outside the contract; platforms inject them via named slots (`actions`, `mobile-actions`). Behaviour is bundled: the component root is wrapped in `<plt-navbar>` (`@playlovetoys/web-components`, Lit), which drives `data-plt-navbar-toggle` / `aria-expanded` / `aria-controls` / `data-open` for the mobile menu (click to open/close, Escape closes and returns focus, click-outside closes) and the mega menu (below). No platform JS required. Emits `plt:navbar-toggle` (`{ open }`) and `plt:megamenu-toggle` (`{ id, open }`).

Opt-in capabilities of `<plt-navbar>`, switched on by an attribute or by the markup that carries it; a frontend that uses none of them behaves as before. They serve frontends that keep their own navbar markup (a Shopify theme with featured cards, say) and want the shared behaviour:

| Hook | On | Behaviour |
| --- | --- | --- |
| `hover-delay="150"` | `<plt-navbar>` | A hovering mouse opens a panel after this many ms, and only if the pointer is still on that trigger, so crossing the bar opens nothing. Moving between the trigger's own children does not restart the wait. While another panel is open it stays until the new one commits. Focus and ArrowDown still open at once. Default `0`: immediate. |
| `[data-plt-megamenu]` | panel | Marks a mega menu panel like `.plt-megamenu` does, for markup that keeps its own classes. The panel toggles `data-open="true|false"`; showing and hiding it is the frontend's CSS. |
| `publish-height` or `publish-height="root"` | `<plt-navbar>` | Keeps `--plt-navbar-height` equal to the element's height (a `ResizeObserver`), on the element, or on `<html>` with `root`. The element must be a block box: give the wrapper `display: block`. Removed when the element disconnects. |
| `[data-plt-navbar-deferred]` | `img` | An image that carries `data-deferred-src`, `data-deferred-srcset` and `data-deferred-sizes` (any subset) gets them applied as `src`, `srcset` and `sizes` on idle (at most 2 s after connect), or at the first hover on a trigger, focus on one, panel open or mobile menu open, whichever comes first. `navbar.activateDeferred()` does it on demand. |
| `[data-plt-navbar-overflow]` | the element that bounds the links (usually the `ul`) | Collapses the links that do not fit into a "More" item. Measured on connect, when the element resizes and when web fonts load; `navbar.reflow()` re-measures on demand. The element's width must not depend on its links. Links are hidden **from the end**, so the ones that stay are the first ones, in order. Needs the hooks below; without a `[data-plt-navbar-more]` item it does nothing. |
| `[data-plt-navbar-item="id"]` | each link's `li` | A link that may be moved into More. Gets `hidden` when it does not fit. The id ties it to its More entry. |
| `[data-plt-navbar-more]` | the More `li` (last in the bar, start with `hidden`) | Holds the toggle and the list. Shown only while some link is hidden. |
| `[data-plt-navbar-more-toggle]` | `button` in More | Opens and closes the list (`aria-expanded`, `aria-controls` to the list). ArrowDown/ArrowUp open it onto the first/last entry. |
| `[data-plt-navbar-more-list]` | `ul` in More (start with `hidden`) | The open list. The design system hangs it below the button, so it never covers it. |
| `[data-plt-navbar-more-for="id"]` | `li` in the list (start with `hidden`) | One entry per link, **plain links included**; only the entries of hidden links are shown. An entry that carries `aria-haspopup`/`aria-controls` opens the same mega menu panel as the link in the bar. |
| `overflow-min="1"` | `<plt-navbar>` | Links that always stay in the bar, however narrow it gets. Default `1`. |
| `dialog[data-plt-navbar-drawer]` | the element `aria-controls` of `[data-plt-navbar-toggle]` | Opt-in modal mobile menu. Open uses `showModal()` (native focus trap, Escape, inert page) and the shared scroll lock used by the cart drawer and quick view. Close restores focus to the toggle and releases the lock (including when two modals overlap). Backdrop clicks close it. Without this attribute the toggle keeps the plain panel contract (`data-open` / `hidden`). |
| `data-label-open` / `data-label-close` | `[data-plt-navbar-toggle]` | Become the toggle's `aria-label` when the menu is closed or open. |
| `[data-plt-navbar-drawer-close]` | control inside the drawer | Closes the modal drawer. |

Keyboard in More: Enter/Space on the button toggles; ArrowDown/ArrowUp/Home/End move between entries; ArrowRight enters an entry's panel; Escape closes the panel first, then the list, and returns focus to the button; a click outside, focus leaving, or following a link closes it. Event `plt:navbar-overflow` (`detail.hidden`: ids of the hidden links, in order) fires when that set changes, including to `[]`.

## MegaMenu

Panel shown under a `Navbar` link whose menu item has grandchildren. Text columns only; images and featured products are not part of the contract (theme-only extensions stay in the consumer).

Required: `id`, `label`, `columns` — array of `{ title, url?, children }` where `children` is an array of `{ label, url, current? }`.

Standalone renderers: Astro `MegaMenu.astro`, Liquid `megamenu.liquid`. The Navbar renderers include them from `links[].columns`.

The panel lives inside the sticky `.plt-navbar` (`.plt-megamenu`, `data-open="true|false"`); anatomy: `.plt-megamenu__inner` > `.plt-megamenu__column` > `.plt-megamenu__title` + `ul.plt-megamenu__list` > `a.plt-megamenu__link`. Its trigger is the top-level link with `aria-haspopup="true"`, `aria-expanded` and `aria-controls` (or `[data-plt-megamenu-trigger]`). `<plt-navbar>` owns the behaviour: open on hover or focus, ArrowDown into the panel, close after leaving trigger and panel (150 ms), on focus leaving or on following a link, Escape closes and returns focus; one panel open at a time.

## MarketSelector

Market and locale switch UI only. URL building, `{% form 'localization' %}`, and market resolution stay in the consumer.

Required: `countries` — array of `{ label, url, current? }`; `languages` — array of `{ label, url, current? }`.

Optional: `country_aria_label`, `language_aria_label`, `current_language_label` (summary text for the language control; defaults to the current language's `label`).

Anatomy: `.plt-market-selector` with two native `details.d-dropdown` panels (`d-menu d-dropdown-content`, `d-badge` summaries). Links are plain `<a href>` — no app JS.

## Footer

Required: `site_name`.

Optional: `logo_url`, `logo_alt`, `home_url`, `tagline`, `columns` — array of `{ title, links: [{ label, url }] }`, `social` — array of `{ label, url }`.

Newsletter form markup is injected by the platform via a slot / render block.

## CartDrawer

Required: `title`.

Optional: `subtotal`, `checkout_url`, `cart_url`, `checkout_label`, `view_cart_label`, `empty_label`, `close_label`.

Line items and quantity/remove controls are injected via a slot / render block. Cart state stays outside the contract.

Interactive version: `<plt-cart-drawer>` — a modal `<dialog>` side sheet (focus contained, Escape closes, focus and page scroll restored). Data: `lines` (CartLine data below), `subtotal`, `checkout-url`, `cart-url`, `labels`, `busy`, `error` (message for a failed mutation, already translated; shown in a live region above the lines, empty removes it); methods `show()` / `hide()` / `toggle()`; events `plt:cart-drawer-open` / `plt:cart-drawer-close`. Line events bubble through it. The consumer owns every cart mutation and formats every price.

## CartLine

Required: `title`, `price`.

Optional: `url`, `image_url`, `image_alt`, `variant_label`, `quantity` (display string or number).

Quantity/remove controls are injected via a slot / render block.

Interactive version: `<plt-cart-line>` with `line` = `{ id, title, url?, imageUrl?, imageAlt?, variantTitle?, quantity, price, compareAtPrice?, maxQuantity? }` (prices are display strings). Renders a `<plt-quantity-selector>` and a remove button; emits `plt:cart-line-change` (`{ lineId, quantity, previousQuantity }`) and `plt:cart-line-remove` (`{ lineId }`); `busy` disables its controls.

## ProductGrid

No required data props. Optional: `columns` hint (`2|3|4`). Children / render block supply ProductCard (or CollectionCard) instances.

`columns` is the maximum on wide screens; narrow viewports step down so cards never overflow:

| `columns` | < 40rem | 40–64rem | ≥ 64rem |
| --- | --- | --- | --- |
| _(none)_ | 2 | 3 | 4 |
| `2` | 2 | 2 | 2 |
| `3` | 1 | 3 | 3 |
| `4` | 2 | 3 | 4 |

## ProductDetail

Required: `title`, `price`.

Optional: `vendor`, `compare_at_price`, `badge`, `description`, `images` — array of `{ url, alt? }`.

Gallery override, option pickers and add-to-cart actions are injected via slots / render blocks.

The gallery is wrapped in `<plt-product-gallery>` (`@playlovetoys/web-components`, Lit): `.plt-product-detail__thumb` buttons swap `.plt-product-detail__gallery-main img` (including `srcset`/`sizes`) and carry `aria-current`; arrow keys, Home and End move between thumbnails; `selectedIndex` / `select(index)` let the page show a variant's image; emits `plt:gallery-change` (`{ index, src, mediaId? }`).

Opt-in capabilities, switched on by the markup that carries them (a frontend that does not render these attributes behaves as before). Media markup (image, video, embed, 3D) stays in each frontend; the element owns selection, zoom, the lightbox and the thumbnail track:

| Hook (attribute on the markup) | Behaviour |
| --- | --- |
| `[data-plt-gallery-slide]` (one per thumbnail, same order; optional `data-media-id`) | The selected slide is shown, the others get `hidden`. Video in a hidden slide pauses (YouTube/Vimeo embeds get a pause command) and an `autoplay` video resumes when shown. `gallery.selectMedia(id)` selects by `data-media-id` and returns whether one matched, so the page can follow a variant's featured media. |
| `[data-plt-gallery-thumb]` | A thumbnail without the ProductDetail class. With `role="tab"` it also carries `aria-selected`. |
| `[data-plt-gallery-zoom]` (wraps an `img`) | Mouse pointers set `--plt-zoom-x` / `--plt-zoom-y`; CSS scales the image on hover for fine pointers at 1024px and up. Touch is ignored; reduced motion drops the transition. |
| `[data-plt-gallery-zoom-open]` + `dialog[data-plt-gallery-lightbox]` containing `[data-plt-gallery-lightbox-image]` and `[data-plt-gallery-lightbox-close]` | Opens the large image (`href`, or `data-zoom-src`; label from `data-zoom-alt`) in a modal `<dialog>`: the page behind is inert, Escape, the close button and the backdrop close it, and focus returns to the opener. Render the opener as a link to the large image, so it still works without JavaScript. |
| `[data-plt-gallery-thumb-track]`, `[data-plt-gallery-thumbs-prev]`, `[data-plt-gallery-thumbs-next]` | The track scrolls the selected thumbnail into view (it never scrolls the page); the buttons page it by one thumbnail. |


Style hooks: `plt-buy-bar` (sticky add-to-cart; set `data-visible="true"` to show it, children are the price and the add-to-cart `form`). It is `position: fixed`, so the page must put its parent stacking context at `z-index: 30` or later positioned content paints over it, and leave bottom padding so it never covers the footer. Hidden from 64rem up.

## Faq

Required: `items` — array of `{ question, answer }`.

Optional: `heading` (section title above the list).

`question` is plain text. `answer` is HTML already sanitized by the consumer (product FAQ / CMS richtext). The renderer does not sanitize.

Anatomy: wrapper `.plt-faq`; each item is daisyUI `d-collapse d-collapse-arrow` with `d-collapse-title` and `d-collapse-content`. Native `<details>` / checkbox collapse — no app JS.

## RichText

Optional: `body` — HTML already sanitized by the consumer.

Brand prose wrapper (`.plt-prose`). Not a CMS runtime: the consumer passes already-rendered HTML (or, in Astro, a default slot). Themes may override typography via tokens.

## Swatch

Style hook only until its dedicated contract lands. `plt-swatch` is a colour chip (set `background-color`, or put an `<img>` inside).

## OptionPicker

Required: `name`, `options` — array of `{ label, value, selected?, disabled? }`.

Variant resolution and form wiring stay outside the contract.

## VariantPicker (pilot, Web Component)

Interactive counterpart of OptionPicker, shipped as `<plt-variant-picker>` from `@playlovetoys/web-components` (Lit). One implementation for Liquid, Astro and React; the platform adapters only normalize data.

Required: `options` — array of `{ name, values: (string | { value, label?, swatch?: { color?, image? } })[] }`; `variants` — array of `{ id, options: string[], available, title? }` with `options` positional and aligned with `options`.

Optional: `selectedVariantId`, `name` (hidden variant-id field, default `id`), `labels` (`{ soldOut?, unavailable? }`), `disabled`.

Emits `plt:variant-change` (`{ variantId, variant, available, selectedOptions, previousVariantId }`, bubbling and composed) when the shopper changes the selection.

Style hooks: composes `.plt-option-picker` with `d-btn` (`d-btn-primary` selected, `d-btn-outline` otherwise); `.plt-variant-picker__value[data-status="available|sold-out|unavailable"]`; children marked `data-plt-fallback` are the no-JavaScript fallback.

Prices, inventory quantities, cart mutations, routing and persistence stay outside the contract. See `packages/web-components/README.md`.

## QuantitySelector

Optional: `value` (default `1`), `min`, `max`, `input_name`, `decrease_label`, `increase_label`.

Interactive version: `<plt-quantity-selector>` (`value`, `min`, `max`, `step`, `name`, `disabled`, `labels`). Clamps typed values, keeps bound buttons focusable (`aria-disabled`), submits under `name`, emits `plt:quantity-change` (`{ value, previousValue }`).

## CartSummary

Required: `subtotal`.

Optional: `heading`, `checkout_url`, `checkout_label`, `note`.

## Collection filters, Marquee and CollapsibleText

Style hooks only. `plt-collection-filters` wraps a `d-collapse` panel (`plt-collection-filters__panel`, collapsed on small screens, always open from 64rem), a `plt-filter-bar`, a `plt-sort-select` and an active-filter list (`plt-collection-filters__active`). `plt-marquee` is a scrolling band (`__track`, `__group`, `__item`, `__separator`; `--plt-marquee-speed` and `--plt-marquee-direction` set the motion; it stands still under reduced motion). `plt-collapsible` clamps `__text` to `--plt-collapsible-lines` lines on small screens (unless `data-expanded`) and hides `__toggle` from 40.0625rem.

## FilterBar

Required: `filters` — array of `{ id, label, options: [{ label, value, selected?, count?, disabled? }], multiple?, range?, collapsible?, open? }`.

Optional: `action`, `method`, `submit_label`.

A filter with `multiple: true` is a checkbox group (options with value `""` are ignored; `count` is shown next to the label) and sends every checked value under the same `id`. Without it the filter is a select. A filter with `range: { min, max }` (each bound `{ name, value?, placeholder?, label? }`) is two number inputs, each sent under its own parameter (a price, say; `id` only names the group and `options` is empty). `collapsible` wraps a filter in a `<details>` group, open by default when it has an applied value (`open` overrides). An option with `disabled` is not selectable unless it is applied (a value with no results).

Facet data resolution stays outside the contract.

Liquid adapter (`plt-filter-bar.liquid`): maps Shopify `filter.type` `list` and `boolean` to `multiple: true` checkbox groups (same anatomy; a value with `count == 0` and not applied is `disabled`), and `price_range` to `range` bounds. Other Shopify filter types are skipped. `plt-sort-select.liquid` preserves active `list` / `boolean` values and price bounds the same way.

Interactive version: `<plt-filter-bar>` (`filters`, `action`, `method`, `manual`, `orientation`, `hide-chips`, `labels`, `preserve`) adds active-filter chips (one per value; a range bound is a chip such as "Price: Min 10") and "clear all"; `hide-chips` leaves the active filters to the frontend. `labels` also takes `min` and `max`, the prefix of a range chip and of a bound's accessible name. Each change emits a cancelable `plt:filter-change` (`{ values, changed, query }`; `values` holds a string per select filter and per range bound (keyed by the bound's `name`) and an array per `multiple` filter, and `query` repeats the name for arrays); if not cancelled the form submits (GET, empty filters omitted). Client-routed frontends cancel it and navigate. `manual` shows an Apply button instead. `orientation="vertical"` stacks the controls for a sidebar. `preserve` is `{ name: string | string[] }` of query parameters another control owns (the sort order, say); they are carried as hidden inputs so a native submit keeps them.

## SortSelect

Required: `options` — array of `{ label, value, selected? }`.

Optional: `name`, `label`, `action`, `method`.

Interactive version: `<plt-sort-select>`; a change emits a cancelable `plt:sort-change` (`{ name, value }`) and submits unless cancelled. `preserve` (see FilterBar) keeps the active filters through a native submit.

## SearchField

Optional: `action`, `method`, `input_name`, `placeholder`, `value`, `submit_label`.

## Pagination

Required: `pages` — array of `{ label, url?, current?, disabled? }`.

Optional: `aria_label`, `prev_url`, `next_url`, `prev_label`, `next_label`, `compact`, `anchor`.

- `compact` — numbered store pagination; adds `plt-pagination--compact` for content-sized join buttons (default remains the full-title doc layout).
- `anchor` — optional URL fragment (e.g. `#Comments-123`) appended to every link (`pages[].url`, `prev_url` / `next_url`, and fallback links).

Interactive version: `<plt-pagination>` (`pages`, `previous-url`, `next-url`, `labels`, `variant="compact"`); links stay links; a plain click emits a cancelable `plt:page-change` (`{ url, label }`) so client-routed frontends can navigate themselves. Liquid/Astro adapters accept `compact` and `anchor` and map them onto the WC attributes and hrefs.

## ChipPills

Required: `items` — array of `{ label, url, current? }`.

Row of link pills for collection / related-term navigation. Anatomy: `.plt-chip-pills` of `a.d-badge` (`d-badge-primary` + `aria-current="page"` when `current`). Overflow scrolling stays in the consumer if needed.

## LocationCard

Required: `title`, `url`.

Optional: `image_url`, `image_alt`, `description`, `meta` (city/region line).

Locations index media-card — not `CollectionCard`. Anatomy: `d-card` + `.plt-media-card` + `.plt-location-card`.

## Carousel

Optional: `heading`, `prev_label` (default Previous), `next_label` (default Next).

Visual shell only: `.plt-carousel` with a snap track (default slot / Liquid `slides` HTML) and presentational prev/next `d-btn d-btn-square` buttons (no click handlers). Scroll behaviour stays in the app.

## EmptyState

Required: `heading`.

Optional: `body`, `tone` (`info|warning|error`), `action_label`, `action_url`.

## Price

Required: `locale` (BCP 47 tag for `Intl.NumberFormat`), `price` — `{ amount, currencyCode }` (decimal string amount, ISO 4217 code).

Optional: `compareAtPrice`, `minPrice`, `maxPrice` (same money shape). When `minPrice` and `maxPrice` are both set, the renderer shows a range instead of `price`.

Money parsing, market rules, and Shopify `MoneyV2` mapping stay outside the contract. The Astro renderer must not hardcode a locale (for example `en-US`).

## Stock

Required: `state` — `available` | `unavailable` | `low` | `unknown`; `label` — human-readable copy supplied by the adapter (translations and threshold logic stay outside the contract).

The renderer does not interpret inventory quantities or Shopify `quantityAvailable`; it only reflects the normalized `state` and `label`.

## PageOutline

Required: `items` — array of `{ depth, slug, text }` (heading outline). Depths `2` and `3` are rendered; other depths are ignored.

Optional: `label` (defaults to `"On this page"`).

A default slot may inject secondary navigation (for example a `NavTree`) below the outline. When both outline roots and the slot are present, the renderer separates them with a border using `--plt-border-color` and gap `--plt-docs-outline-section-gap`.

IntersectionObserver / scroll-spy, filesystem, and product-label i18n stay outside the contract.

Astro-only until a Liquid consumer exists.

## NavTree

Required: `groups` — array of `{ label, items: [{ title, href, current? }], children? }` where `children` repeats the same group shape one level deep.

Optional: `currentPath` — when set, the renderer marks an item current by comparing normalized paths if `current` is not already provided on the item.

The current item gets the `.plt-text-highlight` primitive (background +
color only, from `--plt-color-highlight`/`--plt-color-highlight-content`)
instead of a filled/shadowed pill — a "you are here" marker distinct from
`.theme-elevated` action buttons. Other app-level current-page pills (e.g.
plt-docs' domain rail) should reuse the same class for consistency.

Tree construction, content manifests, and sync stay outside the contract.

Astro-only until a Liquid consumer exists.

## EditorialShell

No required data props. Named slots: `aside`, `main`, `rail` (optional). Optional props `asideId`, `asideToggleLabel`, `asideCloseLabel` customize the mobile drawer trigger (English defaults).

- Without `rail`: two columns when `aside` is present (aside + main from the large breakpoint).
- With `rail`: two columns from the medium breakpoint (main + rail); three columns from the large breakpoint when `aside` is also present.
- Sticky side columns use `--plt-docs-sticky-top`.
- When `aside` is present, it renders inside a daisyUI drawer (`d-drawer lg:d-drawer-open`, same CSS-only mechanism as `CartDrawer`): below the large breakpoint it's a full-screen overlay opened by a focusable `<label>` trigger and closed via the overlay or a close button; from the large breakpoint it becomes the existing permanently visible sticky column. No JavaScript required.

Document chrome (html/head/header/footer), source sync, and section tabs stay in the application.

Astro-only until a Liquid consumer exists.

## Pending storefront units

Contracts above are the implemented set. Units the website still needs (`MegaMenu`, `Faq`, and the rest) are listed in the repository doc `docs/storefront-component-inventory.md`. Do not add a contract here until that unit is requested.

## daisyUI rendering invariant

Contracts describe data only. They never replace component anatomy. Renderers must map these values into the daisyUI-first structures documented in `docs/daisyui-conformance.md`.

## Theme ownership (storefronts)

No storefront (Liquid, Astro, Hydrogen) may define its own theme tokens
(`--color-*` brand palette, `--plt-*` geometry/type) or theme utilities
(`.theme-*`, legacy `.nb-*`). Import the design-system theme
(`themes/cheesecake.css` for the Liquid-brand mirror, or another
`themes/*.css` file) and the shared primitives/typography from this package.
Shopify-specific glue (section spacing, Alpine `x-cloak`, cart dialog chrome)
may stay in the application. See `docs/storefront-visual-parity.md`.
