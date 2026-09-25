import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminSutiNeve, hitelesitAdminMunkamenetet } from "@/auth/admin-munkamenet";
import { keszletInformacio } from "@/catalog/keszlet-allapot";
import { forrasKategoriak, katalogusKategoria } from "@/catalog/katalogus-kategoriak";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { readAppConfig } from "@/lib/kornyezet-schema";

export const dynamic = "force-dynamic";
const jogosultTermek = { source: "unas", brand: "HC Home Fitness", isActive: true, isTestFixture: false, category: { in: forrasKategoriak } } as const;
const allapotSchema = z.object({ termekId: z.string().min(1).max(80), publikalt: z.boolean() }).strict();

function valasz(adat: unknown, status = 200) {
  return NextResponse.json(adat, { status, headers: { "Cache-Control": "private, no-store" } });
}

function azonosEredet(request: NextRequest) {
  try { return new URL(request.headers.get("origin") ?? "").origin === new URL(request.url).origin; }
  catch { return false; }
}

async function tulajdonos(request: NextRequest) {
  return hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "publish_products");
}

export async function GET(request: NextRequest) {
  if (!await tulajdonos(request)) return valasz({ hiba: "A termékek jóváhagyásához tulajdonosi belépés szükséges." }, 401);
  try {
    const termekek = await prisma.product.findMany({
      where: jogosultTermek,
      select: { id: true, sku: true, slug: true, name: true, category: true, priceHuf: true, isPurchasable: true, isPublished: true, keszlet: { select: { quantity: true, fetchedAt: true } } },
      orderBy: [{ isPublished: "asc" }, { category: "asc" }, { name: "asc" }],
      take: 200,
    });
    const maxKor = readAppConfig().STOCK_MAX_AGE_SECONDS;
    return valasz({ termekek: termekek.map(({ keszlet, ...termek }) => ({ ...termek, category: katalogusKategoria(termek.category) ?? termek.category, keszlet: keszletInformacio(keszlet, maxKor) })) });
  } catch {
    return valasz({ hiba: "A terméklista nem érhető el." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!azonosEredet(request)) return valasz({ hiba: "A kérés eredete nem ellenőrizhető." }, 403);
  const admin = await tulajdonos(request);
  if (!admin) return valasz({ hiba: "A termékek jóváhagyásához tulajdonosi belépés szükséges." }, 401);
  const parsed = allapotSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return valasz({ hiba: "A termék és a kért állapot megadása kötelező." }, 400);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { ...jogosultTermek, id: parsed.data.termekId }, select: { id: true, sku: true, isPublished: true } });
      if (!product) return null;
      if (product.isPublished === parsed.data.publikalt) return { id: product.id, sku: product.sku, isPublished: product.isPublished };
      const updated = await tx.product.update({ where: { id: product.id }, data: { isPublished: parsed.data.publikalt }, select: { id: true, sku: true, isPublished: true } });
      await tx.adminAuditLog.create({ data: {
        adminUserId: admin.id,
        action: parsed.data.publikalt ? "product_published" : "product_unpublished",
        targetType: "Product",
        targetId: updated.id,
        details: { sku: updated.sku, published: updated.isPublished },
      } });
      return updated;
    });
    return result ? valasz({ termek: result }) : valasz({ hiba: "A termék nem található vagy nem hagyható jóvá." }, 404);
  } catch {
    return valasz({ hiba: "A termék állapotát nem sikerült menteni." }, 409);
  }
}
