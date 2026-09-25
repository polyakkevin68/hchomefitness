import { NextResponse } from "next/server";
import { listProducts } from "@/catalog/katalogus";
import { keszitGoogleFeed } from "@/catalog/termekfeed";
import { readAppConfig } from "@/lib/kornyezet-schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const { PUBLIC_BASE_URL, CATALOG_ADAPTER } = readAppConfig();
  if (!PUBLIC_BASE_URL || CATALOG_ADAPTER !== "unas") return new NextResponse("A termékfeed nincs engedélyezve.", { status: 503 });
  const feed = keszitGoogleFeed(await listProducts(), PUBLIC_BASE_URL);
  if (!feed.includes("<item>")) return new NextResponse("Jelenleg nincs feedbe tehető, publikált termék.", { status: 503, headers: { "Cache-Control": "private, no-store" } });
  return new NextResponse(feed, {
    headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=300, stale-while-revalidate=300" },
  });
}
