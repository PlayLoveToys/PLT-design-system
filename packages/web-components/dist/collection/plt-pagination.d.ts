import { LitElement } from "lit";
import { type PltPage, type PltPaginationLabels } from "./types.js";
/**
 * `<plt-pagination>` — Pagination anatomy (`d-join` of links).
 *
 * Links stay real links. A click emits a cancelable `plt:page-change`;
 * client-routed frontends cancel it and navigate themselves, everyone else
 * gets a normal navigation. The current page is `aria-current="page"`.
 *
 * Set `variant="compact"` for numbered store pagination (content-sized buttons).
 *
 * @fires plt:page-change - cancelable; `{ url, label }`
 */
export declare class PltPagination extends LitElement {
    static properties: {
        pages: {
            type: ArrayConstructor;
            converter: {
                fromAttribute(value: string | null): any;
                toAttribute(value: unknown): string;
            };
        };
        previousUrl: {
            type: StringConstructor;
            attribute: string;
        };
        nextUrl: {
            type: StringConstructor;
            attribute: string;
        };
        labels: {
            type: ObjectConstructor;
            converter: {
                fromAttribute(value: string | null): any;
                toAttribute(value: unknown): string;
            };
        };
        variant: {
            type: StringConstructor;
            reflect: boolean;
        };
    };
    pages: PltPage[];
    previousUrl: string;
    nextUrl: string;
    labels: PltPaginationLabels;
    variant: string;
    constructor();
    protected createRenderRoot(): this;
    connectedCallback(): void;
    protected updated(): void;
    private _onClick;
    private _link;
    private _inert;
    protected render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "plt-pagination": PltPagination;
    }
}
