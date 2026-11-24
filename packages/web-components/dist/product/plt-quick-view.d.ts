import { LitElement, type PropertyValues } from "lit";
export declare const QUICK_VIEW_OPEN_EVENT = "plt:quick-view-open";
export declare const QUICK_VIEW_CLOSE_EVENT = "plt:quick-view-close";
/**
 * `<plt-quick-view>` — enhances the ProductQuickView markup.
 *
 * Contract (unchanged from the former vanilla element): a `[data-quick-view-open]`
 * trigger, a `<dialog>`, and `[data-quick-view-close]` controls. Opening calls
 * `showModal()` (focus moves into the dialog, Escape closes), locks page scroll
 * (shared by every open modal), and closing returns focus to the trigger.
 * Clicking the backdrop closes it. The trigger may be a link to the product
 * page (it stays the no-JavaScript path). Adds an `open` property and events.
 *
 * @fires plt:quick-view-open
 * @fires plt:quick-view-close
 */
export declare class PltQuickView extends LitElement {
    static properties: {
        open: {
            type: BooleanConstructor;
            reflect: boolean;
        };
    };
    open: boolean;
    private _release;
    private _previousFocus;
    private readonly _onDialogClose;
    constructor();
    protected createRenderRoot(): this;
    get dialog(): HTMLDialogElement | null;
    connectedCallback(): void;
    disconnectedCallback(): void;
    protected updated(changed: PropertyValues<this>): void;
    show(): void;
    close(): void;
    private _closed;
    private _onClick;
}
declare global {
    interface HTMLElementTagNameMap {
        "plt-quick-view": PltQuickView;
    }
}
