# Themes

A theme is a file in `themes/` that sets the `--plt-*` token values and adds the few rules tokens cannot express. The structure (typography hooks, utilities, primitives, patterns) is shared and lives in `src/base.css`; it reads tokens and carries the PLT values only as defaults.

| Theme | File | Look |
| --- | --- | --- |
| `plt` | `themes/plt.css` | The original PlayLoveToys look: bold borders, hard shadows, display type in capitals. Same output as `src/index.css`. |
| `neutral` | `themes/neutral.css` | Stock daisyUI `light` values: thin borders, soft shadows, system fonts, no capitals. |
| `nocturne` | `themes/nocturne.css` | Dark, compact, one accent (`#9184d9`), 8px radii, Inter at medium weight, outlined primary buttons. From the Nocturne kit. |
| `docs` | `themes/docs.css` | Dense dark documentation UI: canvas `#0A0A0F`, violet accent `#8B7CF6`, Inter + JetBrains Mono, hairline borders, no shadows, filled primary buttons. Reading hierarchy (secondary body, primary headings). Visual docs chrome (`PageOutline`, `NavTree`, `EditorialShell` + `plt-docs-*` patterns) lives in the package; the app orchestrates data. |
| `docs-light` | `themes/docs-light.css` | Light counterpart to `docs`: canvas `#FAFAFB`, white surfaces, elevated `#F4F4F6`, border `#E4E4E9`, text primary `#0A0A0F` / secondary `#52525B`, deepened violet `#6D5BE0` for AA link contrast, soft elevation `0 1px 2px rgba(10,10,15,0.06)`. Same type and component signatures as `docs`. |
| `capricho` | `themes/capricho.css` | Quiet editorial luxury (Lunar Caprice): cream ground, charcoal ink, matte gold, marble-dark hero, Bodoni Moda display with Jost, square corners, hairline borders, soft shadows. |
| `broadsheet` | `themes/broadsheet.css` | Printed-newspaper register: cool newsprint ground, near-black ink, Source Serif 4 throughout, cyan accent and magenta second ink, no dark bands or section dividers, small radii, soft ink shadows. |
| `konstrukt` | `themes/konstrukt.css` | Bauhaus/Swiss on paper: riso red, blue and ochre, flat blocks, 2px charcoal borders, no shadows, square corners, uppercase Source Serif 4 headlines with Jost and IBM Plex Mono. |
| `unconventionals` | `themes/unconventionals.css` | Neobrutalist editorial: 3px ink borders, hard offset shadows, PLAYROOM palette (magenta, coral, amber, teal, indigo), Lexend Mega display with Public Sans and Proza Libre. |
| `workbench` | `themes/workbench.css` | Production tool as printed matter: warm paper, coral, slate, mustard and olive inks, 1px rules, flat minimal shadows, IBM Plex Serif, Sans and Mono. |
| `playlovetoys` | `themes/playlovetoys.css` | The live storefront brand: white and cool paper, purple structure, hot-pink call to action, teal accent, Roboto Condensed with Fredoka, 6px corners, soft cool shadows, springy motion, gradient hero. |
| `playdoh` | `themes/playdoh.css` | Claymorphism: soft squishy clay with big radii (20 to 40px), two inset shadows plus a pastel drop shadow, on warm cream. Nectarine, Peche, Menthe and Lagune pastels with deep teal ink, Fredoka with Nunito, springy lift and press. |
| `patio` | `themes/patio.css` | KV Custom Windows + Doors (kvcustomwd.com): white and Bootstrap greys, purple `#533379` structure and headings, pink `#ef446d` call to action, orange `#f2a413` and lavender `#a198ca` accents, Roboto Slab headlines in spaced capitals with Instrument Sans, square corners, hairlines, no shadows, a 120 × 8 purple rule under the hero headline. White on the pink is 3.7:1 (bold buttons only). |
| `cheesecake` | `themes/cheesecake.css` | **Canonical storefront look** — mirror of Liquid daisyUI `brand`: cream `#FAF7F2`, 1.5px borders, 3px section borders, 2px hard shadows (hover 5px), capitalised Fjalla One, Atkinson Hyperlegible and Space Grotesk, purple / hot pink / teal. Same tokens as `plt`. See `storefront-visual-parity.md`. |

## Using one

Import exactly one theme after Tailwind; each declares its own daisyUI plugin configuration, so do not combine two themes or a theme with `src/index.css`.

```css
@import "tailwindcss";
@import "@playlovetoys/design-system/themes/neutral";
```

For the documentation look (dark or light — import exactly one):

```css
@import "tailwindcss";
@import "@playlovetoys/design-system/themes/docs";
/* or: @import "@playlovetoys/design-system/themes/docs-light"; */
```

An application can pick the theme at build time (for example from a `THEME` environment variable resolved in its bundler config). Fonts are not bundled: a theme names the family (`--plt-font-*`) and the application loads the files. For `docs` / `docs-light`, load Inter and JetBrains Mono (or accept the system/ui-monospace fallbacks). Docs chrome markup and sticky/outline CSS live in the package (`EditorialShell`, `PageOutline`, `NavTree`, `plt-docs-*` / `plt-editorial-shell` in `src/patterns.css`, tokens `--plt-docs-sticky-top` and `--plt-docs-outline-section-gap`). The app owns document shell (header/footer), manifests, sync, and presenters. Style app-only chrome with `--plt-*` / `--plt-docs-*` tokens (including `--plt-docs-accent-subtle` for tinted badges and active nav).

## Tokens a theme sets

- Colors: `--plt-color-{base-100,base-200,base-300,base-content,primary,secondary,accent,neutral,info,success,warning,error}` and their `-content` pairs.
- Shape: `--plt-radius-{selector,field,box}`, `--plt-size-{selector,field}`, `--plt-border-width`, `--plt-section-border-width`, `--plt-border-color`.
- Elevation: `--plt-shadow-color`, `--plt-shadow-offset`, `--plt-shadow-hover-offset`, `--plt-shadow-active-offset` (set the offsets to `0px` to remove hard shadows).
- Surface relief: `--plt-elevation-inset` (an inset `box-shadow` list). Cards (`.d-card.theme-elevated`) paint it on an overlay above their children, so a photo or banner that fills one side of the card gets the same relief as the rest. Empty by default. Do not set inset shadows on the card's own `box-shadow`: media covers them.
- Media: `--plt-media-background` (ground behind photos) and `--plt-media-fit` (`contain` or `cover`).
- Type: `--plt-font-{display,body,accent}`, `--plt-heading-{weight,tracking,transform}`, `--plt-label-{weight,tracking,transform}`, `--plt-price-tracking`.
- Layout: `--plt-page-width`, `--plt-section-gap-min`, and the fluid pairs below.

### Fluid layout

Gutters, section spacing, panel padding and the product-card minimum grow linearly from a 320px to a 1280px viewport (`src/tokens/layout.css`). A theme sets each one as two unitless rem numbers, never a `clamp()`:

```css
:root {
  --plt-gutter-min: 1.5;            /* 1.5rem side margin at 320px */
  --plt-gutter-max: 3;              /* 3rem from 1280px up */
  --plt-space-section-{min,max}: …; /* .plt-section padding */
  --plt-space-section-lg-{min,max}: …; /* hero, newsletter */
  --plt-space-panel-{min,max}: …;   /* split CTA, newsletter card */
  --plt-product-card-{min-min,min-max}: …; /* when the product grid drops a column */
}
```

`--plt-page-margin` is now an alias of `--plt-gutter`; set the pair instead. Text widths use `--plt-measure-short` / `--plt-measure` / `--plt-measure-long` (45 / 66 / 75 characters, capped at the previous rem widths), so line length holds when a theme swaps to a wider or narrower font.

The product grid no longer uses viewport media queries: it fits as many columns as its own width allows at `--plt-product-card-min`, up to the `--cols-N` hint, so it steps down by itself beside a filter sidebar.

Unset tokens fall back to the PLT defaults in `src/tokens.css`, `src/geometry.css` and `src/typography.css`.

## Adding a theme

1. Copy `themes/neutral.css` to `themes/<name>.css`.
2. Override the tokens above under `:root`; add rules only for what tokens cannot express (for example outlined buttons or the focus ring).
3. Run `npm run build:themes`; it compiles the demo once per theme and fails if a theme does not compile.

Brand values belong in the token overrides, never in new selectors that duplicate the patterns.

Rules for theme selectors:

- A theme changes tokens. Add a selector only for a signature a token cannot express, and say why in a comment.
- Never set `position`, `display` or `z-index` on a shared class (`.theme-elevated`, `.d-*`): daisyUI components rely on their own (a menu is `position: absolute`) and an unlayered theme rule wins over them. `npm run check:themes` enforces this (also `overflow`, `float`, `inset`); pseudo-elements and single-use `.plt-*` classes are fine, and a deliberate exception takes a `/* theme-rules-ok: reason */` comment above the declaration.
- Effects that must show over media or children go on an overlay, not on the container's own background.
- The base styles (`src/patterns.css`, `primitives.css`, `typography.css`, `base.css`, `utilities.css`, `geometry.css`) use tokens: no hex or `rgb()`/`oklch()` colours, no literal `font-family`, no `!important`. `npm run check:css` (stylelint) enforces it; an exception needs a `stylelint-disable-next-line` comment that says why.
