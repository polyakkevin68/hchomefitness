import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { fiokSutiNeve, hitelesitFiokMunkamenetet } from "@/fiok/szerveres-fiok";
import { prisma } from "@/lib/adatbazis-kapcsolat";
export const dynamic = "force-dynamic";
const bemenet = z.object({ sku: z.string().trim().min(1).max(80), csillag: z.number().int().min(1).max(5), szoveg: z.string().trim().min(10).max(3000) }).strict();
function sameOrigin(request: NextRequest) { try { return new URL(request.headers.get("origin") ?? "").origin === new URL(request.url).origin; } catch { return false; } }
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ hiba: "A kérés eredete nem ellenőrizhető." }, { status: 403 });
  const account = await hitelesitFiokMunkamenetet(request.cookies.get(fiokSutiNeve)?.value);
  if (!account) return NextResponse.json({ hiba: "Igazolt vásárlói fiókba kell belépned." }, { status: 401 });
  const parsed = bemenet.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ hiba: "Ellenőrizd a termékkódot, az értékelést és a szöveget." }, { status: 400 });
  const product = await prisma.product.findFirst({ where: { sku: parsed.data.sku, brand: "HC Home Fitness", source: "unas", isPublished: true, isActive: true, isTestFixture: false } });
  if (!product) return NextResponse.json({ hiba: "A termék nem értékelhető." }, { status: 404 });
  const orders = await prisma.order.findMany({ where: { fiokId: account.id, status: "CONFIRMED" }, select: { id: true, paymentState: true, shipment: { select: { state: true } }, itemSnapshots: true } });
  const qualifying = orders.find((order) => (order.paymentState === "PAID" || order.shipment?.state === "DELIVERED")
    && Array.isArray(order.itemSnapshots) && order.itemSnapshots.some((line) => Boolean(line && typeof line === "object" && !Array.isArray(line) && (line as Record<string, unknown>).cikkszam === product.sku)));
  if (!qualifying) return NextResponse.json({ hiba: "Ehhez a termékhez igazolt, megerősített rendelés szükséges." }, { status: 403 });
  try {
    await prisma.termekErtekeles.create({ data: { productId: product.id, orderId: qualifying.id, fiokId: account.id, csillag: parsed.data.csillag, szoveg: parsed.data.szoveg, allapot: "PENDING", igazoltVasarlas: true } });
    return NextResponse.json({ uzenet: "Az értékelést rögzítettük, közzététel előtt ellenőrzik." }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ hiba: "Ezt a terméket már értékelted ezzel a rendeléssel." }, { status: 409 });
    return NextResponse.json({ hiba: "Az értékelést most nem sikerült elmenteni." }, { status: 503 });
  }
}
