# Fejlesztési állapot

Frissítve: 2026-09-25

## M0 – Környezet és döntések

Állapot: **kész; az UNAS olvasási kapcsolat és teljes első termékimport ellenőrizve**.

- A repository csak a 112 KB-os elsődleges specifikációt tartalmazta; alkalmazáskód, helyi `AGENTS.md` és Git-adattár nem volt.
- Elérhető: Windows PowerShell, Node.js 24.15.0, npm 11.14.0, Git 2.54.0.
- Elérhető: Docker Engine 29.8.0 és Compose 5.5.1; a projekt PostgreSQL szolgáltatása egészséges. `psql` a konténeren belül érhető el; pnpm nincs telepítve.
- `git init` lefutott, hogy a következő módosítások áttekinthetők legyenek.
- Az npm registry első próbája `EACCES` hibát adott; később a függőségek telepítése és a lockfile elkészítése sikerült.
- A Docker Desktop korábban leállított volt; a felhasználó újraindítása után az Engine elindult, a `postgres:17-alpine` adatbázis egészséges.
- Az UNAS-kulcs a Gitből kizárt `.env` fájlban van; értékét nem naplózzuk. Az UNAS olvasási kapcsolat működött; fizetési, számlázási és e-mail kapcsolat még nincs.
- Rögzítve: docs/DECISIONS.md és docs/BACKLOG.md.

## M1 – Alkalmazásváz, adatbázis és ellenőrzött seed

Állapot: **kész; PostgreSQL, öt migráció, seed és import-worker ellenőrizve**.

- Next.js/TypeScript projektváz, mobilra igazodó katalógus és kattintható termékoldal elkészült.
- Compose PostgreSQL-konfiguráció, Prisma séma/migráció, pg-boss worker, 12 rekordos tiltott státuszú seed, jogosultsági szabályalap és CI-folyamat kódja elkészült.
- PostgreSQL 17 migráció sikeres; a seed kétszeri futása 12 tesztrekordot eredményezett. Az UNAS-import ezeket mellett 60 terméket adott hozzá; mind a 72 rekord publikálatlan, a 12 seedtermék tesztként jelölt.
- A pg-boss worker elindult és naplózta a `worker.started` eseményt; Ctrl+C után `worker.stopped` eseménnyel szabályosan leállt.
- Lint, strict típusellenőrzés, 10 teszt, production build és Prisma sémaellenőrzés sikeres.
- A fejlesztői termékminta nem valódi termékimport; a publikus felületen ezt egyértelműen jelölni kell.
- A függőségek lockfile-ból telepíthetők; az npm registry korábbi `EACCES` hibája nem akadályozta a projekt ellenőrzését.

## M2 – UNAS-forrás és termékimport

Állapot: **elkészült; teljes, csak olvasó UNAS-lekérés és helyi adatbázis-import sikeres**.

- A hivatalos UNAS API dokumentáció alapján XML POST, API-kulcsos belépés és Bearer token kezeli az olvasási kapcsolatot.
- Az UNAS dokumentált termékszerkezetében nincs külön márkamező. A felhasználó által megadott „API engedélyezés” paraméter ID-je `8773476`; az adapter kizárólag az `1` értéket fogadja el. Hiányzó vagy `0` érték kizárva.
- Készült DTD/entitás ellen védett XML-elemzés, 5 MB méretkorlát, 15 másodperces kéréskorlát, magyar terméklapozás és 30 oldalas biztonsági korlát.
- Teljes, 9 oldalas olvasás: a legutóbbi futásban 427 forrásrekord; 60 engedélyezett, 367 kizárt, 0 hibás; 11 kategória. `API engedélyezés=1` az egyetlen befogadási feltétel. A forrás 1/2 állapotú termék rendelhetőként, a 3 állapotú nem rendelhetőként jelenik meg.
- Elkészült a tranzakciós, ujjlenyomattal idempotens adatbázis-upsert és importfutás-napló. A meglévő publikálási állapot frissítéskor megmarad; hiányzó termék csak teljes, hibamentes és nem üres egyeztetésnél kapcsolható ki. A bizonyítottan más márkájú rekord nem marad aktív.
- A fejlesztői seed most ugyanazt az importfolyamatot használja. Kétszer futtatva 12 különálló, nem publikált próbatermék és két naplózott futás keletkezett.
- A teljes egyeztetés védelme és ismételhetősége 3 külön importpróbával ellenőrizve. Száraz előnézet, delta-vízjel és admin-előnézet még nyitott.
- A fejlesztői web újra fut; a főoldal, mintatermék és állapotvégpont HTTP 200 választ adott.
- Az `ET160I` csak olvasó válaszában az „API engedélyezés” ID `8773476`, értéke `1`; a `.env`-ben beállított azonosítóval futott a teljes szűrés.
- A teljes első import sikerült: 60 UNAS-rekord saját PostgreSQL-be került, új rekordként; 0 frissített/duplikált/hibás. Minden frissen importált rekord nem publikált maradt.
- A worker hibakezelése javítva: induláskor létrehozza a saját pg-boss sort; tranzakciós advisory lock eredménye típushelyesen kezelve. Két korábbi sikertelen helyi próbajob maradt a naplóban; az utolsó job sikeresen lezárult.
- Az élő katalógus adatbázis-adaptere külön `unas-preview` fejlesztői módban mutatja a 60 nem publikált terméket. Éles adapter továbbra is csak aktív, közzétett, nem teszt HC-rekordokat ad ki.
- A kulcscsere után az `ET160I` csak olvasó paraméterlekérése sikeres volt; új titok nem került naplóba. A két teljes importfutás közül a legutóbbi ismétlés sikeres volt.

## M3 – Katalógus-keresés és szűrés

Állapot: **kattintható, kereshető termékkatalógus és termékoldal; UNAS-adatokkal helyben ellenőrizve**.

- Keresés név, kategória és leírás alapján; kategóriaszűrés; név és ár szerinti rendezés.
- A szűrés GET-paraméterként az URL-be kerül, így a találati oldal megosztható és újratöltés után is megmarad.
- Reszponzív űrlap mobilnézethez; üres találatok külön jelzése.
- Keresés és termékoldal HTTP 200; a helyi előnézet 60 UNAS-terméket jelenít meg, a `ET160I` cikkszám alapján kereshető.
- Az UNAS-adapter a képek HTTPS `SefUrl` mezőjét és a nyilvános termékjellemzőket már kinyeri; csak a `futopadoutlet.hu` domainhez tartozó kép URL marad meg. Belső importőr-, készlet-, szállítási- és csatornaadat nem jelenik meg műszaki adatként.
- A legutóbbi import 60 termékhez 391 kép-URL-t és 791 nyilvános műszaki jellemzőt mentett. Az `ET160I` adatlapján 7 kép és 17 jellemző található; egy minta kép URL-jének HTTPS-elérhetősége 200-as választ adott. A dokumentáció alapján a `ContentParam` csak a válaszban megjelenő mezőket korlátozza, ezért a teljes jellemzőkérésből kimaradt; az engedélyezési szűrés változatlanul helyben történik. Az UNAS bruttó HUF ár és a szállítási díjak jóváhagyva. A csak olvasó `getSetting` API az alapdevizát `HUF`-ként igazolta; a szállítás minden magyar címre és termékre érvényes.

## M4 – Kosár, ár és szállítás

Állapot: **felületi kosár és szerverszámítás elkészült; pénztár és éles vásárlás nincs bekapcsolva**.

- A termékoldalról kosárba tehető a közzétett, valódi UNAS-termék; a nem publikált fejlesztői előnézet vásárlási gombja letiltott.
- A kosár HTTP-only, `SameSite=Strict` munkamenetsütit és annak SHA-256 lenyomatát használja; az API ellenőrzi a kérés eredetét, a bemenetet és a verzióütközést. A válasz `private, no-store` jelölésű.
- Kosárban mennyiség állítható, tétel eltávolítható, szállítási mód kiválasztható. A kiválasztás adatbázisban marad.
- Minden összeg a szerver adatbázisában lévő termékárból készül; kliensárat nem fogad el. Házhoz szállítás 0 Ft, emeletre 19 900 Ft kosáranként egyszer. Ismeretlen/érvénytelen termékösszeg nem ad ingyenes fizetendőt.
- Új Prisma-migráció: a kosárhoz tartozó szállítási mód tárolása; helyi PostgreSQL-en sikeresen alkalmazva.
- A kosár tesztjei a szerveroldali HUF-árat, közzétételi/márkaszabályt, mennyiséghatárokat, házhoz- és emeletdíjat, valamint vegyes kosárnál az egyszeri emeletdíjat ellenőrzik.
- Ismételt kosárba tételkor a mennyiség eggyel nő. Módosításkor adatbázis-szintű verzió-összehasonlítás akadályozza meg, hogy azonos verziójú párhuzamos kérések felülírják egymást.
- A pénztár API 10 perces, szerveroldalon tárolt ajánlatot készít. Az ajánlat a kosárverziót, ár- és tételpillanatképet, szállítási díjat és teljes összeget rögzíti; a tokenből csak SHA-256 lenyomat kerül az adatbázisba. Az ajánlat nem engedélyez fizetést.
- A `CheckoutQuote` adatbázistáblát létrehozó hetedik migráció helyi PostgreSQL-en sikeresen lefutott. A valós útvonalat használó integrációs próba az ajánlat mentését, lejárati idejét, tokenlenyomatát, árpillanatképét és változatlanságát ellenőrzi.
- A lejárt kosarak és ajánlatok takarítása naponta 03:15-kor fut a `Europe/Budapest` időzónában. A háttérfolyamat három újrapróbálkozást állít be; a törölt rekordok számát naplózza.
- Az UNAS-árimport minden teljes terméklista előtt ellenőrzi az alapdevizát; ha nem `HUF` vagy hiányzik az érték, a terméklekérés hibával leáll.
- A kosár és az ár-/szállítási ajánlat M4-ben elkészült; a vendégrendelés és a kézi készletigazolás az alábbi M5 részben készült el. A házhoz- és emeletre szállítás díja minden magyar címre és termékre érvényes. A publikálatlan termékek továbbra sem vásárolhatók.

## M5 – Készlet és rendelés

Állapot: **kész; vendégrendelés, idempotens rögzítés, rendelési pillanatkép és kézi készletdöntés elkészült**.

- A hivatalos UNAS `getStock` dokumentáció szerint a cikkszámok egy kérésben vesszővel adhatók meg; változat és további raktár mezői is visszatérhetnek. A többtermékes hívásokra óránkénti korlát vonatkozik.
- Teszt először: az új parser-, adapter- és XML-injekciós próbák implementáció előtt hibával elbuktak, utána sikeresek lettek.
- Élő, csak olvasó ellenőrzés: 60 HC terméket kérdeztünk le; 60 készletsor érkezett, mind pozitív. Külön raktár- vagy változatsor nem érkezett. Ez csak pillanatkép, nem foglalás vagy későbbi elérhetőségi garancia.
- A mennyiség, változat, raktár és lekérés ideje megmarad az adapter válaszában. A vissza nem kapott cikkszám külön, ismeretlenként szerepel; hiányzó mennyiség nem lesz nulla.
- Elkészült a külön `ProductStock` tábla a mennyiségi pillanatkép, részletes UNAS-sorok és lekérési idő tárolására. Összetett, változatos, további raktári, hiányzó vagy nem visszaadott készletnél az összesített mennyiség ismeretlen marad.
- A készletfrissítés óránként `:00`-kor, legfeljebb 50 cikkszámos csomagokkal fut. A teljes UNAS termék- és árimport óránként `:30`-kor frissíti a katalógust. Mindkét ütemezés magyar időzónás és három újrapróbálkozást állít be; hiányzó API-beállításnál a termékszinkron nem indul.
- A worker ütemezéseit a helyi pg-boss adatbázistáblában ellenőriztem. Az első teljes készletfrissítés 60/60 HC-terméket mentett el a helyi PostgreSQL-be.
- A felhasználó jóváhagyta, hogy az UNAS legyen az automatikus termék-, ár- és készletforrás. A közös készlet csak olvasási tükör, nem automatikus foglalás. Az ajánlat 2 óránál régebbi vagy időbélyeg nélküli importált árnál átmenetileg leáll; a katalógus elrejti a 2 óránál régebbi készletmennyiséget.
- A katalógus friss adat esetén az UNAS által jelzett mennyiséget, lejárt vagy ismeretlen adatnál egyeztetési üzenetet mutat. Egyik szöveg sem ígér készletfoglalást vagy garantált rendelhetőséget.
- A terméklista és adatlap friss készletpillanatképnél feltünteti a forrás által jelzett mennyiséget; elavult vagy ismeretlen adatnál egyeztetést jelez. A kétórás határ `STOCK_MAX_AGE_SECONDS` változóval módosítható. Ez nem készletfoglalás és nem vásárlási ígéret.
- A vendég rendelési igényt küldhet a szerver által tárolt, még érvényes ajánlatból. A szerver ellenőrzi az árat, termékeket, kosárverziót, szállítást és munkamenetet, majd név-, cím-, tétel- és árpillanatképet ment.
- A rendelés a beküldéskor érvényes adatkezelési és értékesítési dokumentumverziót is elmenti; későbbi verzióváltás nem írja át a korábbi rendelést.
- Ugyanazon munkamenet és idempotenciakulcs ismétlése ugyanazt a rendelést adja vissza; eltérő adatokkal ütközést jelez. A párhuzamos beküldést adatbázis-egyediségi szabály védi.
- A vendég rendelését külön, HTTP-only hozzáférési süti védi. A kezelői rendelési felület adatbázis-munkamenettel és szerepkörrel működik, a kézi készletmegerősítést vagy elutasítást naplózza.
- Kézi megerősítéskor a kezelőnek kell a készletet ellenőriznie és a rendelés megjegyzésében rögzítenie. A rendszer nem ír az UNAS-ba és nem foglal le automatikusan készletet. Fizetés nem indul; fizetési szolgáltató és meghívó az M6 része.
- Éles rendelésfogadás alapból tiltott. Engedélyezéséhez legalább 32 karakteres műveleti kulcs és jóváhagyott jogi tájékoztató-verziók szükségesek. Helyi fejlesztéshez külön be van kapcsolva.

## M6 – Fizetés és visszatérítés

Állapot: **folyamatban; belső adattárolás és állapotvédelem elkészült, szolgáltatói integráció sandbox-hozzáférésre vár**.

- A rendeléshez kapcsolt fizetési kísérlet, egyedi kereskedői hivatkozás, ismételhető indítási kulcs, szolgáltatói azonosító és lejárat tárolható.
- Külön, ujjlenyomattal duplikációvédett fizetési eseménynapló és fizetési kísérlethez kapcsolt visszatérítési rekord készült. Az adatbázis pozitív összeget, pozitív próbálkozásszámot és nem üres indoklást kényszerít ki.
- Állapotgép és tesztek védik a későn érkező függő eseménnyel történő visszaállítást, támogatják az ismeretlen fizetés egyeztetését, ellenőrzik a kereskedői hivatkozás/összeg/pénznem egyezését, és megakadályozzák a fizetett összegnél nagyobb visszatérítést.
- Nem készült fizetési API-útvonal, Barion-adapter, átutalási folyamat, kezelői visszatérítés, callback vagy fizetési felület. Fizetést indítani és fizetett státuszt kézzel állítani továbbra sem lehet.
- A tulajdonos SimplePayt választott. A hivatalos fejlesztői oldal alapján új integrációhoz API v2 szükséges; a nyilvános OpenAPI-leírás 2.1-es változatot, HMAC-SHA384 `Signature` fejlécet, sandbox- és éles végpontot ír le. A szolgáltató sandbox-hozzáférést sikeres szerződéskötés után ad.
- Nyitott: SimplePay kereskedői szerződés/fiók, sandbox hozzáférés és titkos kulcs; azután indítási adapter, hitelesített állapotlekérés, callback feldolgozás, visszatérítés, banki átutalás és e2e sandbox-próba.

## M7 – Adminisztráció, teljesítés, számla és értesítések

Állapot: **folyamatban; védett kezelői belépés és helyi rendelésteljesítés elkészült, a Számlázz.hu és a MailerSend kiválasztva, integrációjuk nyitott**.

- Elkészült az adatbázisban tárolt adminfiók, scrypt-jelszólenyomat, véletlen azonosítójú HTTP-only munkamenetsüti, nyolcórás lejárat és visszavonás. A munkamenet minden műveletnél ellenőrzi az aktív fiókot és a szerepkört. A sikertelen belépési próbák lenyomata adatbázisba kerül; nyolc sikertelen próba/15 perc után a belépés elutasított.
- A fejlesztői tulajdonos-létrehozó parancs egyszeri és újrafuttatás ellen védett. Tulajdonosi jelszó nem kerül forráskódba, parancssori argumentumba vagy naplóba; titkos környezeti változóként kell átadni.
- A rendelési admin már nem használ statikus Bearer-kulcsot. Készletdöntés és rendeléslista szerepkör-ellenőrzött; új kezelői fiókot csak OWNER hozhat létre, naplózottan. Az elérhető szerepkörök OWNER, OPERATIONS, FINANCE, CONTENT és READ_ONLY; külön műveleti engedélyek vannak.
- A visszaigazolt rendelés helyi teljesítési állapotai: előkészítés, feladás, kézbesítés vagy megszakítás. Feladáskor kötelező a futár és a követési szám; követési hivatkozás kizárólag HTTPS. Az állapotváltás egy adatbázis-tranzakcióban menti a szállítmányt, auditbejegyzést és feladáskor deduplikált értesítési feladatot.
- Új Prisma migráció alkalmazva. Az adatmodell tartalmaz számla- és értesítési sorokat, de számlakészítés és levélküldés szolgáltató nélkül nem történik. A vásárlói levél nincs bekötve, a feladáskor keletkező értesítés jelenleg csak függő sorrekord.
- A tulajdonos a Számlázz.hu Számla Agentet választotta számlázásra és a MailerSendet tranzakciós levelekre. Az API-hozzáférések és szolgáltatói fiókok még nincsenek beállítva.
- Nyitott: számlázási időzítés és számlaküldés módja, számlafolyamat és védett dokumentumtár, értesítési feldolgozó, adminfelhasználó-kezelő felület és az összes szerepkör teljes műveleti felülete. A forrásrendelés továbbítása változatlanul tiltott.

## M8 – Élesítés előtti ellenőrzés

Állapot: **folyamatban; az adatbázis-elérhetőség is része az egészségellenőrzésnek, a külső üzleti és üzemeltetési kapuk nyitva**.

- Az éles UNAS adapter indulásához kötelező a szerveroldali API-kulcs és a HC-engedélyező paraméter. Éles rendelési igény csak az UNAS katalógus adapterrel kapcsolható be; a `DATABASE_URL` csak PostgreSQL-kapcsolat lehet.
- A futtatókörnyezet `NODE_ENV=production` értéke felülbírálja a véletlenül fejlesztésre állított `APP_ENV`-et; így az UNAS előnézet nem kapcsolható be éles Node-folyamatban.
- Az alkalmazás közös biztonsági fejléceket ad (`nosniff`, keretbe ágyazás tiltása, referrer-szabály, jogosulatlan böngészőfunkciók tiltása); éles környezetben HSTS is beáll. Minden `/api/*` válasz `private, no-store` gyorsítótár-tiltást kap.
- Az `/api/health` most tényleges `SELECT 1` adatbázis-próbát végez, és adatbázishiba esetén 503-at ad; az adatbázis-kapcsolat 5 másodperces csatlakozási időkorlátot kapott. A sikeres és sikertelen eset külön tesztelve.
- A kezdőlap meta leírása már nem fejlesztői előnézetként hirdeti a boltot; a billentyűzetes fókusz kapott jól látható jelölést, a csökkentett mozgás beállítást a CSS figyelembe veszi. Böngészős billentyűzetes és mobilpróba még nincs.
- A végleges domain még nincs rögzítve, ezért kanonikus URL, sitemap és végleges robotirányelv beállítása nyitott; ezeket nem irányítottam találomra egy domainre.
- A tulajdonos pontosította a GitHub-felhasználónevet: a helyes cím `polyakkevin68/hchomefitness`. A projekt feltöltve, a `.env` kimaradt. A 36127162898 futás migrációja, lintje, típusellenőrzése, 124 tesztje és buildje sikeres. A 36127543344 futás mindezeket, valamint a PostgreSQL melletti valódi worker-SIGTERM-próbát is sikeresen teljesítette; a próba a `worker.started` és `worker.stopped` naplóbejegyzéseket ellenőrzi.
- A helyi PostgreSQL-ből `pg_dump` mentést készítettem, külön próba-adatbázisba `pg_restore`-ral visszaállítottam, majd a táblák és alkalmazott migrációk számát összevetettem (19 tábla, 13 migráció). Az ideiglenes adatbázist és mentést eltávolítottam.
- A naplózó most engedélyezett mezőket ír ki, a hibaüzenetből kitakarja az adatbázis-kapcsolatot, Bearer tokent és `*_API_KEY`, `*_TOKEN`, `*_SECRET`, `*_PASSWORD` értéket; két célzott teszt előbb hibázott, utána sikeres lett.
- A helyi `.env` ki van zárva a verziókezelésből. A build publikus 16 és szerveroldali 221 JS/JSON állományát két helyi titkos beállítás értékével vizsgáltam; egyezés nem volt, értéket nem írtam ki.
- A worker leállítása külön függvénybe került: előbb kíméletes leállítást kér, hiba esetén kényszerített lezárást próbál, majd bontja az adatbázis-kapcsolatot. Két egységteszt ellenőrzi a sorrendet és mindkét ágat. A Linuxos GitHub Actions próbában valódi SIGTERM után megjelent a `worker.stopped`; a Windowsos konzolmegszakítás továbbra sem adott ilyen naplót.
- A termékkatalógus adatbázisoldali lapozása 12 terméket ad oldalanként; kategória/összesített darabszám rövid ideig gyorsítótárazott, az ismételt azonos lekérések 5 másodpercig közösítettek. A publikus `/api/katalogus` csak a kártyákhoz szükséges mezőket adja, `private, no-store` fejléccel.
- A termékadatlap adatbázisban, slug alapján egyetlen terméket kér le; nem olvassa be a teljes katalógust. Adapterteszt igazolja a lekérdezés szűrőit.
- A specifikáció szerinti helyi API-terhelési próba sikeres: 1000 termék, 50 párhuzamos kliens, 10 perc, 3000 kérés, 0 hiba, p50 154 ms, p95 213 ms, p99 273 ms. A Windowsos fejlesztőgépen futott szerver, terhelésgenerátor és PostgreSQL; hardveradatot a korlátozott környezet nem adott. Ez nem staging/éles mérés.
- Külön 50 klienses, 30 másodperces főoldal-diagnosztika p95 1022 ms lett. A célérték az API-ra vonatkozik; a szerveroldali HTML válasz lassabb, ezt külön kell kezelni, ha a főoldalra is 500 ms-os cél szükséges.
- A DB-kapcsolatkészlet `DATABASE_POOL_MAX` változóval 1–100 között állítható, alapértéke 10. A 1000 tesztrekord kizárólag az elkülönített `hc_m8_terheles_proba_20260925` adatbázisban volt.
- Helyi ellenőrzés: 32 tesztfájl/124 teszt, lint, típusellenőrzés, Prisma-séma és migrációs státusz, production build sikeres. Az adatbázis-próba sikerénél a `/api/health` 200-at, hibájánál 503-at ad; a biztonsági fejlécek és API-gyorsítótár-fejléc várt értéket ad.
- A `check:production-config` éles környezetre állított helyi próbája sikeres volt a helyi `.env` kapcsolattal és `unas` adapterrel; rendelésfogadás kikapcsolva maradt. Ez csak konfigurációs ellenőrzés, nem staging vagy külső szolgáltatói próba.
- A production buildet külön, 3100-as helyi porton is elindítottam. A főoldal és egészségvégpont 200-at, a HSTS és az API `private, no-store` fejléce helyes értéket adott; a fixture beállítás ellenére a mód `disabled` lett, fejlesztői minta nem jelent meg. A próbát leállítottam, a fejlesztői szerver 3000-en maradt.
- Worker-próba: a GitHub Actions 36127543344 Linux környezetében a PostgreSQL mellett futó worker elindult, SIGTERM-et kapott, szabályosan kilépett, és naplózta a `worker.stopped` eseményt.
- A tulajdonos megerősítette, hogy a domain és a cég/jogi adatok később készülnek el; staging és SimplePay/Számlázz.hu/MailerSend tesztfiókok sincsenek beállítva. Az M6/M7 nyitva marad, ezért ezek a külső M8-kapuk is nyitottak.
- Nyitott kapuk: eladó/jogi tartalom, mobil és billentyűzetes böngészőpróba, éles forrás teljes és részleges hibapróbája, SimplePay sandbox, Számlázz.hu/MailerSend kapcsolat, production riasztás, staging domain/TLS és hozzáférések. Emiatt M8 nem zárható le.

## Kosár API ellenőrzése

- Hat helyettesített kosárútvonal-teszt ellenőrzi a munkamenetsütit, a `private, no-store` választ, az eredet- és bemenetellenőrzést, a kliensár elutasítását, a szállításmód-módosítást, ismételt hozzáadást és a sor törlését. Négy ajánlatútvonal-teszt fedi le az ajánlat létrehozását, az üres kosarat, az elavult kosárverziót és a szállítási mód hiányát.
- A helyi PostgreSQL-integrációs teszt a tényleges útvonalkezelőkön keresztül létrehozza és módosítja a kosarat, ellenőrzi az ajánlat mentését és az árváltozás utáni változatlan pillanatképet, majd igazolja a lejárt ajánlat, a lejárt kosár és az összes saját tesztadat eltávolítását. Az aktív kosár a takarítás után is megmarad.

## Futtatási parancsok

| Cél | Parancs | Állapot |
|---|---|---|
| Függőségek | `npm.cmd ci --no-audit --no-fund` | Sikeres, lockfile-ból 384 csomag települt; Prisma Client újragenerálódott |
| Fejlesztői web | `.env` fejlesztői beállításaival: `npm.cmd run dev` | Fut `http://localhost:3000` címen; a főoldal, mintatermék és `/api/health` HTTP 200 |
| Lint | `npm.cmd run lint` | Sikeres |
| Típusellenőrzés | `npm.cmd run typecheck` | Sikeres |
| Tesztek | `npm.cmd test -- --configLoader runner` | Sikeres: 22 fájl, 95 teszt, valódi helyi PostgreSQL-integrációkkal együtt |
| UNAS pénzneme | `npm.cmd run unas:penznem` | Sikeres, csak olvasó API-kérés; az alapdeviza `HUF` |
| Build | `npm.cmd run build` | Sikeres Next.js 16.3.6 production build |
| Adatbázis | `docker compose up -d adatbazis` | PostgreSQL 17 fut, helyi PostgreSQL-kapcsolat sikeres; 12 migráció alkalmazva |

## M0 ellenőrzés

- Futtatva: `node --version` → v24.15.0.
- Futtatva: `npm.cmd --version` → 11.14.0.
- Futtatva: `git --version` → 2.54.0.windows.1.
- Futtatva: `npm.cmd ci --no-audit --no-fund` → sikeres, 384 csomag települt a lockfile alapján.
- HTTP-próba: kezdőoldal, mintatermék-oldal és `/api/health` mind 200; a termékkártya hivatkozása működik.
- PostgreSQL migráció és seed sikeres; a worker adatbázis-kapcsolatot felépítette.
- UNAS terméklekérés és első teljes import élőben ellenőrizve. Fizetés, számlázás és levélküldés külső szolgáltatói kapcsolata nem futott.

## Következő lépés

Az M8 további feladata a staging és a külső szolgáltatói próbák hozzáférés utáni ellenőrzése, valamint a jogi, mobil/billentyűzetes és üzemeltetési kapuk igazolása. A helyi PostgreSQL mentés-visszaállítása, a worker Linuxos SIGTERM-próbája és az API 1000 termék/50 kliens/10 perces terhelési próbája sikeres (p95 213 ms). A távoli CI 124 teszttel és production builddel zöld. A helyi prototípus a `http://localhost:3000` címen próbálható ki. Az M6 nyitva marad; M7-ben a Számlázz.hu és MailerSend integrációjára még szükség van. Külső fizetési, számlázási és e-mail művelet nem történt.
