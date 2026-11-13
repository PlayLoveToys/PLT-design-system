import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const errors = [];

const pricePath = join(root, "renderers/astro/commerce/Price.astro");
const stockPath = join(root, "renderers/astro/commerce/Stock.astro");
const contractsPath = join(root, "contracts/components.md");

const priceSource = await readFile(pricePath, "utf8");
const stockSource = await readFile(stockPath, "utf8");
const contracts = await readFile(contractsPath, "utf8");

if (/en-US/.test(priceSource)) {
  errors.push("Price.astro must not hardcode en-US; locale comes from props");
}

if (!priceSource.includes("locale")) {
  errors.push("Price.astro must accept a locale prop");
}

if (!stockSource.includes("data-stock-state")) {
  errors.push("Stock.astro must expose data-stock-state for the normalized state");
}

for (const heading of ["## Price", "## Stock"]) {
  if (!contracts.includes(heading)) {
    errors.push(`contracts/components.md is missing ${heading}`);
  }
}

// Pagination: the opt-in compact variant must exist in CSS, both renderers and the contract.
const patterns = await readFile(join(root, "src/patterns.css"), "utf8");
if (!patterns.includes(".plt-pagination--compact")) {
  errors.push("src/patterns.css is missing the .plt-pagination--compact modifier");
}
for (const path of ["renderers/astro/ui/Pagination.astro", "renderers/liquid/pagination.liquid"]) {
  const source = await readFile(join(root, path), "utf8");
  if (!source.includes("plt-pagination--compact") || !source.includes("compact")) {
    errors.push(`${path} must support the compact flag (plt-pagination--compact)`);
  }
}
const paginationContract = contracts.slice(contracts.indexOf("## Pagination"), contracts.indexOf("## EmptyState"));
for (const token of ["`compact`", "plt-pagination--compact", 'variant="compact"', "`anchor`"]) {
  if (!paginationContract.includes(token)) errors.push(`contracts/components.md Pagination section is missing ${token}`);
}

if (errors.length) {
  console.error("commerce contract check failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("commerce contract check passed.");
