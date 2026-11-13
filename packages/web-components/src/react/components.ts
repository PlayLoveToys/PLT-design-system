/**
 * React adapters for every PLT Web Component, built on `createComponent`.
 * Each is configuration only: which props are DOM properties, which are
 * mirrored as attributes for server HTML, which callbacks map to DOM events,
 * and the no-JS fallback.
 */
import { createElement as h, type ReactNode } from "react";
import { createComponent, type BaseProps } from "./create.js";
import type { PltQuantityChangeDetail, PltQuantitySelectorLabels } from "../quantity-selector/types.js";
import type {
  PltCartLabels,
  PltCartLineChangeDetail,
  PltCartLineData,
  PltCartLineRemoveDetail,
} from "../cart/types.js";
import type {
  PltChoice,
  PltFilter,
  PltFilterBarLabels,
  PltFilterChangeDetail,
  PltPreserved,
  PltPage,
  PltPageChangeDetail,
  PltPaginationLabels,
  PltSortChangeDetail,
} from "../collection/types.js";
import { preservedEntries } from "../collection/params.js";
import type { PltGalleryChangeDetail } from "../product/plt-product-gallery.js";
import type { PltMegaMenuToggleDetail, PltNavbarOverflowDetail, PltNavbarToggleDetail } from "../navigation/plt-navbar.js";

type Handler<D> = (detail: D, event: CustomEvent<D>) => void;

// --- Product ----------------------------------------------------------------

export interface PltQuantitySelectorProps extends BaseProps {
  value?: number;
  min?: number;
  max?: number | null;
  step?: number;
  name?: string;
  disabled?: boolean;
  labels?: PltQuantitySelectorLabels;
  onQuantityChange?: Handler<PltQuantityChangeDetail>;
}

export const PltQuantitySelector = createComponent<PltQuantitySelectorProps>({
  tag: "plt-quantity-selector",
  load: () => import("../quantity-selector/define.js"),
  properties: ["value", "min", "max", "step", "name", "disabled", "labels"],
  attributes: { value: "value", min: "min", max: "max", step: "step", name: "name", disabled: "disabled" },
  events: { onQuantityChange: "plt:quantity-change" },
  fallback: ({ value = 1, min = 1, max, name = "quantity", labels }) =>
    h("input", {
      "data-plt-fallback": "",
      className: "d-input",
      type: "number",
      name: name || undefined,
      defaultValue: value,
      min,
      max: max ?? undefined,
      "aria-label": labels?.quantity ?? "Quantity",
    }),
});

export interface PltProductGalleryProps extends BaseProps {
  /** ProductDetail gallery markup (main image + `.plt-product-detail__thumb` buttons). */
  children: ReactNode;
  selectedIndex?: number;
  onGalleryChange?: Handler<PltGalleryChangeDetail>;
}

export const PltProductGallery = createComponent<PltProductGalleryProps>({
  tag: "plt-product-gallery",
  load: () => import("../product/define.js"),
  properties: ["selectedIndex"],
  attributes: { selectedIndex: "selected-index" },
  events: { onGalleryChange: "plt:gallery-change" },
});

export interface PltQuickViewProps extends BaseProps {
  /** ProductQuickView markup: `[data-quick-view-open]`, `<dialog>`, `[data-quick-view-close]`. */
  children: ReactNode;
  open?: boolean;
  onOpen?: Handler<Record<string, never>>;
  onClose?: Handler<Record<string, never>>;
}

export const PltQuickView = createComponent<PltQuickViewProps>({
  tag: "plt-quick-view",
  load: () => import("../product/define.js"),
  properties: ["open"],
  events: { onOpen: "plt:quick-view-open", onClose: "plt:quick-view-close" },
});

// --- Cart -------------------------------------------------------------------

export interface PltCartLineProps extends BaseProps {
  line: PltCartLineData;
  labels?: PltCartLabels;
  busy?: boolean;
  onLineChange?: Handler<PltCartLineChangeDetail>;
  onLineRemove?: Handler<PltCartLineRemoveDetail>;
}

export const PltCartLine = createComponent<PltCartLineProps>({
  tag: "plt-cart-line",
  load: () => import("../cart/define.js"),
  properties: ["line", "labels", "busy"],
  attributes: { busy: "busy" },
  events: { onLineChange: "plt:cart-line-change", onLineRemove: "plt:cart-line-remove" },
});

export interface PltCartDrawerProps extends BaseProps {
  open?: boolean;
  lines: PltCartLineData[];
  subtotal?: string;
  checkoutUrl?: string;
  cartUrl?: string;
  busy?: boolean;
  error?: string;
  labels?: PltCartLabels;
  onOpen?: Handler<Record<string, never>>;
  onClose?: Handler<Record<string, never>>;
  onLineChange?: Handler<PltCartLineChangeDetail>;
  onLineRemove?: Handler<PltCartLineRemoveDetail>;
}

export const PltCartDrawer = createComponent<PltCartDrawerProps>({
  tag: "plt-cart-drawer",
  load: () => import("../cart/define.js"),
  properties: ["open", "lines", "subtotal", "checkoutUrl", "cartUrl", "busy", "error", "labels"],
  attributes: { checkoutUrl: "checkout-url", cartUrl: "cart-url", busy: "busy" },
  events: {
    onOpen: "plt:cart-drawer-open",
    onClose: "plt:cart-drawer-close",
    onLineChange: "plt:cart-line-change",
    onLineRemove: "plt:cart-line-remove",
  },
});

// --- Collection ---------------------------------------------------------------

export interface PltFilterBarProps extends BaseProps {
  filters: PltFilter[];
  action?: string;
  method?: string;
  manual?: boolean;
  orientation?: "horizontal" | "vertical";
  /** Leave the active-filter chips to the frontend. */
  hideChips?: boolean;
  labels?: PltFilterBarLabels;
  /** Query parameters another control owns; kept by a native submit. */
  preserve?: PltPreserved;
  /** Cancel the event (`event.preventDefault()`) to navigate client-side. */
  onFilterChange?: Handler<PltFilterChangeDetail>;
}

export const PltFilterBar = createComponent<PltFilterBarProps>({
  tag: "plt-filter-bar",
  load: () => import("../collection/define.js"),
  properties: ["filters", "action", "method", "manual", "orientation", "hideChips", "labels", "preserve"],
  attributes: { action: "action", method: "method", manual: "manual", orientation: "orientation", hideChips: "hide-chips" },
  events: { onFilterChange: "plt:filter-change" },
  fallback: ({ filters, action = "", method = "get", labels, preserve }) =>
    h(
      "form",
      { "data-plt-fallback": "", className: "plt-filter-bar", action, method },
      ...preservedEntries(preserve).map(([name, value], index) =>
        h("input", { key: `preserve-${index}`, type: "hidden", name, defaultValue: value }),
      ),
      ...filters.map((filter) =>
        filter.range
          ? h(
              "fieldset",
              { key: filter.id, className: "plt-filter-bar__field plt-filter-bar__range" },
              h("legend", { className: "theme-label-bold" }, filter.label),
              h(
                "div",
                { className: "plt-filter-bar__bounds" },
                ...([["min", filter.range.min], ["max", filter.range.max]] as const).map(([kind, bound]) =>
                  h("input", {
                    key: bound.name,
                    className: "d-input d-input-sm",
                    type: "number",
                    inputMode: "decimal",
                    min: 0,
                    step: "any",
                    name: bound.name,
                    defaultValue: bound.value ?? "",
                    placeholder: bound.placeholder,
                    "aria-label": bound.label ?? `${filter.label} ${labels?.[kind] ?? (kind === "min" ? "Min" : "Max")}`,
                  }),
                ),
              ),
            )
          : filter.multiple
          ? h(
              "fieldset",
              { key: filter.id, className: "plt-filter-bar__field plt-filter-bar__group" },
              h("legend", { className: "theme-label-bold" }, filter.label),
              h(
                "ul",
                { className: "plt-filter-bar__options" },
                ...filter.options
                  .filter((option) => option.value !== "")
                  .map((option) =>
                    h(
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
                          option.count != null ? h("span", { className: "theme-meta" }, ` (${option.count})`) : null,
                        ),
                      ),
                    ),
                  ),
              ),
            )
          : h(
              "label",
              { key: filter.id, className: "plt-filter-bar__field theme-label-bold" },
              filter.label,
              h(
                "select",
                { className: "d-select", name: filter.id, defaultValue: filter.options.find((o) => o.selected)?.value },
                ...filter.options.map((option) => h("option", { key: option.value, value: option.value }, option.label)),
              ),
            ),
      ),
      h("button", { type: "submit", className: "d-btn d-btn-primary theme-label-bold" }, labels?.apply ?? "Apply"),
    ),
});

export interface PltSortSelectProps extends BaseProps {
  options: PltChoice[];
  name?: string;
  label?: string;
  action?: string;
  method?: string;
  manual?: boolean;
  applyLabel?: string;
  /** Query parameters another control owns; kept by a native submit. */
  preserve?: PltPreserved;
  /** Cancel the event (`event.preventDefault()`) to navigate client-side. */
  onSortChange?: Handler<PltSortChangeDetail>;
}

export const PltSortSelect = createComponent<PltSortSelectProps>({
  tag: "plt-sort-select",
  load: () => import("../collection/define.js"),
  properties: ["options", "name", "label", "action", "method", "manual", "applyLabel", "preserve"],
  attributes: { name: "name", label: "label", action: "action", method: "method", manual: "manual" },
  events: { onSortChange: "plt:sort-change" },
  fallback: ({ options, name = "sort", label = "Sort by", action = "", method = "get", applyLabel = "Apply", preserve }) =>
    h(
      "form",
      { "data-plt-fallback": "", className: "plt-sort-select", action, method },
      ...preservedEntries(preserve).map(([n, value], index) =>
        h("input", { key: `preserve-${index}`, type: "hidden", name: n, defaultValue: value }),
      ),
      h(
        "label",
        { className: "theme-label-bold" },
        label,
        h(
          "select",
          { className: "d-select", name, defaultValue: options.find((o) => o.selected)?.value },
          ...options.map((option) => h("option", { key: option.value, value: option.value }, option.label)),
        ),
      ),
      h("button", { type: "submit", className: "d-btn d-btn-outline theme-label-bold" }, applyLabel),
    ),
});

export interface PltPaginationProps extends BaseProps {
  pages: PltPage[];
  previousUrl?: string;
  nextUrl?: string;
  labels?: PltPaginationLabels;
  /** Numbered store pagination (`variant="compact"`). */
  variant?: "compact" | string;
  /** Cancel the event (`event.preventDefault()`) to navigate client-side. */
  onPageChange?: Handler<PltPageChangeDetail>;
}

export const PltPagination = createComponent<PltPaginationProps>({
  tag: "plt-pagination",
  load: () => import("../collection/define.js"),
  properties: ["pages", "previousUrl", "nextUrl", "labels", "variant"],
  attributes: { previousUrl: "previous-url", nextUrl: "next-url" },
  events: { onPageChange: "plt:page-change" },
  fallback: ({ pages, previousUrl, nextUrl, labels }) =>
    h(
      "nav",
      { "data-plt-fallback": "", "aria-label": labels?.nav ?? "Pagination" },
      previousUrl ? h("a", { href: previousUrl }, labels?.previous ?? "Previous") : null,
      ...pages.map((page) =>
        page.url && !page.current
          ? h("a", { key: page.label, href: page.url }, page.label)
          : h("span", { key: page.label, "aria-current": page.current ? "page" : undefined }, page.label),
      ),
      nextUrl ? h("a", { href: nextUrl }, labels?.next ?? "Next") : null,
    ),
});

// --- Navigation ---------------------------------------------------------------

export interface PltNavbarProps extends BaseProps {
  /** Navbar markup (toggle, mobile panel, mega menu triggers and panels). */
  children: ReactNode;
  /** Milliseconds a hover must last before a mega menu panel opens (default: at once). */
  hoverDelay?: number;
  /** Keep `--plt-navbar-height` equal to the navbar's height: `""` on the element, `"root"` on `<html>`. */
  publishHeight?: string;
  /** Items that always stay visible when `[data-plt-navbar-overflow]` collapses the rest into "More" (default 1). */
  overflowMin?: number;
  onToggle?: Handler<PltNavbarToggleDetail>;
  onOverflow?: Handler<PltNavbarOverflowDetail>;
  onMegaMenuToggle?: Handler<PltMegaMenuToggleDetail>;
}

export const PltNavbar = createComponent<PltNavbarProps>({
  tag: "plt-navbar",
  load: () => import("../navigation/define.js"),
  properties: ["hoverDelay", "publishHeight", "overflowMin"],
  attributes: { hoverDelay: "hover-delay", publishHeight: "publish-height", overflowMin: "overflow-min" },
  events: {
    onToggle: "plt:navbar-toggle",
    onMegaMenuToggle: "plt:megamenu-toggle",
    onOverflow: "plt:navbar-overflow",
  },
});
