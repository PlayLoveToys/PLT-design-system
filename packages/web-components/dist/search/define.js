import { defineOnce } from "../shared/element.js";
import { PltPredictiveSearch } from "./plt-predictive-search.js";
function definePltSearch(registry) {
  return defineOnce("plt-predictive-search", PltPredictiveSearch, registry ?? globalThis.customElements);
}
definePltSearch();
export {
  PltPredictiveSearch,
  definePltSearch
};
