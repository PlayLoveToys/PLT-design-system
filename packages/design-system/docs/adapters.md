# Platform adapters

Adapters connect the PLT component/design layer to platform conventions without becoming the source of truth for design values.

## Themes

See [themes.md](themes.md): the stylesheet can be consumed as `@playlovetoys/design-system` (PLT look) or through one file in `themes/`.

## Rule

Canonical values live in `--plt-*` tokens. Adapters may alias or expose them, but must not duplicate colors, typography, geometry, spacing or shadows. daisyUI remains the component foundation in every consuming platform.

## Shopify

```css
@import "tailwindcss";
@import "@playlovetoys/design-system";
@import "@playlovetoys/design-system/shopify";
```

The Shopify adapter exposes theme-friendly aliases and section-spacing hooks. Runtime ecommerce behavior, Liquid settings, cart state and product state remain outside the design package.

### Coexisting with a legacy theme stylesheet (Dawn `base.css`)

Do **not** turn on the global Tailwind preflight (`@import "tailwindcss/preflight.css" layer(base)`) while a legacy sheet such as Dawn's `base.css` still styles the page: it also resets the legacy theme's own buttons, inputs and lists (in the harness a Dawn `.button` goes from 238×27 to 96×24 and Dawn lists lose their markers).

The design-system controls need the preflight box model, not the global reset: `box-sizing: border-box`, buttons and inputs without UA padding or borders, a 1.5 line-height. Without it the browser's defaults apply (a `content-box` quantity input grows from 56px to about 82px, the inline `plt-quantity-selector` sits on a line box and becomes 44px tall instead of 40px, and `d-btn` keeps the UA's 1px vertical padding). That is independent of Dawn: the same controls differ from the design target in a page with no legacy sheet and no preflight.

Use the scoped reset and put the legacy sheet in a lower layer:

```css
@layer legacy, theme, plt-base, components, utilities;

@import "./base.css" layer(legacy);                 /* Dawn */
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
@import "@playlovetoys/design-system/scoped-preflight"; /* @layer plt-base */
@import "@playlovetoys/design-system";
@import "@playlovetoys/design-system/shopify";
```

Add `class="plt-ds-root"` to each container that renders design-system markup (a section wrapper, `<main>`, or eventually `<body>`). Inside it the reset (specificity 0, in `plt-base`) beats `legacy`; outside it nothing changes; component and utility classes still win over the reset. Adopt it one section at a time and drop `legacy` when Dawn's sheet is gone, then switch to `@import "tailwindcss"`.

Verified in real Chromium with the real Dawn `base.css` (`packages/web-components/tests/browser/dawn-legacy.test.ts`, harness in `tests/fixtures/dawn-legacy/`): inside `.plt-ds-root`, `plt-quantity-selector`, the `plt-filter-bar` checkboxes and `d-btn` match the no-legacy design target exactly, and Dawn's own controls outside it render as before.

## Astro

```css
@import "tailwindcss";
@import "@playlovetoys/design-system";
@import "@playlovetoys/design-system/astro";
```

The Astro adapter only provides page-shell conveniences and aliases for layout composition. Astro renderers still emit the same prefixed daisyUI classes as Liquid renderers.

## Catalog verification

`demo/index.html` is a no-JavaScript visual catalog, but its stylesheet must be compiled because Tailwind CSS and daisyUI use build-time directives.

```bash
npm install
npm run build:demo
```

For the complete validation suite run `npm run check`.
