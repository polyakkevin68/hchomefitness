import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/adatbazis-kapcsolat";
import { readAppConfig } from "@/lib/kornyezet-schema";
import { ellenorizSzamlaHivatkozast } from "@/szamlazas/vedett-dokumentum";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ azonosito: string }> }) {
  const { azonosito } = await context.params;
  const lejar = request.nextUrl.searchParams.get("lejar") ?? "";
  const alairas = request.nextUrl.searchParams.get("alairas");
  const config = readAppConfig();
  if (!ellenorizSzamlaHivatkozast(azonosito, lejar, alairas, config.INVOICE_ACCESS_SECRET)) {
    return NextResponse.json({ hiba: "A számlahivatkozás lejárt vagy nem érvényes." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  const invoice = await prisma.invoice.findUnique({ where: { id: azonosito }, select: { invoiceNumber: true, documentPdf: true } });
  if (!invoice?.documentPdf || !invoice.invoiceNumber) return NextResponse.json({ hiba: "A számla nem található." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const filename = invoice.invoiceNumber.replace(/[^A-Za-z0-9._-]/g, "_") + ".pdf";
  return new Response(invoice.documentPdf, { status: 200, headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": 'attachment; filename="' + filename + '"',
    "Content-Length": String(invoice.documentPdf.byteLength),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox",
  } });
}
