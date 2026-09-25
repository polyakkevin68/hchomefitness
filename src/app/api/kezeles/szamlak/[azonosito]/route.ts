import { NextResponse, type NextRequest } from "next/server";
import { adminSutiNeve, hitelesitAdminMunkamenetet } from "@/auth/admin-munkamenet";
import { prisma } from "@/lib/adatbazis-kapcsolat";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ azonosito: string }> }) {
  const admin = await hitelesitAdminMunkamenetet(request.cookies.get(adminSutiNeve)?.value, "manage_invoices");
  if (!admin) return NextResponse.json({ hiba: "Ehhez a számlához nincs jogosultságod." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const { azonosito } = await context.params;
  const invoice = await prisma.invoice.findUnique({ where: { id: azonosito }, select: { invoiceNumber: true, documentPdf: true } });
  if (!invoice?.documentPdf || !invoice.invoiceNumber) return NextResponse.json({ hiba: "A számla nem található." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const filename = invoice.invoiceNumber.replace(/[^A-Za-z0-9._-]/g, "_") + ".pdf";
  return new Response(invoice.documentPdf, { status: 200, headers: {
    "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="' + filename + '"',
    "Content-Length": String(invoice.documentPdf.byteLength), "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox",
  } });
}
