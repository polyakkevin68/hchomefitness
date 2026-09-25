import { assertSafeProductionConfig, readAppConfig } from "../src/lib/kornyezet-schema";

try {
  assertSafeProductionConfig(readAppConfig({ ...process.env, APP_ENV: "production" }));
  console.log("A production konfiguráció érvényes.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Érvénytelen konfiguráció.");
  process.exitCode = 1;
}
