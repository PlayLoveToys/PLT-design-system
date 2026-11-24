import { defineOnce } from "../shared/element.js";
import { PltPredictiveSearch } from "./plt-predictive-search.js";

export function definePltSearch(registry?: CustomElementRegistry): boolean {
  return defineOnce("plt-predictive-search", PltPredictiveSearch, registry ?? globalThis.customElements);
}

definePltSearch();

export { PltPredictiveSearch };
