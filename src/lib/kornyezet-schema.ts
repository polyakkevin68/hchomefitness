import { z } from "zod";

const optionalSecret = z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional());
const optionalId = z.preprocess((value) => value === "" ? undefined : value, z.string().regex(/^\d+$/).optional());
const positiveInteger = z.preprocess((value) => value === undefined || value === "" ? 7200 : Number(value), z.number().int().positive());
const databasePoolMax = z.preprocess((value) => value === undefined || value === "" ? 10 : Number(value), z.number().int().min(1).max(100));
const optionalVersion = z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional());
const optionalOperationsToken = z.preprocess((value) => value === "" ? undefined : value, z.string().min(32).optional());
const booleanSetting = z.preprocess((value) => value === undefined || value === "" ? "false" : value, z.enum(["true", "false"]).transform((value) => value === "true"));

const schema = z.object({
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  CATALOG_ADAPTER: z.enum(["disabled", "fixture", "unas", "unas-preview"]).default("disabled"),
  DATABASE_URL: z.string().url().refine((value) => /^postgres(?:ql)?:\/\//i.test(value), "A DATABASE_URL PostgreSQL-kapcsolat legyen.").optional(),
  DATABASE_POOL_MAX: databasePoolMax,
  UNAS_API_KEY: optionalSecret,
  UNAS_HC_ALLOW_PARAM_ID: optionalId,
  PRICE_MAX_AGE_SECONDS: positiveInteger,
  STOCK_MAX_AGE_SECONDS: positiveInteger,
  ORDER_REQUESTS_ENABLED: booleanSetting,
  ORDER_OPERATIONS_TOKEN: optionalOperationsToken,
  ORDER_PRIVACY_NOTICE_VERSION: optionalVersion,
  ORDER_SALES_TERMS_VERSION: optionalVersion,
});

export type AppConfig = z.infer<typeof schema>;

export function readAppConfig(source: Record<string, string | undefined> = process.env): AppConfig {
  const appEnv = source.NODE_ENV === "production" || process.env.NODE_ENV === "production"
    ? "production"
    : source.APP_ENV;
  return schema.parse({ ...source, APP_ENV: appEnv });
}

export function assertSafeProductionConfig(config: AppConfig): void {
  if (config.APP_ENV !== "production") return;
  if (config.CATALOG_ADAPTER === "fixture") {
    throw new Error("A fejlesztői termékminta production környezetben nem engedélyezett.");
  }
  if (config.CATALOG_ADAPTER === "unas-preview") {
    throw new Error("A nem publikált UNAS-termékek előnézete production környezetben nem engedélyezett.");
  }
  if (!config.DATABASE_URL) {
    throw new Error("Production környezethez DATABASE_URL szükséges.");
  }
  if (config.CATALOG_ADAPTER === "unas" && (!config.UNAS_API_KEY || !config.UNAS_HC_ALLOW_PARAM_ID)) {
    throw new Error("Éles UNAS-katalógushoz UNAS_API_KEY és UNAS_HC_ALLOW_PARAM_ID szükséges.");
  }
  if (config.ORDER_REQUESTS_ENABLED && config.CATALOG_ADAPTER !== "unas") {
    throw new Error("Éles rendelési igény csak az ellenőrzött UNAS-katalógussal engedélyezhető.");
  }
  if (config.ORDER_REQUESTS_ENABLED && (!config.ORDER_OPERATIONS_TOKEN || !config.ORDER_PRIVACY_NOTICE_VERSION || !config.ORDER_SALES_TERMS_VERSION)) {
    throw new Error("Production rendelési igényhez jóváhagyott jogi tájékoztató-verziók és legalább 32 karakteres műveleti kulcs szükséges.");
  }
}
