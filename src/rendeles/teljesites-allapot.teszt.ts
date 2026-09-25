import { describe, expect, it } from "vitest";
import { ellenorizKovetesiUrl, leptetTeljesitesiAllapotot } from "./teljesites-allapot";

describe("teljesítési állapotok", () => {
  it("a csomag előkészítésétől a kézbesítésig csak előre enged", () => {
    expect(leptetTeljesitesiAllapotot("PENDING", "PROCESSING")).toBe("PROCESSING");
    expect(leptetTeljesitesiAllapotot("PROCESSING", "SHIPPED")).toBe("SHIPPED");
    expect(leptetTeljesitesiAllapotot("SHIPPED", "DELIVERED")).toBe("DELIVERED");
    expect(() => leptetTeljesitesiAllapotot("DELIVERED", "PROCESSING")).toThrow();
  });

  it("a külső követési hivatkozás csak hiteles HTTPS-cím lehet", () => {
    expect(ellenorizKovetesiUrl("https://futar.example/csomag/123")).toBe(true);
    expect(ellenorizKovetesiUrl("http://futar.example/csomag/123")).toBe(false);
    expect(ellenorizKovetesiUrl("https://user:pass@futar.example")).toBe(false);
    expect(ellenorizKovetesiUrl("nem-url")).toBe(false);
  });
});
