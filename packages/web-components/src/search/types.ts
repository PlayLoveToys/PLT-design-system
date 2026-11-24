/**
 * Predictive Search contracts. The component never fetches: the consumer
 * (theme bridge) listens to `plt:predictive-search-query`, calls its search
 * API (for Shopify, `/search/suggest`), then sets `results` and clears `loading`.
 */
export interface PltSearchItem {
  /** Stable id (optional); used to build option ids. */
  id?: string;
  title: string;
  url: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  /** Secondary line: vendor, product type, page kind… */
  meta?: string | null;
  /** Formatted price (display string; never computed here). */
  price?: string | null;
}

export interface PltSearchGroup {
  /** `products`, `collections`, `pages` or `queries` (any string is accepted). */
  id: string;
  label: string;
  items: PltSearchItem[];
}

export interface PltSearchResults {
  groups: PltSearchGroup[];
  /** "View all" destination; defaults to `{action}?{name}={query}`. */
  viewAllUrl?: string | null;
}

export interface PltSearchLabels {
  /** Accessible name of the input. */
  input?: string;
  submit?: string;
  loading?: string;
  /** `{query}` is replaced with the typed text. */
  empty?: string;
  /** `{count}` is replaced with the number of suggestions. */
  count?: string;
  viewAll?: string;
}

export interface PltSearchQueryDetail {
  query: string;
}

export interface PltSearchSelectDetail {
  /** `item`, or `all` for the "view all" link. */
  kind: "item" | "all";
  url: string;
  groupId?: string;
  item?: PltSearchItem;
  query: string;
}

export const SEARCH_QUERY_EVENT = "plt:predictive-search-query";
export const SEARCH_SELECT_EVENT = "plt:predictive-search-select";

export const DEFAULT_SEARCH_LABELS: Required<PltSearchLabels> = {
  input: "Search",
  submit: "Search",
  loading: "Loading results…",
  empty: "No results for “{query}”",
  count: "{count} suggestions available",
  viewAll: "View all results",
};
