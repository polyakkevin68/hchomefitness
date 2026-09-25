import { describe, expect, it, vi } from "vitest";
import { parseUnasProducts, parseUnasStock, UnasProductAdapter } from "./unas-forras";

const termek = (enabled: string | undefined, id = "20001", baseStatus = "1") => `<Product><State>live</State><Id>${id}</Id><Sku>HC-${id}</Sku><Name><![CDATA[HC futópad]]></Name><Statuses><Status><Type>base</Type><Value>${baseStatus}</Value></Status></Statuses><Prices><Price><Type>normal</Type><Gross>299990</Gross><Actual>1</Actual></Price></Prices><Categories><Category><Type>base</Type><Name><![CDATA[Futópadok]]></Name></Category></Categories><Params><Param><Id>8773476</Id><Name>API engedélyezés</Name><Value>${enabled ?? ""}</Value></Param><Param><Id>6992254</Id><Name>Teherbírás</Name><Value>140</Value></Param><Param><Id>1683247</Id><Name>Készlet</Name><Value>Raktáron</Value></Param></Params><Images><Image><Type>base</Type><SefUrl>https://www.futopadoutlet.hu/images/et160i.jpg</SefUrl></Image><Image><Type>alt</Type><SefUrl>http://www.futopadoutlet.hu/images/insecure.jpg</SefUrl></Image></Images><Description><Short><![CDATA[Minta leírás]]></Short></Description></Product>`;

describe("UNAS termékkapcsolat", () => {
  it("a készletmennyiséget csak az UNAS válaszából veszi, és a hiányzó értéket ismeretlenül hagyja", () => {
    const result = parseUnasStock(`<Products>
      <Product><Id>20001</Id><Sku>HC-20001</Sku><Stocks><Stock><Qty>3</Qty></Stock><Stock><WarehouseId>9</WarehouseId><IsActive>no</IsActive><Qty>4</Qty></Stock></Stocks></Product>
      <Product><Id>20002</Id><Sku>HC-20002</Sku><Stocks><Stock><Variants><Variant>Kék</Variant><Variant>XL</Variant></Variants><Qty>2.5</Qty></Stock></Stocks></Product>
      <Product><Id>20003</Id><Sku>HC-20003</Sku><Stocks><Stock/></Stocks></Product>
    </Products>`);

    expect(result).toEqual([
      { id: "20001", sku: "HC-20001", quantity: 3, variants: [], warehouseId: undefined, active: undefined },
      { id: "20001", sku: "HC-20001", quantity: 4, variants: [], warehouseId: "9", active: false },
      { id: "20002", sku: "HC-20002", quantity: 2.5, variants: ["Kék", "XL"], warehouseId: undefined, active: undefined },
      { id: "20003", sku: "HC-20003", quantity: null, variants: [], warehouseId: undefined, active: undefined },
    ]);
  });

  it("a negatív forrásmennyiséget megőrzi, a nem számszerű adatot viszont elutasítja", () => {
    expect(parseUnasStock("<Products><Product><Id>1</Id><Sku>A</Sku><Stocks><Stock><Qty>-1</Qty></Stock></Stocks></Product></Products>")[0].quantity).toBe(-1);
    expect(() => parseUnasStock("<Products><Product><Id>1</Id><Sku>A</Sku><Stocks><Stock><Qty>NaN</Qty></Stock></Stocks></Product></Products>"))
      .toThrow(/készletmennyiség/);
  });

  it("a getStock lekérése csak olvasó, cikkszámot helyesen XML-kódol, és időbélyegzi az eredményt", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.endsWith("/login")) return new Response("<Login><Token>teszt-token</Token><ExpireTime>4102444800</ExpireTime></Login>");
      return new Response("<Products><Product><Id>20001</Id><Sku>HC&amp;1</Sku><Stocks><Stock><Qty>1</Qty></Stock></Stocks></Product></Products>");
    }) as typeof fetch;
    const before = Date.now();
    const result = await new UnasProductAdapter("kulcs-teszt", undefined, fetcher).getStocksBySku(["HC&1"]);

    expect(result.fetchedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.fetchedAt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(result.stocks).toEqual([{ id: "20001", sku: "HC&1", quantity: 1, variants: [], warehouseId: undefined, active: undefined }]);
    expect(result.unreturnedSkus).toEqual([]);
    expect(calls.map((call) => call.url)).toEqual(["https://api.unas.eu/shop/login", "https://api.unas.eu/shop/getStock"]);
    expect(String(calls[1].init?.body)).toContain("<Sku>HC&amp;1</Sku>");
    expect(String(calls[1].init?.body)).not.toContain("Action");
  });

  it("a választ kihagyó cikkszámot ismeretlenként, vissza nem kapottként jelöli", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => String(input).endsWith("/login")
      ? new Response("<Login><Token>teszt-token</Token><ExpireTime>4102444800</ExpireTime></Login>")
      : new Response("<Products/>")) as typeof fetch;
    const result = await new UnasProductAdapter("kulcs-teszt", undefined, fetcher).getStocksBySku(["HIANYZO-1"]);
    expect(result.stocks).toEqual([]);
    expect(result.unreturnedSkus).toEqual(["HIANYZO-1"]);
  });

  it("nem fogad el üres vagy hibás cikkszám-listát készletlekéréshez", async () => {
    const adapter = new UnasProductAdapter("kulcs-teszt", undefined, vi.fn() as typeof fetch);
    await expect(adapter.getStocksBySku([])).rejects.toThrow(/cikkszám/);
    await expect(adapter.getStocksBySku(["A</Sku><Action>modify"])).rejects.toThrow(/cikkszám/);
  });

  it("csak az API engedélyezés 1 értékű terméket fogadja el", () => {
    const page = parseUnasProducts(`<Products>${termek("1")}${termek(undefined, "20002")}${termek("0", "20003")}${termek("1", "20004").replace("<Gross>299990</Gross>", "<Gross>299990.5</Gross>")}${termek("1", "20005", "2")}${termek("1", "20006", "3")}${termek("1", "20007", "0")}</Products>`, "8773476");
    expect(page.products).toHaveLength(3);
    expect(page.products[0]).toMatchObject({ sku: "HC-20001", brand: "HC Home Fitness", priceHuf: 299990, source: "unas", isTestFixture: false });
    expect(page.products[0].imageUrls).toEqual(["https://www.futopadoutlet.hu/images/et160i.jpg"]);
    expect(page.products[0].attributes).toEqual([{ id: "6992254", name: "Teherbírás", value: "140" }]);
    expect(page.products[1].isPurchasable).toBe(true);
    expect(page.products[2].isPurchasable).toBe(false);
    expect(page.excludedCount).toBe(2);
    expect(page.invalidCount).toBe(2);
  });

  it("felismeri az ET160I mintában talált 8773476 API engedélyezés paramétert", () => {
    const page = parseUnasProducts(`<Products>${termek("1")}</Products>`, "8773476");
    expect(page.products).toHaveLength(1);
    expect(page.products[0].brand).toBe("HC Home Fitness");
  });

  it("elutasítja a hibás és a DTD-t tartalmazó XML-t", () => {
    expect(() => parseUnasProducts("<Products>", "731")).toThrow(/hibás formátumú/);
    expect(() => parseUnasProducts('<!DOCTYPE x [<!ENTITY y "z">]><Products/>', "731")).toThrow(/DTD/);
  });

  it("belép, Bearer tokent küld, és lapozott terméklekérést végez", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    let productPage = 0;
    const firstPage = Array.from({ length: 50 }, (_value, index) => termek("1", String(20001 + index))).join("");
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.endsWith("/login")) return new Response("<Login><Token>teszt-token</Token><ExpireTime>4102444800</ExpireTime></Login>");
      if (url.endsWith("/getSetting")) return new Response("<Settings><Setting><Key>currency</Key><Items><Item><Code>HUF</Code><Type>base</Type></Item></Items></Setting></Settings>");
      productPage += 1;
      return new Response(productPage === 1 ? `<Products>${firstPage}</Products>` : "<Products/>");
    }) as typeof fetch;

    const adapter = new UnasProductAdapter("kulcs-teszt", "8773476", fetcher);
    const page = await adapter.listHcProducts();
    expect(page.products).toHaveLength(50);
    expect(calls.map((call) => call.url)).toEqual(["https://api.unas.eu/shop/login", "https://api.unas.eu/shop/getSetting", "https://api.unas.eu/shop/getProduct", "https://api.unas.eu/shop/getProduct"]);
    expect(new Headers(calls[2].init?.headers).get("authorization")).toBe("Bearer teszt-token");
    expect(String(calls[2].init?.body)).toContain("<LimitStart>1</LimitStart>");
    expect(String(calls[3].init?.body)).toContain("<LimitStart>51</LimitStart>");
  });

  it("nem kérdez le és nem importál termékárat, ha az alapdeviza nem HUF", async () => {
    const urls: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      if (url.endsWith("/login")) return new Response("<Login><Token>teszt-token</Token><ExpireTime>4102444800</ExpireTime></Login>");
      return new Response("<Settings><Setting><Key>currency</Key><Items><Item><Code>EUR</Code><Type>base</Type></Item></Items></Setting></Settings>");
    }) as typeof fetch;
    const adapter = new UnasProductAdapter("teszt-kulcs", "8773476", fetcher);

    await expect(adapter.listHcProducts()).rejects.toThrow(/csak HUF/);
    expect(urls).toEqual(["https://api.unas.eu/shop/login", "https://api.unas.eu/shop/getSetting"]);
  });

  it("az UNAS pénznembeállításából kiolvassa az alapdeviza kódját", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      if (String(input).endsWith("/login")) return new Response("<Login><Token>teszt-token</Token><ExpireTime>4102444800</ExpireTime></Login>");
      return new Response("<Settings><Setting><Key>currency</Key><Items><Item><Code>HUF</Code><Type>base</Type><InitialCurrency>yes</InitialCurrency></Item></Items></Setting></Settings>");
    }) as typeof fetch;
    const adapter = new UnasProductAdapter("teszt-kulcs", "8773476", fetcher);

    await expect(adapter.getShopDefaultCurrency()).resolves.toBe("HUF");
    expect(calls).toHaveLength(2);
    expect(calls[1].url).toBe("https://api.unas.eu/shop/getSetting");
    expect(String(calls[1].init?.body)).toContain("<Key>currency</Key>");
    expect(new Headers(calls[1].init?.headers).get("authorization")).toBe("Bearer teszt-token");
  });

  it("hiányzó devizanemet nem kezel HUF-ként", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => String(input).endsWith("/login")
      ? new Response("<Login><Token>teszt-token</Token><ExpireTime>4102444800</ExpireTime></Login>")
      : new Response("<Settings><Setting><Key>currency</Key><Items/></Setting></Settings>")) as typeof fetch;
    const adapter = new UnasProductAdapter("teszt-kulcs", "8773476", fetcher);

    await expect(adapter.getShopDefaultCurrency()).resolves.toBeUndefined();
    await expect(adapter.listHcProducts()).rejects.toThrow(/csak HUF/);
  });

  it("egy cikkszámot kér le írás nélküli módon, és visszaadja a paraméterazonosítókat", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.endsWith("/login")) return new Response("<Login><Token>teszt-token</Token><ExpireTime>4102444800</ExpireTime></Login>");
      return new Response("<Products><Product><State>live</State><Id>9001</Id><Sku>ET160I</Sku><Statuses><Status><Type>base</Type><Value>1</Value></Status></Statuses><Params><Param><Id>731</Id><Name>Márka</Name><Value>HC Home Fitness</Value></Param></Params></Product></Products>");
    }) as typeof fetch;
    const adapter = new UnasProductAdapter("teszt-kulcs", undefined, fetcher);
    const result = await adapter.getProductParametersBySku("ET160I");
    expect(result).toEqual({ id: "9001", sku: "ET160I", state: "live", baseStatus: "1", parameters: [{ id: "731", name: "Márka", value: "HC Home Fitness" }] });
    expect(calls).toHaveLength(2);
    expect(String(calls[1].init?.body)).toContain("<Sku>ET160I</Sku>");
    expect(String(calls[1].init?.body)).toContain("<ContentType>full</ContentType>");
    expect(calls[1].url).toBe("https://api.unas.eu/shop/getProduct");
  });

  it("egy aktív termékoldalt kér le az előnézethez", async () => {
    const bodies: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/login")) return new Response("<Login><Token>teszt-token</Token><ExpireTime>4102444800</ExpireTime></Login>");
      if (String(input).endsWith("/getSetting")) return new Response("<Settings><Setting><Key>currency</Key><Items><Item><Code>HUF</Code><Type>base</Type></Item></Items></Setting></Settings>");
      bodies.push(String(init?.body));
      return new Response(`<Products>${termek("1")}</Products>`);
    }) as typeof fetch;
    const adapter = new UnasProductAdapter("teszt-kulcs", "8773476", fetcher);
    const page = await adapter.listHcProductPage(1);
    expect(page).toMatchObject({ sourceCount: 1, excludedCount: 0, missingAllowCount: 0, disabledAllowCount: 0, invalidCount: 0, products: [{ sku: "HC-20001" }] });
    expect(bodies[0]).toContain("<LimitStart>1</LimitStart>");
    expect(bodies[0]).toContain("<LimitNum>50</LimitNum>");
    expect(bodies[0]).toContain("<StatusBase>1,2,3</StatusBase>");
    expect(bodies[0]).not.toContain("<ContentParam>");
  });
});
