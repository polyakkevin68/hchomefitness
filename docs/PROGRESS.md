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

Állapot: **a kód és a helyi ellenőrzések elkészültek; M6 külső szolgáltatói próbára és banki átutalási döntésre vár**.

- A rendeléshez kapcsolt fizetési kísérlet, egyedi kereskedői hivatkozás, ismételhető indítási kulcs, szolgáltatói azonosító és lejárat tárolható.
- Külön, ujjlenyomattal duplikációvédett fizetési eseménynapló és fizetési kísérlethez kapcsolt visszatérítési rekord készült. Az adatbázis pozitív összeget, pozitív próbálkozásszámot és nem üres indoklást kényszerít ki.
- Állapotgép és tesztek védik a későn érkező függő eseménnyel történő visszaállítást, támogatják az ismeretlen fizetés egyeztetését, ellenőrzik a kereskedői hivatkozás/összeg/pénznem egyezését, és megakadályozzák a fizetett összegnél nagyobb visszatérítést.
- A hivatalos SimplePay OpenAPI 2.1 alapján elkészült a szerveroldali adapter: `/v2/start`, `/v2/status`, `/v2/query` és `/v2/refund`; a sandbox/production cím rögzített, soha nem a kliens által választott. Minden kérés 32 karakteres véletlen sót és Base64 HMAC-SHA384 `Signature` fejlécet kap; válaszaláírás nyers JSON törzsön ellenőrződik, időkorlát 10 másodperc.
- A fizetésindítás HUF egész összeget, egyedi rendelési hivatkozást és e-mailt kér; csak az aláírt válasz egyező kereskedő-/rendelés-/összeg-/devizaadata és a megfelelő SimplePay fizetési domainje után ad átirányítási URL-t. Az ellenőrzött státusz nyers szolgáltatói állapot marad; önmagában nem állít fizetett állapotot. A visszatérítés pozitív egész HUF összeget és SimplePay tranzakció-azonosítót használ.
- A `PAYMENT_PROVIDER` alapértéke `disabled`; SimplePay aktiváláskor kereskedőazonosító és kulcs szükséges, éles környezetben csak az éles végpont engedett. Kulcs nélkül nincs külső hívás. A visszaigazolt vendégrendelés saját hozzáférési sütivel indíthat fizetést; egyetlen adatbázis-kísérlet készül, az ismételt kérés nem küld új indítást. Bizonytalan indításnál újrapróbálás helyett állapot-egyeztetés szükséges.
- Az aláírt IPN feldolgozza a fizetési eseményt, felismeri az ismétlést, védi az állapotot késői vagy hibás eseménytől, és az eredeti üzenet `receiveDate` mezővel bővített, újraaláírt válaszát adja vissza.
- A kezelői pénzügyi felület és API kizárólag FINANCE/OWNER szerepkörrel indít visszatérítést. Az összeget tranzakciósan lefoglalja, a külső bizonytalan eredményt nem ismétli meg automatikusan; utólag hitelesített `/v2/query` hívással egyeztet, tranzakcióazonosítót, összeget, HUF devizát és visszatérítési listát ellenőriz.
- A fizetési visszatérési oldal csak ellenőrzést kér; a rendelést kizárólag aláírt szerveroldali adat állíthatja fizetettre. Nem helyi visszatéréshez `PUBLIC_BASE_URL` és éles módban HTTPS kell. A SimplePay fiókban az IPN címet be kell állítani.
- Célzott tesztek: 3 fizetési útvonal-, 3 IPN-, 4 kezelői visszatérítés- és 11 adapterteszt. A teljes ellenőrzés: 37 tesztfájl, 153 teszt; típusellenőrzés és lint sikeres.
- A tulajdonos SimplePayt választott. A hivatalos fejlesztői oldal alapján új integrációhoz API v2 szükséges; a nyilvános OpenAPI-leírás 2.1-es változatot, HMAC-SHA384 `Signature` fejlécet, sandbox- és éles végpontot ír le. A szolgáltató sandbox-hozzáférést sikeres szerződéskötés után ad.
- Nyitott: SimplePay kereskedői szerződés/fiók, sandbox hozzáférés és titkos kulcs; domain és `PUBLIC_BASE_URL`; kereskedői felületen IPN cím beállítása; végpontok sandbox-próbája. Banki átutalás összege, kedvezményezett- és közleményadatai nincsenek megadva, ezért az átutalásos folyamat nincs bekapcsolva. A production build helyhiány miatt nem futott.

## M7 – Adminisztráció, teljesítés, számla és értesítések

Állapot: **a helyi implementáció elkészült; a végső M7-ellenőrzés és üzemi bekapcsolás külső szolgáltatói hozzáférésre és üzleti adatokra vár**.

- Elkészült az adatbázisban tárolt adminfiók, scrypt-jelszólenyomat, véletlen azonosítójú HTTP-only munkamenetsüti, nyolcórás lejárat és visszavonás. A munkamenet minden műveletnél ellenőrzi az aktív fiókot és a szerepkört. A sikertelen belépési próbák lenyomata adatbázisba kerül; nyolc sikertelen próba/15 perc után a belépés elutasított.
- A fejlesztői tulajdonos-létrehozó parancs egyszeri és újrafuttatás ellen védett. Tulajdonosi jelszó nem kerül forráskódba, parancssori argumentumba vagy naplóba; titkos környezeti változóként kell átadni.
- A rendelési admin már nem használ statikus Bearer-kulcsot. A szerepkör-ellenőrzött lista az utolsó 100 rendelést mutatja, beleértve az elutasított/lezárt rendeléseket, a fizetési és teljesítési állapotot, valamint a készlet- és szállítási auditelőzményt. Készletdöntés és teljesítés csak jogosult kezelőnek érhető el.
- A visszaigazolt rendelés helyi teljesítési állapotai: előkészítés, feladás, kézbesítés vagy megszakítás. Feladáskor kötelező a futár és a követési szám; követési hivatkozás kizárólag HTTPS. Az állapotváltás egy adatbázis-tranzakcióban menti a szállítmányt, auditbejegyzést és feladáskor deduplikált értesítési feladatot.
- A pg-boss háttérfeldolgozó percenként felveszi a rendelési, készlet-, fizetési, visszatérítési, feladási és számlaértesítéseket. A MailerSend adapter az alapértelmezett tiltott mód mellett tesztcím-listával korlátozható; bizonytalan küldés vagy a szolgáltatói elfogadás utáni adatbázishiba `UNKNOWN`, és nem indítható újra automatikusan. Aláírt webhook visszaigazolja a kézbesítést vagy visszapattanást.
- Sikeres SimplePay visszatérítéskor ugyanabban az adatbázis-tranzakcióban kerül sorba deduplikált ügyféllevél; a sablon tartalmazza a visszatérített összeget.
- Készült jogosultságvédett értesítési lista és hibás, biztosan elutasított levél újrapróbálása auditnaplóval. A bizonytalan levelet a felület kifejezetten nem engedi újraküldeni. Üzemeltetési teendőit a `docs/RUNBOOK.md` rögzíti.
- A Számlázz.hu XML Agent adapter HUF tételösszeget ellenőriz, XML-t kódol, PDF-et és számlaszámot vizsgál; hálózati vagy hiányos siker-válasznál az eredményt bizonytalannak jelöli. A vásárlói számlázási adatok, adókulcs, kiállítási időzítés és eladói adatok hiányában automatikus kiállítást nem indít.
- A FINANCE/OWNER számlakezelő a már kiállított számlát és PDF-et legfeljebb 10 MB méretben, jogosultság- és fájlfejléc-ellenőrzéssel, SHA-256 lenyomattal és auditbejegyzéssel rögzíti. Egy rendeléshez egy számlarekord engedélyezett; a dokumentum adatbázisban privát, kezelőként védetten, vásárlóként hét napos HMAC-linkkel érhető el. A 14. migráció a PDF-tárat és egyediségkorlátot hozzáadta.
- A tulajdonos a Számlázz.hu Számla Agentet és a MailerSendet választotta. Adapterek, outbox, adminnézetek és biztonsági korlátok helyben elkészültek; tényleges szolgáltatói hozzáférés és külső próba nincs beállítva.
- OWNER-nek készült kezelőifiók-oldal: fióklista, jelszóval és engedélyezett szerepkörrel létrehozás, letiltás és újraaktiválás. Módosításkor eredet- és munkamenetellenőrzés, egyedi auditbejegyzés fut; letiltás visszavonja az érintett összes munkamenetet. Saját fiók és az utolsó aktív OWNER nem tiltható le. Útvonaltesztek: 6/6 sikeres.
- Teljes helyi ellenőrzés: 40 tesztfájl, 171 teszt sikeres; `npm.cmd run lint`, `npx.cmd tsc --noEmit --incremental false`, Prisma-sémaellenőrzés és 14 adatbázis-migráció sikeres. Production build és 3100-as porton futtatott kezelői smoke próba sikeres. A `.env` tartalma nem került kiírásra.
- Külső M7-feladatok: eladói és számlázási adatok, ÁFA-megfeleltetés, kiállítási időzítés és számlaküldési szabály jóváhagyása; Számlázz.hu és MailerSend tesztfiók/kulcs, feladó domain, webhook-URL és staging domain beállítása; szolgáltatói próbák. A forrásrendelés továbbítása változatlanul tiltott.

## M8 – Élesítés előtti ellenőrzés

Állapot: **folyamatban; a helyi kódellenőrzések sikeresek, a külső üzleti és üzemeltetési, valamint a kézi böngészős kapuk nyitva**.

- Az éles UNAS adapter indulásához kötelező a szerveroldali API-kulcs és a HC-engedélyező paraméter. Éles rendelési igény csak az UNAS katalógus adapterrel kapcsolható be; a `DATABASE_URL` csak PostgreSQL-kapcsolat lehet.
- A futtatókörnyezet `NODE_ENV=production` értéke felülbírálja a véletlenül fejlesztésre állított `APP_ENV`-et; így az UNAS előnézet nem kapcsolható be éles Node-folyamatban.
- Az alkalmazás közös biztonsági fejléceket ad (`nosniff`, keretbe ágyazás tiltása, referrer-szabály, jogosulatlan böngészőfunkciók tiltása); éles környezetben HSTS is beáll. Minden `/api/*` válasz `private, no-store` gyorsítótár-tiltást kap.
- Az `/api/health` most tényleges `SELECT 1` adatbázis-próbát végez, és adatbázishiba esetén 503-at ad; az adatbázis-kapcsolat 5 másodperces csatlakozási időkorlátot kapott. A sikeres és sikertelen eset külön tesztelve.
- A kezdőlap meta leírása már nem fejlesztői előnézetként hirdeti a boltot; a billentyűzetes fókusz kapott jól látható jelölést, a csökkentett mozgás beállítást a CSS figyelembe veszi. A böngészős billentyűzetes próba nyitott; a tulajdonos a mobil böngészőpróbát manuálisan végzi el.
- A végleges domain még nincs rögzítve, ezért kanonikus URL, sitemap és végleges robotirányelv beállítása nyitott; ezeket nem irányítottam találomra egy domainre.
- A tulajdonos pontosította a GitHub-felhasználónevet: a helyes cím `polyakkevin68/hchomefitness`. A projekt feltöltve, a `.env` kimaradt. A 36127162898 futás migrációja, lintje, típusellenőrzése, 124 tesztje és buildje sikeres. A 36127543344 futás mindezeket, valamint a PostgreSQL melletti valódi worker-SIGTERM-próbát is sikeresen teljesítette; a próba a `worker.started` és `worker.stopped` naplóbejegyzéseket ellenőrzi.
- `pg_dump`/`pg_restore` próba a jelenlegi sémán sikeres: külön, ideiglenes adatbázisba állítottam vissza a mentést; az eredeti és visszaállított adatbázisban 19 tábla és 14 alkalmazott migráció egyezett. A próba végén az ideiglenes adatbázis és dump törlése lefutott.
- A naplózó most engedélyezett mezőket ír ki, a hibaüzenetből kitakarja az adatbázis-kapcsolatot, Bearer tokent és `*_API_KEY`, `*_TOKEN`, `*_SECRET`, `*_PASSWORD` értéket; két célzott teszt előbb hibázott, utána sikeres lett.
- A helyi `.env` ki van zárva a verziókezelésből. A build publikus 16 és szerveroldali 221 JS/JSON állományát két helyi titkos beállítás értékével vizsgáltam; egyezés nem volt, értéket nem írtam ki.
- A worker leállítása külön függvénybe került: előbb kíméletes leállítást kér, hiba esetén kényszerített lezárást próbál, majd bontja az adatbázis-kapcsolatot. Két egységteszt ellenőrzi a sorrendet és mindkét ágat. A Linuxos GitHub Actions próbában valódi SIGTERM után megjelent a `worker.stopped`; a Windowsos konzolmegszakítás továbbra sem adott ilyen naplót.
- A termékkatalógus adatbázisoldali lapozása 12 terméket ad oldalanként; kategória/összesített darabszám rövid ideig gyorsítótárazott, az ismételt azonos lekérések 5 másodpercig közösítettek. A publikus `/api/katalogus` csak a kártyákhoz szükséges mezőket adja, `private, no-store` fejléccel.
- A termékadatlap adatbázisban, slug alapján egyetlen terméket kér le; nem olvassa be a teljes katalógust. Adapterteszt igazolja a lekérdezés szűrőit.
- A specifikáció szerinti helyi API-terhelési próba sikeres: 1000 termék, 50 párhuzamos kliens, 10 perc, 3000 kérés, 0 hiba, p50 154 ms, p95 213 ms, p99 273 ms. A Windowsos fejlesztőgépen futott szerver, terhelésgenerátor és PostgreSQL; hardveradatot a korlátozott környezet nem adott. Ez nem staging/éles mérés.
- Külön 50 klienses, 30 másodperces főoldal-diagnosztika p95 1022 ms lett. A célérték az API-ra vonatkozik; a szerveroldali HTML válasz lassabb, ezt külön kell kezelni, ha a főoldalra is 500 ms-os cél szükséges.
- A DB-kapcsolatkészlet `DATABASE_POOL_MAX` változóval 1–100 között állítható, alapértéke 10. A 1000 tesztrekord kizárólag az elkülönített `hc_m8_terheles_proba_20260925` adatbázisban volt.
- Friss helyi ellenőrzés: 40 tesztfájl/171 teszt, lint, TypeScript, Prisma-séma és 14 migrációs státusz, production build sikeres. A tesztparancs most automatikusan betölti a `.env` fájlt; korábban hiányzó `DATABASE_URL` miatt egy teszt indításkor elbukott.
- A `check:production-config` próba sikeres, amikor `CATALOG_ADAPTER=unas` értéket a folyamatnak adtam át; a helyi előnézeti beállítással a próba helyesen hibázik. Éles rendelésfogadás kikapcsolva maradt. Ez konfigurációs ellenőrzés, nem staging vagy külső szolgáltatói próba.
- A friss production build külön, 3100-as helyi porton futott. A `/`, `/api/health` és `/api/katalogus` 200-at adott, a HSTS és az API `private, no-store` fejléce megjelent; a próbafolyamatot leállítottam.
- Worker-próba: a GitHub Actions 36127543344 Linux környezetében a PostgreSQL mellett futó worker elindult, SIGTERM-et kapott, szabályosan kilépett, és naplózta a `worker.stopped` eseményt.
- A tulajdonos megerősítette, hogy a domain és a cég/jogi adatok később készülnek el; staging és SimplePay/Számlázz.hu/MailerSend tesztfiókok sincsenek beállítva. Az M6/M7 nyitva marad, ezért ezek a külső M8-kapuk is nyitottak.
- Nyitott kapuk: eladó/jogi tartalom, tulajdonosi mobil böngészőpróba, billentyűzetes böngészőpróba, élő forrás részleges hibájának próbája, SimplePay sandbox, Számlázz.hu/MailerSend kapcsolat, production riasztás, staging domain/TLS és hozzáférések. Emiatt M8 nem zárható le.

## M9 – P1 funkciók

Állapot: **a helyi P1-kód, adatbázis-migrációk és automatikus ellenőrzések elkészültek. Külső feltételek és a tulajdonos kézi mobilpróbája külön nyitottak.**

- CMP01: 2–4, azonos kategóriájú, valódi HC/UNAS-termék; szerveroldali ellenőrzés, eltérés-szűrő, hiányzóadat-jelzés és gördíthető táblázat.
- ACC01: e-mail-igazolás, sózott jelszó, visszavonható HTTP-only munkamenet, saját rendelések/címek, kijelentkezés. Vendégrendeléshez az e-mail önmagában nem ad hozzáférést; régi rendeléshez a vendégsüti birtoklása kell.
- PRM01: dátumos, termékkörös, minimumos, felső plafonos és keretlimites kupon; ajánlatkor szerializálható foglalás, rendeléskor felhasználás; adminisztrálható ajánlók és kuponos akciós oldal.
- NEWS01: hozzájárulás és verzió naplózása, egyszer használatos e-mail-megerősítés, leiratkozás, MailerSend-állapot. Alapértelmezve kikapcsolt; tájékoztató/verzió és valódi provider nélkül nem hirdeti a feliratkozást.
- FEED01: `/feed/google.xml` és `/feed/arukereso.xml`; forrás szerinti HUF-ár, termékoldal/kép URL, aktuális készlet- és rendelhetőségszűrés. Áruc feedbe csak tényleges UNAS nettó ár kerül; becsült ÁFA nem kerül ki. Exportálható termék hiányában a route 503-at ad.
- REV01: csak belépett vásárló, fizetett vagy kézbesített, megerősített saját rendelés és benne lévő SKU alapján írhat. Moderálás kötelező; nincs strukturált csillag, amíg nem publikált, valós értékelés.
- CMS01: auditált CONTENT/OWNER kezelőoldal és szerkeszthető, egyszerű szöveges márka-, útmutató-, szerviz- és kampányoldal. A jogi/cégadatokat nem találtam ki.
- FIN01 a D12 szerint kikapcsolva marad lender-szerződésig; FUL01-et a D07 alapján nem írja az UNAS-ba. Ezeket nem helyettesíti kitalált külső szolgáltató vagy felhatalmazás.
- Helyi PostgreSQL-en 21 migráció alkalmazva; teszt 55 fájl/219 teszt, lint, típusellenőrzés, Prisma állapot és production build sikeres.
- A UNAS-előnézet első, korlátozott próbája `fetch failed` hibát adott; az engedélyezett csak olvasó újrapróbán az első oldal 8 HC-termékéből mindegyikhez nettó ár érkezett. A teljes 9 oldalas import sikeres: 60 HC elfogadva, 368 kizárva, 0 hibás; 60 helyi termék frissült, 60/60 nettó árral. A feed-integrációs PostgreSQL-próba a termékoldal/feed ár- és készletegyezést ellenőrzi.
- A tényleges katalógusban 60 HC-termék van, de jelenleg 0 publikált termék; a feedek emiatt 503-at adnak, nem tesznek ki hiányos vagy üres exportot. A termékpublikálás kezelői jóváhagyásra, a külső feedbefogadás Google/Árukereső partnerfiókra vár.
- MailerSend élő hírlevél nem futott: `NEWSLETTER_ENABLED=false`, nincs jóváhagyott végleges tájékoztató-verzió/provider. A külső fiókbeállítások M8/üzleti kapuk.
- Mobil böngészőtesztet és billentyűzetes böngészőtesztet nem futtattam; a tulajdonos kézi próbája nyitott.

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
| Tesztek | `npm.cmd test -- --configLoader runner` | Sikeres: 40 fájl, 171 teszt, valódi helyi PostgreSQL-integrációkkal együtt |
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

Az M8 külső kapui tulajdonosi/staging/provider adatokra várnak. Az OWNER-termékjóváhagyó felület elkészült; fejlesztői `unas-preview` módban a közzétett, rendelhető, friss és pozitív készletű termékek helyi kosárba tehetők, rendelésleadás továbbra sincs bekapcsolva. A csak olvasó UNAS készletszinkron 60/60 rekordot frissített; mind a 60 megfelel a kosárfeltételnek. A tényleges katalógusellenőrzés pontosan a tulajdonos által kért kilenc kategóriát mutatja, mind a 60 terméket besorolta; a nem engedélyezett kategóriaoldalak és termékek rejtettek. Következő helyi P0 munka a termékdokumentumok kezelése. A mobilpróba a tulajdonos kézi feladata.
