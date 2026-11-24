import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../src/search/define";
import type { PltPredictiveSearch } from "../../src/search/plt-predictive-search";

const results = {
  groups: [
    { id: "products", label: "Products", items: [{ id: "p1", title: "Silk <Tie>", url: "/products/tie", meta: "Brand", price: "$10.00", imageUrl: "/t.jpg" }, { id: "p2", title: "Ring", url: "/products/ring" }] },
    { id: "collections", label: "Collections", items: [{ id: "c1", title: "Accessories", url: "/collections/acc" }] },
    { id: "pages", label: "Pages", items: [] },
  ],
};

const mount = async (attrs = "") => {
  document.body.innerHTML = `<plt-predictive-search ${attrs}><form data-plt-fallback action="/search" method="get"><input type="search" name="q" value="ti"><button>Search</button></form></plt-predictive-search>`;
  const el = document.querySelector("plt-predictive-search") as PltPredictiveSearch;
  await el.updateComplete;
  return el;
};
const type = async (el: PltPredictiveSearch, text: string) => {
  const input = el.input!;
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await el.updateComplete;
};
const key = async (el: PltPredictiveSearch, name: string) => {
  const event = new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true });
  el.input!.dispatchEvent(event);
  await el.updateComplete;
  return event;
};

describe("<plt-predictive-search>", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("retires the no-JS form, keeps what was typed and renders a combobox", async () => {
    const el = await mount();
    const fallback = el.querySelector<HTMLElement>("[data-plt-fallback]")!;
    expect(fallback.hidden).toBe(true);
    expect(fallback.querySelector("input")!.disabled).toBe(true);
    expect(el.input!.value).toBe("ti");
    expect(el.input!.getAttribute("role")).toBe("combobox");
    expect(el.input!.getAttribute("aria-expanded")).toBe("false");
    expect(el.querySelector("[role=listbox]")!.hasAttribute("hidden")).toBe(true);
  });

  it("emits one debounced query and ignores short input", async () => {
    const el = await mount('value=""');
    const seen: string[] = [];
    el.addEventListener("plt:predictive-search-query", (event) => seen.push((event as CustomEvent).detail.query));
    await type(el, "t");
    await type(el, "ti");
    await type(el, "tie");
    vi.advanceTimersByTime(250);
    expect(seen).toEqual(["tie"]);
    await type(el, "t");
    vi.advanceTimersByTime(250);
    expect(seen).toEqual(["tie"]);
  });

  it("shows loading, then grouped results, then the empty state", async () => {
    const el = await mount('value="tie"');
    await type(el, "tie");
    el.loading = true;
    await el.updateComplete;
    expect(el.querySelector(".predictive-search__panel")!.hasAttribute("hidden")).toBe(false);
    expect(el.querySelector("[role=status]")!.textContent).toBe("Loading results…");
    expect(el.querySelector(".predictive-search__panel")!.getAttribute("aria-busy")).toBe("true");

    el.results = results;
    el.loading = false;
    await el.updateComplete;
    expect(el.input!.getAttribute("aria-expanded")).toBe("true");
    const groups = [...el.querySelectorAll("[role=group]")];
    expect(groups.map((group) => group.getAttribute("data-group"))).toEqual(["products", "collections"]);
    expect(groups[0].getAttribute("aria-labelledby")).toBe(groups[0].querySelector("h3")!.id);
    const options = [...el.querySelectorAll("[role=option]")];
    expect(options).toHaveLength(4); // 3 suggestions + "view all"
    expect(options[0].textContent).toContain("Silk <Tie>");
    expect(options[3].querySelector("a")!.getAttribute("href")).toBe("/search?q=tie");
    expect(el.querySelector("[role=status]")!.textContent).toBe("3 suggestions available");

    el.results = { groups: [] };
    await el.updateComplete;
    expect(el.querySelector(".plt-predictive-search__state")!.textContent).toBe("No results for “tie”");
    expect(el.input!.getAttribute("aria-expanded")).toBe("false");
  });

  it("moves the active option with the arrows (wrapping) and exposes it to assistive technology", async () => {
    const el = await mount('value="tie"');
    await type(el, "tie");
    el.results = results;
    await el.updateComplete;
    const options = () => [...el.querySelectorAll("[role=option]")];
    await key(el, "ArrowDown");
    expect(el.input!.getAttribute("aria-activedescendant")).toBe(options()[0].id);
    expect(options()[0].getAttribute("aria-selected")).toBe("true");
    await key(el, "ArrowUp");
    await key(el, "ArrowUp");
    expect(el.input!.getAttribute("aria-activedescendant")).toBe(options()[2].id);
    await key(el, "ArrowDown"); // 2 → "view all"
    expect(el.input!.getAttribute("aria-activedescendant")).toBe(options()[3].id);
    await key(el, "ArrowDown"); // wraps to the first
    expect(el.input!.getAttribute("aria-activedescendant")).toBe(options()[0].id);
  });

  it("Enter follows the active option unless a listener cancels the select event", async () => {
    const el = await mount('value="tie"');
    await type(el, "tie");
    el.results = results;
    await el.updateComplete;
    const clicks: string[] = [];
    el.addEventListener("click", (event) => {
      const anchor = (event.target as Element).closest("a");
      if (anchor) {
        clicks.push(anchor.getAttribute("href")!);
        event.preventDefault(); // jsdom does not navigate
      }
    });
    const selected: unknown[] = [];
    el.addEventListener("plt:predictive-search-select", (event) => selected.push((event as CustomEvent).detail));
    await key(el, "ArrowDown");
    const enter = await key(el, "Enter");
    expect(enter.defaultPrevented).toBe(true);
    expect(selected[0]).toMatchObject({ kind: "item", url: "/products/tie", groupId: "products", query: "tie" });
    expect(clicks).toEqual(["/products/tie"]);

    // Cancelled select (client-routed theme): the anchor click's default is prevented.
    const cancel = (event: Event) => event.preventDefault();
    el.addEventListener("plt:predictive-search-select", cancel);
    const link = el.querySelector<HTMLAnchorElement>("[role=option] a")!;
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });

  it("Enter without an active option submits the form natively", async () => {
    const el = await mount('value="tie"');
    await type(el, "tie");
    el.results = results;
    await el.updateComplete;
    expect((await key(el, "Enter")).defaultPrevented).toBe(false);
  });

  it("Escape closes the popup, then clears the field", async () => {
    const el = await mount('value="tie"');
    await type(el, "tie");
    el.results = results;
    await el.updateComplete;
    expect((await key(el, "Escape")).defaultPrevented).toBe(true);
    expect(el.querySelector(".predictive-search__panel")!.hasAttribute("hidden")).toBe(true);
    expect(el.value).toBe("tie");
    await key(el, "Escape");
    expect(el.value).toBe("");
    expect(el.input!.value).toBe("");
  });

  it("closes when the pointer goes down outside", async () => {
    const el = await mount('value="tie"');
    await type(el, "tie");
    el.results = results;
    await el.updateComplete;
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await el.updateComplete;
    expect(el.querySelector(".predictive-search__panel")!.hasAttribute("hidden")).toBe(true);
  });
});
