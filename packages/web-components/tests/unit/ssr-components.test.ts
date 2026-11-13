// @vitest-environment node
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  PltCartDrawer,
  PltFilterBar,
  PltNavbar,
  PltPagination,
  PltQuantitySelector,
  PltSortSelect,
} from "../../src/react/components";
import { shopifyLiquid } from "../fixtures/liquid.mjs";

const adapters = fileURLToPath(new URL("../../adapters/liquid/", import.meta.url));
const renderers = fileURLToPath(new URL("../../../design-system/renderers/liquid/", import.meta.url));
const render = async (file: string, context: Record<string, unknown>) =>
  shopifyLiquid().parseAndRender(await readFile(file, "utf8"), context);
const decode = (raw: string) =>
  JSON.parse(raw.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c))).replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
const attribute = (html: string, name: string) => decode(html.match(new RegExp(`\\s${name}="([^"]*)"`))![1]);

describe("server rendering of every component", () => {
  it("imports every entry point without a DOM", async () => {
    expect(typeof document).toBe("undefined");
    const entries = [
      import("../../dist/all.js"),
      import("../../dist/quantity-selector/define.js"),
      import("../../dist/cart/define.js"),
      import("../../dist/collection/define.js"),
      import("../../dist/product/define.js"),
      import("../../dist/navigation/define.js"),
      import("../../dist/react/index.js"),
    ];
    for (const entry of entries) await expect(entry).resolves.toBeTruthy();
  });

  it("React adapters render the element and their no-JS fallbacks", () => {
    const quantity = renderToString(h(PltQuantitySelector, { value: 2, max: 5, name: "quantity" }));
    expect(quantity).toMatch(/^<plt-quantity-selector value="2" max="5" name="quantity"><input data-plt-fallback="" /);
    expect(quantity).toMatch(/<input[^>]* type="number"[^>]* name="quantity"[^>]* value="2"/);

    const filters = renderToString(
      h(PltFilterBar, { filters: [{ id: "color", label: "Color", options: [{ label: "All", value: "" }, { label: "Red", value: "red", selected: true }] }], action: "/c" }),
    );
    expect(filters).toContain('<plt-filter-bar action="/c">');
    expect(filters).toContain('<form data-plt-fallback="" class="plt-filter-bar" action="/c" method="get">');
    expect(filters).toContain('<option value="red" selected="">Red</option>');
    expect(filters).not.toContain("filters=");

    const multi = renderToString(
      h(PltFilterBar, {
        filters: [{ id: "filter.p.vendor", label: "Brand", multiple: true, options: [{ label: "Dorcel", value: "Dorcel", count: 4, selected: true }, { label: "Any", value: "" }] }],
        preserve: { sort_by: "price-ascending", tag: ["a", "b"] },
        orientation: "vertical",
      }),
    );
    expect(multi).toContain('<plt-filter-bar orientation="vertical">');
    expect(multi).toMatch(/<input type="hidden" name="sort_by" value="price-ascending"\/>/);
    expect(multi).toMatch(/<input type="hidden" name="tag" value="a"\/><input type="hidden" name="tag" value="b"\/>/);
    expect(multi).toContain('<legend class="theme-label-bold">Brand</legend>');
    expect(multi).toMatch(/<input type="checkbox" class="d-checkbox d-checkbox-primary" name="filter\.p\.vendor" checked="" value="Dorcel"\/>/);
    expect(multi).toContain('<span class="theme-meta"> (4)</span>');
    expect(multi).not.toContain('value=""');

    const sort = renderToString(h(PltSortSelect, { options: [{ label: "A", value: "a" }], name: "sort_by", preserve: { "filter.p.vendor": "Dorcel" } }));
    expect(sort).toContain('<select class="d-select" name="sort_by">');
    expect(sort).toMatch(/<input type="hidden" name="filter\.p\.vendor" value="Dorcel"\/>/);

    const pages = renderToString(h(PltPagination, { pages: [{ label: "1", url: "?page=1" }, { label: "2", current: true }], nextUrl: "?page=3" }));
    expect(pages).toContain('<plt-pagination next-url="?page=3"><nav data-plt-fallback="" aria-label="Pagination"><a href="?page=1">1</a><span aria-current="page">2</span><a href="?page=3">Next</a></nav>');

    const drawer = renderToString(h(PltCartDrawer, { lines: [], cartUrl: "/cart" }));
    expect(drawer).toBe('<plt-cart-drawer cart-url="/cart"></plt-cart-drawer>');

    const navbar = renderToString(h(PltNavbar, { children: h("header", { className: "plt-navbar" }) }));
    expect(navbar).toBe('<plt-navbar><header class="plt-navbar"></header></plt-navbar>');
  });

  it("Liquid: quantity selector", async () => {
    const html = await render(`${adapters}plt-quantity-selector.liquid`, { value: 3, max: 9, quantity_label: 'Qty "x"' });
    expect(html).toContain('value="3"');
    expect(html).toContain('max="9"');
    expect(attribute(html, "labels")).toEqual({ decrease: "Decrease quantity", increase: "Increase quantity", quantity: 'Qty "x"' });
    expect(html).toContain('<input data-plt-fallback class="d-input" type="number" name="quantity" value="3" min="1" step="1" max="9"');
  });

  it("Liquid: quantity selector carries the variant quantity rule step", async () => {
    const html = await render(`${adapters}plt-quantity-selector.liquid`, { value: 6, min: 6, step: 3, max: 30 });
    expect(html).toMatch(/<plt-quantity-selector[^>]* min="6"[^>]* step="3"[^>]* max="30"/);
    expect(html).toContain('min="6" step="3" max="30"');
  });

  it("Liquid: cart drawer maps the Shopify cart, formatting money server-side", async () => {
    const cart = {
      total_price: 5700,
      items: [
        { key: "40001:abc", quantity: 2, url: "/products/tee?variant=40001", image: "tee.jpg", final_line_price: 3800, original_line_price: 4400, product: { title: "Play Tee <b>", has_only_default_variant: false }, variant: { title: "Red / S" } },
        { key: "40007:def", quantity: 1, url: "/products/ring", image: null, final_line_price: 1900, original_line_price: 1900, product: { title: "Ring", has_only_default_variant: true }, variant: { title: "Default Title" } },
      ],
    };
    const html = await render(`${adapters}plt-cart-drawer.liquid`, { cart, routes: { cart_url: "/cart" }, title: "Panier", decrease_label: "Moins", increase_label: "Plus", quantity_label: "Quantité" });
    expect(attribute(html, "lines")).toEqual([
      { id: "40001:abc", title: "Play Tee <b>", url: "/products/tee?variant=40001", imageUrl: "tee.jpg", imageAlt: "Play Tee <b>", variantTitle: "Red / S", quantity: 2, price: "$38.00", compareAtPrice: "$44.00" },
      { id: "40007:def", title: "Ring", url: "/products/ring", imageUrl: null, imageAlt: "Ring", variantTitle: null, quantity: 1, price: "$19.00", compareAtPrice: null },
    ]);
    expect(html).toContain('subtotal="$57.00"');
    expect(html).toContain('cart-url="/cart"');
    expect(attribute(html, "labels")).toMatchObject({ title: "Panier", decrease: "Moins", increase: "Plus", quantity: "Quantité" });
    expect(html).not.toContain("<b>");
  });

  it("Liquid: filters, sort options and paginate", async () => {
    const filters = [
      { type: "list", param_name: "filter.v.option.color", label: "Color", values: [{ value: "Red", label: "Red", active: true, count: 4 }, { value: "Blue", label: "Blue", active: true, count: 2 }] },
      {
        type: "boolean",
        param_name: "filter.p.m.custom.organic",
        label: "Organic",
        active_values: [{ value: "1" }],
        values: [
          { value: "1", label: "Yes", active: true, count: 3 },
          { value: "0", label: "No", active: false, count: 0 },
        ],
      },
      { type: "price_range", param_name: "filter.v.price", label: "Price", values: [], range_min: 500, range_max: 20000, min_value: { param_name: "filter.v.price.gte", value: 10 }, max_value: { param_name: "filter.v.price.lte", value: null } },
    ];
    const filterHtml = await render(`${adapters}plt-filter-bar.liquid`, {
      filters,
      action: "/search",
      orientation: "vertical",
      sort_by: "price-ascending",
      search_terms: 'gift "set"',
    });
    expect(attribute(filterHtml, "filters")).toEqual([
      { id: "filter.v.option.color", label: "Color", multiple: true, collapsible: false, options: [{ label: "Red", value: "Red", selected: true, count: 4, disabled: false }, { label: "Blue", value: "Blue", selected: true, count: 2, disabled: false }] },
      {
        id: "filter.p.m.custom.organic",
        label: "Organic",
        multiple: true,
        collapsible: false,
        options: [
          { label: "Yes", value: "1", selected: true, count: 3, disabled: false },
          { label: "No", value: "0", selected: false, count: 0, disabled: true },
        ],
      },
      {
        id: "filter.v.price",
        label: "Price",
        collapsible: false,
        options: [],
        range: { min: { name: "filter.v.price.gte", value: "10", placeholder: "5.00" }, max: { name: "filter.v.price.lte", value: "", placeholder: "200.00" } },
      },
    ]);
    expect(filterHtml).toContain('type="checkbox" name="filter.p.m.custom.organic" value="1" checked');
    expect(filterHtml).toContain('value="0" disabled');
    expect(filterHtml).toContain('type="number" inputmode="decimal" min="0" step="any" name="filter.v.price.gte" value="10" placeholder="5.00" aria-label="Price Min"');
    expect(filterHtml).not.toContain("hide-chips");

    const collapsedHtml = await render(`${adapters}plt-filter-bar.liquid`, {
      filters: [
        { type: "list", param_name: "filter.p.vendor", label: "Brand", active_values: [], values: [{ value: "A", label: "A", active: false, count: 3 }, { value: "B", label: "B", active: false, count: 0 }] },
        filters[2],
      ],
      collapsible: true,
      hide_chips: true,
      min_label: "Desde",
      max_label: "Hasta",
    });
    const collapsedFilters = attribute(collapsedHtml, "filters");
    expect(collapsedFilters[0].collapsible).toBe(true);
    expect(collapsedFilters[0].options.map((option: { disabled: boolean }) => option.disabled)).toEqual([false, true]);
    expect(attribute(collapsedHtml, "labels")).toMatchObject({ min: "Desde", max: "Hasta", apply: "Apply" });
    expect(collapsedHtml).toMatch(/<plt-filter-bar [^>]* hide-chips>/);
    expect(collapsedFilters[1].range.min.label).toBe("Desde");
    expect(collapsedHtml).toContain('aria-label="Hasta"');
    expect(collapsedHtml).toContain('<details class="plt-filter-bar__details"><summary class="theme-label-bold">Brand</summary>');
    expect(collapsedHtml).toContain('<details class="plt-filter-bar__details" open><summary class="theme-label-bold">Price</summary>');
    expect(collapsedHtml).toContain('value="B" disabled');
    expect(attribute(filterHtml, "preserve")).toEqual({ sort_by: "price-ascending", q: 'gift "set"' });
    expect(filterHtml).toContain('orientation="vertical"');
    expect(filterHtml).toContain('<input type="hidden" name="sort_by" value="price-ascending">');
    expect(filterHtml).toContain('<input type="hidden" name="q" value="gift &#34;set&#34;">');
    expect(filterHtml).toContain('type="checkbox" name="filter.v.option.color" value="Red" checked');
    expect(filterHtml).toContain('<span class="theme-meta">(4)</span>');

    const sortHtml = await render(`${adapters}plt-sort-select.liquid`, {
      options: [{ name: "Featured", value: "manual" }, { name: "Price, low to high", value: "price-ascending" }],
      current: "price-ascending",
      filters,
      action: "/search",
      search_terms: "gifts",
    });
    expect(attribute(sortHtml, "options")[1]).toEqual({ label: "Price, low to high", value: "price-ascending", selected: true });
    expect(attribute(sortHtml, "preserve")).toEqual({
      q: "gifts",
      "filter.v.option.color": ["Red", "Blue"],
      "filter.p.m.custom.organic": ["1"],
      "filter.v.price.gte": "10",
    });
    expect(sortHtml).toContain('<input type="hidden" name="filter.p.m.custom.organic" value="1">');
    expect(sortHtml).toContain('<input type="hidden" name="filter.v.price.gte" value="10">');
    expect(sortHtml).not.toContain("filter.v.price.lte");
    expect(sortHtml).toContain('<form data-plt-fallback class="plt-sort-select" action="/search" method="get">');
    expect(sortHtml).toContain('<input type="hidden" name="q" value="gifts">');
    expect(sortHtml.match(/name="filter\.v\.option\.color"/g)).toHaveLength(2);
    expect(sortHtml).toContain('name="sort_by"');

    const paginate = {
      current_page: 2,
      previous: { is_link: true, url: "/collections/all?page=1" },
      next: { is_link: true, url: "/collections/all?page=3" },
      parts: [
        { title: "1", url: "/collections/all?page=1", is_link: true },
        { title: "2", url: "", is_link: false },
        { title: "&hellip;", url: "", is_link: false },
        { title: "9", url: "/collections/all?page=9", is_link: true },
      ],
    };
    const pageHtml = await render(`${adapters}plt-pagination.liquid`, { paginate });
    expect(attribute(pageHtml, "pages")).toEqual([
      { label: "1", url: "/collections/all?page=1", current: false, disabled: false },
      { label: "2", url: null, current: true, disabled: false },
      { label: "…", url: null, current: false, disabled: true },
      { label: "9", url: "/collections/all?page=9", current: false, disabled: false },
    ]);
    expect(pageHtml).toContain('previous-url="/collections/all?page=1"');
    expect(pageHtml).toContain("<span>…</span>");
    expect(pageHtml).not.toContain("hellip");
    expect(pageHtml).not.toContain('variant="compact"');

    const compactHtml = await render(`${adapters}plt-pagination.liquid`, {
      paginate,
      compact: true,
      anchor: "#Comments-123",
    });
    expect(compactHtml).toContain('variant="compact"');
    expect(attribute(compactHtml, "pages")).toEqual([
      { label: "1", url: "/collections/all?page=1#Comments-123", current: false, disabled: false },
      { label: "2", url: null, current: true, disabled: false },
      { label: "…", url: null, current: false, disabled: true },
      { label: "9", url: "/collections/all?page=9#Comments-123", current: false, disabled: false },
    ]);
    expect(compactHtml).toContain('previous-url="/collections/all?page=1#Comments-123"');
    expect(compactHtml).toContain('next-url="/collections/all?page=3#Comments-123"');
    expect(compactHtml).toContain('href="/collections/all?page=1#Comments-123"');
    expect(compactHtml).toContain('href="/collections/all?page=9#Comments-123"');
    expect(compactHtml).toContain('href="/collections/all?page=3#Comments-123"');
  });

  it("Liquid: the Navbar renderer wraps <plt-navbar> and renders mega menus", async () => {
    const links = [
      { label: "Shop", url: "/shop", columns: [{ title: "New", url: "/new", children: [{ label: "Toys", url: "/new/toys" }] }] },
      { label: "About", url: "/about" },
    ];
    const html = await render(`${renderers}navbar.liquid`, { site_name: "PLT", links });
    expect(html.trim().startsWith("<plt-navbar>")).toBe(true);
    expect(html).toContain('aria-haspopup="true" aria-expanded="false" aria-controls="plt-megamenu-0"');
    expect(html).toContain('<div class="plt-megamenu" id="plt-megamenu-0" data-open="false" role="region" aria-label="Shop">');
    expect(html).toContain('<a class="plt-megamenu__link" href="/new/toys">Toys</a>');
    expect(html).not.toContain('aria-controls="plt-megamenu-1"');
  });
});
