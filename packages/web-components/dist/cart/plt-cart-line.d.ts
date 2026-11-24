import { LitElement, nothing } from "lit";
import { type PltCartLabels, type PltCartLineData } from "./types.js";
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
export declare class PltCartLine extends LitElement {
    static properties: {
        line: {
            type: ObjectConstructor;
            converter: {
                fromAttribute(value: string | null): any;
                toAttribute(value: unknown): string;
            };
        };
        labels: {
            type: ObjectConstructor;
            converter: {
                fromAttribute(value: string | null): any;
                toAttribute(value: unknown): string;
            };
        };
        busy: {
            type: BooleanConstructor;
            reflect: boolean;
        };
    };
    line: PltCartLineData | null;
    labels: PltCartLabels;
    /** Set while the consumer's mutation is in flight: controls are disabled. */
    busy: boolean;
    constructor();
    protected createRenderRoot(): this;
    connectedCallback(): void;
    private _onQuantity;
    private _remove;
    protected render(): typeof nothing | import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "plt-cart-line": PltCartLine;
    }
}
