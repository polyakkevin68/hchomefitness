import "server-only";
import { Prisma, type PrismaClient } from "../generated/prisma/client";
import type { UnasStockSnapshot } from "./unas-forras";

type GetStocksBySku = (skus: string[]) => Promise<UnasStockSnapshot>;
type StockRow = { quantity: number | null; variants: string[]; warehouseId: string | null; active: boolean | null };
export const UNAS_KESZLET_SZINKRON_CRON = "0 * * * *";

export async function szinkronizalUnasKeszletet(
  prisma: PrismaClient,
  getStocksBySku: GetStocksBySku,
  options: { skus?: string[] } = {},
): Promise<{ updatedCount: number; knownCount: number; unknownCount: number }> {
  const products = await prisma.product.findMany({
    where: { source: "unas", isActive: true, isTestFixture: false, ...(options.skus ? { sku: { in: options.skus } } : {}) },
    select: { id: true, sku: true },
    orderBy: { id: "asc" },
  });
  const updates: Array<{ productId: string; quantity: number | null; rows: StockRow[]; fetchedAt: Date }> = [];

  for (let index = 0; index < products.length; index += 50) {
    const batch = products.slice(index, index + 50);
    const snapshot = await getStocksBySku(batch.map((product) => product.sku));
    const unreturned = new Set(snapshot.unreturnedSkus);
    for (const product of batch) {
      const stockRows = snapshot.stocks.filter((row) => row.sku === product.sku);
      if (unreturned.has(product.sku) && stockRows.length > 0) {
        throw new Error("Az UNAS ugyanazt a cikkszámot visszaadta és hiányzóként is jelölte.");
      }
      const rows = stockRows.map((row) => ({
        quantity: row.quantity,
        variants: row.variants,
        warehouseId: row.warehouseId ?? null,
        active: row.active ?? null,
      }));
      const onlyUnambiguousRow = stockRows.length === 1
        && stockRows[0].quantity !== null
        && stockRows[0].variants.length === 0
        && !stockRows[0].warehouseId
        && stockRows[0].active !== false;
      updates.push({
        productId: product.id,
        quantity: onlyUnambiguousRow ? stockRows[0].quantity : null,
        rows,
        fetchedAt: snapshot.fetchedAt,
      });
    }
  }

  await prisma.$transaction(async (transaction) => {
    for (const update of updates) {
      const rows = update.rows as Prisma.InputJsonValue;
      await transaction.productStock.upsert({
        where: { productId: update.productId },
        create: { ...update, rows },
        update: { quantity: update.quantity, rows, fetchedAt: update.fetchedAt },
      });
    }
  });

  const knownCount = updates.filter((update) => update.quantity !== null).length;
  return { updatedCount: updates.length, knownCount, unknownCount: updates.length - knownCount };
}
