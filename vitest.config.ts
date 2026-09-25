import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.teszt.ts"] },
  resolve: {
    conditions: ["react-server"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/teszt/kiszolgalo-only.ts", import.meta.url)),
    },
  },
});
