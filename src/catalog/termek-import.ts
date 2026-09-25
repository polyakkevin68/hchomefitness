import "server-only";
import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "../generated/prisma/client";
import type { CatalogProduct } from "./adatmodellek";

export const UNAS_TELJES_IMPORT_CRON = "30 * * * *";

export type ImportInput = {
  source: CatalogProduct["source"];
  products: CatalogProduct[];
  excludedSourceIds?: string[];
  excludedCount?: number;
  invalidCount?: number;
  fetchComplete: boolean;
};

export type ImportResult = {
  createdCount: number;
  updatedCount: number;
  unchangedCount: number;
  deactivatedCount: number;
  invalidCount: number;
  complete: boolean;
};

function signature(product: CatalogProduct): string {
  return createHash("sha256").update(JSON.stringify({
    sourceId: product.sourceId,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    priceHuf: product.priceHuf,
    description: product.description,
    imageUrls: product.imageUrls,
    attributes: product.attributes,
    isPurchasable: product.isPurchasable,
  })).digest("hex");
}

function prepare(input: ImportInput): { products: CatalogProduct[]; seenIds: Set<string>; invalidCount: number; safeToDeactivate: boolean } {
  const products: CatalogProduct[] = [];
  const seenIds = new Set<string>();
  const seenSkus = new Set<string>();
  let duplicateCount = 0;
  for (const product of input.products) {
    if (product.source !== input.source || !product.sourceId.trim() || !product.sku.trim() || seenIds.has(product.sourceId) || seenSkus.has(product.sku)) {
      duplicateCount += 1;
      continue;
    }
    seenIds.add(product.sourceId);
    seenSkus.add(product.sku);
    products.push(product);
  }

  const excludedRows = (input.excludedSourceIds ?? []).filter((id) => id.trim());
  const excludedIds = new Set(excludedRows);
  const overlappingIds = [...excludedIds].filter((id) => seenIds.has(id)).length;
  const untrackedExcluded = Math.max(0, (input.excludedCount ?? excludedRows.length) - excludedRows.length);
  const invalidCount = (input.invalidCount ?? 0) + duplicateCount + (excludedRows.length - excludedIds.size) + overlappingIds + untrackedExcluded;
  return {
    products,
    // Csak elfogadott HC termék tarthatja aktív állapotban a korábbi rekordot.
    seenIds,
    invalidCount,
    safeToDeactivate: input.fetchComplete && invalidCount === 0 && (seenIds.size > 0 || excludedIds.size > 0),
  };
}

/** Idempotens, tranzakciós termékszinkron. Csak igazoltan teljes, hibamentes pillanatkép kapcsolhat ki hiányzó terméket. */
export async function importProducts(prisma: PrismaClient, input: ImportInput): Promise<ImportResult> {
  const prepared = prepare(input);
  const now = new Date();
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$queryRaw<{ locked: boolean }[]>(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`hc-catalog-import:${input.source}`})) IS NULL AS locked`);
    let createdCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    for (const product of prepared.products) {
      const sourceHash = signature(product);
      const existing = await tx.product.findUnique({ where: { source_sourceId: { source: input.source, sourceId: product.sourceId } } });
      if (!existing) {
        await tx.product.create({ data: {
          source: input.source,
          sourceId: product.sourceId,
          sku: product.sku,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          category: product.category,
          description: product.description,
          imageUrls: product.imageUrls,
          attributes: product.attributes,
          isPurchasable: product.isPurchasable,
          priceHuf: product.priceHuf,
          isTestFixture: product.isTestFixture,
          isActive: true,
          isPublished: false,
          sourceHash,
          lastImportedAt: now,
        } });
        createdCount += 1;
      } else if (existing.sourceHash === sourceHash && existing.isActive) {
        await tx.product.update({ where: { id: existing.id }, data: { lastImportedAt: now } });
        unchangedCount += 1;
      } else {
        await tx.product.update({ where: { id: existing.id }, data: {
          sku: product.sku,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          category: product.category,
          description: product.description,
          imageUrls: product.imageUrls,
          attributes: product.attributes,
          isPurchasable: product.isPurchasable,
          priceHuf: product.priceHuf,
          isTestFixture: product.isTestFixture,
          isActive: true,
          sourceHash,
          lastImportedAt: now,
        } });
        updatedCount += 1;
      }
    }

    const deactivatedCount = prepared.safeToDeactivate
      ? (await tx.product.updateMany({
          where: {
            source: input.source,
            isActive: true,
            ...(prepared.seenIds.size ? { sourceId: { notIn: [...prepared.seenIds] } } : {}),
          },
          data: { isActive: false },
        })).count
      : 0;
    const complete = input.fetchComplete && prepared.invalidCount === 0;
    await tx.importRun.create({ data: {
      source: input.source,
      status: complete ? "SUCCESS" : "INCOMPLETE",
      isComplete: complete,
      receivedCount: input.products.length + (input.excludedCount ?? 0),
      acceptedCount: prepared.products.length,
      excludedCount: input.excludedCount ?? 0,
      invalidCount: prepared.invalidCount,
      createdCount,
      updatedCount,
      unchangedCount,
      deactivatedCount,
      finishedAt: now,
    } });
    return { createdCount, updatedCount, unchangedCount, deactivatedCount, invalidCount: prepared.invalidCount, complete };
  }, { maxWait: 5_000, timeout: 30_000 });
}
