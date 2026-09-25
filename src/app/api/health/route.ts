import { prisma } from "@/lib/adatbazis-kapcsolat";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = process.env.CATALOG_ADAPTER;
  const appEnv = process.env.NODE_ENV === "production" ? "production" : process.env.APP_ENV;
  const mode = configured === "unas-preview" && appEnv === "development"
    ? "unas-preview"
    : configured === "unas" ? "unas" : configured === "fixture" && process.env.NODE_ENV !== "production" ? "fixture" : "disabled";
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", app: "hc-home-fitness", mode, dependencies: { database: "ok" } });
  } catch {
    return Response.json({ status: "degraded", app: "hc-home-fitness", mode, dependencies: { database: "unavailable" } }, { status: 503 });
  }
}
