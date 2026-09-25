import "server-only";
import { prisma } from "@/lib/adatbazis-kapcsolat";

export async function takaritLejartKosarakat(most = new Date()) {
  const kosarak = await prisma.kosar.deleteMany({ where: { expiresAt: { lte: most } } });
  const ajanlatok = await prisma.checkoutQuote.deleteMany({ where: { expiresAt: { lte: most } } });

  return { toroltKosarak: kosarak.count, toroltAjanlatok: ajanlatok.count };
}
