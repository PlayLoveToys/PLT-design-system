import { LitElement, type PropertyValues } from "lit";
import { emit, retireFallback } from "../shared/element.js";

export interface PltGalleryChangeDetail {
  index: number;
  src: string;
  /** `data-media-id` of the shown slide, when the markup carries one. */
  mediaId?: string;
}

export const GALLERY_CHANGE_EVENT = "plt:gallery-change";

const THUMB = ".plt-product-detail__thumb, [data-plt-gallery-thumb]";
const MAIN_IMAGE = ".plt-product-detail__gallery-main img";
const SLIDE = "[data-plt-gallery-slide]";
const ZOOM_PANE = "[data-plt-gallery-zoom]";
const ZOOM_OPEN = "[data-plt-gallery-zoom-open]";
const LIGHTBOX = "dialog[data-plt-gallery-lightbox]";
const LIGHTBOX_IMAGE = "[data-plt-gallery-lightbox-image]";
const LIGHTBOX_CLOSE = "[data-plt-gallery-lightbox-close]";
const THUMB_TRACK = "[data-plt-gallery-thumb-track]";
const THUMBS_PREV = "[data-plt-gallery-thumbs-prev]";
const THUMBS_NEXT = "[data-plt-gallery-thumbs-next]";

/**
 * `<plt-product-gallery>` — enhances the ProductDetail gallery markup.
 *
 * Contract (unchanged from the former vanilla element): `.plt-product-detail__thumb`
 * buttons swap `.plt-product-detail__gallery-main img` and carry
 * `aria-current`. The element renders nothing itself; listeners are
 * delegated, so thumbnails added later by any framework keep working.
 * Adds: `srcset`/`sizes` follow the thumbnail, arrow keys / Home / End move
 * between thumbnails, `selectedIndex`, `select(index)` and an event.
 *
 * Opt-in capabilities, each switched on by the markup that carries it, so
 * existing consumers are untouched:
 *
 * - **Slides** — `[data-plt-gallery-slide]` children (one per thumbnail, in
 *   order, any media: image, video, embed, 3D). The selected one is shown and
 *   the others get `hidden`; video in a slide that is hidden pauses (and
 *   resumes when it has `autoplay`). A slide's `data-media-id` lets the page
 *   call `selectMedia(id)` when a variant changes.
 * - **Hover zoom** — `[data-plt-gallery-zoom]` follows the pointer through
 *   `--plt-zoom-x` / `--plt-zoom-y`; the scale itself is CSS.
 * - **Lightbox** — `[data-plt-gallery-zoom-open]` (a link to the large image,
 *   or a button with `data-zoom-src`; optional `data-zoom-alt`) opens
 *   `dialog[data-plt-gallery-lightbox]` with `[data-plt-gallery-lightbox-image]`
 *   and `[data-plt-gallery-lightbox-close]`. It is a modal `<dialog>`: focus is
 *   trapped, Escape closes it and focus returns to the opener.
 * - **Thumbnail track** — `[data-plt-gallery-thumb-track]` scrolls the selected
 *   thumbnail into view; `[data-plt-gallery-thumbs-prev|next]` page it.
 *
 * @fires plt:gallery-change - when the shown media changes.
 */
export class PltProductGallery extends LitElement {
  static override properties = {
    selectedIndex: { type: Number, attribute: "selected-index", reflect: true },
  };

  declare selectedIndex: number;

  constructor() {
    super();
    this.selectedIndex = -1;
    this.addEventListener("click", (event) => this._onClick(event));
    this.addEventListener("keydown", (event) => this._onKeydown(event));
    this.addEventListener("pointermove", (event) => this._onPointerMove(event));
    this.addEventListener("pointerleave", () => this._resetZoom(), true);
  }

  protected override createRenderRoot() {
    return this;
  }

  /** Thumbnails in document order. */
  get thumbs(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(THUMB)];
  }

  /** Slides in document order (empty unless the markup opts in). */
  get slides(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(SLIDE)];
  }

  /** Index the main image currently shows (the server markup shows the current thumb). */
  private _shownIndex = -1;
  private _opener: HTMLElement | null = null;

  override connectedCallback() {
    super.connectedCallback();
    retireFallback(this);
    const thumbs = this.thumbs;
    const current = thumbs.findIndex((thumb) => thumb.getAttribute("aria-current") === "true");
    this._shownIndex = current >= 0 ? current : thumbs.length ? 0 : -1;
    if (this.selectedIndex < 0) this.selectedIndex = this._shownIndex;
    // Synchronously, as the former vanilla element did, so markup is right on upgrade.
    this._markCurrent();
    this._showSlide(this.selectedIndex, -1);
    this._scrollThumbIntoView(false);
  }

  protected override updated(changed: PropertyValues<this>) {
    // Only a consumer-set index swaps the image; the initial one is already shown.
    if (changed.has("selectedIndex") && this.selectedIndex !== this._shownIndex) this._apply();
  }

  /** Shows thumbnail `index` in the main image (or its slide). */
  select(index: number) {
    const thumbs = this.thumbs;
    if (index < 0 || index >= thumbs.length || index === this.selectedIndex) return;
    this.selectedIndex = index;
    this._apply();
    const src = thumbs[index].querySelector("img")?.getAttribute("src") ?? "";
    const mediaId = this.slides[index]?.dataset.mediaId;
    emit<PltGalleryChangeDetail>(this, GALLERY_CHANGE_EVENT, mediaId ? { index, src, mediaId } : { index, src });
  }

  /**
   * Shows the slide whose `data-media-id` is `id` (for example a variant's
   * featured media). Returns whether one matched.
   */
  selectMedia(id: string | number | null | undefined): boolean {
    if (id === null || id === undefined || id === "") return false;
    const index = this.slides.findIndex((slide) => slide.dataset.mediaId === String(id));
    if (index < 0) return false;
    this.select(index);
    return true;
  }

  private _markCurrent() {
    this.thumbs.forEach((thumb, i) => {
      const on = i === this.selectedIndex;
      thumb.setAttribute("aria-current", on ? "true" : "false");
      if (thumb.getAttribute("role") === "tab") thumb.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  private _apply() {
    const previous = this._shownIndex;
    this._shownIndex = this.selectedIndex;
    this._markCurrent();
    this._showSlide(this.selectedIndex, previous);
    this._scrollThumbIntoView(true);
    const thumb = this.thumbs[this.selectedIndex];
    const source = thumb?.querySelector("img");
    const main = this.querySelector<HTMLImageElement>(MAIN_IMAGE);
    if (!source || !main) return;
    // Copy the responsive candidates too, or the browser keeps showing the old srcset.
    for (const attribute of ["srcset", "sizes"] as const) {
      const value = source.getAttribute(attribute);
      if (value) main.setAttribute(attribute, value);
      else main.removeAttribute(attribute);
    }
    main.src = source.src;
    main.alt = source.alt || thumb.getAttribute("aria-label") || "";
  }

  /** Slides mode: show one slide, quiet the one that was showing. */
  private _showSlide(index: number, previous: number) {
    const slides = this.slides;
    if (!slides.length || index < 0) return;
    slides.forEach((slide, i) => {
      slide.hidden = i !== index;
    });
    if (previous >= 0 && previous !== index && slides[previous]) pauseMedia(slides[previous]);
    if (previous >= 0 && previous !== index) {
      for (const video of slides[index]?.querySelectorAll<HTMLVideoElement>("video[autoplay]") ?? []) {
        video.play?.()?.catch(() => {});
      }
    }
  }

  /** Moves the thumbnail track (not the page) so the selected thumbnail is visible. */
  private _scrollThumbIntoView(smooth: boolean) {
    const track = this.querySelector<HTMLElement>(THUMB_TRACK);
    const thumb = this.thumbs[this.selectedIndex];
    if (!track || !thumb || !track.contains(thumb)) return;
    const trackRect = track.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    let delta = 0;
    if (thumbRect.left < trackRect.left) delta = thumbRect.left - trackRect.left;
    else if (thumbRect.right > trackRect.right) delta = thumbRect.right - trackRect.right;
    if (!delta || typeof track.scrollBy !== "function") return;
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: delta, behavior: smooth && !reduce ? "smooth" : "auto" });
  }

  private _pageThumbs(direction: 1 | -1) {
    const track = this.querySelector<HTMLElement>(THUMB_TRACK);
    if (!track || typeof track.scrollBy !== "function") return;
    const thumb = track.querySelector<HTMLElement>(THUMB);
    const step = thumb ? thumb.offsetWidth + 8 : track.clientWidth * 0.8;
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: step * direction, behavior: reduce ? "auto" : "smooth" });
  }

  private _onPointerMove(event: PointerEvent) {
    if (event.pointerType === "touch") return;
    const pane = (event.target as Element | null)?.closest?.<HTMLElement>(ZOOM_PANE);
    if (!pane || !this.contains(pane)) return;
    const rect = pane.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pane.style.setProperty("--plt-zoom-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    pane.style.setProperty("--plt-zoom-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  }

  private _resetZoom() {
    for (const pane of this.querySelectorAll<HTMLElement>(ZOOM_PANE)) {
      pane.style.removeProperty("--plt-zoom-x");
      pane.style.removeProperty("--plt-zoom-y");
    }
  }

  private _openLightbox(opener: HTMLElement) {
    const dialog = this.querySelector<HTMLDialogElement>(LIGHTBOX);
    const image = dialog?.querySelector<HTMLImageElement>(LIGHTBOX_IMAGE);
    const src = opener.dataset.zoomSrc || opener.getAttribute("href") || "";
    if (!dialog || !image || !src) return false;
    image.src = src;
    image.alt = opener.dataset.zoomAlt ?? "";
    dialog.setAttribute("aria-label", image.alt);
    this._opener = opener;
    if (!dialog.dataset.pltBound) {
      dialog.dataset.pltBound = "";
      // Closing by Escape, the close button or the backdrop all end here.
      dialog.addEventListener("close", () => {
        image.removeAttribute("src");
        this._opener?.focus();
        this._opener = null;
      });
    }
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    return true;
  }

  private _closeLightbox(dialog: HTMLDialogElement) {
    if (typeof dialog.close === "function") dialog.close();
    else {
      dialog.removeAttribute("open");
      dialog.dispatchEvent(new Event("close"));
    }
  }

  private _onClick(event: Event) {
    if (!this.isConnected) return;
    const target = event.target as Element | null;

    const opener = target?.closest?.<HTMLElement>(ZOOM_OPEN);
    if (opener && this.contains(opener)) {
      // Without JS the link opens the large image; with it, the lightbox does.
      if (this._openLightbox(opener)) event.preventDefault();
      return;
    }

    const dialog = this.querySelector<HTMLDialogElement>(LIGHTBOX);
    if (dialog?.open && (target?.closest?.(LIGHTBOX_CLOSE) || target === dialog)) {
      event.preventDefault();
      this._closeLightbox(dialog);
      return;
    }

    if (target?.closest?.(THUMBS_PREV) || target?.closest?.(THUMBS_NEXT)) {
      this._pageThumbs(target.closest(THUMBS_PREV) ? -1 : 1);
      return;
    }

    const thumb = target?.closest?.(THUMB);
    if (!thumb || !this.contains(thumb)) return;
    this.select(this.thumbs.indexOf(thumb as HTMLElement));
  }

  private _onKeydown(event: KeyboardEvent) {
    if (!this.isConnected) return;
    const thumbs = this.thumbs;
    const from = thumbs.indexOf((event.target as Element | null)?.closest?.(THUMB) as HTMLElement);
    if (from < 0) return;
    const last = thumbs.length - 1;
    const to =
      event.key === "ArrowRight" || event.key === "ArrowDown" ? Math.min(from + 1, last)
      : event.key === "ArrowLeft" || event.key === "ArrowUp" ? Math.max(from - 1, 0)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : -1;
    if (to < 0) return;
    event.preventDefault();
    thumbs[to].focus();
    this.select(to);
  }
}

/** Stops playback in a slide that is no longer shown. */
function pauseMedia(slide: HTMLElement) {
  for (const video of slide.querySelectorAll<HTMLVideoElement>("video")) video.pause?.();
  for (const frame of slide.querySelectorAll<HTMLIFrameElement>("iframe")) {
    const src = frame.src || "";
    // Only providers that take commands by postMessage; others keep playing.
    if (/youtube(-nocookie)?\.com/.test(src)) {
      frame.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
    } else if (/vimeo\.com/.test(src)) {
      frame.contentWindow?.postMessage(JSON.stringify({ method: "pause" }), "*");
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "plt-product-gallery": PltProductGallery;
  }
}
