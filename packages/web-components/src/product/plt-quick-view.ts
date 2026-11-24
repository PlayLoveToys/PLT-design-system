import { LitElement, type PropertyValues } from "lit";
import { emit, lockScroll } from "../shared/element.js";

export const QUICK_VIEW_OPEN_EVENT = "plt:quick-view-open";
export const QUICK_VIEW_CLOSE_EVENT = "plt:quick-view-close";

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
export class PltQuickView extends LitElement {
  static override properties = {
    open: { type: Boolean, reflect: true },
  };

  declare open: boolean;

  private _release: (() => void) | null = null;
  private _previousFocus: Element | null = null;
  private readonly _onDialogClose = () => this._closed();

  constructor() {
    super();
    this.open = false;
    this.addEventListener("click", (event) => this._onClick(event));
  }

  protected override createRenderRoot() {
    return this;
  }

  get dialog(): HTMLDialogElement | null {
    return this.querySelector("dialog");
  }

  override connectedCallback() {
    super.connectedCallback();
    this.dialog?.addEventListener("close", this._onDialogClose);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.dialog?.removeEventListener("close", this._onDialogClose);
    if (this._release) {
      this._release();
      this._release = null;
      this.open = false;
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    if (!changed.has("open")) return;
    if (this.open && !this._release) this.show();
    else if (!this.open && this._release) this.close();
  }

  show() {
    const dialog = this.dialog;
    if (!dialog || this._release || !this.isConnected) return;
    this._previousFocus = document.activeElement;
    this._release = lockScroll();
    dialog.showModal();
    this.open = true;
    emit(this, QUICK_VIEW_OPEN_EVENT, {});
  }

  close() {
    if (this.dialog && this._release) this.dialog.close();
  }

  private _closed() {
    if (!this._release) return;
    this._release();
    this._release = null;
    this.open = false;
    const previous = this._previousFocus as HTMLElement | null;
    if (previous && typeof previous.focus === "function") previous.focus();
    emit(this, QUICK_VIEW_CLOSE_EVENT, {});
  }

  private _onClick(event: MouseEvent) {
    const target = event.target as Element | null;
    if (!target?.closest) return;
    if (target.closest("[data-quick-view-open]")) {
      // A trigger rendered as a link still works without JavaScript; with it, open the dialog instead.
      event.preventDefault();
      return this.show();
    }
    if (target.closest("[data-quick-view-close]")) return this.close();
    const dialog = this.dialog;
    if (dialog && target === dialog) {
      const rect = dialog.getBoundingClientRect();
      const outside =
        event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (outside) this.close();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "plt-quick-view": PltQuickView;
  }
}
