import { LitElement } from "lit";
import { emit, retireFallback } from "../shared/element.js";
const GALLERY_CHANGE_EVENT = "plt:gallery-change";
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
class PltProductGallery extends LitElement {
  constructor() {
    super();
    /** Index the main image currently shows (the server markup shows the current thumb). */
    this._shownIndex = -1;
    this._opener = null;
    this.selectedIndex = -1;
    this.addEventListener("click", (event) => this._onClick(event));
    this.addEventListener("keydown", (event) => this._onKeydown(event));
    this.addEventListener("pointermove", (event) => this._onPointerMove(event));
    this.addEventListener("pointerleave", () => this._resetZoom(), true);
  }
  createRenderRoot() {
    return this;
  }
  /** Thumbnails in document order. */
  get thumbs() {
    return [...this.querySelectorAll(THUMB)];
  }
  /** Slides in document order (empty unless the markup opts in). */
  get slides() {
    return [...this.querySelectorAll(SLIDE)];
  }
  connectedCallback() {
    super.connectedCallback();
    retireFallback(this);
    const thumbs = this.thumbs;
    const current = thumbs.findIndex((thumb) => thumb.getAttribute("aria-current") === "true");
    this._shownIndex = current >= 0 ? current : thumbs.length ? 0 : -1;
    if (this.selectedIndex < 0) this.selectedIndex = this._shownIndex;
    this._markCurrent();
    this._showSlide(this.selectedIndex, -1);
    this._scrollThumbIntoView(false);
  }
  updated(changed) {
    if (changed.has("selectedIndex") && this.selectedIndex !== this._shownIndex) this._apply();
  }
  /** Shows thumbnail `index` in the main image (or its slide). */
  select(index) {
    const thumbs = this.thumbs;
    if (index < 0 || index >= thumbs.length || index === this.selectedIndex) return;
    this.selectedIndex = index;
    this._apply();
    const src = thumbs[index].querySelector("img")?.getAttribute("src") ?? "";
    const mediaId = this.slides[index]?.dataset.mediaId;
    emit(this, GALLERY_CHANGE_EVENT, mediaId ? { index, src, mediaId } : { index, src });
  }
  /**
   * Shows the slide whose `data-media-id` is `id` (for example a variant's
   * featured media). Returns whether one matched.
   */
  selectMedia(id) {
    if (id === null || id === void 0 || id === "") return false;
    const index = this.slides.findIndex((slide) => slide.dataset.mediaId === String(id));
    if (index < 0) return false;
    this.select(index);
    return true;
  }
  _markCurrent() {
    this.thumbs.forEach((thumb, i) => {
      const on = i === this.selectedIndex;
      thumb.setAttribute("aria-current", on ? "true" : "false");
      if (thumb.getAttribute("role") === "tab") thumb.setAttribute("aria-selected", on ? "true" : "false");
    });
  }
  _apply() {
    const previous = this._shownIndex;
    this._shownIndex = this.selectedIndex;
    this._markCurrent();
    this._showSlide(this.selectedIndex, previous);
    this._scrollThumbIntoView(true);
    const thumb = this.thumbs[this.selectedIndex];
    const source = thumb?.querySelector("img");
    const main = this.querySelector(MAIN_IMAGE);
    if (!source || !main) return;
    for (const attribute of ["srcset", "sizes"]) {
      const value = source.getAttribute(attribute);
      if (value) main.setAttribute(attribute, value);
      else main.removeAttribute(attribute);
    }
    main.src = source.src;
    main.alt = source.alt || thumb.getAttribute("aria-label") || "";
  }
  /** Slides mode: show one slide, quiet the one that was showing. */
  _showSlide(index, previous) {
    const slides = this.slides;
    if (!slides.length || index < 0) return;
    slides.forEach((slide, i) => {
      slide.hidden = i !== index;
    });
    if (previous >= 0 && previous !== index && slides[previous]) pauseMedia(slides[previous]);
    if (previous >= 0 && previous !== index) {
      for (const video of slides[index]?.querySelectorAll("video[autoplay]") ?? []) {
        video.play?.()?.catch(() => {
        });
      }
    }
  }
  /** Moves the thumbnail track (not the page) so the selected thumbnail is visible. */
  _scrollThumbIntoView(smooth) {
    const track = this.querySelector(THUMB_TRACK);
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
  _pageThumbs(direction) {
    const track = this.querySelector(THUMB_TRACK);
    if (!track || typeof track.scrollBy !== "function") return;
    const thumb = track.querySelector(THUMB);
    const step = thumb ? thumb.offsetWidth + 8 : track.clientWidth * 0.8;
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: step * direction, behavior: reduce ? "auto" : "smooth" });
  }
  _onPointerMove(event) {
    if (event.pointerType === "touch") return;
    const pane = event.target?.closest?.(ZOOM_PANE);
    if (!pane || !this.contains(pane)) return;
    const rect = pane.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pane.style.setProperty("--plt-zoom-x", `${(event.clientX - rect.left) / rect.width * 100}%`);
    pane.style.setProperty("--plt-zoom-y", `${(event.clientY - rect.top) / rect.height * 100}%`);
  }
  _resetZoom() {
    for (const pane of this.querySelectorAll(ZOOM_PANE)) {
      pane.style.removeProperty("--plt-zoom-x");
      pane.style.removeProperty("--plt-zoom-y");
    }
  }
  _openLightbox(opener) {
    const dialog = this.querySelector(LIGHTBOX);
    const image = dialog?.querySelector(LIGHTBOX_IMAGE);
    const src = opener.dataset.zoomSrc || opener.getAttribute("href") || "";
    if (!dialog || !image || !src) return false;
    image.src = src;
    image.alt = opener.dataset.zoomAlt ?? "";
    dialog.setAttribute("aria-label", image.alt);
    this._opener = opener;
    if (!dialog.dataset.pltBound) {
      dialog.dataset.pltBound = "";
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
  _closeLightbox(dialog) {
    if (typeof dialog.close === "function") dialog.close();
    else {
      dialog.removeAttribute("open");
      dialog.dispatchEvent(new Event("close"));
    }
  }
  _onClick(event) {
    if (!this.isConnected) return;
    const target = event.target;
    const opener = target?.closest?.(ZOOM_OPEN);
    if (opener && this.contains(opener)) {
      if (this._openLightbox(opener)) event.preventDefault();
      return;
    }
    const dialog = this.querySelector(LIGHTBOX);
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
    this.select(this.thumbs.indexOf(thumb));
  }
  _onKeydown(event) {
    if (!this.isConnected) return;
    const thumbs = this.thumbs;
    const from = thumbs.indexOf(event.target?.closest?.(THUMB));
    if (from < 0) return;
    const last = thumbs.length - 1;
    const to = event.key === "ArrowRight" || event.key === "ArrowDown" ? Math.min(from + 1, last) : event.key === "ArrowLeft" || event.key === "ArrowUp" ? Math.max(from - 1, 0) : event.key === "Home" ? 0 : event.key === "End" ? last : -1;
    if (to < 0) return;
    event.preventDefault();
    thumbs[to].focus();
    this.select(to);
  }
}
PltProductGallery.properties = {
  selectedIndex: { type: Number, attribute: "selected-index", reflect: true }
};
function pauseMedia(slide) {
  for (const video of slide.querySelectorAll("video")) video.pause?.();
  for (const frame of slide.querySelectorAll("iframe")) {
    const src = frame.src || "";
    if (/youtube(-nocookie)?\.com/.test(src)) {
      frame.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
    } else if (/vimeo\.com/.test(src)) {
      frame.contentWindow?.postMessage(JSON.stringify({ method: "pause" }), "*");
    }
  }
}
export {
  GALLERY_CHANGE_EVENT,
  PltProductGallery
};
