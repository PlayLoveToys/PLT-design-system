// @vitest-environment node
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { STATIC_ADAPTERS, buildAdapter } from "../../scripts/build-static-adapters.mjs";
import { shopifyLiquid } from "../fixtures/liquid.mjs";

const adapters = fileURLToPath(new URL("../../adapters/liquid/", import.meta.url));
const renderers = fileURLToPath(new URL("../../../design-system/renderers/liquid/", import.meta.url));
const read = (path: string) => readFile(path, "utf8");
const names = Object.keys(STATIC_ADAPTERS);

const samples: Record<string, Record<string, unknown>> = {
  "plt-article-card": { title: "Guide <1>", url: "/blogs/news/guide", image_url: "/g.jpg", meta: "May 1", excerpt: "Short", action_label: "Lire" },
  "plt-collection-card": { title: "Vibrators", url: "/collections/v", image_url: "/v.jpg", description: "All of them" },
  "plt-swatch": { color: "#ff0066", label: "Pink", size: "sm" },
  "plt-buy-bar": { content: '<button class="d-btn">Add</button>', visible: true },
  "plt-prose": { body: "<p>Hello <strong>world</strong></p>" },
  "plt-trust-bar": { heading: "Why us", items: [{ icon: "<svg></svg>", label: "Free shipping", body: "Over $50" }, { label: "Discreet" }] },
  "plt-link-grid": { heading: "Help", columns: [{ title: "Shop", links: [{ label: "All", url: "/collections/all" }] }] },
  "plt-chip-pills": { items: [{ label: "New", url: "/new", current: true }, { label: "Sale", url: "/sale" }] },
  "plt-location-card": { title: "Montréal", url: "/pages/montreal", meta: "QC", description: "Store" },
  "plt-newsletter": { heading: "Join", body: "Deals", form_action: "/contact#newsletter", input_name: "contact[email]" },
  "plt-footer": { site_name: "PLT", tagline: "Play", social: [{ label: "Instagram", url: "https://instagram.com/plt" }], columns: [{ title: "Help", links: [{ label: "FAQ", url: "/faq" }] }], newsletter: "<div id=nl></div>", legal: "<p>Legal</p>" },
};

describe("static Liquid adapters (DS#23)", () => {
  it("covers the 11 static renderers", () => {
    expect(names.sort()).toEqual([
      "plt-article-card", "plt-buy-bar", "plt-chip-pills", "plt-collection-card", "plt-footer", "plt-link-grid",
      "plt-location-card", "plt-newsletter", "plt-prose", "plt-swatch", "plt-trust-bar",
    ]);
  });

  it.each(names)("%s is current, Shopify-valid and self-contained", async (name) => {
    const source = await read(`${adapters}${name}.liquid`);
    expect(source).toBe(await buildAdapter(name, STATIC_ADAPTERS[name as keyof typeof STATIC_ADAPTERS]));
    expect(source.startsWith("{% doc %}")).toBe(true);
    expect(source).toContain("{% enddoc %}");
    const outsideDoc = source.replace(/\{% doc %\}[\s\S]*?\{% enddoc %\}/, "");
    expect(outsideDoc).not.toMatch(/\{%-?\s*include\b/);
    expect(outsideDoc).not.toMatch(/\{%-?\s*render\b/);
    expect(outsideDoc).not.toContain("<script");
  });

  it.each(names)("%s renders the same markup as its renderer", async (name) => {
    const spec = STATIC_ADAPTERS[name as keyof typeof STATIC_ADAPTERS];
    const engine = shopifyLiquid(adapters);
    const fromAdapter = await engine.parseAndRender(await read(`${adapters}${name}.liquid`), samples[name]);
    const fromRenderer = await engine.parseAndRender(await read(`${renderers}${spec.renderer}.liquid`), samples[name]);
    expect(fromAdapter.trim()).toBe(fromRenderer.trim());
    expect(fromAdapter.trim().length).toBeGreaterThan(0);
  });

  it("escapes normalized text but passes trusted HTML slots through", async () => {
    const engine = shopifyLiquid(adapters);
    const card = await engine.parseAndRender(await read(`${adapters}plt-article-card.liquid`), samples["plt-article-card"]);
    expect(card).toContain("Guide &lt;1&gt;");
    expect(card).toContain(">Lire</a>");
    const prose = await engine.parseAndRender(await read(`${adapters}plt-prose.liquid`), samples["plt-prose"]);
    expect(prose).toContain("<strong>world</strong>");
    const bar = await engine.parseAndRender(await read(`${adapters}plt-buy-bar.liquid`), samples["plt-buy-bar"]);
    expect(bar).toContain('data-visible="true"');
    expect(bar).toContain('<button class="d-btn">Add</button>');
    const footer = await engine.parseAndRender(await read(`${adapters}plt-footer.liquid`), samples["plt-footer"]);
    expect(footer).toContain('<div id=nl></div>');
    expect(footer).toContain("<p>Legal</p>");
  });
});
