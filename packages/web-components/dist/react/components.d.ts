/**
 * React adapters for every PLT Web Component, built on `createComponent`.
 * Each is configuration only: which props are DOM properties, which are
 * mirrored as attributes for server HTML, which callbacks map to DOM events,
 * and the no-JS fallback.
 */
import { type ReactNode } from "react";
import { type BaseProps } from "./create.js";
import type { PltQuantityChangeDetail, PltQuantitySelectorLabels } from "../quantity-selector/types.js";
import type { PltCartLabels, PltCartLineChangeDetail, PltCartLineData, PltCartLineRemoveDetail } from "../cart/types.js";
import type { PltChoice, PltFilter, PltFilterBarLabels, PltFilterChangeDetail, PltPreserved, PltPage, PltPageChangeDetail, PltPaginationLabels, PltSortChangeDetail } from "../collection/types.js";
import type { PltGalleryChangeDetail } from "../product/plt-product-gallery.js";
import type { PltMegaMenuToggleDetail, PltNavbarOverflowDetail, PltNavbarToggleDetail } from "../navigation/plt-navbar.js";
type Handler<D> = (detail: D, event: CustomEvent<D>) => void;
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
export declare const PltQuantitySelector: import("react").ForwardRefExoticComponent<PltQuantitySelectorProps & import("react").RefAttributes<HTMLElement>>;
export interface PltProductGalleryProps extends BaseProps {
    /** ProductDetail gallery markup (main image + `.plt-product-detail__thumb` buttons). */
    children: ReactNode;
    selectedIndex?: number;
    onGalleryChange?: Handler<PltGalleryChangeDetail>;
}
export declare const PltProductGallery: import("react").ForwardRefExoticComponent<PltProductGalleryProps & import("react").RefAttributes<HTMLElement>>;
export interface PltQuickViewProps extends BaseProps {
    /** ProductQuickView markup: `[data-quick-view-open]`, `<dialog>`, `[data-quick-view-close]`. */
    children: ReactNode;
    open?: boolean;
    onOpen?: Handler<Record<string, never>>;
    onClose?: Handler<Record<string, never>>;
}
export declare const PltQuickView: import("react").ForwardRefExoticComponent<PltQuickViewProps & import("react").RefAttributes<HTMLElement>>;
export interface PltCartLineProps extends BaseProps {
    line: PltCartLineData;
    labels?: PltCartLabels;
    busy?: boolean;
    onLineChange?: Handler<PltCartLineChangeDetail>;
    onLineRemove?: Handler<PltCartLineRemoveDetail>;
}
export declare const PltCartLine: import("react").ForwardRefExoticComponent<PltCartLineProps & import("react").RefAttributes<HTMLElement>>;
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
export declare const PltCartDrawer: import("react").ForwardRefExoticComponent<PltCartDrawerProps & import("react").RefAttributes<HTMLElement>>;
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
export declare const PltFilterBar: import("react").ForwardRefExoticComponent<PltFilterBarProps & import("react").RefAttributes<HTMLElement>>;
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
export declare const PltSortSelect: import("react").ForwardRefExoticComponent<PltSortSelectProps & import("react").RefAttributes<HTMLElement>>;
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
export declare const PltPagination: import("react").ForwardRefExoticComponent<PltPaginationProps & import("react").RefAttributes<HTMLElement>>;
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
export declare const PltNavbar: import("react").ForwardRefExoticComponent<PltNavbarProps & import("react").RefAttributes<HTMLElement>>;
export {};
