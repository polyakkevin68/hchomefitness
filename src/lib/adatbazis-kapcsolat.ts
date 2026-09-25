import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { readAppConfig } from "./kornyezet-schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL szükséges az adatbázis-kapcsolathoz.");

const globalForPrisma = globalThis as typeof globalThis & { hcPrisma?: PrismaClient };
const { DATABASE_POOL_MAX: max } = readAppConfig();
export const prisma = globalForPrisma.hcPrisma ?? new PrismaClient({
  adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000, max }),
});
if (process.env.NODE_ENV !== "production") globalForPrisma.hcPrisma = prisma;
