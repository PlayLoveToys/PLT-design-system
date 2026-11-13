import { createElement as h } from "react";
import { createComponent } from "./create.js";
import { preservedEntries } from "../collection/params.js";
const PltQuantitySelector = createComponent({
  tag: "plt-quantity-selector",
  load: () => import("../quantity-selector/define.js"),
  properties: ["value", "min", "max", "step", "name", "disabled", "labels"],
  attributes: { value: "value", min: "min", max: "max", step: "step", name: "name", disabled: "disabled" },
  events: { onQuantityChange: "plt:quantity-change" },
  fallback: ({ value = 1, min = 1, max, name = "quantity", labels }) => h("input", {
    "data-plt-fallback": "",
    className: "d-input",
    type: "number",
    name: name || void 0,
    defaultValue: value,
    min,
    max: max ?? void 0,
    "aria-label": labels?.quantity ?? "Quantity"
  })
});
const PltProductGallery = createComponent({
  tag: "plt-product-gallery",
  load: () => import("../product/define.js"),
  properties: ["selectedIndex"],
  attributes: { selectedIndex: "selected-index" },
  events: { onGalleryChange: "plt:gallery-change" }
});
const PltQuickView = createComponent({
  tag: "plt-quick-view",
  load: () => import("../product/define.js"),
  properties: ["open"],
  events: { onOpen: "plt:quick-view-open", onClose: "plt:quick-view-close" }
});
const PltCartLine = createComponent({
  tag: "plt-cart-line",
  load: () => import("../cart/define.js"),
  properties: ["line", "labels", "busy"],
  attributes: { busy: "busy" },
  events: { onLineChange: "plt:cart-line-change", onLineRemove: "plt:cart-line-remove" }
});
const PltCartDrawer = createComponent({
  tag: "plt-cart-drawer",
  load: () => import("../cart/define.js"),
  properties: ["open", "lines", "subtotal", "checkoutUrl", "cartUrl", "busy", "error", "labels"],
  attributes: { checkoutUrl: "checkout-url", cartUrl: "cart-url", busy: "busy" },
  events: {
    onOpen: "plt:cart-drawer-open",
    onClose: "plt:cart-drawer-close",
    onLineChange: "plt:cart-line-change",
    onLineRemove: "plt:cart-line-remove"
  }
});
const PltFilterBar = createComponent({
  tag: "plt-filter-bar",
  load: () => import("../collection/define.js"),
  properties: ["filters", "action", "method", "manual", "orientation", "hideChips", "labels", "preserve"],
  attributes: { action: "action", method: "method", manual: "manual", orientation: "orientation", hideChips: "hide-chips" },
  events: { onFilterChange: "plt:filter-change" },
  fallback: ({ filters, action = "", method = "get", labels, preserve }) => h(
    "form",
    { "data-plt-fallback": "", className: "plt-filter-bar", action, method },
    ...preservedEntries(preserve).map(
      ([name, value], index) => h("input", { key: `preserve-${index}`, type: "hidden", name, defaultValue: value })
    ),
    ...filters.map(
      (filter) => filter.range ? h(
        "fieldset",
        { key: filter.id, className: "plt-filter-bar__field plt-filter-bar__range" },
        h("legend", { className: "theme-label-bold" }, filter.label),
        h(
          "div",
          { className: "plt-filter-bar__bounds" },
          ...[["min", filter.range.min], ["max", filter.range.max]].map(
            ([kind, bound]) => h("input", {
              key: bound.name,
              className: "d-input d-input-sm",
              type: "number",
              inputMode: "decimal",
              min: 0,
              step: "any",
              name: bound.name,
              defaultValue: bound.value ?? "",
              placeholder: bound.placeholder,
              "aria-label": bound.label ?? `${filter.label} ${labels?.[kind] ?? (kind === "min" ? "Min" : "Max")}`
            })
          )
        )
      ) : filter.multiple ? h(
        "fieldset",
        { key: filter.id, className: "plt-filter-bar__field plt-filter-bar__group" },
        h("legend", { className: "theme-label-bold" }, filter.label),
        h(
          "ul",
          { className: "plt-filter-bar__options" },
          ...filter.options.filter((option) => option.value !== "").map(
            (option) => h(
              "li",
              { key: option.value },
              h(
                "label",
                { className: "plt-filter-bar__option" },
                h("input", { type: "checkbox", className: "d-checkbox d-checkbox-primary", name: filter.id, value: option.value, defaultChecked: option.selected }),
                h(
                  "span",
                  { className: "theme-label-bold" },
                  option.label,
                  option.count != null ? h("span", { className: "theme-meta" }, ` (${option.count})`) : null
                )
              )
            )
          )
        )
      ) : h(
        "label",
        { key: filter.id, className: "plt-filter-bar__field theme-label-bold" },
        filter.label,
        h(
          "select",
          { className: "d-select", name: filter.id, defaultValue: filter.options.find((o) => o.selected)?.value },
          ...filter.options.map((option) => h("option", { key: option.value, value: option.value }, option.label))
        )
      )
    ),
    h("button", { type: "submit", className: "d-btn d-btn-primary theme-label-bold" }, labels?.apply ?? "Apply")
  )
});
const PltSortSelect = createComponent({
  tag: "plt-sort-select",
  load: () => import("../collection/define.js"),
  properties: ["options", "name", "label", "action", "method", "manual", "applyLabel", "preserve"],
  attributes: { name: "name", label: "label", action: "action", method: "method", manual: "manual" },
  events: { onSortChange: "plt:sort-change" },
  fallback: ({ options, name = "sort", label = "Sort by", action = "", method = "get", applyLabel = "Apply", preserve }) => h(
    "form",
    { "data-plt-fallback": "", className: "plt-sort-select", action, method },
    ...preservedEntries(preserve).map(
      ([n, value], index) => h("input", { key: `preserve-${index}`, type: "hidden", name: n, defaultValue: value })
    ),
    h(
      "label",
      { className: "theme-label-bold" },
      label,
      h(
        "select",
        { className: "d-select", name, defaultValue: options.find((o) => o.selected)?.value },
        ...options.map((option) => h("option", { key: option.value, value: option.value }, option.label))
      )
    ),
    h("button", { type: "submit", className: "d-btn d-btn-outline theme-label-bold" }, applyLabel)
  )
});
const PltPagination = createComponent({
  tag: "plt-pagination",
  load: () => import("../collection/define.js"),
  properties: ["pages", "previousUrl", "nextUrl", "labels", "variant"],
  attributes: { previousUrl: "previous-url", nextUrl: "next-url" },
  events: { onPageChange: "plt:page-change" },
  fallback: ({ pages, previousUrl, nextUrl, labels }) => h(
    "nav",
    { "data-plt-fallback": "", "aria-label": labels?.nav ?? "Pagination" },
    previousUrl ? h("a", { href: previousUrl }, labels?.previous ?? "Previous") : null,
    ...pages.map(
      (page) => page.url && !page.current ? h("a", { key: page.label, href: page.url }, page.label) : h("span", { key: page.label, "aria-current": page.current ? "page" : void 0 }, page.label)
    ),
    nextUrl ? h("a", { href: nextUrl }, labels?.next ?? "Next") : null
  )
});
const PltNavbar = createComponent({
  tag: "plt-navbar",
  load: () => import("../navigation/define.js"),
  properties: ["hoverDelay", "publishHeight", "overflowMin"],
  attributes: { hoverDelay: "hover-delay", publishHeight: "publish-height", overflowMin: "overflow-min" },
  events: {
    onToggle: "plt:navbar-toggle",
    onMegaMenuToggle: "plt:megamenu-toggle",
    onOverflow: "plt:navbar-overflow"
  }
});
export {
  PltCartDrawer,
  PltCartLine,
  PltFilterBar,
  PltNavbar,
  PltPagination,
  PltProductGallery,
  PltQuantitySelector,
  PltQuickView,
  PltSortSelect
};
