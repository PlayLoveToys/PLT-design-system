import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../src/collection/define";
import "../../src/navigation/define";
import "../../src/product/define";
import { activeFilters, nonEmptyValues, preservedEntries, selectedValues, toQuery } from "../../src/collection/params";
import type { PltFilter } from "../../src/collection/types";

const flush = (element: { updateComplete: Promise<unknown> }) => element.updateComplete;

const filters: PltFilter[] = [
  {
    id: "filter.v.option.color",
    label: "Color",
    options: [
      { label: "All", value: "" },
      { label: "Red", value: "Red", selected: true },
      { label: "Blue", value: "Blue" },
    ],
  },
  {
    id: "filter.v.option.size",
    label: "Size",
    options: [
      { label: "All", value: "" },
      { label: "S", value: "S" },
    ],
  },
];

describe("collection params", () => {
  it("derives selection, query and active chips", () => {
    const values = selectedValues(filters);
    expect(values).toEqual({ "filter.v.option.color": "Red", "filter.v.option.size": "" });
    expect(toQuery(values)).toBe("filter.v.option.color=Red");
    expect(activeFilters(filters, values)).toEqual([
      { id: "filter.v.option.color", label: "Color", value: "Red", valueLabel: "Red" },
    ]);
  });
});

describe("multi-value filters", () => {
  const multi: PltFilter[] = [
    {
      id: "filter.p.vendor",
      label: "Brand",
      multiple: true,
      options: [
        { label: "Dorcel", value: "Dorcel", count: 4, selected: true },
        { label: "Doc Johnson", value: "Doc Johnson", count: 9, selected: true },
        { label: "Magic Wand", value: "Magic Wand", count: 2 },
      ],
    },
    { id: "filter.v.availability", label: "Availability", options: [{ label: "All", value: "" }, { label: "In stock", value: "1" }] },
  ];

  it("selects arrays for multiple filters and repeats the name in the query", () => {
    const values = selectedValues(multi);
    expect(values).toEqual({ "filter.p.vendor": ["Dorcel", "Doc Johnson"], "filter.v.availability": "" });
    expect(nonEmptyValues(values)).toEqual({ "filter.p.vendor": ["Dorcel", "Doc Johnson"] });
    expect(toQuery(values)).toBe("filter.p.vendor=Dorcel&filter.p.vendor=Doc+Johnson");
    expect(activeFilters(multi, values).map((item) => item.valueLabel)).toEqual(["Dorcel", "Doc Johnson"]);
  });

  it("treats an empty array as no filter", () => {
    expect(nonEmptyValues({ a: [], b: "", c: ["x"] })).toEqual({ c: ["x"] });
    expect(toQuery({ a: [], c: ["x", "y"] })).toBe("c=x&c=y");
  });

  it("lists preserved params, repeating array names and dropping empties", () => {
    expect(preservedEntries({ sort_by: "price-ascending", tag: ["a", "b"], empty: "" })).toEqual([
      ["sort_by", "price-ascending"],
      ["tag", "a"],
      ["tag", "b"],
    ]);
    expect(preservedEntries(undefined)).toEqual([]);
  });
});

describe("<plt-filter-bar>", () => {
  let submit: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    submit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => {});
  });
  afterEach(() => {
    submit.mockRestore();
    document.body.innerHTML = "";
  });

  async function mount(attributes = "") {
    document.body.innerHTML = `<plt-filter-bar action="/collections/all" ${attributes}><form data-plt-fallback class="plt-filter-bar"><select name="x"></select></form></plt-filter-bar>`;
    const element = document.querySelector("plt-filter-bar")!;
    element.filters = filters;
    await flush(element);
    return element;
  }

  const select = (element: HTMLElement, index: number) =>
    element.querySelectorAll<HTMLSelectElement>("form.plt-filter-bar:not([data-plt-fallback]) select")[index];

  it("renders the FilterBar anatomy with labelled selects and retires the fallback", async () => {
    const element = await mount();
    const form = element.querySelector<HTMLFormElement>("form.plt-filter-bar:not([data-plt-fallback])")!;
    expect(form.getAttribute("action")).toBe("/collections/all");
    expect(form.method).toBe("get");
    const color = select(element, 0);
    expect(color.value).toBe("Red");
    expect(element.querySelector(`label[for="${color.id}"]`)!.textContent).toBe("Color");
    expect(element.querySelector<HTMLElement>("[data-plt-fallback]")!.hidden).toBe(true);
    expect(element.querySelector('button[type="submit"]')).toBeNull();
    expect(element.querySelector(".plt-filter-bar__chips")!.textContent).toContain("Color: Red");
  });

  it("emits a cancelable plt:filter-change and submits unless cancelled", async () => {
    const element = await mount();
    const events: CustomEvent[] = [];
    element.addEventListener("plt:filter-change", (event) => events.push(event as CustomEvent));
    const size = select(element, 1);
    size.value = "S";
    size.dispatchEvent(new Event("change", { bubbles: true }));
    await flush(element);
    expect(events[0].cancelable).toBe(true);
    expect(events[0].detail).toEqual({
      values: { "filter.v.option.color": "Red", "filter.v.option.size": "S" },
      changed: "filter.v.option.size",
      query: "filter.v.option.color=Red&filter.v.option.size=S",
    });
    expect(submit).toHaveBeenCalledTimes(1);

    element.addEventListener("plt:filter-change", (event) => event.preventDefault());
    size.value = "";
    size.dispatchEvent(new Event("change", { bubbles: true }));
    expect(submit).toHaveBeenCalledTimes(1);
    expect(element.values).toEqual({ "filter.v.option.color": "Red" });
  });

  it("removes a chip, clears all, and returns focus to the select", async () => {
    const element = await mount();
    element.addEventListener("plt:filter-change", (event) => event.preventDefault());
    const chip = element.querySelector<HTMLButtonElement>(".plt-filter-bar__chips button")!;
    expect(chip.getAttribute("aria-label")).toBe("Remove filter: Color Red");
    chip.click();
    await flush(element);
    await Promise.resolve();
    expect(element.values).toEqual({});
    expect(element.querySelector(".plt-filter-bar__active")).toBeNull();
    expect(document.activeElement).toBe(select(element, 0));
  });

  it("submits its own form, never the server-rendered fallback", async () => {
    const element = await mount();
    submit.mockImplementation(function (this: HTMLFormElement) {
      expect(this.hasAttribute("data-plt-fallback")).toBe(false);
    });
    const size = select(element, 1);
    size.value = "S";
    size.dispatchEvent(new Event("change", { bubbles: true }));
    await flush(element);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(element.form!.hasAttribute("data-plt-fallback")).toBe(false);
  });

  it("in manual mode shows Apply and only reports on submit", async () => {
    const element = await mount("manual");
    const listener = vi.fn((event: Event) => event.preventDefault());
    element.addEventListener("plt:filter-change", listener);
    const color = select(element, 0);
    color.value = "Blue";
    color.dispatchEvent(new Event("change", { bubbles: true }));
    expect(submit).not.toHaveBeenCalled();
    const form = element.querySelector<HTMLFormElement>("form.plt-filter-bar:not([data-plt-fallback])")!;
    const submitEvent = new Event("submit", { cancelable: true });
    form.dispatchEvent(submitEvent);
    expect(submitEvent.defaultPrevented).toBe(true);
    expect(listener.mock.calls.at(-1)![0].detail.values).toEqual({ "filter.v.option.color": "Blue" });
  });
});

describe("<plt-filter-bar> with multi-value filters and preserved params", () => {
  let submit: ReturnType<typeof vi.spyOn>;
  const brands: PltFilter[] = [
    {
      id: "filter.p.vendor",
      label: "Brand",
      multiple: true,
      options: [
        { label: "Dorcel", value: "Dorcel", count: 4, selected: true },
        { label: "Doc Johnson", value: "Doc Johnson", count: 9 },
        { label: "Any", value: "" },
      ],
    },
    { id: "filter.v.availability", label: "Availability", options: [{ label: "All", value: "" }, { label: "In stock", value: "1" }] },
  ];

  beforeEach(() => {
    submit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => {});
  });
  afterEach(() => {
    submit.mockRestore();
    document.body.innerHTML = "";
  });

  async function mount(attributes = "") {
    document.body.innerHTML = `<plt-filter-bar action="/collections/all" ${attributes}></plt-filter-bar>`;
    const element = document.querySelector("plt-filter-bar")!;
    element.filters = brands;
    await flush(element);
    return element;
  }

  const boxes = (element: HTMLElement) => [...element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];

  it("renders a labelled checkbox group with counts and skips the empty option", async () => {
    const element = await mount();
    const group = element.querySelector("fieldset.plt-filter-bar__group")!;
    expect(group.querySelector("legend")!.textContent).toBe("Brand");
    expect(boxes(element).map((box) => [box.name, box.value, box.checked])).toEqual([
      ["filter.p.vendor", "Dorcel", true],
      ["filter.p.vendor", "Doc Johnson", false],
    ]);
    expect(group.textContent).toContain("Dorcel (4)");
    expect(group.textContent).toContain("Doc Johnson (9)");
  });

  it("reports arrays, repeats the name in the query and submits each toggle", async () => {
    const element = await mount();
    const listener = vi.fn();
    element.addEventListener("plt:filter-change", listener);
    const second = boxes(element)[1];
    second.checked = true;
    second.dispatchEvent(new Event("change", { bubbles: true }));
    await flush(element);
    expect(listener.mock.calls[0][0].detail).toEqual({
      values: { "filter.p.vendor": ["Dorcel", "Doc Johnson"] },
      changed: "filter.p.vendor",
      query: "filter.p.vendor=Dorcel&filter.p.vendor=Doc+Johnson",
    });
    expect(submit).toHaveBeenCalledTimes(1);

    const first = boxes(element)[0];
    first.checked = false;
    first.dispatchEvent(new Event("change", { bubbles: true }));
    expect(element.values).toEqual({ "filter.p.vendor": ["Doc Johnson"] });
  });

  it("shows one chip per value; removing one keeps the others and returns focus to its checkbox", async () => {
    const element = await mount();
    element.addEventListener("plt:filter-change", (event) => event.preventDefault());
    const second = boxes(element)[1];
    second.checked = true;
    second.dispatchEvent(new Event("change", { bubbles: true }));
    await flush(element);
    const chips = [...element.querySelectorAll<HTMLButtonElement>(".plt-filter-bar__chips button")];
    expect(chips.map((chip) => chip.getAttribute("aria-label"))).toEqual([
      "Remove filter: Brand Dorcel",
      "Remove filter: Brand Doc Johnson",
    ]);
    chips[0].click();
    await flush(element);
    await Promise.resolve();
    expect(element.values).toEqual({ "filter.p.vendor": ["Doc Johnson"] });
    expect(boxes(element)[0].checked).toBe(false);
    expect(document.activeElement).toBe(boxes(element)[0]);
  });

  it("submits the new state after a chip removal or clear all, not the stale form", async () => {
    const element = await mount();
    const sent: string[] = [];
    submit.mockImplementation(function (this: HTMLFormElement) {
      // Only the brand group: `new FormData(form)` does not run the empty-value cleanup of a real submit.
      sent.push(new FormData(this).getAll("filter.p.vendor").join(","));
    });
    const chip = element.querySelector<HTMLButtonElement>(".plt-filter-bar__chips button")!;
    chip.click();
    await flush(element);
    await Promise.resolve();
    expect(sent).toEqual([""]);

    boxes(element)[1].checked = true;
    boxes(element)[1].dispatchEvent(new Event("change", { bubbles: true }));
    await flush(element);
    await Promise.resolve();
    element.querySelector<HTMLButtonElement>(".plt-filter-bar__active > button")!.click();
    await flush(element);
    await Promise.resolve();
    expect(sent).toEqual(["", "Doc Johnson", ""]);
  });

  it("clear all empties multiple and single filters", async () => {
    const element = await mount();
    element.addEventListener("plt:filter-change", (event) => event.preventDefault());
    element.querySelector<HTMLButtonElement>(".plt-filter-bar__active > button")!.click();
    await flush(element);
    expect(element.values).toEqual({});
    expect(boxes(element).every((box) => !box.checked)).toBe(true);
  });

  it("carries preserved params as hidden inputs and reflects orientation", async () => {
    const element = await mount('orientation="vertical"');
    element.preserve = { sort_by: "price-ascending", tag: ["a", "b"] };
    await flush(element);
    const hidden = [...element.querySelectorAll<HTMLInputElement>('form:not([data-plt-fallback]) input[type="hidden"]')];
    expect(hidden.map((input) => [input.name, input.value])).toEqual([
      ["sort_by", "price-ascending"],
      ["tag", "a"],
      ["tag", "b"],
    ]);
    expect(element.getAttribute("orientation")).toBe("vertical");
  });

  it("accepts preserve as a JSON attribute", async () => {
    document.body.innerHTML = `<plt-filter-bar preserve='{"sort_by":"title-ascending"}'></plt-filter-bar>`;
    const element = document.querySelector("plt-filter-bar")!;
    element.filters = brands;
    await flush(element);
    expect(element.querySelector<HTMLInputElement>('input[type="hidden"]')!.value).toBe("title-ascending");
  });
});

describe("range, collapsible and disabled filters", () => {
  let submit: ReturnType<typeof vi.spyOn>;
  const price: PltFilter = {
    id: "filter.v.price",
    label: "Price",
    options: [],
    collapsible: true,
    range: {
      min: { name: "filter.v.price.gte", value: 10, placeholder: "0" },
      max: { name: "filter.v.price.lte", value: null, placeholder: "200" },
    },
  };
  const brand: PltFilter = {
    id: "filter.p.vendor",
    label: "Brand",
    multiple: true,
    collapsible: true,
    options: [
      { label: "Dorcel", value: "Dorcel", count: 4 },
      { label: "Empty", value: "Empty", count: 0, disabled: true },
      { label: "Applied but empty", value: "Old", count: 0, disabled: true, selected: true },
    ],
  };

  beforeEach(() => {
    submit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => {});
  });
  afterEach(() => {
    submit.mockRestore();
    document.body.innerHTML = "";
  });

  async function mount(attributes = "") {
    document.body.innerHTML = `<plt-filter-bar action="/collections/all" ${attributes}></plt-filter-bar>`;
    const element = document.querySelector("plt-filter-bar")!;
    element.filters = [price, brand];
    await flush(element);
    return element;
  }
  const bound = (element: HTMLElement, name: string) => element.querySelector<HTMLInputElement>(`input[type="number"][name="${name}"]`)!;

  it("keys a range by its bounds: selection, query and chips", () => {
    const values = selectedValues([price]);
    expect(values).toEqual({ "filter.v.price.gte": "10", "filter.v.price.lte": "" });
    expect(toQuery(values)).toBe("filter.v.price.gte=10");
    expect(activeFilters([price], values, { min: "Min", max: "Max" })).toEqual([
      { id: "filter.v.price.gte", label: "Price", value: "10", valueLabel: "Min 10" },
    ]);
  });

  it("renders two number inputs with their placeholders inside a collapsible group", async () => {
    const element = await mount();
    const group = element.querySelector("details.plt-filter-bar__details")!;
    expect(group.querySelector("summary")!.textContent).toBe("Price");
    expect(group.hasAttribute("open")).toBe(true); // it has an applied value
    expect(bound(element, "filter.v.price.gte").value).toBe("10");
    expect(bound(element, "filter.v.price.gte").placeholder).toBe("0");
    expect(bound(element, "filter.v.price.lte").value).toBe("");
    expect(bound(element, "filter.v.price.lte").getAttribute("aria-label")).toBe("Price Max");
   
    expect(element.querySelectorAll("details.plt-filter-bar__details")[1].hasAttribute("open")).toBe(true); // brand has an applied value too
  });

  it("emits a bound change, cancelable, and submits unless cancelled", async () => {
    const element = await mount();
    const seen: Array<{ changed: string | null; query: string }> = [];
    element.addEventListener("plt:filter-change", (event) => {
      const detail = (event as CustomEvent).detail;
      seen.push({ changed: detail.changed, query: detail.query });
    });
    const max = bound(element, "filter.v.price.lte");
    max.value = "50";
    max.dispatchEvent(new Event("change", { bubbles: true }));
    await flush(element);
    expect(seen[0]).toEqual({ changed: "filter.v.price.lte", query: expect.stringContaining("filter.v.price.lte=50") });
    expect(seen[0].query).toContain("filter.v.price.gte=10");
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("clears a bound for empty or non-numeric input", async () => {
    const element = await mount();
    const min = bound(element, "filter.v.price.gte");
    min.value = "abc";
    min.dispatchEvent(new Event("change", { bubbles: true }));
    await flush(element);
    expect(element.values["filter.v.price.gte"]).toBeUndefined();
    expect(bound(element, "filter.v.price.gte").value).toBe("");
  });

  it("removes a range chip and returns focus to its input", async () => {
    const element = await mount();
    const chip = [...element.querySelectorAll<HTMLButtonElement>(".plt-filter-bar__chips button")].find((button) => button.textContent!.includes("Min 10"))!;
    chip.click();
    await flush(element);
    await flush(element);
    expect(element.values["filter.v.price.gte"]).toBeUndefined();
    expect(document.activeElement).toBe(bound(element, "filter.v.price.gte"));
    expect(submit).toHaveBeenCalled();
  });

  it("clear all empties the range bounds too", async () => {
    const element = await mount();
    [...element.querySelectorAll<HTMLButtonElement>(".plt-filter-bar__active > button")][0].click();
    await flush(element);
    expect(element.values).toEqual({});
  });

  it("omits empty bounds from the submitted form data", async () => {
    const element = await mount();
    const data = new FormData();
    data.append("filter.v.price.gte", "10");
    data.append("filter.v.price.lte", "");
    const event = new Event("formdata") as FormDataEvent;
    Object.defineProperty(event, "formData", { value: data });
    element.form!.dispatchEvent(event);
    expect(data.has("filter.v.price.lte")).toBe(false);
    expect(data.get("filter.v.price.gte")).toBe("10");
  });

  it("disables an option with no results unless it is applied", async () => {
    const element = await mount();
    const boxes = [...element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(boxes.find((box) => box.value === "Empty")!.disabled).toBe(true);
    expect(boxes.find((box) => box.value === "Old")!.disabled).toBe(false);
    expect(boxes.find((box) => box.value === "Dorcel")!.disabled).toBe(false);
  });

  it("hide-chips leaves the active filters to the frontend", async () => {
    const element = await mount("hide-chips");
    expect(element.querySelector(".plt-filter-bar__active")).toBeNull();
    expect(element.hasAttribute("hide-chips")).toBe(true);
  });
});

describe("<plt-sort-select> and <plt-pagination>", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("sort: emits plt:sort-change and submits unless cancelled", async () => {
    const submit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => {});
    document.body.innerHTML = '<plt-sort-select name="sort_by" label="Sort"></plt-sort-select>';
    const element = document.querySelector("plt-sort-select")!;
    element.options = [
      { label: "Featured", value: "manual" },
      { label: "Price, low to high", value: "price-ascending", selected: true },
    ];
    await flush(element);
    const selectEl = element.querySelector("select")!;
    expect(selectEl.name).toBe("sort_by");
    expect(selectEl.value).toBe("price-ascending");
    const listener = vi.fn();
    element.addEventListener("plt:sort-change", listener);
    selectEl.value = "manual";
    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    expect(listener.mock.calls[0][0].detail).toEqual({ name: "sort_by", value: "manual" });
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("sort: carries preserved params as hidden inputs", async () => {
    document.body.innerHTML = '<plt-sort-select name="sort_by"></plt-sort-select>';
    const element = document.querySelector("plt-sort-select")!;
    element.options = [{ label: "Featured", value: "manual" }];
    element.preserve = { "filter.p.vendor": ["Dorcel", "Doc Johnson"], q: "wand" };
    await flush(element);
    const hidden = [...element.querySelectorAll<HTMLInputElement>('input[type="hidden"]')];
    expect(hidden.map((input) => [input.name, input.value])).toEqual([
      ["filter.p.vendor", "Dorcel"],
      ["filter.p.vendor", "Doc Johnson"],
      ["q", "wand"],
    ]);
  });

  it("pagination: renders links, marks the current page, lets clicks be cancelled", async () => {
    document.body.innerHTML = '<plt-pagination previous-url="?page=1" next-url="?page=3"></plt-pagination>';
    const element = document.querySelector("plt-pagination")!;
    element.pages = [
      { label: "1", url: "?page=1" },
      { label: "2", current: true },
      { label: "3", url: "?page=3" },
    ];
    await flush(element);
    const nav = element.querySelector("nav.plt-pagination")!;
    expect(nav.getAttribute("aria-label")).toBe("Pagination");
    expect(element.querySelector('[aria-current="page"]')!.textContent).toBe("2");
    expect([...element.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual(["?page=1", "?page=1", "?page=3", "?page=3"]);
    element.addEventListener("plt:page-change", (event) => event.preventDefault());
    const click = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    element.querySelectorAll("a")[2].dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    const modified = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
    element.querySelectorAll("a")[2].dispatchEvent(modified);
    expect(modified.defaultPrevented).toBe(false);
  });

  it("pagination: variant=compact adds plt-pagination--compact", async () => {
    document.body.innerHTML = '<plt-pagination variant="compact"></plt-pagination>';
    const element = document.querySelector("plt-pagination")!;
    element.pages = [{ label: "1", current: true }, { label: "2", url: "?page=2" }];
    await flush(element);
    expect(element.getAttribute("variant")).toBe("compact");
    expect(element.querySelector("nav")!.classList.contains("plt-pagination--compact")).toBe(true);
  });
});

describe("<plt-navbar>", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="outside">Outside</button>
      <plt-navbar>
        <header class="plt-navbar">
          <button data-plt-navbar-toggle aria-expanded="false" aria-controls="mobile">Menu</button>
          <ul>
            <li><a id="shop" href="/shop" aria-haspopup="true" aria-expanded="false" aria-controls="mega-shop">Shop</a></li>
            <li><a id="toys" href="/toys" aria-haspopup="true" aria-expanded="false" aria-controls="mega-toys">Toys</a></li>
            <li><a id="about" href="/about">About</a></li>
          </ul>
          <div class="plt-megamenu" id="mega-shop" data-open="false"><a id="shop-first" href="/shop/new">New</a><a href="/shop/sale">Sale</a></div>
          <div class="plt-megamenu" id="mega-toys" data-open="false"><a id="toys-first" href="/toys/all">All toys</a></div>
          <div id="mobile" data-open="false" hidden><a href="/shop">Shop</a></div>
        </header>
      </plt-navbar>`;
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
  const key = (target: HTMLElement, name: string) =>
    target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }));

  it("keeps the mobile toggle contract: click, Escape, outside click", () => {
    const toggle = $("[data-plt-navbar-toggle]");
    const panel = $("#mobile");
    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(panel.dataset.open).toBe("true");
    expect(panel.hidden).toBe(false);
    key(panel, "Escape");
    expect(panel.hidden).toBe(true);
    expect(document.activeElement).toBe(toggle);
    toggle.click();
    $("#outside").click();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens a mega menu on focus, one at a time, and closes on Escape", () => {
    const events: Array<{ id: string; open: boolean }> = [];
    $("plt-navbar").addEventListener("plt:megamenu-toggle", (event) => events.push((event as CustomEvent).detail));
    $("#shop").focus();
    expect($("#mega-shop").dataset.open).toBe("true");
    expect($("#shop").getAttribute("aria-expanded")).toBe("true");
    $("#toys").focus();
    expect($("#mega-shop").dataset.open).toBe("false");
    expect($("#mega-toys").dataset.open).toBe("true");
    key($("#toys"), "ArrowDown");
    expect(document.activeElement).toBe($("#toys-first"));
    key($("#toys-first"), "Escape");
    expect($("#mega-toys").dataset.open).toBe("false");
    expect(document.activeElement).toBe($("#toys"));
    expect(events.slice(0, 3)).toEqual([
      { id: "mega-shop", open: true },
      { id: "mega-shop", open: false },
      { id: "mega-toys", open: true },
    ]);
  });

  it("opens on hover and closes after leaving trigger and panel", () => {
    vi.useFakeTimers();
    const over = (target: HTMLElement, relatedTarget: Element | null = null) =>
      target.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse", relatedTarget }));
    const out = (target: HTMLElement, relatedTarget: Element | null) =>
      target.dispatchEvent(new PointerEvent("pointerout", { bubbles: true, pointerType: "mouse", relatedTarget }));
    over($("#shop"));
    expect($("#mega-shop").dataset.open).toBe("true");
    out($("#shop"), $("#mega-shop"));
    over($("#mega-shop"));
    vi.advanceTimersByTime(300);
    expect($("#mega-shop").dataset.open).toBe("true");
    out($("#mega-shop"), $("#outside"));
    vi.advanceTimersByTime(100);
    expect($("#mega-shop").dataset.open).toBe("true");
    vi.advanceTimersByTime(100);
    expect($("#mega-shop").dataset.open).toBe("false");
  });

  it("closes when focus leaves and when a panel link is followed", () => {
    $("#shop").focus();
    $("#about").focus();
    expect($("#mega-shop").dataset.open).toBe("false");
    $("#shop").focus();
    $("#shop-first").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect($("#mega-shop").dataset.open).toBe("false");
  });
});

describe("<plt-product-gallery> additions", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("moves with arrow keys, copies srcset and reports the change", async () => {
    document.body.innerHTML = `<plt-product-gallery>
      <div class="plt-product-detail__gallery-main"><img src="a.jpg" srcset="a.jpg 1x, a2.jpg 2x" alt="A"></div>
      <button class="plt-product-detail__thumb" aria-label="Front"><img src="a.jpg" srcset="a.jpg 1x, a2.jpg 2x" alt=""></button>
      <button class="plt-product-detail__thumb" aria-label="Back"><img src="b.jpg" srcset="b.jpg 1x, b2.jpg 2x" alt=""></button>
    </plt-product-gallery>`;
    const gallery = document.querySelector("plt-product-gallery")!;
    const [first, second] = gallery.thumbs;
    const main = gallery.querySelector<HTMLImageElement>(".plt-product-detail__gallery-main img")!;
    const changes = vi.fn();
    gallery.addEventListener("plt:gallery-change", changes);
    first.focus();
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(second);
    expect(main.getAttribute("srcset")).toBe("b.jpg 1x, b2.jpg 2x");
    expect(main.alt).toBe("Back");
    expect(second.getAttribute("aria-current")).toBe("true");
    expect(changes.mock.calls[0][0].detail).toMatchObject({ index: 1 });
    gallery.selectedIndex = 0;
    await gallery.updateComplete;
    expect(main.getAttribute("srcset")).toBe("a.jpg 1x, a2.jpg 2x");
  });
});
