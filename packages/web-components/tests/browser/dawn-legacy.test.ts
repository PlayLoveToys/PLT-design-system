// Scoped preflight next to Dawn's base.css in `@layer legacy` (DS#24), in real Chromium.
import { beforeAll, describe, expect, it } from "vitest";
import { compile, measure, setups } from "../fixtures/dawn-legacy/probe.mjs";

type Metrics = Awaited<ReturnType<typeof measure>>;
const result = {} as Record<keyof typeof setups, Metrics>;

beforeAll(async () => {
  for (const [name, css] of Object.entries(setups)) {
    result[name as keyof typeof setups] = await measure(compile(name, css));
  }
}, 120_000);

describe("design-system controls with Dawn base.css in @layer legacy", () => {
  it("the global preflight changes the legacy theme's own controls (why it stays off)", () => {
    expect(result.globalPreflight.outside).not.toEqual(result.legacy.outside);
  });

  it("without any reset the controls differ from the design target (UA box model, not Dawn)", () => {
    // content-box inputs and UA button padding: the baseline the 2026-11-18 probe measured.
    expect(result.legacy.quantity).not.toBe(result.reference.quantity);
    expect(result.legacy.buttonPaddingBlock).not.toBe(result.reference.buttonPaddingBlock);
  });

  it("scoped preflight gives plt-quantity-selector, plt-filter-bar and d-btn the design-target metrics", () => {
    for (const key of ["quantity", "checkbox", "button", "buttonPaddingBlock"] as const) {
      expect(result.scoped[key], key).toBe(result.reference[key]);
    }
    // The checkbox group must not collapse (the probe reported 0x0).
    expect(result.scoped.checkbox).not.toMatch(/^0x|x0$/);
  });

  it("scoped preflight leaves everything outside .plt-ds-root exactly as the legacy theme renders it", () => {
    expect(result.scoped.outside).toEqual(result.legacy.outside);
  });
});
