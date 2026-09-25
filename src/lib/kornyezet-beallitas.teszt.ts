import { describe, expect, it } from "vitest";
import { assertSafeProductionConfig, readAppConfig } from "./kornyezet-schema";

describe("környezet beállításai", () => {
  it("hibás környezetnevet elutasít", () => {
    expect(() => readAppConfig({ APP_ENV: "prod" })).toThrow();
  });

  it("üres, előkészített UNAS titokhelyek mellett is elindul", () => {
    expect(() => readAppConfig({ CATALOG_ADAPTER: "fixture", UNAS_API_KEY: "", UNAS_HC_ALLOW_PARAM_ID: "" })).not.toThrow();
  });

  it("productionben letiltja a próbaadatot", () => {
    const config = readAppConfig({ APP_ENV: "production", CATALOG_ADAPTER: "fixture", DATABASE_URL: "postgresql://user:pass@db.example/hc" });
    expect(() => assertSafeProductionConfig(config)).toThrow(/nem engedélyezett/);
  });

  it("productionben adatbázis-konfigurációt követel meg", () => {
    const config = readAppConfig({ APP_ENV: "production", CATALOG_ADAPTER: "disabled" });
    expect(() => assertSafeProductionConfig(config)).toThrow(/DATABASE_URL/);
  });
  it("csak PostgreSQL URL-t fogad el adatbázis-kapcsolatként", () => {
    expect(() => readAppConfig({ DATABASE_URL: "https://db.example/hc" })).toThrow(/PostgreSQL/);
  });
  it("productionben letiltja a nem publikált UNAS-előnézetet", () => {
    const config = readAppConfig({ APP_ENV: "production", CATALOG_ADAPTER: "unas-preview", DATABASE_URL: "postgresql://user:pass@db.example/hc" });
    expect(() => assertSafeProductionConfig(config)).toThrow(/production/);
  });
  it("production futtatókörnyezetben nem engedi felülírni az éles módot fejlesztőire", () => {
    const config = readAppConfig({ NODE_ENV: "production", APP_ENV: "development", CATALOG_ADAPTER: "unas-preview" });
    expect(config.APP_ENV).toBe("production");
    expect(() => assertSafeProductionConfig(config)).toThrow(/production környezetben nem engedélyezett/);
  });
  it("alapértelmezésben két órán belüli termékárat követel meg", () => {
    expect(readAppConfig({}).PRICE_MAX_AGE_SECONDS).toBe(7200);
  });
  it("az adatbázis-kapcsolatkészlet 10-es alapértéket és legfeljebb 100 kapcsolatot enged", () => {
    expect(readAppConfig({}).DATABASE_POOL_MAX).toBe(10);
    expect(readAppConfig({ DATABASE_POOL_MAX: "50" }).DATABASE_POOL_MAX).toBe(50);
    expect(() => readAppConfig({ DATABASE_POOL_MAX: "101" })).toThrow();
  });
  it("pozitív egész másodpercben fogadja az árfrissességi határt", () => {
    expect(readAppConfig({ PRICE_MAX_AGE_SECONDS: "1800" }).PRICE_MAX_AGE_SECONDS).toBe(1800);
    expect(() => readAppConfig({ PRICE_MAX_AGE_SECONDS: "0" })).toThrow();
  });
  it("alapértelmezésben két órás készletfrissességi határt használ", () => {
    expect(readAppConfig({}).STOCK_MAX_AGE_SECONDS).toBe(7200);
    expect(readAppConfig({ STOCK_MAX_AGE_SECONDS: "900" }).STOCK_MAX_AGE_SECONDS).toBe(900);
  });
  it("rendelési igényt alapból kikapcsol, production engedélyezéshez jogi verziókat és műveleti kulcsot követel", () => {
    expect(readAppConfig({}).ORDER_REQUESTS_ENABLED).toBe(false);
    const config = readAppConfig({
      APP_ENV: "production", CATALOG_ADAPTER: "unas", DATABASE_URL: "postgresql://user:pass@db.example/hc",
      UNAS_API_KEY: "szerveroldali-teszt-kulcs", UNAS_HC_ALLOW_PARAM_ID: "8773476",
      ORDER_REQUESTS_ENABLED: "true", ORDER_OPERATIONS_TOKEN: "a".repeat(40),
    });
    expect(() => assertSafeProductionConfig(config)).toThrow(/jogi tájékoztató/i);
    const teljes = readAppConfig({
      APP_ENV: "production", CATALOG_ADAPTER: "unas", DATABASE_URL: "postgresql://user:pass@db.example/hc",
      UNAS_API_KEY: "szerveroldali-teszt-kulcs", UNAS_HC_ALLOW_PARAM_ID: "8773476",
      ORDER_REQUESTS_ENABLED: "true", ORDER_OPERATIONS_TOKEN: "a".repeat(40),
      ORDER_PRIVACY_NOTICE_VERSION: "2026-09", ORDER_SALES_TERMS_VERSION: "2026-09",
    });
    expect(() => assertSafeProductionConfig(teljes)).not.toThrow();
  });
  it("nem enged éles UNAS-adaptert hiányzó hitelesítéssel vagy engedélyparaméterrel", () => {
    const hianyzoKulcs = readAppConfig({ APP_ENV: "production", CATALOG_ADAPTER: "unas", DATABASE_URL: "postgresql://user:pass@db.example/hc", UNAS_HC_ALLOW_PARAM_ID: "8773476" });
    const hianyzoParam = readAppConfig({ APP_ENV: "production", CATALOG_ADAPTER: "unas", DATABASE_URL: "postgresql://user:pass@db.example/hc", UNAS_API_KEY: "teszt-kulcs" });
    expect(() => assertSafeProductionConfig(hianyzoKulcs)).toThrow(/UNAS_API_KEY/);
    expect(() => assertSafeProductionConfig(hianyzoParam)).toThrow(/UNAS_HC_ALLOW_PARAM_ID/);
  });
  it("nem enged éles rendelési igényt a fixture vagy kikapcsolt katalógushoz", () => {
    const config = readAppConfig({ APP_ENV: "production", CATALOG_ADAPTER: "disabled", DATABASE_URL: "postgresql://user:pass@db.example/hc", ORDER_REQUESTS_ENABLED: "true", ORDER_OPERATIONS_TOKEN: "a".repeat(40), ORDER_PRIVACY_NOTICE_VERSION: "2026-09", ORDER_SALES_TERMS_VERSION: "2026-09" });
    expect(() => assertSafeProductionConfig(config)).toThrow(/UNAS-katalógussal/);
  });
});
