import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const tarolo = vi.hoisted(() => ({ lekerVendegRendelest: vi.fn() }));
vi.mock("@/rendeles/szerveres-rendeles", () => ({ ...tarolo }));

import { GET } from "./route";

const publicId = "HC-20260925-ABCD23456789";
const token = "v".repeat(43);
const cookieName = `hc_rendeles_${publicId}`;

describe("vendégrendelés megtekintése", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tarolo.lekerVendegRendelest.mockResolvedValue({ publicId, status: "PENDING_CONFIRMATION", tetelek: [] });
  });

  it("a rendeléshez kötött hozzáférési sütit ellenőrzi és privát választ ad", async () => {
    const request = new NextRequest(`http://localhost:3000/api/rendeles/${publicId}`, {
      headers: { cookie: `${cookieName}=${token}` },
    });
    const response = await GET(request, { params: Promise.resolve({ azonosito: publicId }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(tarolo.lekerVendegRendelest).toHaveBeenCalledWith(publicId, token);
  });

  it("hozzáférési süti nélkül nem kérdez le rendelést", async () => {
    const request = new NextRequest(`http://localhost:3000/api/rendeles/${publicId}`);
    const response = await GET(request, { params: Promise.resolve({ azonosito: publicId }) });
    expect(response.status).toBe(404);
    expect(tarolo.lekerVendegRendelest).not.toHaveBeenCalled();
  });
});
