import { LitElement, type PropertyValues } from "lit";
import { type PltSearchLabels, type PltSearchResults } from "./types.js";
/**
 * `<plt-predictive-search>` — SearchField with a suggestions popup
 * (ARIA 1.2 combobox with a listbox of grouped options).
 *
 * It never fetches. Typing (at least `min-length` characters, after `debounce`
 * ms) emits `plt:predictive-search-query`; the consumer queries its search
 * API, then sets `results` and clears `loading`. Without JavaScript the
 * server-rendered `data-plt-fallback` form is a normal GET search.
 *
 * Keyboard: ArrowDown / ArrowUp move through the options (wrapping) and open
 * the popup, Enter follows the active option (or submits the form when none
 * is active), Escape closes the popup (a second Escape clears the field),
 * focus leaving the element closes it.
 *
 * @fires plt:predictive-search-query - `{ query }`, debounced
 * @fires plt:predictive-search-select - cancelable; `{ kind, url, groupId?, item?, query }`
 */
export declare class PltPredictiveSearch extends LitElement {
    static properties: {
        results: {
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
        loading: {
            type: BooleanConstructor;
            reflect: boolean;
        };
        value: {
            type: StringConstructor;
        };
        action: {
            type: StringConstructor;
        };
        method: {
            type: StringConstructor;
        };
        name: {
            type: StringConstructor;
        };
        placeholder: {
            type: StringConstructor;
        };
        minLength: {
            type: NumberConstructor;
            attribute: string;
        };
        debounce: {
            type: NumberConstructor;
        };
        _open: {
            state: boolean;
        };
        _active: {
            state: boolean;
        };
    };
    results: PltSearchResults | null;
    labels: PltSearchLabels;
    /** Set by the consumer while a query is in flight. */
    loading: boolean;
    value: string;
    action: string;
    method: string;
    name: string;
    placeholder: string;
    minLength: number;
    debounce: number;
    private _open;
    private _active;
    private readonly _id;
    private _timer;
    private readonly _onPointerDown;
    constructor();
    protected createRenderRoot(): this;
    connectedCallback(): void;
    disconnectedCallback(): void;
    protected willUpdate(changed: PropertyValues<this>): void;
    get input(): HTMLInputElement | null;
    private get _labels();
    private get _query();
    private get _ready();
    private get _options();
    private get _viewAllUrl();
    private _close;
    private _onInput;
    private _onKeydown;
    /** Emits the cancelable select event; runs `proceed` unless a listener cancels it. */
    private _choose;
    private _status;
    private _renderItem;
    private _onLinkClick;
    protected render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "plt-predictive-search": PltPredictiveSearch;
    }
}
