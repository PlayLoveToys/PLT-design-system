import { LitElement, html, nothing } from "lit";
import { live } from "lit/directives/live.js";
import { emit, jsonConverter, retireFallback } from "../shared/element.js";
import {
  CART_LINE_CHANGE_EVENT,
  CART_LINE_REMOVE_EVENT,
  DEFAULT_CART_LABELS
} from "./types.js";
class PltCartLine extends LitElement {
  constructor() {
    super();
    this.line = null;
    this.labels = {};
    this.busy = false;
    this.addEventListener("plt:quantity-change", (event) => this._onQuantity(event));
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    retireFallback(this);
  }
  _onQuantity(event) {
    event.stopPropagation();
    if (!this.line) return;
    emit(this, CART_LINE_CHANGE_EVENT, {
      lineId: this.line.id,
      quantity: event.detail.value,
      previousQuantity: event.detail.previousValue
    });
  }
  _remove() {
    if (!this.line || this.busy) return;
    emit(this, CART_LINE_REMOVE_EVENT, { lineId: this.line.id });
  }
  render() {
    const line = this.line;
    if (!line) return nothing;
    const labels = { ...DEFAULT_CART_LABELS, ...this.labels ?? {} };
    const image = line.imageUrl ? html`<img src=${line.imageUrl} alt=${line.imageAlt ?? ""} loading="lazy" />` : nothing;
    const title = line.url ? html`<a href=${line.url}>${line.title}</a>` : line.title;
    return html`<article class="plt-cart-line" aria-busy=${this.busy ? "true" : "false"}>
      <div class="plt-cart-line__media">${line.url && line.imageUrl ? html`<a href=${line.url} tabindex="-1" aria-hidden="true">${image}</a>` : image}</div>
      <div>
        <h3 class="theme-headline-sm plt-cart-line__title">${title}</h3>
        ${line.variantTitle ? html`<p class="theme-meta plt-cart-line__meta">${line.variantTitle}</p>` : nothing}
        <div class="plt-cart-line__controls">
          <plt-quantity-selector
            name=""
            .value=${live(line.quantity)}
            .min=${1}
            .max=${line.maxQuantity ?? null}
            .labels=${{ decrease: labels.decrease, increase: labels.increase, quantity: `${labels.quantity}, ${line.title}` }}
            ?disabled=${this.busy}
          ></plt-quantity-selector>
          <button
            type="button"
            class="d-btn d-btn-ghost d-btn-sm theme-label-bold plt-cart-line__remove"
            aria-label=${`${labels.remove}: ${line.title}`}
            ?disabled=${this.busy}
            @click=${() => this._remove()}
          >${labels.remove}</button>
        </div>
      </div>
      <div class="plt-cart-line__price">
        ${line.compareAtPrice ? html`<s class="plt-cart-line__compare">${line.compareAtPrice}</s> ` : nothing}${line.price}
      </div>
    </article>`;
  }
}
PltCartLine.properties = {
  line: { type: Object, converter: jsonConverter("plt-cart-line", () => null) },
  labels: { type: Object, converter: jsonConverter("plt-cart-line", () => ({})) },
  busy: { type: Boolean, reflect: true }
};
export {
  PltCartLine
};
