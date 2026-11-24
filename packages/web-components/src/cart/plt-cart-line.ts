import { LitElement, html, nothing } from "lit";
import { live } from "lit/directives/live.js";
import { emit, jsonConverter, retireFallback } from "../shared/element.js";
import type { PltQuantityChangeDetail } from "../quantity-selector/types.js";
import {
  CART_LINE_CHANGE_EVENT,
  CART_LINE_REMOVE_EVENT,
  DEFAULT_CART_LABELS,
  type PltCartLabels,
  type PltCartLineChangeDetail,
  type PltCartLineData,
  type PltCartLineRemoveDetail,
} from "./types.js";

/**
 * `<plt-cart-line>` — one cart line (CartLine anatomy) with a
 * `<plt-quantity-selector>` and a remove button.
 *
 * It reports intent and never mutates the cart: the consumer performs the
 * Shopify mutation, then sets `line` (and clears `busy`).
 *
 * @fires plt:cart-line-change - `{ lineId, quantity, previousQuantity }`
 * @fires plt:cart-line-remove - `{ lineId }`
 */
export class PltCartLine extends LitElement {
  static override properties = {
    line: { type: Object, converter: jsonConverter("plt-cart-line", () => null) },
    labels: { type: Object, converter: jsonConverter("plt-cart-line", () => ({})) },
    busy: { type: Boolean, reflect: true },
  };

  declare line: PltCartLineData | null;
  declare labels: PltCartLabels;
  /** Set while the consumer's mutation is in flight: controls are disabled. */
  declare busy: boolean;

  constructor() {
    super();
    this.line = null;
    this.labels = {};
    this.busy = false;
    this.addEventListener("plt:quantity-change", (event) => this._onQuantity(event as CustomEvent<PltQuantityChangeDetail>));
  }

  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    // Server-rendered no-JS markup (`data-plt-fallback`) gives way to the rendered line.
    retireFallback(this);
  }

  private _onQuantity(event: CustomEvent<PltQuantityChangeDetail>) {
    // The line speaks for its quantity control; nobody else needs the inner event.
    event.stopPropagation();
    if (!this.line) return;
    emit<PltCartLineChangeDetail>(this, CART_LINE_CHANGE_EVENT, {
      lineId: this.line.id,
      quantity: event.detail.value,
      previousQuantity: event.detail.previousValue,
    });
  }

  private _remove() {
    if (!this.line || this.busy) return;
    emit<PltCartLineRemoveDetail>(this, CART_LINE_REMOVE_EVENT, { lineId: this.line.id });
  }

  protected override render() {
    const line = this.line;
    if (!line) return nothing;
    const labels = { ...DEFAULT_CART_LABELS, ...(this.labels ?? {}) };
    const image = line.imageUrl
      ? html`<img src=${line.imageUrl} alt=${line.imageAlt ?? ""} loading="lazy" />`
      : nothing;
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

declare global {
  interface HTMLElementTagNameMap {
    "plt-cart-line": PltCartLine;
  }
}
