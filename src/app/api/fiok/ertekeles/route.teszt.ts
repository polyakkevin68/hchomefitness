import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({session:vi.fn(),product:vi.fn(),orders:vi.fn(),create:vi.fn()}));
vi.mock("@/fiok/szerveres-fiok",()=>({fiokSutiNeve:"hc-fiok",hitelesitFiokMunkamenetet:mocks.session}));
vi.mock("@/lib/adatbazis-kapcsolat",()=>({prisma:{product:{findFirst:mocks.product},order:{findMany:mocks.orders},termekErtekeles:{create:mocks.create}}}));
import { POST } from "./route";
import { Prisma } from "@/generated/prisma/client";
import { NextRequest } from "next/server";
function request(payload:unknown){return new NextRequest("https://bolt.example/api/fiok/ertekeles",{method:"POST",headers:{origin:"https://bolt.example","content-type":"application/json",cookie:"hc-fiok=valid"},body:JSON.stringify(payload)});}
describe("termékértékelés útvonal",()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.session.mockResolvedValue({id:"account-1",email:"vevo@example.test"});mocks.product.mockResolvedValue({id:"product-1",sku:"HC-1"});mocks.orders.mockResolvedValue([{id:"order-1",paymentState:"PAID",shipment:null,itemSnapshots:[{cikkszam:"HC-1"}]}]);mocks.create.mockResolvedValue({id:"review-1"});});
 it("csak megerősített rendelés termékére ment függő, igazolt értékelést",async()=>{const r=await POST(request({sku:"HC-1",csillag:5,szoveg:"A rendeléshez kapcsolt vélemény."}));expect(r.status).toBe(201);expect(mocks.create).toHaveBeenCalledWith({data:expect.objectContaining({orderId:"order-1",productId:"product-1",fiokId:"account-1",igazoltVasarlas:true,allapot:"PENDING"})});});
 it("más termék, még nem teljesített rendelés vagy anonim vásárló nem értékelhet",async()=>{mocks.orders.mockResolvedValue([{id:"order-1",paymentState:"UNPAID",shipment:null,itemSnapshots:[{cikkszam:"HC-1"}]},{id:"order-2",paymentState:"PAID",shipment:null,itemSnapshots:[{cikkszam:"HC-ELTERO"}]}]);expect((await POST(request({sku:"HC-1",csillag:4,szoveg:"Nincs hozzá teljesített vásárlás."}))).status).toBe(403);mocks.session.mockResolvedValue(null);expect((await POST(request({sku:"HC-1",csillag:4,szoveg:"Nincs hozzá teljesített vásárlás."}))).status).toBe(401);});
 it("azonos rendelés és termék ismételt értékelését egyediségi ütközéssel kezeli",async()=>{mocks.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("unique",{code:"P2002",clientVersion:"test"}));expect((await POST(request({sku:"HC-1",csillag:4,szoveg:"Egy újabb vélemény."}))).status).toBe(409);});
});
