import { LitElement, html, nothing } from "lit";
import { emit, jsonConverter, retireFallback } from "../shared/element.js";
import { PAGE_CHANGE_EVENT, type PltPage, type PltPageChangeDetail, type PltPaginationLabels } from "./types.js";

const DEFAULT_LABELS: Required<PltPaginationLabels> = {
  nav: "Pagination",
  previous: "Previous",
  next: "Next",
};

/**
 * `<plt-pagination>` — Pagination anatomy (`d-join` of links).
 *
 * Links stay real links. A click emits a cancelable `plt:page-change`;
 * client-routed frontends cancel it and navigate themselves, everyone else
 * gets a normal navigation. The current page is `aria-current="page"`.
 *
 * @fires plt:page-change - cancelable; `{ url, label }`
 */
export class PltPagination extends LitElement {
  static override properties = {
    pages: { type: Array, converter: jsonConverter("plt-pagination", () => []) },
    previousUrl: { type: String, attribute: "previous-url" },
    nextUrl: { type: String, attribute: "next-url" },
    labels: { type: Object, converter: jsonConverter("plt-pagination", () => ({})) },
    variant: { type: String, reflect: true },
  };

  declare pages: PltPage[];
  declare previousUrl: string;
  declare nextUrl: string;
  declare labels: PltPaginationLabels;
  /** `"compact"` renders content-sized buttons in one joined row (numbered store pagination). */
  declare variant: string;

  constructor() {
    super();
    this.pages = [];
    this.previousUrl = "";
    this.nextUrl = "";
    this.labels = {};
    this.variant = "";
  }

  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    retireFallback(this);
  }

  protected override updated() {
    retireFallback(this);
  }

  private _onClick(event: MouseEvent, url: string, label: string) {
    // Let modified clicks (new tab/window) through untouched.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!emit<PltPageChangeDetail>(this, PAGE_CHANGE_EVENT, { url, label }, true)) event.preventDefault();
  }

  private _link(url: string, label: string, ariaLabel?: string) {
    return html`<a
      class="d-btn d-btn-outline d-join-item theme-bordered theme-label-bold"
      href=${url}
      aria-label=${ariaLabel ?? label}
      @click=${(event: MouseEvent) => this._onClick(event, url, label)}
    >${label}</a>`;
  }

  private _inert(label: string, current = false) {
    return html`<button
      class="d-btn d-join-item theme-bordered theme-label-bold ${current ? "d-btn-primary" : "d-btn-outline d-btn-disabled"}"
      type="button"
      aria-current=${current ? "page" : nothing}
      disabled
    >${label}</button>`;
  }

  protected override render() {
    const labels = { ...DEFAULT_LABELS, ...(this.labels ?? {}) };
    return html`<nav class="plt-pagination${this.variant === "compact" ? " plt-pagination--compact" : ""}" aria-label=${labels.nav}>
      <div class="d-join">
        ${this.previousUrl ? this._link(this.previousUrl, labels.previous) : this._inert(labels.previous)}
        ${(this.pages ?? []).map((page) =>
          page.url && !page.current && !page.disabled ? this._link(page.url, page.label) : this._inert(page.label, Boolean(page.current)),
        )}
        ${this.nextUrl ? this._link(this.nextUrl, labels.next) : this._inert(labels.next)}
      </div>
    </nav>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "plt-pagination": PltPagination;
  }
}
