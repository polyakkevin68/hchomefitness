import KosarFelulete from "./kosar-felulete";
import Link from "next/link";
import { readAppConfig } from "@/lib/kornyezet-schema";
import "@/app/rendeles.css";

export const dynamic = "force-dynamic";

export default function KosarOldal() {
  return <main className="kosar-oldal"><header className="site-header"><Link className="brand" href="/"><span className="brand-mark">HC</span><span>HOME FITNESS</span></Link><Link href="/#katalogus">← Vissza a kínálathoz</Link></header><KosarFelulete rendelesEngedelyezett={readAppConfig().ORDER_REQUESTS_ENABLED} /></main>;
}
