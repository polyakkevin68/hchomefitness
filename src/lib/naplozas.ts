type NaploMezok = Record<string, string | number | boolean | null>;

const engedelyezettMezok = new Set(["requestId", "orderId", "syncRunId", "jobId", "durationMs", "statusCode", "pagesFetched", "acceptedCount", "excludedCount", "invalidCount", "createdCount", "updatedCount", "unchangedCount", "deactivatedCount", "unknownCount", "errorCode", "errorName", "errorMessage"]);

function kitakarHibaszoveget(szoveg: string): string {
  return szoveg
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[ADATBAZIS-KAPCSOLAT-ELTAKARVA]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [ELTAKARVA]")
    .replace(/\b([A-Z0-9_]*(?:API_KEY|ACCESS_TOKEN|REFRESH_TOKEN|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*)\s*[=:]\s*[^\s,;]+/gi, "$1=[ELTAKARVA]")
    .slice(0, 180);
}

export function logEvent(level: "info" | "warn" | "error", event: string, fields: NaploMezok = {}): void {
  const safeFields = Object.fromEntries(Object.entries(fields)
    .filter(([key]) => engedelyezettMezok.has(key))
    .map(([key, value]) => [key, key === "errorMessage" && typeof value === "string" ? kitakarHibaszoveget(value) : value]));
  const record = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...safeFields });
  if (level === "error") console.error(record);
  else if (level === "warn") console.warn(record);
  else console.info(record);
}
