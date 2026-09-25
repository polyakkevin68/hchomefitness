import "server-only";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { CatalogProduct, ProductAttribute } from "./adatmodellek";

const API_ROOT = "https://api.unas.eu/shop/";
const MAX_XML_BYTES = 5 * 1024 * 1024;
const PAGE_SIZE = 50;
const MAX_PAGES = 30;
const BRAND = "HC Home Fitness";

type XmlRecord = Record<string, unknown>;
export type ParsedPage = { products: CatalogProduct[]; excludedCount: number; invalidCount: number; excludedSourceIds: string[]; sourceCount: number; missingAllowCount: number; disabledAllowCount: number };
export type ParsedCatalog = ParsedPage & { complete: boolean; pagesFetched: number };
export type UnasProductParameter = { id: string; name: string; value: string };
export type UnasStock = { id: string; sku: string; quantity: number | null; variants: string[]; warehouseId?: string; active?: boolean };
export type UnasStockSnapshot = { fetchedAt: Date; stocks: UnasStock[]; unreturnedSkus: string[] };

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
  processEntities: false,
  isArray: (_name, path) => typeof path === "string" && ["Products.Product", "Statuses.Status", "Prices.Price", "Categories.Category", "Params.Param", "Images.Image"].includes(path),
});

function text(value: unknown): string | undefined {
  if (typeof value === "string") return value.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, (entity) => {
    const named: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
    if (entity.toLowerCase() in named) return named[entity.toLowerCase()];
    const codepoint = entity[2]?.toLowerCase() === "x" ? Number.parseInt(entity.slice(3, -1), 16) : Number.parseInt(entity.slice(2, -1), 10);
    return Number.isSafeInteger(codepoint) && codepoint >= 0 && codepoint <= 0x10ffff ? String.fromCodePoint(codepoint) : entity;
  }).trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object" && "#text" in value) return text((value as XmlRecord)["#text"]);
  return undefined;
}

function items(value: unknown): XmlRecord[] {
  if (Array.isArray(value)) return value.filter((item): item is XmlRecord => !!item && typeof item === "object");
  if (value && typeof value === "object") return [value as XmlRecord];
  return [];
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function parseXml(xml: string): XmlRecord {
  if (Buffer.byteLength(xml, "utf8") > MAX_XML_BYTES) throw new Error("Az UNAS XML-válasz meghaladja az 5 MB-os korlátot.");
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) throw new Error("Az UNAS XML-válasz tiltott DTD vagy entitás deklarációt tartalmaz.");
  const valid = XMLValidator.validate(xml);
  if (valid !== true) throw new Error("Az UNAS XML-válasza hibás formátumú.");
  return parser.parse(xml) as XmlRecord;
}

function slugify(value: string, id: string): string {
  const base = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("hu-HU").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base || "hc-termek"}-${id.toLocaleLowerCase("en-US")}`;
}

function readableDescription(value: unknown): string {
  return (text(value) ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<li\b[^>]*>/gi, "• ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|tr)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function productImageUrl(value: unknown): string | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !(url.hostname === "futopadoutlet.hu" || url.hostname.endsWith(".futopadoutlet.hu"))) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function publicAttributes(rows: XmlRecord[], allowParameterId: string): ProductAttribute[] {
  const internalName = /api engedélyezés|importőr|allegro|árukereső|készlet|szállítás/i;
  return rows.flatMap((parameter) => {
    const id = text(parameter.Id) ?? "";
    const name = text(parameter.Name) ?? "";
    const value = text(parameter.Value) ?? "";
    if (!id || id === allowParameterId || !name || !value || internalName.test(name)) return [];
    return [{ id, name, value }];
  });
}

export function parseUnasProducts(xml: string, allowParameterId: string): ParsedPage {
  return parseUnasDocument(parseXml(xml), allowParameterId);
}

export function parseUnasStock(xml: string): UnasStock[] {
  return parseUnasStockDocument(parseXml(xml));
}

function textItems(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return values.map(text).filter((item): item is string => item !== undefined);
}

function parseUnasStockDocument(document: XmlRecord): UnasStock[] {
  if (document.Error) throw new Error("Az UNAS API elutasította a készletlekérést.");
  const productsNode = document.Products;
  if (productsNode === "") return [];
  if (!productsNode || typeof productsNode !== "object") throw new Error("Az UNAS készletválaszából hiányzik a Products elem.");
  return items((productsNode as XmlRecord).Product).flatMap((product) => {
    const id = text(product.Id);
    const sku = text(product.Sku);
    if (!id || !sku) throw new Error("Az UNAS készletválaszából hiányzik a termékazonosító vagy a cikkszám.");
    const stocks = items((product.Stocks as XmlRecord | undefined)?.Stock);
    const rows = stocks.length ? stocks : [{}];
    return rows.map((stock) => {
      const rawQuantity = text(stock.Qty);
      const quantity = rawQuantity === undefined || rawQuantity === "" ? null : Number(rawQuantity);
      if (quantity !== null && !Number.isFinite(quantity)) throw new Error("Az UNAS készletmennyisége nem érvényes szám.");
      const variants = textItems((stock.Variants as XmlRecord | undefined)?.Variant);
      const warehouseId = text(stock.WarehouseId);
      const rawActive = text(stock.IsActive);
      if (rawActive && rawActive !== "yes" && rawActive !== "no") throw new Error("Az UNAS raktáraktivitás értéke hibás.");
      return { id, sku, quantity, variants, ...(warehouseId ? { warehouseId } : {}), ...(rawActive ? { active: rawActive === "yes" } : {}) };
    });
  });
}

function parseUnasDocument(document: XmlRecord, allowParameterId: string): ParsedPage {
  if (document.Error) throw new Error("Az UNAS API elutasította a terméklekérést.");
  const productsNode = document.Products;
  if (productsNode === "") return { products: [], excludedCount: 0, invalidCount: 0, excludedSourceIds: [], sourceCount: 0, missingAllowCount: 0, disabledAllowCount: 0 };
  if (!productsNode || typeof productsNode !== "object") throw new Error("Az UNAS válaszból hiányzik a Products elem.");
  const products = items((productsNode as XmlRecord).Product);
  const result: ParsedPage = { products: [], excludedCount: 0, invalidCount: 0, excludedSourceIds: [], sourceCount: products.length, missingAllowCount: 0, disabledAllowCount: 0 };

  for (const product of products) {
    try {
      const id = text(product.Id);
      const sku = text(product.Sku);
      const name = text(product.Name);
      const state = text(product.State);
      const statuses = items((product.Statuses as XmlRecord | undefined)?.Status);
      const baseStatus = statuses.find((status) => text(status.Type) === "base");
      const statusValue = text(baseStatus?.Value);
      if (!id || !sku || !name || state === "deleted" || !["1", "2", "3"].includes(statusValue ?? "")) {
        result.invalidCount += 1;
        continue;
      }

      const parameters = items((product.Params as XmlRecord | undefined)?.Param);
      const allowParameter = parameters.find((parameter) => text(parameter.Id) === allowParameterId);
      if (!allowParameter) {
        result.excludedCount += 1;
        result.excludedSourceIds.push(id);
        result.missingAllowCount += 1;
        continue;
      }
      if (text(allowParameter.Value) !== "1") {
        result.excludedCount += 1;
        result.excludedSourceIds.push(id);
        result.disabledAllowCount += 1;
        continue;
      }

      const priceRows = items((product.Prices as XmlRecord | undefined)?.Price);
      const actual = priceRows.find((price) => text(price.Actual) === "1") ?? priceRows.find((price) => text(price.Type) === "normal");
      const gross = Number(text(actual?.Gross));
      const netCandidate = Number(text(actual?.Net));
      const categoryRows = items((product.Categories as XmlRecord | undefined)?.Category);
      const category = categoryRows.find((item) => text(item.Type) === "base");
      const categoryName = text(category?.Name);
      if (!actual || !Number.isSafeInteger(gross) || gross < 0 || !categoryName) {
        result.invalidCount += 1;
        continue;
      }

      const shortDescription = text((product.Description as XmlRecord | undefined)?.Short) ?? "";
      const longDescription = readableDescription((product.Description as XmlRecord | undefined)?.Long);
            const images = items((product.Images as XmlRecord | undefined)?.Image);
      const imageUrls = images
        .filter((image) => ["base", "alt"].includes(text(image.Type) ?? ""))
        .map((image) => productImageUrl(image.SefUrl))
        .filter((url): url is string => Boolean(url));
      const attributes = publicAttributes(parameters, allowParameterId);
      result.products.push({
        sourceId: id,
        sku,
        slug: slugify(name, id),
        name,
        brand: BRAND,
        category: categoryName,
        priceHuf: gross,
        ...(Number.isFinite(netCandidate) && netCandidate >= 0 ? { netPriceHuf: netCandidate } : {}),
        description: shortDescription,
        longDescription,
        imageUrls,
        attributes,
        isPurchasable: statusValue !== "3",
        source: "unas",
        isTestFixture: false,
      });
    } catch {
      result.invalidCount += 1;
    }
  }
  return result;
}

async function readLimitedBody(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_XML_BYTES) throw new Error("Az UNAS XML-válasz meghaladja az 5 MB-os korlátot.");
  if (!response.body) throw new Error("Az UNAS API üres választ adott.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let total = 0;
  let output = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_XML_BYTES) throw new Error("Az UNAS XML-válasz meghaladja az 5 MB-os korlátot.");
      output += decoder.decode(value, { stream: true });
    }
    output += decoder.decode();
    return output;
  } finally {
    reader.releaseLock();
  }
}

export class UnasProductAdapter {
  private token: string | undefined;
  private tokenExpiresAt = 0;

  constructor(
    private readonly apiKey: string,
    private readonly allowParameterId?: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    if (!apiKey.trim()) throw new Error("UNAS_API_KEY szükséges.");
    if (allowParameterId !== undefined && !/^\d+$/.test(allowParameterId)) throw new Error("Az HC engedélyező paraméter UNAS-azonosítója hibás.");
  }

  private async post(endpoint: string, body: string, bearer?: string): Promise<XmlRecord> {
    const response = await this.fetcher(`${API_ROOT}${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/xml; charset=utf-8", ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
      body,
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const xml = await readLimitedBody(response);
    const parsed = parseXml(xml);
    if (!response.ok || parsed.Error) throw new Error(`Az UNAS ${endpoint} hívása sikertelen (HTTP ${response.status}).`);
    return parsed;
  }

  private async getToken(): Promise<string> {
    if (this.token && this.tokenExpiresAt > Date.now() + 30_000) return this.token;
    const response = await this.post("login", `<?xml version="1.0" encoding="UTF-8"?><Params><ApiKey>${escapeXml(this.apiKey)}</ApiKey></Params>`);
    const login = (response.Login as XmlRecord | undefined) ?? response;
    const token = text(login.Token);
    const expiry = Number(text(login.ExpireTime));
    if (!token) throw new Error("Az UNAS belépési válaszában nincs token.");
    this.token = token;
    this.tokenExpiresAt = Number.isFinite(expiry) && expiry > 0 ? expiry * 1000 : 0;
    return token;
  }

  async getShopDefaultCurrency(): Promise<string | undefined> {
    const token = await this.getToken();
    const response = await this.post("getSetting", "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Params><Key>currency</Key></Params>", token);
    const settings = response.Settings as XmlRecord | undefined;
    const setting = items(settings?.Setting).find((item) => text(item.Key) === "currency");
    const currencies = items((setting?.Items as XmlRecord | undefined)?.Item);
    return text(currencies.find((currency) => text(currency.Type) === "base")?.Code);
  }

  private async assertHufCurrency(): Promise<void> {
    const currency = await this.getShopDefaultCurrency();
    if (currency?.toUpperCase() !== "HUF") {
      throw new Error(`Az UNAS alapdevizaneme ${currency ?? "ismeretlen"}; csak HUF ár importálható.`);
    }
  }

  async listHcProducts(maxPages = MAX_PAGES): Promise<ParsedCatalog> {
    const allowParameterId = this.allowParameterId;
    if (!allowParameterId) throw new Error("Az HC engedélyező paraméter UNAS-azonosítója szükséges.");
    if (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > MAX_PAGES) throw new Error(`Az oldallimit 1 és ${MAX_PAGES} közötti egész szám lehet.`);
    await this.assertHufCurrency();
    const aggregate: ParsedCatalog = { products: [], excludedCount: 0, invalidCount: 0, excludedSourceIds: [], sourceCount: 0, missingAllowCount: 0, disabledAllowCount: 0, complete: false, pagesFetched: 0 };
    for (let pageNumber = 0, start = 1; pageNumber < maxPages; pageNumber += 1, start += PAGE_SIZE) {
      const page = await this.fetchHcProductPage(start, allowParameterId);
      aggregate.pagesFetched += 1;
      aggregate.products.push(...page.products);
      aggregate.excludedCount += page.excludedCount;
      aggregate.missingAllowCount += page.missingAllowCount;
      aggregate.disabledAllowCount += page.disabledAllowCount;
      aggregate.invalidCount += page.invalidCount;
      aggregate.excludedSourceIds.push(...page.excludedSourceIds);
      aggregate.sourceCount += page.sourceCount;
      if (page.sourceCount < PAGE_SIZE) {
        aggregate.complete = true;
        return aggregate;
      }
    }
    return aggregate;
  }

  async listHcProductPage(start = 1): Promise<ParsedPage> {
    const allowParameterId = this.allowParameterId;
    if (!allowParameterId) throw new Error("Az HC engedélyező paraméter UNAS-azonosítója szükséges.");
    if (!Number.isSafeInteger(start) || start < 1) throw new Error("Érvénytelen UNAS-lapozási kezdőérték.");
    await this.assertHufCurrency();
    return this.fetchHcProductPage(start, allowParameterId);
  }

  private async fetchHcProductPage(start: number, allowParameterId: string): Promise<ParsedPage> {
    const token = await this.getToken();
    const request = `<?xml version="1.0" encoding="UTF-8"?><Params><StatusBase>1,2,3</StatusBase><State>live</State><LimitNum>${PAGE_SIZE}</LimitNum><LimitStart>${start}</LimitStart><ContentType>full</ContentType><Lang>hu</Lang></Params>`;
    const response = await this.post("getProduct", request, token);
    return parseUnasDocument(response, allowParameterId);
  }

  async getProductParametersBySku(sku: string): Promise<{ id: string; sku: string; state: string; baseStatus: string; parameters: UnasProductParameter[] }> {
    if (!/^[A-Za-z0-9_-]{1,50}$/.test(sku)) throw new Error("Érvénytelen UNAS cikkszám.");
    const token = await this.getToken();
    const request = `<?xml version="1.0" encoding="UTF-8"?><Params><Sku>${escapeXml(sku)}</Sku><ContentType>full</ContentType><Lang>hu</Lang></Params>`;
    const response = await this.post("getProduct", request, token);
    const rows = items((response.Products as XmlRecord | undefined)?.Product);
    if (rows.length !== 1 || text(rows[0].Sku) !== sku) throw new Error("A megadott cikkszámhoz nem pontosan egy UNAS-termék érkezett.");
    const row = rows[0];
    const statuses = items((row.Statuses as XmlRecord | undefined)?.Status);
    const baseStatus = statuses.find((status) => text(status.Type) === "base");
    const parameters = items((row.Params as XmlRecord | undefined)?.Param).map((parameter) => ({
      id: text(parameter.Id) ?? "",
      name: text(parameter.Name) ?? "",
      value: text(parameter.Value) ?? "",
    })).filter((parameter) => parameter.id !== "");
    return { id: text(row.Id) ?? "", sku, state: text(row.State) ?? "", baseStatus: text(baseStatus?.Value) ?? "", parameters };
  }

  async getStocksBySku(skus: string[]): Promise<UnasStockSnapshot> {
    if (!Array.isArray(skus) || skus.length < 1 || skus.length > PAGE_SIZE || skus.some((sku) => typeof sku !== "string" || sku.trim() !== sku || !/^[^,\u0000-\u001f<>]{1,100}$/.test(sku))) {
      throw new Error(`A készletlekéréshez 1 és ${PAGE_SIZE} közötti érvényes cikkszámlista szükséges.`);
    }
    if (new Set(skus).size !== skus.length) throw new Error("A készletlekérési cikkszámlista nem tartalmazhat ismétlődő elemet.");
    const token = await this.getToken();
    const request = `<?xml version="1.0" encoding="UTF-8"?><Params><Sku>${escapeXml(skus.join(","))}</Sku></Params>`;
    const response = await this.post("getStock", request, token);
    const stocks = parseUnasStockDocument(response);
    const requested = new Set(skus);
    if (stocks.some((stock) => !requested.has(stock.sku))) throw new Error("Az UNAS a kért cikkszámokon kívüli termék készletét adta vissza.");
    const returned = new Set(stocks.map((stock) => stock.sku));
    return { fetchedAt: new Date(), stocks, unreturnedSkus: skus.filter((sku) => !returned.has(sku)) };
  }
}
