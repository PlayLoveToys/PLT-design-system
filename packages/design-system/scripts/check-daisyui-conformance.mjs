import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const scanRoots = ["src", "themes", "adapters", "renderers", "demo"];
const textExtensions = new Set([".css", ".astro", ".liquid", ".html"]);

const forbiddenClasses = [
  // Parallel PLT component APIs
  "plt-button",
  "plt-card",
  "plt-badge",
  "plt-field",
  "plt-input",
  "plt-select",
  "plt-textarea",
  "plt-alert",
  "plt-divider",
  "plt-nav-link",
  "plt-headline-lg",
  "plt-headline-sm",
  "plt-body-lg",
  "plt-meta",
  "plt-bordered",
  "plt-elevated",
  "plt-sidebar-shadow",
  // Removed/obsolete daisyUI v5 modifiers
  "d-input-bordered",
  "d-select-bordered",
  "d-textarea-bordered",
  "d-card-bordered",
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (textExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

const errors = [];
for (const scanRoot of scanRoots) {
  const files = await walk(join(root, scanRoot));
  for (const file of files) {
    const text = await readFile(file, "utf8");
    for (const className of forbiddenClasses) {
      const escaped = escapeRegExp(className);
      const tokenUse = new RegExp(`(?:\\.${escaped}(?![\\w-])|["'\\s]${escaped}(?=["'\\s]))`);
      if (tokenUse.test(text)) {
        errors.push(`${relative(root, file)} uses forbidden or obsolete class ${className}`);
      }
    }
  }
}

const required = {
  "renderers/astro/product/ProductCard.astro": ["d-card", "d-card-body", "d-card-title", "d-card-actions", "d-badge", "d-btn"],
  "renderers/liquid/product-card.liquid": ["d-card", "d-card-body", "d-card-title", "d-card-actions", "d-badge", "d-btn"],
  "renderers/astro/collection/CollectionCard.astro": ["d-card", "d-card-body", "d-card-title"],
  "renderers/liquid/collection-card.liquid": ["d-card", "d-card-body", "d-card-title"],
  "renderers/astro/layout/Hero.astro": ["d-hero", "d-hero-content", "d-hero-overlay", "d-btn"],
  "renderers/liquid/hero.liquid": ["d-hero", "d-hero-content", "d-hero-overlay", "d-btn"],
  "renderers/astro/editorial/Newsletter.astro": ["d-card", "d-card-body", "d-card-title", "d-input", "d-btn"],
  "renderers/liquid/newsletter.liquid": ["d-card", "d-card-body", "d-card-title", "d-input", "d-btn"],
  "renderers/astro/layout/PromoStrip.astro": ["d-btn"],
  "renderers/liquid/promo-strip.liquid": ["d-btn"],
  "renderers/astro/editorial/SectionHeader.astro": ["d-badge", "theme-headline-lg", "plt-section-header"],
  "renderers/liquid/section-header.liquid": ["d-badge", "theme-headline-lg", "plt-section-header"],
  "renderers/astro/editorial/Faq.astro": ["d-collapse", "d-collapse-arrow", "d-collapse-title", "d-collapse-content", "plt-faq"],
  "renderers/liquid/faq.liquid": ["d-collapse", "d-collapse-arrow", "d-collapse-title", "d-collapse-content", "plt-faq"],
  "renderers/astro/editorial/RichText.astro": ["plt-prose"],
  "renderers/liquid/rich-text.liquid": ["plt-prose"],
  "renderers/astro/editorial/EditorialCard.astro": ["d-card", "d-card-body", "d-card-title", "d-card-actions", "d-btn"],
  "renderers/liquid/editorial-card.liquid": ["d-card", "d-card-body", "d-card-title", "d-card-actions", "d-btn"],
  "renderers/astro/editorial/SplitCta.astro": ["d-btn", "d-badge", "plt-split-cta"],
  "renderers/liquid/split-cta.liquid": ["d-btn", "d-badge", "plt-split-cta"],
  "renderers/astro/navigation/Breadcrumbs.astro": ["d-breadcrumbs", "plt-breadcrumbs"],
  "renderers/liquid/breadcrumbs.liquid": ["d-breadcrumbs", "plt-breadcrumbs"],
  "renderers/astro/navigation/Navbar.astro": ["d-navbar", "d-menu", "d-btn", "plt-navbar"],
  "renderers/liquid/navbar.liquid": ["d-navbar", "d-menu", "d-btn", "plt-navbar"],
  "renderers/astro/navigation/MegaMenu.astro": ["plt-megamenu", "plt-megamenu__inner", "plt-megamenu__column", "plt-megamenu__title", "plt-megamenu__list", "plt-megamenu__link"],
  "renderers/liquid/megamenu.liquid": ["plt-megamenu", "plt-megamenu__inner", "plt-megamenu__column", "plt-megamenu__title", "plt-megamenu__list", "plt-megamenu__link"],
  "renderers/astro/navigation/MarketSelector.astro": ["d-dropdown", "d-badge", "d-menu", "plt-market-selector"],
  "renderers/liquid/market-selector.liquid": ["d-dropdown", "d-badge", "d-menu", "plt-market-selector"],
  "renderers/astro/layout/Footer.astro": ["d-footer", "d-menu", "d-btn", "plt-footer"],
  "renderers/liquid/footer.liquid": ["d-footer", "d-menu", "d-btn", "plt-footer"],
  "renderers/astro/cart/CartDrawer.astro": ["d-drawer", "d-drawer-toggle", "d-drawer-side", "d-btn", "plt-cart-drawer"],
  "renderers/liquid/cart-drawer.liquid": ["d-drawer", "d-drawer-toggle", "d-drawer-side", "d-btn", "plt-cart-drawer"],
  "renderers/astro/cart/CartLine.astro": ["plt-cart-line", "theme-headline-sm"],
  "renderers/liquid/cart-line.liquid": ["plt-cart-line", "theme-headline-sm"],
  "renderers/astro/product/ProductGrid.astro": ["plt-product-grid"],
  "renderers/liquid/product-grid.liquid": ["plt-product-grid"],
  "renderers/astro/product/ProductDetail.astro": ["plt-product-detail", "d-badge", "theme-headline-lg"],
  "renderers/liquid/product-detail.liquid": ["plt-product-detail", "d-badge", "theme-headline-lg"],
  "renderers/astro/commerce/OptionPicker.astro": ["d-btn", "plt-option-picker"],
  "renderers/liquid/option-picker.liquid": ["d-btn", "plt-option-picker"],
  "renderers/astro/commerce/QuantitySelector.astro": ["d-join", "d-btn", "d-input", "plt-quantity-selector"],
  "renderers/liquid/quantity-selector.liquid": ["d-join", "d-btn", "d-input", "plt-quantity-selector"],
  "renderers/astro/commerce/CartSummary.astro": ["d-card", "d-card-body", "d-card-title", "d-card-actions", "d-btn"],
  "renderers/liquid/cart-summary.liquid": ["d-card", "d-card-body", "d-card-title", "d-card-actions", "d-btn"],
  "renderers/astro/collection/FilterBar.astro": ["d-select", "d-btn", "plt-filter-bar"],
  "renderers/liquid/filter-bar.liquid": ["d-select", "d-btn", "plt-filter-bar"],
  "renderers/astro/collection/SortSelect.astro": ["d-select", "plt-sort-select"],
  "renderers/liquid/sort-select.liquid": ["d-select", "plt-sort-select"],
  "renderers/astro/ui/SearchField.astro": ["d-input", "d-btn", "plt-search-field"],
  "renderers/liquid/search-field.liquid": ["d-input", "d-btn", "plt-search-field"],
  "renderers/astro/ui/Pagination.astro": ["d-join", "d-btn", "plt-pagination"],
  "renderers/liquid/pagination.liquid": ["d-join", "d-btn", "plt-pagination"],
  "renderers/astro/ui/EmptyState.astro": ["d-alert", "d-btn", "plt-empty-state"],
  "renderers/liquid/empty-state.liquid": ["d-alert", "d-btn", "plt-empty-state"],
  "renderers/astro/ui/ChipPills.astro": ["d-badge", "plt-chip-pills"],
  "renderers/liquid/chip-pills.liquid": ["d-badge", "plt-chip-pills"],
  "renderers/astro/editorial/LocationCard.astro": ["d-card", "d-card-body", "d-card-title", "plt-media-card", "plt-location-card"],
  "renderers/liquid/location-card.liquid": ["d-card", "d-card-body", "d-card-title", "plt-media-card", "plt-location-card"],
  "renderers/astro/commerce/Price.astro": ["plt-price", "plt-product-card__price"],
  "renderers/astro/commerce/Stock.astro": ["plt-stock", "data-stock-state"],
  "renderers/astro/editorial/PageOutline.astro": ["plt-docs-toc"],
  "renderers/astro/editorial/NavTree.astro": ["d-menu", "plt-docs-nav-tree"],
  "renderers/astro/layout/EditorialShell.astro": ["plt-editorial-shell"],
  "demo/index.html": [
    "d-btn",
    "d-card",
    "d-card-body",
    "d-card-title",
    "d-card-actions",
    "d-badge",
    "d-input",
    "d-select",
    "d-textarea",
    "d-divider",
    "d-alert",
    "d-link",
    "d-tabs",
    "d-tab",
    "d-navbar",
    "d-breadcrumbs",
    "d-drawer",
    "d-footer",
    "plt-product-card",
    "plt-hero",
    "plt-section-header",
  ],
};

for (const [path, classes] of Object.entries(required)) {
  const text = await readFile(join(root, path), "utf8");
  for (const className of classes) {
    if (!text.includes(className)) errors.push(`${path} is missing required daisyUI class ${className}`);
  }
}

const theme = await readFile(join(root, "src/daisyui-theme.css"), "utf8");
for (const expected of [
  'prefix: "d-"',
  "themes: brand --default",
  "--radius-selector",
  "--radius-field",
  "--radius-box",
  "--size-selector",
  "--size-field",
  "--border",
  "--depth",
  "--noise",
]) {
  if (!theme.includes(expected)) errors.push(`src/daisyui-theme.css is missing ${expected}`);
}

if (errors.length) {
  console.error("daisyUI conformance check failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("daisyUI conformance check passed.");
