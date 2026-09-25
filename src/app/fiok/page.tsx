import Link from "next/link";
import FiokFelulete from "./fiok-felulete";
import "./fiok.css";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
type Tulajdonsagok = { searchParams: Promise<{ token?: string }> };
export default async function FiokOldal({ searchParams }: Tulajdonsagok) {
  const { token } = await searchParams;
  return <main className="fiok-oldal"><header className="site-header"><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><Link href="/#katalogus">Vissza a boltba</Link></header>
    <section className="fiok-tartalom"><p className="eyebrow">VÁSÁRLÓI FIÓK</p><h1>Rendelések és címek egy helyen.</h1><p>A vendégvásárlás fiók nélkül is elérhető. A fiókhoz e-mail-igazolás szükséges.</p><FiokFelulete igazoloToken={token ?? ""} /></section>
  </main>;
}
