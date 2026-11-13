import { LitElement, html, nothing } from "lit";
import { emit, jsonConverter, retireFallback } from "../shared/element.js";
import { PAGE_CHANGE_EVENT } from "./types.js";
const DEFAULT_LABELS = {
  nav: "Pagination",
  previous: "Previous",
  next: "Next"
};
class PltPagination extends LitElement {
  constructor() {
    super();
    this.pages = [];
    this.previousUrl = "";
    this.nextUrl = "";
    this.labels = {};
    this.variant = "";
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    retireFallback(this);
  }
  updated() {
    retireFallback(this);
  }
  _onClick(event, url, label) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!emit(this, PAGE_CHANGE_EVENT, { url, label }, true)) event.preventDefault();
  }
  _link(url, label, ariaLabel) {
    return html`<a
      class="d-btn d-btn-outline d-join-item theme-bordered theme-label-bold"
      href=${url}
      aria-label=${ariaLabel ?? label}
      @click=${(event) => this._onClick(event, url, label)}
    >${label}</a>`;
  }
  _inert(label, current = false) {
    return html`<button
      class="d-btn d-join-item theme-bordered theme-label-bold ${current ? "d-btn-primary" : "d-btn-outline d-btn-disabled"}"
      type="button"
      aria-current=${current ? "page" : nothing}
      disabled
    >${label}</button>`;
  }
  render() {
    const labels = { ...DEFAULT_LABELS, ...this.labels ?? {} };
    const compact = this.variant === "compact";
    return html`<nav class="plt-pagination${compact ? " plt-pagination--compact" : ""}" aria-label=${labels.nav}>
      <div class="d-join">
        ${this.previousUrl ? this._link(this.previousUrl, labels.previous) : this._inert(labels.previous)}
        ${(this.pages ?? []).map(
      (page) => page.url && !page.current && !page.disabled ? this._link(page.url, page.label) : this._inert(page.label, Boolean(page.current))
    )}
        ${this.nextUrl ? this._link(this.nextUrl, labels.next) : this._inert(labels.next)}
      </div>
    </nav>`;
  }
}
PltPagination.properties = {
  pages: { type: Array, converter: jsonConverter("plt-pagination", () => []) },
  previousUrl: { type: String, attribute: "previous-url" },
  nextUrl: { type: String, attribute: "next-url" },
  labels: { type: Object, converter: jsonConverter("plt-pagination", () => ({})) },
  variant: { type: String, reflect: true }
};
export {
  PltPagination
};
