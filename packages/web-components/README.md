# @playlovetoys/web-components

Framework-neutral PLT Web Components built with [Lit](https://lit.dev). One
implementation per component, consumed by the Shopify Liquid theme, the Astro
storefront and the Hydrogen React storefront through thin adapters.

This package is separate from `@playlovetoys/design-system` so CSS-only
consumers never install or download Lit. Styles still come from the design
system: components render into light DOM with the existing `d-` daisyUI classes,
`theme-*` treatments and `--plt-*` tokens.

See [`docs/architecture/lit-adoption.md`](../../docs/architecture/lit-adoption.md)
for the decisions, costs and validation.

## Components

Every element renders into light DOM, registers idempotently (`define`
modules; no-op on the server), takes complex data as properties or JSON
attributes, and reports through bubbling, composed `plt:*` `CustomEvent`s.
None fetches data, formats money, mutates the cart or routes: the frontend does.

| Group | Element | Data in | Events out |
| --- | --- | --- | --- |
| Product | `<plt-variant-picker>` | `options`, `variants`, `selected-variant-id`, `name`, `labels` | `plt:variant-change` |
| Product | `<plt-quantity-selector>` | `value`, `min`, `max`, `step`, `name`, `labels` | `plt:quantity-change` |
| Product | `<plt-product-gallery>` | ProductDetail gallery markup; `selected-index`, `select(i)`, `selectMedia(id)`; opt-in slides, hover zoom, lightbox and thumbnail track (see `contracts/components.md`) | `plt:gallery-change` |
| Product | `<plt-quick-view>` | ProductQuickView markup (`<dialog>`); `open`, `show()`, `close()` | `plt:quick-view-open`, `plt:quick-view-close` |
| Cart | `<plt-cart-line>` | `line` (`{ id, title, quantity, price, … }`), `busy` | `plt:cart-line-change`, `plt:cart-line-remove` |
| Cart | `<plt-cart-drawer>` | `lines`, `subtotal`, `checkout-url`, `cart-url`, `busy`; `show()` | `plt:cart-drawer-open`, `plt:cart-drawer-close` (+ line events) |
| Collection | `<plt-filter-bar>` | `filters` (a filter may be `multiple`: checkbox group, `range`: two number inputs, or `collapsible`), `action`, `manual`, `orientation`, `hide-chips`, `labels`, `preserve` | `plt:filter-change` (cancelable) |
| Collection | `<plt-sort-select>` | `options`, `name`, `label` | `plt:sort-change` (cancelable) |
| Collection | `<plt-pagination>` | `pages`, `previous-url`, `next-url`, `variant` (`compact`) | `plt:page-change` (cancelable) |
| Navigation | `<plt-navbar>` | Navbar + MegaMenu markup; opt-in `hover-delay`, `[data-plt-megamenu]`, `publish-height`, deferred images, overflow "More" (see `contracts/components.md`) | `plt:navbar-toggle`, `plt:megamenu-toggle`, `plt:navbar-overflow` |

Two kinds of element:

- **Rendering** elements (picker, quantity, cart, collection) render their
  own anatomy from data. Children marked `data-plt-fallback` are the
  server-rendered no-JS version; they are hidden and disabled on upgrade.
- **Enhancing** elements (gallery, quick view, navbar) add behaviour to
  markup the design-system renderers already emit; they render nothing.
  Their contracts are unchanged from the former vanilla custom elements.

Collection events are cancelable: by default the control submits its GET form
or follows its link (works in any frontend, including Liquid); client-routed
frontends call `event.preventDefault()` and navigate themselves.

Contracts: `packages/design-system/contracts/components.md` (VariantPicker,
QuantitySelector, CartDrawer, CartLine, FilterBar, SortSelect, Pagination,
ProductDetail, ProductQuickView, Navbar, MegaMenu).

## `<plt-variant-picker>`

Option/variant selector. It resolves the shopper's option choices against the
variants it is given and reports the result. It does **not** fetch products,
show prices, touch the cart, change routes or persist anything — the consuming
frontend owns all of that.

### Properties and attributes

| Property | Attribute | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `options` | `options` (JSON) | `PltProductOption[]` | `[]` | `{ name, values: (string \| { value, label?, swatch?: { color?, image? } })[] }` |
| `variants` | `variants` (JSON) | `PltVariant[]` | `[]` | `{ id, options: string[], available, title? }`; `options` are positional and aligned with `options`. |
| `selectedVariantId` | `selected-variant-id` | `string \| null` | `null` | Reflected. Unknown ids fall back to the first available variant. `null` when the selection matches no variant. |
| `name` | `name` | `string` | `"id"` | Name of the hidden input carrying the variant id (Shopify `/cart/add` uses `id`; the Astro storefront uses `merchandiseId`). |
| `labels` | `labels` (JSON) | `{ soldOut?, unavailable? }` | English | Localized status strings. |
| `disabled` | `disabled` | `boolean` | `false` | Disables every control. |

Read-only getters: `selectedVariant` (`PltVariant | null`), `selectedOptions`
(`{ name, value }[]`).

Malformed JSON attributes are ignored (with a console warning) instead of
throwing. Ids are compared as strings, so numeric Liquid ids and Storefront API
GIDs both work.

### Event

`plt:variant-change` — `CustomEvent<PltVariantChangeDetail>`, `bubbles: true`,
`composed: true`, dispatched when the **shopper** changes the selection (not when
the consumer sets properties, like native `change`).

```ts
interface PltVariantChangeDetail {
  variantId: string | null;      // null: no variant has this combination
  variant: PltVariant | null;
  available: boolean;            // variant exists and is available
  selectedOptions: { name: string; value: string }[];
  previousVariantId: string | null;
}
```

### Behaviour

- One native radio group per option inside a `<fieldset>`/`<legend>`; arrow keys,
  Tab and Space work as for any radio group. The radio is visually hidden, not
  `display: none`, so it stays focusable; the focused value gets an outline.
- Each value is marked `data-status="available" | "sold-out" | "unavailable"`
  relative to the other selected values; the status is part of the radio's
  accessible name (`"M, Sold out"`). A polite live region announces the result.
- Choosing a value whose combination does not exist keeps that value and moves
  the other options to the closest existing variant (available first).
- A hidden `<input name="{name}">` carries the variant id, so the element works
  inside any `<form>` without form-associated custom element APIs.
- Children marked `data-plt-fallback` (server-rendered `<select>`) are hidden
  and disabled on upgrade: without JavaScript the form still submits a variant.

### Styling

Uses `d-btn`, `d-btn-primary`, `d-btn-outline`, `d-select`, `theme-*` and
`.plt-option-picker*`, plus the `.plt-variant-picker*` rules in
`@playlovetoys/design-system/variant-picker`
(`packages/design-system/src/components/variant-picker.css`). The other
components use the existing anatomy in `patterns.css` plus
`@playlovetoys/design-system/web-components`
(`src/components/web-components.css`: drawer sheet, filter chips, focus states).
Both files are included by the full design-system stylesheet and fall back to
daisyUI 5 variables when `--plt-*` tokens are absent. Tailwind consumers
should add `@source` for this package's `dist/` (and the adapters they use)
so the classes are generated.

## Entry points

| Import | Contents |
| --- | --- |
| `@playlovetoys/web-components/<group>` | Classes, types and helpers. Does not register tags. Groups: `variant-picker`, `quantity-selector`, `cart`, `collection`, `product`, `navigation`. |
| `@playlovetoys/web-components/<group>/define` | Registers the group's tags once (no-op on the server or when already defined). |
| `@playlovetoys/web-components/all` | Registers every component. |
| `@playlovetoys/web-components/bundle` | `dist/plt-web-components.bundle.js`: all components, Lit included once, for Shopify themes. |
| `@playlovetoys/web-components/variant-picker/bundle` | `dist/plt-variant-picker.bundle.js`: the pilot's single-component bundle. |
| `@playlovetoys/web-components/variant-picker/resolve` | Pure variant resolution (no DOM, no Lit). |
| `@playlovetoys/web-components/variant-picker/storefront` | `fromStorefrontProduct()` — Storefront API product → picker data. |
| `@playlovetoys/web-components/react` | React 18/19 adapters for every element, built on `createComponent()`. |
| `@playlovetoys/web-components/adapters/liquid/*` | Snippets: `plt-variant-picker`, `plt-quantity-selector`, `plt-cart-drawer`, `plt-filter-bar`, `plt-sort-select`, `plt-pagination`, `plt-web-components` (loads the bundle). |
| `@playlovetoys/web-components/adapters/astro/*` | `VariantPicker`, `QuantitySelector`, `CartLine`, `CartDrawer`, `FilterBar`, `SortSelect`, `Pagination`, `WebComponents` (registers all). |

The design-system renderers ProductDetail, ProductQuickView and Navbar (Astro
and Liquid) already wrap their markup in the enhancing elements; Liquid pages
add `{% render 'plt-web-components' %}` once, Astro pages get the script from
the renderer.

`dist/` is committed (and verified by `npm run check:dist`) because consumers
install the design system as a git dependency and Shopify themes copy the
bundle into `assets/`.

## Installing in a frontend

With npm, the design system is a git dependency of the whole repository
(npm cannot install a sub-directory), so paths include `packages/…`:

```jsonc
// package.json
"@playlovetoys/platform": "github:aavendano/plt-design-system#<commit>",
"lit": "^3.3.1"
```

```js
import VariantPicker from "@playlovetoys/platform/packages/web-components/adapters/astro/VariantPicker.astro";
import { fromStorefrontProduct } from "@playlovetoys/platform/packages/web-components/dist/variant-picker/storefront.js";
```

`lit` must be a dependency of the frontend: git dependencies do not install
the workspace's own dependencies. Frontends that do not import the whole
design-system stylesheet add the picker styles on their own (they fall back
to daisyUI 5 theme variables when `--plt-*` tokens are absent) and register
the classes with Tailwind:

```css
@import "@playlovetoys/platform/packages/design-system/src/components/variant-picker.css";
@source "../../node_modules/@playlovetoys/platform/packages/web-components/dist";
@source "../../node_modules/@playlovetoys/platform/packages/web-components/adapters/astro";
```

With pnpm, `github:aavendano/plt-design-system#<commit>&path:/packages/web-components`
installs the package under its own name and the `exports` below apply.

## Platform adapters

### Shopify Liquid

Copy `dist/plt-web-components.bundle.js` to the theme's `assets/` and the
snippets in `adapters/liquid/` to `snippets/`. Each data snippet loads the
bundle (module scripts with one URL run once); pages that only use the
enhancing renderers (Navbar, ProductDetail, ProductQuickView) render
`{% render 'plt-web-components' %}` once. Inside the product form:

```liquid
{%- assign sold_out_label = 'products.product.sold_out' | t -%}
{%- assign unavailable_label = 'products.product.unavailable' | t -%}
{% render 'plt-variant-picker',
  product: product,
  sold_out_label: sold_out_label,
  unavailable_label: unavailable_label
%}
```

The theme keeps price, button state and URL updates by listening to
`plt:variant-change`. No React, Astro or Alpine is required. The other
snippets map Shopify objects directly: `plt-cart-drawer` (`cart`; prices
formatted with `money` in Liquid), `plt-filter-bar` (`collection.filters`,
list filters), `plt-sort-select` (`collection.sort_options`),
`plt-pagination` (`paginate`), `plt-quantity-selector`.

### Astro

```astro
---
import VariantPicker from "@playlovetoys/web-components/adapters/astro/VariantPicker.astro";
import { fromStorefrontProduct } from "@playlovetoys/web-components/variant-picker/storefront";
const picker = fromStorefrontProduct(product); // product from the Storefront API
---
<form method="post" action="/api/cart">
  <VariantPicker {...picker} name="merchandiseId" labels={{ soldOut: t("soldOut") }} />
</form>
```

The component renders on the server as plain HTML plus the no-JS fallback; the
client `<script>` only registers the element.

### Hydrogen React

```tsx
import { PltVariantPicker } from "@playlovetoys/web-components/react";
import { fromStorefrontProduct } from "@playlovetoys/web-components/variant-picker/storefront";

const picker = useMemo(() => fromStorefrontProduct(product), [product]);
<PltVariantPicker
  {...picker}
  name="merchandiseId"
  onVariantChange={({ selectedOptions }) =>
    navigate(`?${new URLSearchParams(selectedOptions.map((o) => [o.name, o.value]))}`, { replace: true })
  }
/>;
```

Every adapter comes from one generic bridge, `createComponent({ tag, load,
properties, attributes, events, fallback })`: arrays and objects travel as DOM
properties, simple values are mirrored as attributes for the server HTML, DOM
events map to callbacks (`onVariantChange`, `onLineChange`, `onFilterChange`,
…; the callback gets `(detail, event)`), and the element definition is
imported lazily in an effect, so server rendering never touches
`customElements` and hydration sees the server's markup. Memoize array and
object props to avoid resetting properties on every render. Cancel collection
events to route with `navigate()`:

```tsx
<PltFilterBar filters={filters} onFilterChange={(detail, event) => {
  event.preventDefault();
  navigate(`?${detail.query}`, { replace: true });
}} />
<PltCartDrawer open={open} lines={lines} subtotal={subtotal} busy={pending}
  onLineChange={({ lineId, quantity }) => cart.updateLines([{ id: lineId, quantity }])}
  onLineRemove={({ lineId }) => cart.removeLines([lineId])}
  onClose={() => setOpen(false)} />
```

## Development

```bash
npm run build -w @playlovetoys/web-components        # dist/
npm run test -w @playlovetoys/web-components         # unit + SSR (jsdom / node)
npm run test:browser -w @playlovetoys/web-components # Liquid, Astro, React demos in Chromium
npm run size -w @playlovetoys/web-components         # bundle sizes
```

`test:browser` builds three storefront demos in `examples/.out/{liquid,astro,react}`
(Liquid rendered with liquidjs, a real `astro build`, React SSR + hydration),
each with navbar + mega menu, product page (gallery, variant picker, quantity),
collection controls, quick views and the cart drawer, and drives them with
Playwright: pointer and keyboard use, events, cart mutations, client routing
vs. default navigation, axe-core, no-JS fallbacks, and pixel / ARIA parity
across the three frontends. Screenshots land in `examples/.out/screenshots/`. It needs Chromium
(`npx playwright install chromium`).
