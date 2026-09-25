export type CatalogProduct = {
  id?: string;
  sourceId: string;
  sku: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  priceHuf: number;
  description: string;
  imageUrls: string[];
  attributes: ProductAttribute[];
  isPurchasable: boolean;
  source: "fixture" | "unas";
  isTestFixture: boolean;
  keszlet?: import("./keszlet-allapot").KeszletInformacio;
};

export type ProductAttribute = { id: string; name: string; value: string };

export type KatalogusKereso = { keres?: string; kategoria?: string; rendezes?: string; oldal?: string; oldalmeret?: number };

export type KatalogusOldal = {
  termekek: CatalogProduct[];
  szurtTermekekSzama: number;
  osszesTermekSzama: number;
  kategoriak: string[];
  oldal: number;
  oldalakSzama: number;
};

export interface CatalogAdapter {
  listProducts(): Promise<CatalogProduct[]>;
  searchProducts?(kereses: KatalogusKereso): Promise<KatalogusOldal>;
  getProductBySlug?(slug: string): Promise<CatalogProduct | null>;
}
