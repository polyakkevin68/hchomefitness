export function biztonsagiFejlecek(eles: boolean): { key: string; value: string }[] {
  const fejlecek = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "X-DNS-Prefetch-Control", value: "on" },
  ];
  if (eles) fejlecek.push({ key: "Strict-Transport-Security", value: "max-age=31536000" });
  return fejlecek;
}
