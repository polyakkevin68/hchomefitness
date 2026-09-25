import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/adatbazis-kapcsolat";
export const dynamic = "force-dynamic";
export default async function TartalmiOldal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const oldal = await prisma.tartalmiOldal.findFirst({ where: { slug, kintVan: true }, select: { cim: true, bevezeto: true, szekciok: true } });
  if (!oldal) notFound();
  const szekciok = Array.isArray(oldal.szekciok) ? oldal.szekciok.flatMap((s) => s && typeof s === "object" && !Array.isArray(s) && typeof s.cim === "string" && typeof s.szoveg === "string" ? [{ cim: s.cim, szoveg: s.szoveg }] : []) : [];
  return <main className="product-page"><header className="site-header"><Link className="brand" href="/">HC HOME FITNESS</Link><Link href="/">Főoldal</Link></header><article className="product-related"><h1>{oldal.cim}</h1><p>{oldal.bevezeto}</p>{szekciok.map((s, i) => <section key={`${s.cim}-${i}`}><h2>{s.cim}</h2>{s.szoveg.split(/\n{2,}/).map((paragraph, n) => <p key={n}>{paragraph}</p>)}</section>)}</article></main>;
}
