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
  PAYMENT_PROVIDER: z.enum(["disabled", "simplepay"]).default("disabled"),
  PUBLIC_BASE_URL: z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional()),
  SIMPLEPAY_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  SIMPLEPAY_MERCHANT_ID: optionalSecret,
  SIMPLEPAY_MERCHANT_KEY: optionalSecret,
  MAILERSEND_PROVIDER: z.enum(["disabled", "mailersend"]).default("disabled"),
  MAILERSEND_MODE: z.enum(["allowlist", "live"]).default("allowlist"),
  MAILERSEND_API_KEY: optionalSecret,
  MAILERSEND_FROM_EMAIL: z.preprocess((value) => value === "" ? undefined : value, z.string().email().optional()),
  MAILERSEND_FROM_NAME: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).max(100).optional()),
  MAILERSEND_ALLOWED_RECIPIENTS: z.preprocess((value) => value === "" ? undefined : value, z.string().optional()),
  MAILERSEND_WEBHOOK_SECRET: optionalSecret,
  NEWSLETTER_ENABLED: booleanSetting,
  NEWSLETTER_CONSENT_VERSION: optionalVersion,
  NEWSLETTER_PRIVACY_URL: z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional()),
  INVOICE_ACCESS_SECRET: z.preprocess((value) => value === "" ? undefined : value, z.string().min(32).optional()),
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
  if (config.PAYMENT_PROVIDER === "simplepay" && (!config.SIMPLEPAY_MERCHANT_ID || !config.SIMPLEPAY_MERCHANT_KEY)) {
    throw new Error("SimplePay fizetéshez SIMPLEPAY_MERCHANT_ID és SIMPLEPAY_MERCHANT_KEY szükséges.");
  }
  if (config.PAYMENT_PROVIDER === "simplepay" && config.APP_ENV === "production" && config.SIMPLEPAY_ENV !== "production") {
    throw new Error("Éles környezetben SimplePay éles végpontot kell beállítani.");
  }
  if (config.PAYMENT_PROVIDER === "simplepay" && !config.PUBLIC_BASE_URL) {
    throw new Error("SimplePay fizetéshez PUBLIC_BASE_URL szükséges.");
  }
  if (config.PAYMENT_PROVIDER === "simplepay" && config.APP_ENV === "production" && !config.PUBLIC_BASE_URL?.startsWith("https://")) {
    throw new Error("Éles SimplePay fizetéshez HTTPS PUBLIC_BASE_URL szükséges.");
  }
  if (config.MAILERSEND_PROVIDER === "mailersend") {
    if (!config.MAILERSEND_API_KEY || !config.MAILERSEND_FROM_EMAIL || !config.MAILERSEND_FROM_NAME) {
      throw new Error("MailerSend használatához API-kulcs, hitelesített feladói cím és név szükséges.");
    }
    if (config.MAILERSEND_MODE === "allowlist" && !config.MAILERSEND_ALLOWED_RECIPIENTS?.split(",").some((email) => email.trim())) {
      throw new Error("Tesztlevelet csak megadott engedélyezési listára lehet küldeni.");
    }
    if (config.MAILERSEND_MODE === "live" && config.APP_ENV !== "production") {
      throw new Error("Éles címzettekhez kizárólag production környezet engedélyezett.");
    }
    if (config.APP_ENV === "production" && (!config.PUBLIC_BASE_URL?.startsWith("https://") || !config.INVOICE_ACCESS_SECRET)) {
      throw new Error("Éles tranzakciós levelekhez HTTPS PUBLIC_BASE_URL és INVOICE_ACCESS_SECRET szükséges.");
    }
  }
  if (config.NEWSLETTER_ENABLED && (!config.NEWSLETTER_CONSENT_VERSION || !config.NEWSLETTER_PRIVACY_URL || config.MAILERSEND_PROVIDER !== "mailersend")) {
    throw new Error("Hírlevélhez jóváhagyott hozzájárulás-verzió, adatkezelési tájékoztató URL és MailerSend kapcsolat szükséges.");
  }
  if (config.NEWSLETTER_ENABLED && config.APP_ENV === "production" && (!config.NEWSLETTER_PRIVACY_URL?.startsWith("https://") || !config.NEWSLETTER_CONSENT_VERSION)) {
    throw new Error("Éles hírlevélhez HTTPS adatkezelési tájékoztató és jóváhagyott hozzájárulás-verzió szükséges.");
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
