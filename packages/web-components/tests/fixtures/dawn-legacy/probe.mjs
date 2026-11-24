// Harness: the design-system controls next to Shopify Dawn's base.css in `@layer legacy`.
// `setups` are the stylesheet compositions under test; `measure` renders the same markup in
// real Chromium and reports the metrics that regressed in PLT-liquid-theme (docs/fase1-preflight.md).
// A shared `html` font keeps glyph widths out of the comparison (the global preflight sets one).
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = join(here, "../../..");
const out = join(root, "examples/.out-dawn");

const dawn = '@import "./dawn-base.css" layer(legacy);';
const ds = '@source "./probe.mjs";\n@import "@playlovetoys/design-system";';
const tw = (layers, ...imports) => `@layer ${layers};\n${imports.join("\n")}`;

export const setups = {
  /** What the theme ships today: Dawn only, no Tailwind preflight. */
  legacy: tw("legacy, theme, base, components, utilities", dawn, '@import "tailwindcss/theme.css" layer(theme);', '@import "tailwindcss/utilities.css" layer(utilities);', ds),
  /** The deferred experiment: global preflight in `base`. */
  globalPreflight: tw("legacy, theme, base, components, utilities", dawn, '@import "tailwindcss/theme.css" layer(theme);', '@import "tailwindcss/preflight.css" layer(base);', '@import "tailwindcss/utilities.css" layer(utilities);', ds),
  /** The design target: Tailwind preflight, no legacy stylesheet (as in the demos). */
  reference: `@import "tailwindcss";\n${ds}`,
  /** The documented setup: Dawn in `legacy`, preflight scoped to `.plt-ds-root`. */
  scoped: tw("legacy, theme, plt-base, components, utilities", dawn, '@import "tailwindcss/theme.css" layer(theme);', '@import "tailwindcss/utilities.css" layer(utilities);', '@import "@playlovetoys/design-system/scoped-preflight";', ds),
};

export function compile(name, css) {
  mkdirSync(out, { recursive: true });
  const input = join(here, `${name}.input.css`);
  writeFileSync(input, css);
  // The input sits next to dawn-base.css so `@import "./dawn-base.css"` resolves.
  execFileSync(join(root, "../../node_modules/.bin/tailwindcss"), ["-i", input, "-o", join(out, `${name}.css`), "--minify"], { cwd: root, stdio: "pipe" });
  return readFileSync(join(out, `${name}.css`), "utf8");
}

export const MARKUP = `
<div class="plt-ds-root" id="root">
  <plt-quantity-selector id="qty" value="2" min="1" name="quantity"><input data-plt-fallback type="number" name="quantity" value="2"></plt-quantity-selector>
  <plt-filter-bar id="fb" filters='[{"id":"filter.p.vendor","label":"Brand","multiple":true,"options":[{"label":"Dorcel","value":"Dorcel","count":4},{"label":"Lelo","value":"Lelo","count":2}]}]'></plt-filter-bar>
  <button id="btn" class="d-btn d-btn-primary">Add</button>
</div>
<div id="outside">
  <button id="dawn-button" class="button" type="button">Dawn button</button>
  <input id="dawn-input" class="field__input" type="text" value="Dawn field">
  <ul id="dawn-list"><li>One</li></ul>
</div>`;

const box = (el) => {
  const r = el.getBoundingClientRect();
  return `${Math.round(r.width)}x${Math.round(r.height)}`;
};

export async function measure(css) {
  const browser = await chromium.launch({ executablePath: process.env.PLT_CHROME_PATH || undefined });
  try {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html><head><style>${css}</style><style>html{font-family:Arial,Helvetica,sans-serif}</style></head><body>${MARKUP}</body></html>`);
    await page.addScriptTag({ content: readFileSync(join(root, "dist/plt-web-components.bundle.js"), "utf8"), type: "module" });
    await page.waitForSelector("plt-quantity-selector .d-join");
    await page.waitForSelector("plt-filter-bar input[type=checkbox]");
    return await page.evaluate((boxSource) => {
      const box = new Function(`return ${boxSource}`)();
      const style = (el) => getComputedStyle(el);
      const checkbox = document.querySelector("#fb input[type=checkbox]:not([disabled])");
      const btn = document.querySelector("#btn");
      return {
        quantity: box(document.querySelector("#qty")),
        checkbox: box(checkbox),
        button: box(btn),
        buttonPaddingBlock: style(btn).paddingBlockStart,
        outside: {
          button: box(document.querySelector("#dawn-button")),
          input: box(document.querySelector("#dawn-input")),
          listStyle: style(document.querySelector("#dawn-list")).listStyleType,
        },
      };
    }, box.toString());
  } finally {
    await browser.close();
  }
}
