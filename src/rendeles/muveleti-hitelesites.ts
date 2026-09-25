import { createHash, timingSafeEqual } from "node:crypto";
import { readAppConfig } from "@/lib/kornyezet-schema";

export function ervenyesMuveletiKulcs(authorization: string | null): boolean {
  const vart = readAppConfig().ORDER_OPERATIONS_TOKEN;
  const kapott = authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!vart || !kapott) return false;
  const vartHash = createHash("sha256").update(vart).digest();
  const kapottHash = createHash("sha256").update(kapott).digest();
  return timingSafeEqual(vartHash, kapottHash);
}
