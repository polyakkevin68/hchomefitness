import type { CatalogProduct } from "./adatmodellek";

export type CatalogFilters = { keres?: string; kategoria?: string; rendezes?: string };

export function filterCatalog(products: CatalogProduct[], filters: CatalogFilters): CatalogProduct[] {
  const term = filters.keres?.trim().toLocaleLowerCase("hu-HU") ?? "";
  const category = filters.kategoria?.trim() ?? "";
  const filtered = products.filter((product) => {
    const searchable = `${product.sku} ${product.name} ${product.category} ${product.description}`.toLocaleLowerCase("hu-HU");
    return (!term || searchable.includes(term)) && (!category || product.category === category);
  });
  switch (filters.rendezes) {
    case "ar-novekvo": return filtered.sort((a, b) => a.priceHuf - b.priceHuf);
    case "ar-csokkeno": return filtered.sort((a, b) => b.priceHuf - a.priceHuf);
    case "nev": return filtered.sort((a, b) => a.name.localeCompare(b.name, "hu"));
    default: return filtered;
  }
}
