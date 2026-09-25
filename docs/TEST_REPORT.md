# Ellenőrzési jegyzőkönyv

Dátum: 2026-09-25. Mérföldkő: M9 helyi P1-implementáció kész; M6/M7 külső próbára, M8 külső kapukra és M9 néhány feltételes szolgáltatói próbára vár. Környezet: Windows, Node.js 24.15.0, npm 11.14.0, helyi PostgreSQL 17.

## M9 termék-összehasonlítás (CMP01)

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| Összehasonlítás-szabályok | Sikeres | 2–4 slug, egyediség, létezés, HC márka, UNAS-forrás, nem próbaadat és azonos kategória ellenőrzött. |
| Célzott teszt | Sikeres | 4 teszt a jóváhagyott termékekre és hibás/hiányzó, duplikált, idegen márkájú, próba- vagy eltérő kategóriájú bemenetre. |
| Teljes tesztcsomag | Sikeres | 41 fájl, 175 teszt; a PostgreSQL-integrációs tesztekkel együtt. |
| `npm.cmd run lint` és `npm.cmd run typecheck` | Sikeres | A teljes forráskód ellenőrzése hibamentes. |
| `npm.cmd run build` | Sikeres | Next.js 16.3.6 production build; a dinamikus `/osszehasonlitas` útvonal is lefordult. |
| Böngészős ellenőrzés | Tulajdonos végzi | Mobil böngészőpróbát nem futtattam; a táblázat működését a tulajdonos ellenőrzi kézzel. |

## M9 összesített ellenőrzés

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| Teljes tesztcsomag | Sikeres | `npm.cmd test -- --configLoader runner`: 55 fájl, 219 teszt. Lefedi a fiók és rendelés-összekötés, kupon/ajánló PostgreSQL tranzakciók, feed/termékoldal ár-egyezés PostgreSQL-en, UNAS nettó/bruttó parser, hírlevél PostgreSQL, értékelési jogosultság és tartalomkezelési útvonalak releváns eseteit. |
| Lint és típusellenőrzés | Sikeres | `npm.cmd run lint`, `npm.cmd run typecheck`. |
| Prisma | Sikeres | `npm.cmd exec prisma validate`, `npm.cmd exec prisma migrate status`; 21 migráció, adatbázis naprakész. |
| Production build | Sikeres | `npm.cmd run build`; mindkét feed és az új tartalmi, értékelési, hírlevél-, kupon- és fiókútvonalak lefordultak. |
| Termékoldal és friss Prisma-kliens | Sikeres | A sémából újragenerálás és a korábban futó fejlesztői szerver újraindítása után az érintett termékoldal HTTP 200-at adott; `findMany` futási hiba nem jelentkezett. |
| UNAS nettó ár friss lekérése | Sikeres, csak olvasó | Az első próbát `fetch failed` állította meg. Újrapróbálva: 50 forrásrekord, 8 HC-termék, mind a 8-hoz nettó ár; teljes import: 9 oldal, 60 elfogadott, 368 kizárt, 0 hibás. UNAS-adat nem módosult. |
| Helyi UNAS-import | Sikeres | Worker naplója: 60 rekord frissült, 0 új, 0 hibás. Az adatbázisban 60 importált HC-termékhez van nettó ár. Publikált termék még nincs, ezért a feedek 503-at adnak. |
| Feed–termékoldal ár és készlet | Sikeres | Valódi helyi PostgreSQL-próba ugyanazon rekord bruttó/nettó HUF-árát és friss készletét hasonlítja mindkét feed értékeihez; publikálatlan terméket nem tesz ki. |
| Google/Árukereső feed külső befogadása | Nem futott | Nincs ellenőrzött partnerfiók/regisztráció vagy feltöltés. A katalógusban nincs publikált termék. |
| MailerSend hírlevél | Helyben szimulált | PostgreSQL teszt igazolta a hozzájárulás-verzió, megerősítés, leiratkozás és provider-állapot mentését; valódi provider alapból tiltva és külső levél nem küldődött. |
| Áruhitel / UNAS-rendelésírás | Nem alkalmazható / tiltott | Nincs lender-szerződés (D12); forrásírás nincs jóváhagyva (D07), így adapter és külső módosítás nem készült. |
| Mobil böngészőpróba | Tulajdonos végzi | Kérésre nem futtattam; kézi ellenőrzés nyitott. |

## Katalógus P0 folytatása

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| UNAS részletes leírás | Sikeres | Hivatalos UNAS `Description.Long` mezőből olvas; az első 50 rekordból 8 engedélyezett HC-termék mindegyikéhez érkezett hosszú leírás. A teljes, 9 oldalas csak olvasó import 60/60 valódi HC-terméket frissített; mind a 60-hoz ment részletes leírás a helyi adatbázisba. |
| Termékoldali leírás | Sikeres | A friss Prisma-klienssel ellenőrzött termékoldal HTTP 200-at adott és megjelenítette a részletes leírást. A forrás HTML-kódja nem kerül végrehajtásra. |
| Kategóriaoldalak | Sikeres | A kezdőlap kategóriagombjai `/kategoria/[slug]` útvonalra mutatnak; a `/kategoria/futopadok` helyi HTTP-próbája 200-at adott termékkártyákkal. |
| Kategória-engedélylista | Sikeres | A helyi katalógus 60 terméket és pontosan a kért kilenc kategóriát adott vissza; az UNAS alcsoportnevek egységesítve, az idegen kategóriák kizárva. |
| Kosárba helyezés | Sikeres helyi próbához | Fejlesztői `unas-preview` módban csak közzétett, forrás szerint rendelhető, friss és pozitív készletű valódi termék tehető a kosárba. A PostgreSQL-integráció friss készlettel engedi, három órás készletadattal elutasítja a műveletet. A mostani UNAS-frissítés mind a 60 terméket naprakész, ismert készlettel hozta vissza; mind a 60 megfelel a kosárfeltételnek. Rendelésleadás továbbra sincs bekapcsolva. |
| Teljes tesztcsomag | Sikeres | `npm.cmd test -- --configLoader runner`: 58 fájl, 228 teszt; kategóriaengedélylista, friss készletű kosárba tétel és elavult készlet elutasítása is ellenőrizve. |
| Típusellenőrzés és lint | Sikeres | `npm.cmd run typecheck` és `npm.cmd run lint`. A production buildet ebben a módosításban nem futtattam. |
| Adatbázis | Sikeres | 22 Prisma-migráció naprakész, benne a részletes termékleírás mezővel. |

## Termékjóváhagyás

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| OWNER jogosultság | Sikeres | Az új `publish_products` műveletet csak OWNER szerep kapja; CONTENT, OPERATIONS és READ_ONLY nem. |
| Terméklista | Sikeres | Csak aktív, nem tesztadat, HC márkájú UNAS-termékeket listáz; készletfrissességet külön jelöl. |
| Közzététel/elrejtés | Sikeres | Eredetellenőrzött API tranzakcióban állapotot ment és auditbejegyzést ír; hibás vagy nem megfelelő terméket elutasít. |
| Ellenőrzések | Sikeres | Típusellenőrzés, lint, 58 fájl/228 teszt; az OWNER-lista csak engedélyezett kategóriájú termékeket ad. |
| Valódi termékpublikálás | Tulajdonos jelzése alapján megtörtént | A tulajdonos jelezte, hogy közzétette a termékeket; az adatbázis teljes listáját ebben az ellenőrzésben nem olvastam ki. |

## M6 SimplePay adapter folytatása

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| SimplePay hivatalos API-szerződés | Ellenőrizve | A SimplePay által közzétett OpenAPI 2.1 JSON/POST üzenetet, Base64 HMAC-SHA384 aláírást és `Signature` fejlécet ír le; sandbox- és production alapcím külön van. |
| Adapterhívások | Sikeres helyettesített válaszokkal | Start, státusz és refund kéréseknél az aláírás ellenőrzött. Indításnál kereskedő, rendelési hivatkozás, teljes HUF összeg, valuta és pontos SimplePay domain egyezik; hibás aláírás elutasított. |
| `node --import dotenv/config ./node_modules/vitest/vitest.mjs run --configLoader runner src/fizetes/simplepay-kapcsolat.teszt.ts` | Sikeres | 7 célzott adapterteszt; indítás, státusz, visszatérítés, hálózati hiba, összegeltérés és idegen átirányítás. Külső SimplePay-kérés nem történt. |
| `node --import dotenv/config ./node_modules/vitest/vitest.mjs run --configLoader runner` | Sikeres | 34 tesztfájl, 139 teszt; helyi PostgreSQL-integrációkkal együtt. A Vitest nem tölti be magától a `.env` fájlt, ezért a Node `dotenv/config` betöltést használja a parancs. |
| `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build` | Sikeres | ESLint, TypeScript és Next.js production build hiba nélkül; fizetési adapter kódja lefordul. |
| SimplePay sandbox / éles fizetés | Nem futott | Kereskedői szerződés, sandbox belépés, kereskedőazonosító és titkos kulcs nincs beállítva. A provider `disabled` marad, valódi pénzmozgás nem indult. |
| PaymentAttempt-integráció és callback | Még nincs kész | Az adapter egyelőre önálló; rendelési API-val, tartós kísérlettel, callback/IPN-nel, hiteles állapotátmenettel és refund adminnal össze kell kötni. |

## M7 adminisztráció és teljesítés

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| Admin-jelszó és munkamenet | Sikeres | Scrypt jelszólenyomat, véletlen sütitoken, adatbázisban csak SHA-256 tokenlenyomat; belépés, lejárat, visszavonás és szerepkör-ellenőrzés valódi helyi PostgreSQL-en tesztelve. |
| Szerepkörök és rendeléskezelés | Sikeres | Jogosulatlan szerepkör készletigazolását az integrációs teszt elutasította. OWNER fiók API és kezdeti OWNER létrehozó parancs elkészült. |
| OWNER kezelőifiók-felület | Sikeres helyettesített API-próbával | Lista, jelszavas fióklétrehozás, letiltás és újraaktiválás. Letiltás visszavonja a munkameneteket; önletiltás és utolsó aktív OWNER tiltása elutasított. 6 célzott útvonalteszt. |
| Helyi teljesítés és audit | Sikeres | PostgreSQL-integrációs próba az előkészítés → feladás → kézbesítés állapotokat, átmenettiltást, auditot és egyszeri feladási értesítési sort ellenőrzi. |
| Prisma migráció | Sikeres | `20260925130000_m7_szamla_vedett_tar` alkalmazva; összesen 14 migráció, Prisma státusz szerint naprakész. |
| Számlázz.hu és MailerSend | Helyettesített teszt sikeres; külső próba nyitott | A helyi adapter, outbox, sablon, hibakezelés és privát PDF-tár elkészült. Valós számla vagy levél nem ment ki. |
| Teljes tesztcsomag | Sikeres | A korábbi futás 39 fájl/164 teszt volt; legfrissebb M7 futás 40 fájl/171 teszt, helyi PostgreSQL-integrációval. |
| `npm.cmd run typecheck` és `npm.cmd run lint` | Sikeres | A záró módosítások után TypeScript és ESLint hibamentes. |
| `npm.cmd run build` | Sikeres | Next.js production build a teljes M7 útvonalkészlettel. |
| Prisma séma és migrációs állapot | Sikeres | Séma érvényes, mind a 14 migráció alkalmazva. |

## M7 értesítési feldolgozás és számlatár

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| MailerSend adapter és sablonok | Sikeres, helyettesített válaszokkal | Engedélyezőlista, élő mód környezeti korlátja, 202/azonosító és bizonytalan hálózati eredmény tesztelve; magyar rendelési sablon és HTML-kódolás ellenőrizve. |
| Aláírt MailerSend webhook | Sikeres | Nyers törzs HMAC-SHA256 aláírása és kézbesített állapot; hibás aláírásnál nincs adatbázis-lekérdezés. A tényleges külső webhook-fogadás nem futott. |
| Értesítési adatbázis-outbox és admin | Sikeres kódellenőrzéssel | Percenkénti worker, duplikációkulcs, `UNKNOWN` automatikus újraküldés tiltása, `FAILED` szerepkörvédett újrapróbálása és audit. |
| Számlázz.hu Agent adapter | Sikeres, helyettesített válaszokkal | XML-kódolás, HUF végösszeg, levélküldés kikapcsolása, PDF/számlaszám és bizonytalan hálózati/hiányos válasz tesztelve; valós Agent-hívás nem történt. |
| Védett számlatár | Sikeres | FINANCE/OWNER letöltés, egy rendeléshez egy számla, feltöltésméret/PDF-fejléc, SHA-256 és audit; vásárlói HMAC-link hét napos lejárata tesztelve. |
| 14. adatbázis-migráció | Sikeres | `20260925130000_m7_szamla_vedett_tar` alkalmazva; Prisma státusz szerint minden migráció naprakész. |
| Teljes tesztcsomag | Sikeres | 40 tesztfájl, 171 teszt; helyi PostgreSQL-integrációval együtt. Az első futás új outboxrekordokra nem takarító tesztet, a következő globális lejárttakarítási darabszámtól függő tesztet talált; mindkettőt stabilizálva a végső teljes futás sikeres lett. A SimplePay visszatérítés e-mail sorba állítását/összegét és a szolgáltatói elfogadás utáni adatbázishiba `UNKNOWN` kezelését is tesztek fedik. |
| Lint, TypeScript és Prisma-séma | Sikeres | `npm.cmd run lint`, `npx.cmd tsc --noEmit --incremental false`, `npm.cmd exec prisma validate`. |
| Production build és kezelői smoke próba | Sikeres | A production build elkészült. A rendelés-, értesítés- és számlakezelő oldalak HTTP 200-at, bejelentkezés nélkül az értesítési és számla API HTTP 401-et adott; a helyi szerver 3100-as portról leállítva. |
| Számlázási és MailerSend külső próba | Nyitott | Nincs számlázó és e-mail tesztfiók/kulcs, jóváhagyott eladói/ÁFA-adat, kiállítási és számlaküldési szabály, domain vagy webhook-regisztráció; sem számla, sem e-mail nem ment ki. |

## M8 élesítés előtti helyi ellenőrzések

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| Production konfigurációs védelem | Kódteszt és élesre állított helyi próba sikeres | A tesztek tiltják a fixture/előnézeti adaptert, hiányzó UNAS kulcsot/paramétert, nem PostgreSQL URL-t és nem UNAS katalógussal engedélyezett rendelést. A `check:production-config` helyi `.env` kapcsolattal, `unas` adapterrel és kikapcsolt rendelésfogadással érvényes konfigurációt jelzett; ez nem éles szolgáltatói/staging próba. |
| Production build futó smoke | Sikeres, helyi | A `next start` 3100-as porton 200-at adott; adatbázis él, mód `disabled`, fixture/előnézeti címke nem jelent meg, HSTS és API cache-tiltás érvényesült. |
| Közös biztonsági HTTP-fejlécek | Sikeres | Egységteszt, valamint a futó `http://localhost:3000/` élő válaszán ellenőrizve: `nosniff`, `DENY`, referrer- és permissions-szabály. HSTS csak éles konfigurációban adódik. |
| API gyorsítótár-tiltása | Sikeres | A futó `/api/health` válasz `Cache-Control: private, no-store` fejlécet ad. |
| Adatbázis-egészségellenőrzés | Sikeres | A `/api/health` `SELECT 1` lekérdezést futtat; az egészséges adatbázis 200, a kapcsolat hibája 503. Mindkét eset útvonalszinten tesztelt. |
| Naplómezők és hibaüzenetek titokvédelme | Sikeres | Engedélyezett mezőlista és adatbázis-URL/Bearer/API-kulcs/token/titok/jelszó kitakarása; két új egységteszt. |
| Titok a buildben | Sikeres | `.env` verziókezelésből kizárva; két helyi érzékeny beállítás értéke nem található a 16 publikus vagy 221 szerveroldali JS/JSON buildállományban. |
| Mentés és visszaállítás | Sikeres, jelenlegi sémán | `pg_dump`/`pg_restore` külön ideiglenes PostgreSQL-adatbázisba. Az eredeti és a visszaállított adatbázisban 19 tábla és 14 alkalmazott migráció egyezett; az ideiglenes adatbázis és dump eltávolítása lefutott. |
| Katalógus API-terhelés | Sikeres, helyi | 1000 teszttermék, 50 párhuzamos HTTP-kliens, 10 perc: 3000 sikeres, 0 hibás kérés, 0% hiba, p50 154 ms, p95 213 ms, p99 273 ms, 8,7 MB átvitel. A szerver, a generátor és a PostgreSQL ugyanazon Windows gépen futott; staginget nem helyettesíti. |
| Főoldal szerveroldali válaszideje | Nem teljesíti az API-célértéket; külön mérés | Egy 30 másodperces, 50 klienses diagnosztikai futás p95 1022 ms lett. A specifikáció célja a katalógus API-ra vonatkozik; a HTML-próba külön eredmény. |
| Katalógus-lapozás és API | Sikeres | Adatbázisoldali lapozás, 12 rekord/oldal, rövid metaadat-gyorsítótár és 5 másodperces azonos kérésközösítés. A publikus JSON csak kártyaadatokat tartalmaz; válasz `private, no-store`. A termékadatlap adatbázisban slug alapján egy rekordot kérdez le. |
| SEO és billentyűzetes alapok | Részben kész | Meta leírás, fókuszjelölés és csökkentett mozgás támogatása elkészült; domain, sitemap és robots beállítás, valamint billentyűzetes böngészőpróba nyitott. A mobil böngészőpróbát a tulajdonos végzi el. |
| Worker leállás | Sikeres valódi Linuxos jelpróba | GitHub Actions 36127543344 PostgreSQL mellett elindította a workert, SIGTERM-et küldött, legfeljebb 15 másodpercig várt, és csak a `worker.stopped` naplóbejegyzés után engedte át a lépést. A Windowsos konzolmegszakítás ettől függetlenül nem volt megfigyelhető. |
| CI adatbázis-környezet | Sikeres távoli futás | GitHub Actions 36127543344: PostgreSQL 17, migráció, lint, típusellenőrzés, 124 teszt, workerjel-próba és production build mind sikeres. Az első futás rendelési próbája a helyi jogidokumentum-verziók hiánya miatt bukott; a workflow ezeket csak a tesztlépésnek adja át. |
| Friss teljes helyi csomag | Sikeres | 40 tesztfájl, 171 teszt, lint, típusellenőrzés, Prisma séma/14 migráció és production build. A `test` npm-parancs most `dotenv/config` betöltéssel fut, ezért helyben is elérhető a `.env` adatbázis-kapcsolata. |
| Friss éles konfiguráció és production smoke | Sikeres, helyi | `CATALOG_ADAPTER=unas` folyamatbeállítással a konfiguráció érvényes. A production szerveren `/`, `/api/health` és `/api/katalogus` HTTP 200; az API-válaszokon `private, no-store`, a production válaszokon HSTS és `nosniff` fejléc szerepelt. A helyi preview adapterrel a konfiguráció helyesen elutasított. |
| Staging, szolgáltatói sandbox | Nem ellenőrzött | Staging hozzáférés és SimplePay/Számlázz.hu/MailerSend hitelesítés nincs; külső művelet nem történt. |

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| `node --version` | Sikeres | `v24.15.0` |
| `npm.cmd --version` | Sikeres | `11.14.0` |
| `npm.cmd ci --no-audit --no-fund` | Sikeres | Lockfile-ból 384 csomag; Prisma Client 7.10.0 generálódott |
| `npm.cmd run lint` | Sikeres | ESLint 10.11.0, nincs hiba vagy figyelmeztetés |
| `npm.cmd run typecheck` | Sikeres | TypeScript 6.0.3 |
| `npm.cmd test -- --configLoader runner` | Sikeres | 8 tesztfájl, 27 teszt; UNAS-szűrés/lapozás, képcím-domain és attribútumszűrés, cikkszámkeresés, ismételhető import, adatbázis-adapter, HUF-összegzés, szállítási díj és közzétételi védelem. A Windowsos alapértelmezett esbuild konfigurációbetöltő a szülőkönyvtár elérésénél hibázott; a runner betöltővel a tesztek sikeresen futnak. |
| `npm.cmd run build` | Sikeres | Next.js 16.3.6 production build; `/`, `/api/health`, `/termek/[termek]` fordult |
| `npm.cmd exec prisma validate` | Sikeres | Prisma 7.10.0; a séma érvényes |
| `http://localhost:3000/` | Sikeres | Fejlesztői szerver 200; 60 UNAS-termékkártya és „Fejlesztői előnézet” jelölés megjelenik |
| Keresett katalógus URL | Sikeres | `/?keres=ET160I` HTTP 200, a cikkszám szerinti terméklink megjelenik |
| `http://localhost:3000/api/health` | Sikeres | `{"status":"ok","app":"hc-home-fitness","mode":"unas-preview"}` |
| Fejlesztői szerver | Fut | `http://localhost:3000`; keresés, termékadatlap és `/api/health` HTTP 200 |
| Docker CLI/Compose | Sikeres | Docker Engine 29.8.0; Compose 5.5.1; `postgres:17-alpine` szolgáltatás `healthy` állapotú |
| PostgreSQL migráció | Sikeres | `202609240001_alap` – `202609240004_termek_kepek_es_jellemzok`, majd `20260924142741_kosar` migráció alkalmazva |
| Kosár API | Részben ellenőrizve | A felület és az API bekötése elkészült, külön útvonal-integrációs próba még nem futott; vásárlás nincs bekapcsolva. |
| PostgreSQL seed és import | Sikeres | Kétszer futott az idempotens importon át. SQL ellenőrzés: `12|12|12|12` = 12 rekord, 12 nem publikált, 12 próbaadatként jelölt, 12 egyedi SKU; két importfutás-napló |
| pg-boss worker | Sikeres | Sor létrehozása után az import sikeresen lefutott; a korábbi sikertelen diagnosztikai próbák két hibás jobot hagytak, termékmódosítás nélkül |
| UNAS XML-feldolgozás | Sikeres mockkal | Helyi válaszminta, szerveroldali kliens, Bearer-fejléc és az `API engedélyezés=1` szűrés |
| UNAS `ET160I` terméklekérés | Sikeres, élő, csak olvasó hívás | `getProduct` SKU alapján; az „API engedélyezés” paraméter ID 8773476, érték `1`. Más UNAS-művelet nem futott. |
| Adatbázis-import | Sikeres próbával | Újrafuttatás nem duplikál; változatlan terméket felismer; a publikáltságot megőrzi; részleges/üres import nem kapcsol ki; teljes importban a kizárt márkát kikapcsolja |
| UNAS teljes import | Sikeres, megismételt, élő, csak olvasó kapcsolat | Legutóbb 9 oldal, 427 forrásrekord, 60 engedélyezett, 367 kizárt, 0 hibás; 60 meglévő UNAS rekord frissült. Mind a 60 publikálatlan maradt; az UNAS-ban nem történt írás. |
| UNAS képek és jellemzők | Sikeres, élő import és helyi ellenőrzés | 60 termékhez 391 kép-URL és 791 jellemző került; az `ET160I` 7 képet és 17 jellemzőt tartalmaz. Egy minta HTTPS kép URL HTTP 200-at adott. A belső készlet-, szállítási- és API-jelölő adatok nem jelennek meg. |
| Helyi katalógus-előnézet | Sikeres | `http://localhost:3000` HTTP 200, 60 UNAS-kártya; az `ET160I` cikkszám szerinti keresése és termékoldala HTTP 200; kép, jellemzők és HUF formázás megjelenik, vásárlás tiltva. |
| Fizetés/számlázás/levélküldés | Nem futott | Külső szolgáltatói hozzáférés nincs beállítva, nem indult külső művelet |

## M6 fizetési alapok ellenőrzése

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| Fizetési állapotgép | Sikeres | Ismételt állapot, egyeztetésből érkező késői siker és siker utáni visszaállítás tiltása tesztelve. |
| Fizetési adat- és összegellenőrzés | Sikeres | Kereskedői hivatkozás, pontos HUF-összeg és pénznem egyezése szükséges; nulla vagy eltérő adat elutasítva. |
| Visszatérítési állapot és összeg | Sikeres | Ismételt siker idempotens; nulla, negatív és a sikeres fizetési összeget meghaladó kérelem tiltott. |
| PostgreSQL-adatmodell | Sikeres | Fizetési kísérlet, ujjlenyomatos eseménynapló és visszatérítés; 11. és 12. migráció helyi PostgreSQL 17-en alkalmazva. |
| `npm.cmd test -- --configLoader runner` | Sikeres | 22 tesztfájl, 95 teszt, PostgreSQL-integrációkkal. |
| `npm.cmd run lint` / `npm.cmd run typecheck` | Sikeres | Mindkettő hibamentes. |
| `npm.cmd run build` | Sikeres | Next.js 16.3.6 production build. |
| Prisma-ellenőrzés | Sikeres | `prisma validate`, `prisma migrate status`; 12 migráció, séma naprakész. |
| Éles konfigurációellenőrzés | Fejlesztői környezetben nem sikerül | A `check:production-config` hiányzó production `DATABASE_URL` miatt megállt. |
| Barion/sandbox/valódi fizetés | Nem futott | Szolgáltató és sandbox-hozzáférés nincs kiválasztva; külső hívás nem történt. |

Az első lint- és típusellenőrzési próbák hibáit javítottuk; a későbbi tiszta telepítés utáni ellenőrzések mind sikeresek.

## M4 folytatás ellenőrzése

Dátum: 2026-09-24. Környezet: Windows, Node.js 24.15.0, npm 11.14.0.

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| `npm.cmd test` | Sikertelen indulás | A Vitest alapértelmezett esbuild-konfigurációbetöltője Windows alatt hozzáférési hibát ad a szülőkönyvtárra. |
| `npm.cmd test -- --configLoader runner` | Sikeres | 10 tesztfájl, 35 teszt. Tartalmaz vegyes kosárra vonatkozó egyszeri emeletdíj-, 6 helyettesített útvonal- és 1 valódi PostgreSQL-integrációs próbát. |
| `npm.cmd run typecheck` | Sikeres | TypeScript strict ellenőrzés a kosárfelület és az új migráció kódja után. |
| `npm.cmd run lint` | Sikeres | ESLint hibák és figyelmeztetések nélkül. |
| `npm.cmd run build` | Sikeres | Next.js production build; a `/kosar` és `/api/kosar` dinamikus útvonal megjelenik a build kimenetében. |
| `npm.cmd exec prisma migrate deploy` | Sikeres | A `20260924160000_kosar_szallitas` migráció alkalmazva a helyi PostgreSQL 17 adatbázisra; összesen 6 migráció. |
| Kosár API útvonalteszt | Sikeres, helyettesített szolgáltatással | 5 próba: süti és gyorsítótár, eredetvédelem, kliensár elutasítása, szállításmód, törlés. |
| Kosár PostgreSQL-integráció | Sikeres | Helyi `hc_webaruhaz` adatbázis; GET-süti, ismételt kosárba tétel és szerverár, emeletdíj tárolása, újraolvasás, törlés és saját tesztadatok takarításának ellenőrzése. |
| Fizetés, számlázás, levélküldés | Nem futott | Nincs szolgáltatói konfiguráció; külső művelet nem indult. |

## M4 ajánlat ellenőrzése

Dátum: 2026-09-24. A fejlesztés a tulajdonos kérésére tesztvezérelt módon készült: az ajánlat útvonaltesztje előbb hibát jelzett, majd az útvonal és a szolgáltatás elkészülte után sikeres lett.

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| `npm.cmd test -- --configLoader runner src/app/api/kosar/adatbazis.teszt.ts` | Sikeres | Helyi PostgreSQL; kosár, ár és szállítás ellenőrzése, ajánlat létrehozása, 10 perces lejárat, tokenlenyomat, árpillanatkép, árváltozás utáni változatlanság, tesztadatok takarítása. |
| `npm.cmd test -- --configLoader runner` | Sikeres | 11 tesztfájl, 39 teszt; a valós PostgreSQL-integrációs próbával együtt. |
| `npm.cmd run lint` | Sikeres | ESLint hibák és figyelmeztetések nélkül. |
| `npm.cmd run typecheck` | Sikeres | TypeScript strict típusellenőrzés. |
| `npm.cmd exec prisma validate` | Sikeres | A Prisma-séma érvényes. |
| `npm.cmd run build` | Sikeres | Next.js production build; az `/api/penztar/ajanlat` útvonal bekerült a buildbe. |
| PostgreSQL-migráció | Sikeres | A `20260924172000_ajanlat` migráció alkalmazva; összesen 7 migráció. |
| `http://localhost:3000` | Sikeres | A fejlesztői szerver fut, a kezdőoldal HTTP 200 választ adott. |
| Vásárlás és fizetés | Tiltva | Az ajánlat nem engedélyez fizetést; a termékek fejlesztői előnézetben nem rendelhetők. |

## M4 lejárttakarítás ellenőrzése

Dátum: 2026-09-24. A takarítás tesztjeit az implementáció előtt írtam meg; először a hiányzó modult jelző hiba miatt pirosak voltak.

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| `npm.cmd test -- --configLoader runner src/kosar/lejart-kosar-takaritas.teszt.ts` | Sikeres | 2 egységteszt; az időpontig lejárt kosarak és ajánlatok szűrése, törlési sorrend és darabszám. |
| `npm.cmd test -- --configLoader runner src/app/api/kosar/adatbazis.teszt.ts` | Sikeres | Helyi PostgreSQL-en az aktív kosár megmarad; lejárt ajánlat törlődik; lejárt kosár törlődik, a kaszkád a hozzá tartozó adatokat is eltávolítja. |
| `npm.cmd test -- --configLoader runner` | Sikeres | 12 tesztfájl, 41 teszt, köztük a valós PostgreSQL-integráció. |
| `npm.cmd run lint` | Sikeres | ESLint hibák és figyelmeztetések nélkül. |
| `npm.cmd run typecheck` | Sikeres | TypeScript strict típusellenőrzés. |
| `npm.cmd exec prisma validate` | Sikeres | A Prisma-séma érvényes. |
| `npm.cmd run build` | Sikeres | Next.js production build. |
| Háttérütemezés | Beállítva | Naponta 03:15, `Europe/Budapest`; három újrapróbálkozás; törlési darabszám naplózása. |
| `npm.cmd run worker:dev` | Sikeres indulás | A pg-boss sorok és az ismétlődő takarítási ütemezés betöltődött; `worker.started` naplóbejegyzés megjelent. |
| `http://localhost:3000` | Sikeres | Fejlesztői szerver fut; HTTP 200. |

## M4 UNAS pénznemellenőrzése

Dátum: 2026-09-24. A pénznemlekérő és az importvédelmi próbák előbb készültek el, mint a hozzájuk tartozó kód.

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| Hivatalos UNAS leírás | Ellenőrizve | A `getSetting` `Key=currency` kérés devizanem-rekordjában a `Type=base` sor `Code` mezője adja az alapdevizát. |
| `npm.cmd run unas:penznem` | Sikeres, élő, csak olvasó hívás | Az áruház alapdevizája `HUF`; a webshop pénznemével egyezik. UNAS-adat nem módosult. |
| `npm.cmd run unas:elozetes -- --elso-oldal` | Sikeres, élő, csak olvasó előnézet | A pénznemellenőrzés után az első 50 rekordból 8 HC-termék ment át a szűrőn; adatbázis-módosítás nem történt. |
| Nem HUF alapdeviza | Sikeres teszt | `EUR` alapdevizánál az adapter hibával leáll, és nem kéri le a termékárakat. |
| Hiányzó alapdeviza | Sikeres teszt | Ismeretlen pénznemnél az import hibával leáll; nem veszi alapul a HUF-ot. |
| `npm.cmd test -- --configLoader runner` | Sikeres | 12 tesztfájl, 44 teszt; a helyi PostgreSQL-integrációval együtt. |

## M5 UNAS készletolvasás

Dátum: 2026-09-24. A teszteket először készítettem el; a hiányzó készletparser/adapter miatt pirosak voltak az implementáció előtt.

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| Hivatalos UNAS `getStock` dokumentáció | Ellenőrizve | Cikkszám-lista, készletmennyiség, változat és további raktár dokumentálva. Több terméknél csomagfüggő híváskorlát van; a `setStock` nem használatos. |
| Adapter egységtesztek | Sikeres | Pozitív, negatív és hiányzó mennyiség; több raktár, változat, hibás szám; XML-kódolás, csak olvasó végpont, időbélyeg, kihagyott cikkszám és cikkszám-ellenőrzés. |
| Élő `getStock` próba | Sikeres, csak olvasó | 60 HC SKU kérve, 60 mennyiségi sor érkezett, mind pozitív; 0 hiányzó, 0 raktári kiegészítő sor, 0 változatsor. UNAS-adat nem módosult. Ez lekéréskori adat, nem foglalás. |
| Készletpillanatkép PostgreSQL-integráció | Sikeres | A helyi próba termék mennyisége elmentődött, majd az UNAS-válasz hiányakor nullára/ismeretlenre frissült. A próba termék kaszkáddal eltávolította saját készletsorát. |
| Teljes élő készletszinkron | Sikeres, csak olvasó UNAS + helyi DB | 60 készletlekérés mentve, 60 ismert pozitív, 0 ismeretlen; összesen 60 ProductStock pillanatkép a helyi PostgreSQL-ben. |
| Worker ütemezése | Sikeres, adatbázisban ellenőrizve | Termék-/árimport `30 * * * *`, készlet `0 * * * *`, lejárttakarítás `15 3 * * *`; mind `Europe/Budapest`. |
| Nyolcadik Prisma-migráció | Sikeres | A `ProductStock` tábla és egyedi termékkapcsolata helyi PostgreSQL-en létrejött. |
| `npm.cmd test -- --configLoader runner` | Sikeres | 13 tesztfájl, 54 teszt; két valódi helyi PostgreSQL-integrációval együtt. |
| Lint, típusellenőrzés, Prisma-séma és production build | Sikeres | Mind az öt ellenőrzés hibamentesen lefutott. |
| Rendelés / foglalás | Nincs bekapcsolva | A közös UNAS-készlet nem foglalás; idempotens rendelés és kézi megerősítési folyamat még nincs megvalósítva. |

## Árforrás frissessége

Dátum: 2026-09-24. A frissességfüggvényt, beállítást és az átmeneti API-hibát ellenőrző tesztek a hozzájuk tartozó működés előtt készültek.

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| Forrásadat frissességi egységteszt | Sikeres | Friss, lejárt, hiányzó, hibás és jövőbeli időbélyeg; érvénytelen korhatár. |
| Beállítás és ajánlat API | Sikeres | Alapérték 7200 másodperc; egyedi pozitív egész érték elfogadott. Elavult árnál HTTP 503 és `FORRAS_ADAT_ELAVULT` kód érkezik. |
| Valódi PostgreSQL kosár- és ajánlatútvonal | Sikeres | Friss forrással ajánlat készül; három órás importidőnél új ajánlat nem készül, a korábban elmentett ajánlat pillanatképe változatlan. |
| Teljes ellenőrzés | Sikeres | 15 tesztfájl, 69 teszt; lint, típusellenőrzés, Prisma validate és production build is sikeres. |

## Készletadat megjelenítése

Dátum: 2026-09-24. A készletállapotot ellenőrző tesztek az állapotkezelés és a megjelenítő szöveg elkészítése előtt készültek.

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| Frissességi osztályozás | Sikeres | Friss, lejárt, hiányzó, ismeretlen, hibás és jövőbeli készletidő tesztelve. Alapérték 7200 másodperc, `STOCK_MAX_AGE_SECONDS` változóval módosítható. |
| Katalógus adatbázis-adapter | Sikeres | A friss mennyiséget átadja, a lejártat mennyiség nélkül „elavult” állapotra váltja. |
| Vásárlói szöveg | Sikeres | A termékkártya és adatlap jelzi a készlet állapotát, és friss adat esetén is külön visszaigazolást ígér; készletfoglalás nincs. |
| Teljes ellenőrzés | Sikeres | 15 tesztfájl, 69 teszt; lint, típusellenőrzés, Prisma validate és production build. |

## M5 rendelés és kézi készletdöntés

Dátum: 2026-09-25. Az új rendelési útvonalak tesztjei a működés előtt készültek, és először hiányzó útvonal/modul hibával pirosak voltak. A rendelési szolgáltatást ezután valódi helyi PostgreSQL-en ellenőriztük.

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| Párhuzamos újraküldés | Sikeres | Azonos munkamenet és idempotenciakulcs egy rendelést hoz létre. Az adatbázis összetett egyedisége kezeli a párhuzamos ütközést is. |
| Eltérő kérésazonos tartalma | Sikeres | Azonos kulcs eltérő adatokkal ütközést ad; más vendégmunkamenet külön rendelést hozhat létre. |
| Rendelési pillanatkép | Sikeres | Termék neve, SKU-ja, mennyisége, ára, cím, szállítási mód és összegek az adatbázisba mentődnek; utólagos terméknév-/árváltozás nem írja át. |
| Vendég hozzáférés | Sikeres | Csak a rendeléshez kötött hozzáférési süti teszi elérhetővé az állapotot; hibás/hiányzó kulcs 404. A sütit az API titkosítottan adja vissza, tokenértéket nem tesz a JSON-válaszba. |
| Kézi készletdöntés | Sikeres | Műveleti kulcs, eredetellenőrzés, szöveges indoklás és naplózott megerősítés/elutasítás; véglegesített állapot nem fordítható vissza. |
| Ajánlat- és készletfrissesség | Sikeres | Lejárt ajánlatot a szerver elutasítja. A katalógus 2 óránál régebbi vagy ismeretlen UNAS-készletet nem mutat mennyiségként. |
| Rendelési igény alapbeállítása | Sikeres | Alapból tiltott; éles engedélyezéshez legalább 32 karakteres műveleti kulcs és mindkét jogi dokumentum verziója szükséges. |
| Teljes tesztkészlet | Sikeres | 21 tesztfájl, 89 teszt; helyi PostgreSQL-integrációkkal. |
| `npm.cmd run lint` | Sikeres | ESLint hiba és figyelmeztetés nélkül. |
| `npm.cmd run typecheck` | Sikeres | TypeScript strict ellenőrzés. |
| `npm.cmd run build` | Sikeres | Next.js production build; vásárlói rendelésnézet és kezelői rendelési oldal bekerült. |
| Prisma migráció | Sikeres | `20260925090000_rendelesi_igeny` és `20260925103000_rendelesi_jogi_verziok` alkalmazva; összesen 10 migráció. |
| Fizetés / valódi készletfoglalás | Nincs bekapcsolva | A közös UNAS-készletet nem foglaljuk; a kezelői döntés kézi igazolás. Fizetési szolgáltató híján megerősítés után sem indul terhelés; fizetési meghívó az M6 feladata. |

## M6 SimplePay fizetés, IPN és visszatérítés

Dátum: 2026-09-25. A SimplePay sandbox-hitelesítők és kereskedői fiók hiányában a szolgáltató válaszait helyettesített tesztek fedik le.

| Ellenőrzés | Eredmény | Bizonyíték / korlátozás |
|---|---|---|
| Vendégrendelési fizetés API | Sikeres | 3 útvonalteszt; rendelési jogosultság, eredetvédelem és szerveren tárolt összeg. |
| SimplePay adapter | Sikeres | 11 teszt; HMAC, start/status/query/refund, tranzakcióazonosító, HUF és összegellenőrzés, hálózati hibák. |
| IPN útvonal | Sikeres | 3 teszt; aláírt válasz, fizetett állapot rögzítése, hibás aláírás és 16 KiB méretkorlát. |
| Pénzügyi kezelői API | Sikeres | 4 útvonalteszt; hozzáférési szerepkör, összegkorlát, visszatérítés és eredetvédelem. |
| Teljes tesztkészlet | Sikeres | 37 tesztfájl, 153 teszt, köztük helyi PostgreSQL-integrációk. A Vitest Windowsos konfigurációbetöltéséhez `--configLoader runner` kellett; a PostgreSQL-teszthez a `.env`-ből titok kiírása nélkül adtam át a `DATABASE_URL` értékét. |
| Típusellenőrzés | Sikeres | `npx.cmd tsc --noEmit --incremental false`. |
| Lint | Sikeres | `npm.cmd run lint`. |
| Production build | Nem futott | A rendszermeghajtón nem volt szabad hely; a buildet nem indítottam el. |
| SimplePay sandbox | Nem futott | Nincs kereskedői szerződés/fiók, sandbox-hozzáférés, domain és kulcs; külső kérés nem történt, a `PAYMENT_PROVIDER` alapértéke `disabled`. |
