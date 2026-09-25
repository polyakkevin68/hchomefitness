import "server-only";

export type RendelesiErtesites = {
  publicId: string;
  customerName: string;
  customerEmail: string;
  totalHuf: number;
  paymentState: string;
  status: string;
  notificationType: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  invoiceNumber?: string | null;
  invoiceUrl?: string | null;
  refundAmountHuf?: number | null;
  itemSnapshots?: unknown;
};

function htmlEsc(ertek: string) {
  return ertek.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

const huf = new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 });

export function keszitTranzakciosUzenetet(rendeles: RendelesiErtesites) {
  const nev = htmlEsc(rendeles.customerName);
  const azonosito = htmlEsc(rendeles.publicId);
  const targySzoveg: Record<string, string> = {
    ORDER_RECEIVED: "Megkaptuk rendelési igényét",
    STOCK_CONFIRMED: "A készletet visszaigazoltuk",
    STOCK_REJECTED: "Rendelési igényének készlete nem elérhető",
    PAYMENT_SUCCEEDED: "Fizetését visszaigazoltuk",
    PAYMENT_FAILED: "A fizetés nem teljesült",
    ORDER_SHIPPED: "Rendelését feladtuk",
    INVOICE_ISSUED: "Elkészült a számlája",
    REFUND_UPDATED: "Frissült a visszatérítés állapota",
  };
  const targy = targySzoveg[rendeles.notificationType];
  if (!targy) throw new Error("Ismeretlen tranzakciós üzenettípus.");
  const tetelsorok = Array.isArray(rendeles.itemSnapshots) ? rendeles.itemSnapshots.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const sor = item as Record<string, unknown>;
    if (typeof sor.nev !== "string" || typeof sor.mennyiseg !== "number" || typeof sor.sorOsszegHuf !== "number") return [];
    return [htmlEsc(sor.nev) + " · " + sor.mennyiseg + " db · " + huf.format(sor.sorOsszegHuf)];
  }) : [];
  const alapSzoveg = "Rendelésazonosító: " + azonosito + "."
    + (tetelsorok.length ? " Tételek: " + tetelsorok.join("; ") + "." : "")
    + " Rögzített összeg: " + huf.format(rendeles.totalHuf) + ".";
  const tartalom = rendeles.notificationType === "ORDER_SHIPPED"
    ? "A csomagot feladtuk: " + htmlEsc(rendeles.carrier ?? "") + ", követési szám: " + htmlEsc(rendeles.trackingNumber ?? "") + ". Követés: " + htmlEsc(rendeles.trackingUrl ?? "")
    : rendeles.notificationType === "INVOICE_ISSUED"
      ? "Számlaszám: " + htmlEsc(rendeles.invoiceNumber ?? "") + ". Védett letöltés: " + htmlEsc(rendeles.invoiceUrl ?? "")
      : rendeles.notificationType === "REFUND_UPDATED"
        ? "A(z) " + huf.format(rendeles.refundAmountHuf ?? 0) + " összegű visszatérítést rögzítettük."
        : rendeles.notificationType === "ORDER_RECEIVED"
        ? alapSzoveg + " A rendelési igényt most a készlet kézi ellenőrzése követi."
        : alapSzoveg;
  const link = rendeles.notificationType === "INVOICE_ISSUED" && rendeles.invoiceUrl
    ? '<p><a href="' + htmlEsc(rendeles.invoiceUrl) + '">Számla letöltése</a></p>'
    : "";
  const szoveg = "Kedves " + rendeles.customerName + "!\n\n" + targy + ".\n" + tartalom + "\n\nHC Home Fitness";
  const html = '<main style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937"><p>Kedves ' + nev + '!</p><p>'
    + htmlEsc(targy) + ".</p><p>" + tartalom + "</p>" + link
    + "<p>Rendelésazonosító: <strong>" + azonosito + "</strong></p><p>HC Home Fitness</p></main>";
  return { targy: "HC Home Fitness – " + targy, szoveg, html };
}
