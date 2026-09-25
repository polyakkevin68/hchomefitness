export function kategoriaSlug(nev: string): string {
  return nev.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("hu-HU")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
