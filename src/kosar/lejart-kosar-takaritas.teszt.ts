import { beforeEach, describe, expect, it, vi } from "vitest";

const { torolKosarakat, torolAjanlatokat } = vi.hoisted(() => ({
  torolKosarakat: vi.fn(),
  torolAjanlatokat: vi.fn(),
}));

vi.mock("@/lib/adatbazis-kapcsolat", () => ({
  prisma: {
    kosar: { deleteMany: torolKosarakat },
    checkoutQuote: { deleteMany: torolAjanlatokat },
  },
}));

import { takaritLejartKosarakat } from "./lejart-kosar-takaritas";

describe("lejárt kosarak és ajánlatok takarítása", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    torolKosarakat.mockResolvedValue({ count: 2 });
    torolAjanlatokat.mockResolvedValue({ count: 3 });
  });

  it("csak a megadott időpontban vagy azelőtt lejárt rekordokat törli", async () => {
    const most = new Date("2026-09-24T01:00:00.000Z");

    const eredmeny = await takaritLejartKosarakat(most);

    expect(torolKosarakat).toHaveBeenCalledWith({ where: { expiresAt: { lte: most } } });
    expect(torolAjanlatokat).toHaveBeenCalledWith({ where: { expiresAt: { lte: most } } });
    expect(eredmeny).toEqual({ toroltKosarak: 2, toroltAjanlatok: 3 });
  });

  it("előbb a lejárt kosarakat, majd az aktív kosarak lejárt ajánlatait törli", async () => {
    await takaritLejartKosarakat(new Date("2026-09-24T01:00:00.000Z"));

    expect(torolKosarakat).toHaveBeenCalledTimes(1);
    expect(torolAjanlatokat).toHaveBeenCalledTimes(1);
    expect(torolKosarakat.mock.invocationCallOrder[0]).toBeLessThan(torolAjanlatokat.mock.invocationCallOrder[0]);
  });
});
