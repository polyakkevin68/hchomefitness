export function forrasAdatFriss(
  importIdeje: Date | null,
  maximalisKorMasodperc: number,
  most = new Date(),
): boolean {
  if (!importIdeje || !Number.isFinite(importIdeje.getTime())
    || !Number.isFinite(most.getTime())
    || !Number.isSafeInteger(maximalisKorMasodperc) || maximalisKorMasodperc < 1) return false;

  const kor = most.getTime() - importIdeje.getTime();
  return kor >= 0 && kor < maximalisKorMasodperc * 1000;
}
