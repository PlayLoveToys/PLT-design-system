import { LitElement } from "lit";
import { emit, lockScroll } from "../shared/element.js";
const QUICK_VIEW_OPEN_EVENT = "plt:quick-view-open";
const QUICK_VIEW_CLOSE_EVENT = "plt:quick-view-close";
class PltQuickView extends LitElement {
  constructor() {
    super();
    this._release = null;
    this._previousFocus = null;
    this._onDialogClose = () => this._closed();
    this.open = false;
    this.addEventListener("click", (event) => this._onClick(event));
  }
  createRenderRoot() {
    return this;
  }
  get dialog() {
    return this.querySelector("dialog");
  }
  connectedCallback() {
    super.connectedCallback();
    this.dialog?.addEventListener("close", this._onDialogClose);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.dialog?.removeEventListener("close", this._onDialogClose);
    if (this._release) {
      this._release();
      this._release = null;
      this.open = false;
    }
  }
  updated(changed) {
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
  _closed() {
    if (!this._release) return;
    this._release();
    this._release = null;
    this.open = false;
    const previous = this._previousFocus;
    if (previous && typeof previous.focus === "function") previous.focus();
    emit(this, QUICK_VIEW_CLOSE_EVENT, {});
  }
  _onClick(event) {
    const target = event.target;
    if (!target?.closest) return;
    if (target.closest("[data-quick-view-open]")) {
      event.preventDefault();
      return this.show();
    }
    if (target.closest("[data-quick-view-close]")) return this.close();
    const dialog = this.dialog;
    if (dialog && target === dialog) {
      const rect = dialog.getBoundingClientRect();
      const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (outside) this.close();
    }
  }
}
PltQuickView.properties = {
  open: { type: Boolean, reflect: true }
};
export {
  PltQuickView,
  QUICK_VIEW_CLOSE_EVENT,
  QUICK_VIEW_OPEN_EVENT
};
