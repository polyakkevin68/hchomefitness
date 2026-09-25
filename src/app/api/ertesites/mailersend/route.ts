import { NextResponse, type NextRequest } from "next/server";
import { fogadMailerSendWebhook } from "@/ertesites/feldolgozo";

export const dynamic = "force-dynamic";
const maxBytes = 64 * 1024;

export async function POST(request: NextRequest) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes || !request.body) return NextResponse.json({ hiba: "Az értesítési esemény nem érvényes." }, { status: 413 });
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return NextResponse.json({ hiba: "Az értesítési esemény túl nagy." }, { status: 413 }); }
      parts.push(item.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const accepted = await fogadMailerSendWebhook(raw, request.headers.get("signature"));
    return accepted ? new NextResponse(null, { status: 204 }) : NextResponse.json({ hiba: "Az értesítési esemény nem hitelesíthető vagy nem található." }, { status: 401 });
  } catch {
    return NextResponse.json({ hiba: "Az értesítési esemény nem dolgozható fel." }, { status: 503 });
  }
}
