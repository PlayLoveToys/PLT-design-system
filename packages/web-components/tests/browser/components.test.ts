/**
 * Real-browser tests of every component group (product, cart, collection,
 * navigation) in the three built storefront demos. The Liquid demo leaves the
 * collection controls on their default behaviour (GET navigation); Astro and
 * React cancel the events and route on the client.
 */
import { createServer, type Server } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "playwright";

const root = fileURLToPath(new URL("../..", import.meta.url));
const out = join(root, "examples/.out");
const screenshots = join(out, "screenshots");
const axeSource = await readFile(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};

let server: Server;
let browser: Browser;
let origin = "";

beforeAll(async () => {
  server = createServer(async (request, response) => {
    let path = decodeURIComponent(new URL(request.url ?? "/", "http://x").pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = normalize(join(out, path));
    if (!file.startsWith(out)) return void response.writeHead(403).end();
    try {
      response.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(await readFile(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  origin = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  browser = await chromium.launch();
  await mkdir(screenshots, { recursive: true });
});

afterAll(async () => {
  await browser?.close();
  await new Promise((resolve) => server?.close(resolve));
});

const TAGS = [
  "plt-variant-picker",
  "plt-quantity-selector",
  "plt-cart-drawer",
  "plt-cart-line",
  "plt-filter-bar",
  "plt-sort-select",
  "plt-pagination",
  "plt-product-gallery",
  "plt-quick-view",
  "plt-navbar",
];

async function open(name: string, { width = 1200, javaScriptEnabled = true } = {}) {
  const context = await browser.newContext({ javaScriptEnabled, viewport: { width, height: 1000 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto(`${origin}/${name}/`);
  if (javaScriptEnabled) {
    await page.waitForFunction((tags) => tags.every((tag) => customElements.get(tag)), TAGS);
    await page.waitForFunction(
      () =>
        document.querySelector("plt-cart-drawer dialog") &&
        document.querySelector(
          'plt-filter-bar > form:not([data-plt-fallback]) select, plt-filter-bar > form:not([data-plt-fallback]) input[type="checkbox"]',
        ),
    );
  }
  return { page, errors, close: () => context.close() };
}

const settle = (page: Page) =>
  page.evaluate(() => Promise.allSettled(document.getAnimations().map((animation) => animation.finished)));

async function audit(page: Page, context = "body") {
  await page.addScriptTag({ content: axeSource });
  await settle(page);
  const results = await page.evaluate(
    (selector) =>
      (window as unknown as { axe: { run: (c: string) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe.run(selector),
    context,
  );
  return results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
}

const focused = (page: Page) =>
  page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    return element ? `${element.tagName.toLowerCase()}:${element.textContent?.trim() ?? ""}` : "";
  });

const frontends = [
  { name: "liquid", clientRouted: false },
  { name: "astro", clientRouted: true },
  { name: "react", clientRouted: true },
] as const;

describe.each(frontends)("$name storefront", ({ name, clientRouted }) => {
  it("defines every element without errors and passes axe", async () => {
    const { page, errors, close } = await open(name);
    expect(await audit(page)).toEqual([]);
    await page.screenshot({ path: join(screenshots, `${name}-store.png`), fullPage: true, animations: "disabled" });
    expect(errors).toEqual([]);
    await close();
  });

  it("navbar: mega menu by hover and keyboard, Escape returns focus", async () => {
    const { page, close } = await open(name);
    const trigger = page.locator('.plt-navbar__links a[aria-haspopup="true"]').first();
    const panel = page.locator(".plt-megamenu").first();
    await trigger.hover();
    await expect.poll(() => panel.getAttribute("data-open")).toBe("true");
    expect(await trigger.getAttribute("aria-expanded")).toBe("true");
    await page.screenshot({ path: join(screenshots, `${name}-megamenu.png`), animations: "disabled" });
    await page.mouse.move(600, 900);
    await expect.poll(() => panel.getAttribute("data-open")).toBe("false");

    await trigger.focus();
    expect(await panel.getAttribute("data-open")).toBe("true");
    await page.keyboard.press("ArrowDown");
    expect(await focused(page)).toBe("a:Clothing");
    await page.keyboard.press("Escape");
    expect(await panel.getAttribute("data-open")).toBe("false");
    expect(await focused(page)).toBe("a:Shop");
    await close();
  });

  it("navbar: mobile menu toggles with click and Escape", async () => {
    const { page, close } = await open(name, { width: 390 });
    const toggle = page.locator("[data-plt-navbar-toggle]");
    await toggle.click();
    expect(await page.locator("#plt-navbar-mobile").isVisible()).toBe(true);
    expect(await toggle.getAttribute("aria-expanded")).toBe("true");
    expect(await page.locator("#plt-navbar-mobile").getByRole("link", { name: "Tees" }).isVisible()).toBe(true);
    await page.keyboard.press("Escape");
    expect(await page.locator("#plt-navbar-mobile").isVisible()).toBe(false);
    expect(await focused(page)).toContain("button");
    await close();
  });

  it("gallery: thumbnails, arrow keys and the variant's image", async () => {
    const { page, close } = await open(name);
    const main = page.locator(".plt-product-detail__gallery-main img");
    await page.locator(".plt-product-detail__thumb").nth(1).click();
    expect(await main.getAttribute("src")).toContain("blue.svg");
    await page.keyboard.press("ArrowRight");
    expect(await main.getAttribute("src")).toContain("green.svg");
    expect(await page.locator(".plt-product-detail__thumb").nth(2).getAttribute("aria-current")).toBe("true");
    // The page maps a colour to an image when the variant changes.
    await page.locator('plt-variant-picker label:has(> input[value="Blue"])').click();
    await expect.poll(() => main.getAttribute("src")).toContain("blue.svg");
    await close();
  });

  it("quantity + cart drawer: add, change, remove, focus handling", async () => {
    const { page, close } = await open(name);
    const quantity = page.locator("[data-pdp] plt-quantity-selector");
    await quantity.getByRole("button", { name: "Increase quantity" }).click();
    await quantity.getByRole("button", { name: "Increase quantity" }).click();
    expect(await quantity.locator(".plt-quantity-selector input").inputValue()).toBe("3");
    await page.locator("[data-add-to-cart]").click();

    const dialog = page.locator("plt-cart-drawer dialog");
    await expect.poll(() => dialog.evaluate((d: HTMLDialogElement) => d.open)).toBe(true);
    expect(await page.evaluate(() => document.querySelector("plt-cart-drawer dialog")!.contains(document.activeElement))).toBe(true);
    const lines = page.locator("plt-cart-drawer plt-cart-line");
    expect(await lines.count()).toBe(2);
    const tee = lines.filter({ hasText: "Play Tee" });
    expect(await tee.locator(".plt-quantity-selector input").inputValue()).toBe("3");
    await expect.poll(() => page.locator(".plt-cart-drawer__subtotal").textContent()).toContain("$76.00");
    await settle(page);
    await page.locator("plt-cart-drawer .plt-cart-drawer__panel").screenshot({ path: join(screenshots, `${name}-cart.png`), animations: "disabled" });
    expect(await audit(page, "plt-cart-drawer")).toEqual([]);

    await tee.getByRole("button", { name: "Decrease quantity" }).click();
    await expect.poll(() => page.locator(".plt-cart-drawer__subtotal").textContent()).toContain("$57.00");
    await lines.filter({ hasText: "Glow Ring" }).getByRole("button", { name: "Remove: Glow Ring" }).click();
    await expect.poll(() => lines.count()).toBe(1);
    await expect.poll(() => page.locator(".plt-cart-drawer__subtotal").textContent()).toContain("$38.00");
    expect(await page.locator("[data-cart-open]").first().textContent()).toContain("(2)");

    await page.keyboard.press("Escape");
    await expect.poll(() => dialog.evaluate((d: HTMLDialogElement) => d.open)).toBe(false);
    // The dialog's `close` event (which releases the scroll lock) is a task after `open` flips.
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
    await close();
  });

  it("quick view: opens a modal and returns focus on Escape", async () => {
    const { page, close } = await open(name);
    const trigger = page.locator("[data-quick-view-open]").first();
    await trigger.click();
    const dialog = page.locator("plt-quick-view dialog").first();
    expect(await dialog.evaluate((d: HTMLDialogElement) => d.open)).toBe(true);
    await page.keyboard.press("Escape");
    await expect.poll(() => dialog.evaluate((d: HTMLDialogElement) => d.open)).toBe(false);
    expect(await focused(page)).toBe("button:Quick view");
    await close();
  });

  it("collection: filters, chips, sort and pagination", async () => {
    const { page, close } = await open(name);
    const color = page.locator('plt-filter-bar > form:not([data-plt-fallback]) input[name="filter.v.option.color"][value="Red"]');
    if (clientRouted) {
      await color.check();
      await expect.poll(() => page.url()).toContain("filter.v.option.color=Red");
      expect(page.url()).not.toContain("filter.v.option.size");
      const chip = page.getByRole("button", { name: "Remove filter: Color Red" });
      expect(await chip.isVisible()).toBe(true);
      await page.locator(".plt-collection-controls").screenshot({ path: join(screenshots, `${name}-filters.png`), animations: "disabled" });
      await chip.click();
      await expect.poll(() => page.url()).not.toContain("filter.v.option.color");
      expect(await focused(page)).toContain("input");

      await page.locator("plt-sort-select > form:not([data-plt-fallback]) select").selectOption("price-ascending");
      await expect.poll(() => page.url()).toContain("sort_by=price-ascending");

      await page.locator("plt-pagination").getByRole("link", { name: "2" }).click();
      await expect.poll(() => page.url()).toContain("page=2");
      await expect.poll(() => page.locator("[data-log]").textContent()).toContain("plt:page-change");
    } else {
      // Default behaviour: real GET navigation, empty filters omitted.
      await Promise.all([page.waitForURL(/filter\.v\.option\.color=Red/), color.check()]);
      expect(page.url()).not.toContain("filter.v.option.size");
      await page.waitForFunction(() => customElements.get("plt-sort-select") && document.querySelector("plt-sort-select > form:not([data-plt-fallback]) select"));
      await Promise.all([page.waitForURL(/sort_by=price-ascending/), page.locator("plt-sort-select > form:not([data-plt-fallback]) select").selectOption("price-ascending")]);
      await page.waitForFunction(() => document.querySelector("plt-pagination a"));
      await Promise.all([page.waitForURL(/page=2/), page.locator("plt-pagination").getByRole("link", { name: "2" }).click()]);
    }
    await close();
  });

  it("works without JavaScript: fallbacks for quantity, filters, sort and pagination", async () => {
    const { page, close } = await open(name, { javaScriptEnabled: false });
    expect(await page.locator('plt-quantity-selector > input[data-plt-fallback][name="quantity"]').isVisible()).toBe(true);
    expect(await page.locator('plt-filter-bar > form[data-plt-fallback] input[type="checkbox"][name="filter.v.option.color"]').first().isVisible()).toBe(true);
    expect(await page.locator("plt-filter-bar > form[data-plt-fallback] button[type=submit]").isVisible()).toBe(true);
    expect(await page.locator('plt-sort-select > form[data-plt-fallback] select[name="sort_by"]').isVisible()).toBe(true);
    expect(await page.locator('plt-pagination > nav[data-plt-fallback] a[href="?page=2"]').first().isVisible()).toBe(true);
    await close();
  });
});

/**
 * Same size and no visible difference. Chromium rasterizes anti-aliased edges (a checkbox shadow, text at a
 * half-pixel baseline) with a one-level wobble from run to run, so byte equality fails about one run in four
 * even for one page. A real layout or colour difference changes thousands of pixels, or by far more than
 * two levels, and still fails here.
 */
async function imagesMatch(a: Buffer, b: Buffer, { maxDelta = 2, maxShare = 0.002 } = {}) {
  if (a.equals(b)) return true;
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const { sizeEqual, share, worst } = await page.evaluate(
      async ([x, y]) => {
        const load = async (base64: string) => {
          const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(bitmap, 0, 0);
          return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
        };
        const [one, two] = await Promise.all([load(x), load(y)]);
        if (one.width !== two.width || one.height !== two.height) return { sizeEqual: false, share: 1, worst: 255 };
        let differing = 0;
        let largest = 0;
        for (let i = 0; i < one.data.length; i += 4) {
          const delta = Math.max(...[0, 1, 2, 3].map((c) => Math.abs(one.data[i + c] - two.data[i + c])));
          if (delta > 0) differing += 1;
          largest = Math.max(largest, delta);
        }
        return { sizeEqual: true, share: differing / (one.width * one.height), worst: largest };
      },
      [a.toString("base64"), b.toString("base64")],
    );
    return sizeEqual && worst <= maxDelta && share <= maxShare;
  } finally {
    await context.close();
  }
}

describe("cross-frontend parity of the shared components", () => {
  it("renders identical collection controls and pagination in the three frontends", async () => {
    const shots: Record<string, Buffer[]> = { controls: [], pagination: [] };
    for (const { name } of frontends) {
      const { page, close } = await open(name);
      await settle(page);
      shots.controls.push(await page.locator(".plt-collection-controls").screenshot({ path: join(screenshots, `${name}-controls-parity.png`), animations: "disabled" }));
      shots.pagination.push(await page.locator("plt-pagination").screenshot({ animations: "disabled" }));
      await close();
    }
    for (const images of Object.values(shots)) {
      expect(await imagesMatch(images[0], images[1])).toBe(true);
      expect(await imagesMatch(images[0], images[2])).toBe(true);
    }
  });

  it("exposes the same accessibility tree for every shared component", async () => {
    const trees: string[] = [];
    for (const { name } of frontends) {
      const { page, close } = await open(name);
      const parts = await Promise.all(
        ["plt-variant-picker", "[data-pdp] plt-quantity-selector", "plt-filter-bar", "plt-sort-select", "plt-pagination"].map((selector) =>
          page.locator(selector).first().ariaSnapshot(),
        ),
      );
      trees.push(parts.join("\n---\n"));
      await close();
    }
    expect(trees[1]).toBe(trees[0]);
    expect(trees[2]).toBe(trees[0]);
  });
});
