import { LitElement, html, nothing, type PropertyValues } from "lit";
import { live } from "lit/directives/live.js";
import { byId, emit, jsonConverter, nextId, retireFallback } from "../shared/element.js";
import {
  DEFAULT_SEARCH_LABELS,
  SEARCH_QUERY_EVENT,
  SEARCH_SELECT_EVENT,
  type PltSearchGroup,
  type PltSearchItem,
  type PltSearchLabels,
  type PltSearchQueryDetail,
  type PltSearchResults,
  type PltSearchSelectDetail,
} from "./types.js";

interface Option {
  id: string;
  kind: "item" | "all";
  url: string;
  group?: PltSearchGroup;
  item?: PltSearchItem;
}

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
export class PltPredictiveSearch extends LitElement {
  static override properties = {
    results: { type: Object, converter: jsonConverter("plt-predictive-search", () => null) },
    labels: { type: Object, converter: jsonConverter("plt-predictive-search", () => ({})) },
    loading: { type: Boolean, reflect: true },
    value: { type: String },
    action: { type: String },
    method: { type: String },
    name: { type: String },
    placeholder: { type: String },
    minLength: { type: Number, attribute: "min-length" },
    debounce: { type: Number },
    _open: { state: true },
    _active: { state: true },
  };

  declare results: PltSearchResults | null;
  declare labels: PltSearchLabels;
  /** Set by the consumer while a query is in flight. */
  declare loading: boolean;
  declare value: string;
  declare action: string;
  declare method: string;
  declare name: string;
  declare placeholder: string;
  declare minLength: number;
  declare debounce: number;
  declare private _open: boolean;
  declare private _active: number;

  private readonly _id = nextId("plt-predictive-search");
  private _timer: ReturnType<typeof setTimeout> | undefined;
  private readonly _onPointerDown = (event: Event) => {
    if (this._open && !this.contains(event.target as Node)) this._close();
  };

  constructor() {
    super();
    this.results = null;
    this.labels = {};
    this.loading = false;
    this.value = "";
    this.action = "/search";
    this.method = "get";
    this.name = "q";
    this.placeholder = "";
    this.minLength = 2;
    this.debounce = 200;
    this._open = false;
    this._active = -1;
    this.addEventListener("focusout", (event) => {
      const next = (event as FocusEvent).relatedTarget as Node | null;
      if (next && !this.contains(next)) this._close();
    });
  }

  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    // Keep what was typed before the element upgraded.
    if (!this.value) {
      const typed = this.querySelector<HTMLInputElement>(":scope > [data-plt-fallback] input[type=search], :scope > [data-plt-fallback] input[type=text]");
      if (typed?.value) this.value = typed.value;
    }
    retireFallback(this);
    document.addEventListener("pointerdown", this._onPointerDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._timer);
    document.removeEventListener("pointerdown", this._onPointerDown);
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // New suggestions restart keyboard navigation.
    if (changed.has("results")) this._active = -1;
  }

  get input(): HTMLInputElement | null {
    return this.querySelector<HTMLInputElement>("input[role=combobox]");
  }

  private get _labels(): Required<PltSearchLabels> {
    return { ...DEFAULT_SEARCH_LABELS, ...(this.labels ?? {}) };
  }

  private get _query(): string {
    return (this.value ?? "").trim();
  }

  private get _ready(): boolean {
    return this._query.length >= Math.max(1, this.minLength);
  }

  private get _options(): Option[] {
    const options: Option[] = [];
    for (const group of this.results?.groups ?? []) {
      group.items.forEach((item, index) => {
        options.push({ id: `${this._id}-${group.id}-${item.id ?? index}`, kind: "item", url: item.url, group, item });
      });
    }
    if (options.length) options.push({ id: `${this._id}-all`, kind: "all", url: this._viewAllUrl });
    return options;
  }

  private get _viewAllUrl(): string {
    if (this.results?.viewAllUrl) return this.results.viewAllUrl;
    const separator = this.action.includes("?") ? "&" : "?";
    return `${this.action}${separator}${encodeURIComponent(this.name)}=${encodeURIComponent(this._query)}`;
  }

  private _close() {
    this._open = false;
    this._active = -1;
  }

  private _onInput(event: Event) {
    this.value = (event.target as HTMLInputElement).value;
    clearTimeout(this._timer);
    if (!this._ready) return this._close();
    this._open = true;
    this._active = -1;
    this._timer = setTimeout(() => emit<PltSearchQueryDetail>(this, SEARCH_QUERY_EVENT, { query: this._query }), this.debounce);
  }

  private _onKeydown(event: KeyboardEvent) {
    const options = this._options;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (!this._ready || !options.length) return;
        event.preventDefault();
        this._open = true;
        const step = event.key === "ArrowDown" ? 1 : -1;
        this._active = this._active < 0 ? (step > 0 ? 0 : options.length - 1) : (this._active + step + options.length) % options.length;
        this.updateComplete.then(() => byId(this, options[this._active]?.id)?.scrollIntoView?.({ block: "nearest" }));
        return;
      }
      case "Enter": {
        const option = this._open ? options[this._active] : undefined;
        if (!option) return; // no active option: the form submits normally
        event.preventDefault();
        this._choose(option, () => {
          byId(this, option.id)?.querySelector("a")?.click();
        });
        return;
      }
      case "Escape": {
        if (this._open) {
          event.preventDefault();
          this._close();
        } else if (this.value) {
          event.preventDefault();
          this.value = "";
          clearTimeout(this._timer);
        }
        return;
      }
    }
  }

  /** Emits the cancelable select event; runs `proceed` unless a listener cancels it. */
  private _choose(option: Option, proceed: () => void) {
    const detail: PltSearchSelectDetail = {
      kind: option.kind,
      url: option.url,
      query: this._query,
      ...(option.kind === "item" ? { groupId: option.group?.id, item: option.item } : {}),
    };
    if (emit(this, SEARCH_SELECT_EVENT, detail, true)) proceed();
  }

  private _status(count: number): string {
    const labels = this._labels;
    if (!this._ready) return "";
    if (this.loading) return labels.loading;
    if (count) return labels.count.replace("{count}", String(count));
    if (this.results) return labels.empty.replace("{query}", this._query);
    return "";
  }

  private _renderItem(option: Option, selected: boolean) {
    const item = option.item!;
    return html`<div role="option" id=${option.id} aria-selected=${selected ? "true" : "false"} class="predictive-search__option plt-predictive-search__option" ?data-active=${selected}>
      <a class="predictive-search__link" href=${item.url} tabindex="-1" @click=${(event: MouseEvent) => this._onLinkClick(event, option)}>
        ${item.imageUrl ? html`<img class="plt-predictive-search__image" src=${item.imageUrl} alt=${item.imageAlt ?? ""} width="40" height="40" loading="lazy" />` : nothing}
        <span class="plt-predictive-search__text">
          <span class="theme-label-bold">${item.title}</span>
          ${item.meta ? html`<span class="theme-meta">${item.meta}</span>` : nothing}
        </span>
        ${item.price ? html`<span class="plt-predictive-search__price">${item.price}</span>` : nothing}
      </a>
    </div>`;
  }

  private _onLinkClick(event: MouseEvent, option: Option) {
    const detail: PltSearchSelectDetail = {
      kind: option.kind,
      url: option.url,
      query: this._query,
      ...(option.kind === "item" ? { groupId: option.group?.id, item: option.item } : {}),
    };
    if (!emit(this, SEARCH_SELECT_EVENT, detail, true)) event.preventDefault();
  }

  protected override render() {
    const labels = this._labels;
    const options = this._options;
    const count = options.filter((option) => option.kind === "item").length;
    const showPanel = this._open && this._ready && (this.loading || !!this.results);
    const listId = `${this._id}-list`;
    const active = showPanel ? options[this._active] : undefined;
    const status = this._status(count);
    return html`<form class="plt-search-field plt-predictive-search" action=${this.action} method=${this.method} role="search">
      <input
        class="d-input"
        type="search"
        name=${this.name}
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded=${showPanel && count > 0 ? "true" : "false"}
        aria-controls=${listId}
        aria-activedescendant=${active?.id ?? nothing}
        aria-label=${labels.input}
        placeholder=${this.placeholder || nothing}
        .value=${live(this.value)}
        @input=${(event: Event) => this._onInput(event)}
        @keydown=${(event: KeyboardEvent) => this._onKeydown(event)}
        @focus=${() => { if (this._ready && (this.results || this.loading)) this._open = true; }}
      />
      <button class="d-btn d-btn-primary theme-bordered theme-elevated theme-label-bold" type="submit">${labels.submit}</button>
      <p class="sr-only" role="status" aria-live="polite">${status}</p>
      <div class="predictive-search__panel plt-predictive-search__panel" ?hidden=${!showPanel} aria-busy=${this.loading ? "true" : "false"}>
        ${showPanel && this.loading && !count ? html`<p class="theme-meta plt-predictive-search__state">${labels.loading}</p>` : nothing}
        ${showPanel && !this.loading && this.results && !count
          ? html`<p class="theme-meta plt-predictive-search__state">${labels.empty.replace("{query}", this._query)}</p>`
          : nothing}
        <div id=${listId} role="listbox" aria-label=${labels.input} ?hidden=${!(showPanel && count)}>
          ${(this.results?.groups ?? []).map((group) => {
            if (!group.items.length) return nothing;
            const headingId = `${this._id}-${group.id}-heading`;
            return html`<div role="group" aria-labelledby=${headingId} class="plt-predictive-search__group" data-group=${group.id}>
              <h3 id=${headingId} class="predictive-search__heading theme-label-bold" role="presentation">${group.label}</h3>
              <div class="predictive-search__list">
                ${group.items.map((_, index) => {
                  const option = options.find((candidate) => candidate.group === group && candidate.item === group.items[index])!;
                  return this._renderItem(option, option === active);
                })}
              </div>
            </div>`;
          })}
          ${count
            ? html`<div class="predictive-search__footer">
                <div role="option" id=${`${this._id}-all`} aria-selected=${active?.kind === "all" ? "true" : "false"} class="predictive-search__option" ?data-active=${active?.kind === "all"}>
                  <a class="predictive-search__link theme-label-bold" href=${this._viewAllUrl} tabindex="-1" @click=${(event: MouseEvent) => this._onLinkClick(event, options[options.length - 1]!)}>${labels.viewAll}</a>
                </div>
              </div>`
            : nothing}
        </div>
      </div>
    </form>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "plt-predictive-search": PltPredictiveSearch;
  }
}
