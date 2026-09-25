import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/fejlesztoi-seed.ts" },
  datasource: { url: process.env.DATABASE_URL ?? "postgresql://hc_dev:hc_dev@localhost:5432/hc_webaruhaz?schema=public" },
});
