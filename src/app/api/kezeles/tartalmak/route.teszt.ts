import { beforeEach,describe,expect,it,vi } from "vitest";
const mocks=vi.hoisted(()=>({auth:vi.fn(),create:vi.fn(),audit:vi.fn(),transaction:vi.fn()}));
vi.mock("@/auth/admin-munkamenet",()=>({adminSutiNeve:"hc-admin",hitelesitAdminMunkamenetet:mocks.auth}));
vi.mock("@/lib/adatbazis-kapcsolat",()=>({prisma:{$transaction:mocks.transaction,tartalmiOldal:{findMany:vi.fn()},adminAuditLog:{}}}));
import { POST } from "./route";
import { NextRequest } from "next/server";
function request(data:unknown,origin="https://bolt.example"){return new NextRequest("https://bolt.example/api/kezeles/tartalmak",{method:"POST",headers:{origin,"content-type":"application/json",cookie:"hc-admin=valid"},body:JSON.stringify(data)});}
describe("tartalomkezelő útvonal",()=>{beforeEach(()=>{vi.clearAllMocks();mocks.auth.mockResolvedValue({id:"admin-1"});mocks.transaction.mockImplementation(async(fn:(tx:unknown)=>unknown)=>fn({tartalmiOldal:{create:mocks.create},adminAuditLog:{create:mocks.audit}}));mocks.create.mockImplementation(async({data}:{data:Record<string,unknown>})=>({id:"page-1",...data}));mocks.audit.mockResolvedValue({});});
 it("az új oldalt alapértelmezés szerint vázlatként és auditnaplóval menti",async()=>{const response=await POST(request({slug:"vasarlasi-utmutato",cim:"Vásárlási útmutató",bevezeto:"Bevezető",szekciok:[{cim:"Kezdés",szoveg:"Szöveg"}],kintVan:false}));expect(response.status).toBe(201);expect(mocks.create).toHaveBeenCalledWith({data:expect.objectContaining({kintVan:false})});expect(mocks.audit).toHaveBeenCalled();});
 it("elutasítja az idegen eredetű vagy hibás oldalt",async()=>{expect((await POST(request({},"https://idegen.example"))).status).toBe(403);expect((await POST(request({slug:"<script>",cim:"x",bevezeto:"x",szekciok:[],kintVan:true}))).status).toBe(400);});
});
