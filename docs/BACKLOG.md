# Teendők és kiadási terv

Az elsődleges követelményjegyzék: `HC_Home_Fitness_GPT6_Luna_fejlesztesi_terv.md`.

## P0 – első kiadás

- [ ] CAT01 – HC termékkatalógus és kategóriák; a kilenc jóváhagyott kategória van engedélyezve, a forráson kívüli kategóriák rejtettek. Csak ellenőrzött HC termék publikálható.
- [x] CAT02 – keresés, szűrés, rendezés és lapozás megosztható URL-lel; a kategóriagombok valódi `/kategoria/[slug]` oldalra vezetnek.
- [ ] CAT03 – termékoldal, képek, ár, készlet, műszaki adatok és dokumentumok. Az UNAS rövid és részletes leírása már importálódik; termékdokumentumok kezelése még nyitott.
- [ ] SYN01 – ismételhető, naplózott import és delta szinkron; HC márkavédelem.
- [x] CART01 – adatbázis-kosár, munkamenetsüti, felületi kosár, mennyiség-/törlésmódosítás, szerveroldali összegzés, 10 perces adatbázis-ajánlat és napi lejárttakarítás elkészült. Fejlesztői `unas-preview` módban közzétett, forrás szerint rendelhető, friss és pozitív készletű termék tesztkosárba tehető; rendelésleadás és fizetés továbbra is tiltott.
- [x] ORD01 – vendég rendelési igény, cím- és rendelés-pillanatképek, idempotens újraküldés, korlátozott rendelésnézet és SimplePay fizetési meghívó elkészült.
- [ ] PAY01 – egy bankkártyás szolgáltató teszt- és éles adapterrel; csak hitelesített fizetési állapot.
- [ ] PAY02 – átutalás és engedélyezett offline fizetés.
- [x] INV01 – kézi készletmegerősítés és elutasítás naplózott; közös készlet nem foglalódik automatikusan és a kezelői igazolás kötelező.
- [ ] SHIP01 – valós díjak, nagygépszállítás és átvétel.
- [ ] SVC01 – jóváhagyott összeszerelési és garanciabővítési lehetőségek.
- [ ] ADM01 – védett admin, rendeléskezelés, publikálás, tartalom, szinkron és szerepkörök. OWNER-termékjóváhagyó felület/API elkészült és auditált; kezelői fiókok, pénzügy, tartalom és ajánlók is vannak. A szinkron kezelőnézete még nyitott.
- [ ] MAIL01 – tranzakciós levelek és hibakezelés.
- [ ] BILL01 – egy kijelölt számlázó, idempotencia és bizonytalan eredmény egyeztetése.
- [ ] SEO01 – sitemap, canonical, meta és strukturált adatok.
- [ ] OPS01 – naplózás, riasztás, mentés és visszaállítási próba.
- [ ] LEG01 – jóváhagyott jogi tájékoztatók és hozzájárulások.

## P1 – későbbi kiadás

- [x] CMP01 – 2–4 azonos kategóriájú HC termék szerveroldalon validált összehasonlítása, különbségszűrővel és hiányzóadat-jelzéssel.
- [x] ACC01 – igazolt vásárlói fiók, saját rendelések, címjegyzék, kijelentkezés és régi vendégrendelés összekötése a rendelési süti birtoklásával.
- [x] PRM01 – tranzakciósan korlátozott kuponok, szerkeszthető termékajánlók és aktív kuponokat felsoroló akciós oldal. Forrás szerinti nettó/bruttó ár is megmarad; nincs kitalált kedvezményes ár.
- [x] NEWS01 – hozzájárulás-verzióval rögzített feliratkozás, e-mail-megerősítés, leiratkozás és MailerSend állapot; alapértelmezetten kikapcsolva, amíg a jóváhagyott tájékoztató és szolgáltatói kapcsolat nincs beállítva.
- [x] FEED01 – Google Merchant RSS/XML és Árukereső XML útvonal, csak friss készletű, rendelhető, valódi HC-termékkel; a bruttó/nettó ár a forrásból jön. Jelenleg 0 termék publikált, ezért az útvonal 503-at ad; partnerfiókos befogadás és aktiválás nyitott.
- [ ] FIN01 – áruhitel tényleges szolgáltatói kapcsolat alapján.
- [ ] FUL01 – D07 alapján nem engedélyezett; UNAS-ba rendelésírás nem készült.
- [x] REV01 – csak kifizetett vagy kézbesített, fiókhoz kötött termékvásárlásból írható értékelés; jóváhagyásig nem jelenik meg, nincs csillag/strukturált értékelés hamis forrásból.
- [x] CMS01 – tartalomkezelő szerepkörrel szerkeszthető és auditált márka-, útmutató-, szerviz- és kampányoldalak. Üzleti/jogi tartalom üresen marad jóváhagyásig.

## Mérföldkövek

- [x] M0 – környezet, specifikáció, döntések és backlog.
- [x] M1 – alkalmazásváz, PostgreSQL/Prisma, worker, seed, auth alap és CI.
- [x] M2 – UNAS olvasóadapter és megismételt teljes import. (Legutóbb 9 oldal/427 forrásrekord; 60 engedélyezett termék helyi adatbázisba importálva; mind publikálatlan.)
- [x] M3 – kattintható mobil katalógus és arculati alapok; finomhangolás nyitott.
- [x] M4 – kosár, ár és szállítás.
- [x] M5 – rendelések és készlet: idempotens vendégigény, pillanatképek, korlátozott vendéghozzáférés és műveleti készletdöntés.
- [ ] M6 – fizetés és visszatérítés. SimplePay indítás, aláírt állapot- és tranzakciólekérdezés, IPN, valamint FINANCE/OWNER jogosultságú visszatérítési API és kezelőfelület elkészült, helyben tesztelve. A kereskedői fiók/sandbox, domain/IPN-regisztráció és valós végpontpróba nyitott; az átutalás adatai hiányoznak.
- [ ] M7 – helyi implementáció kész: szerepkör-ellenőrzött, teljes rendelési előzmény, kézi teljesítés, outbox-alapú tranzakciós értesítés, hibakezelő felület, védett számlatár és Számlázz.hu adapter. A mérföldkő külső szolgáltatói próbája és üzleti számlázási jóváhagyása nyitott.
- [ ] M8 – élesítés előtti ellenőrzés. Friss helyi ellenőrzés: 40/171 teszt, lint, típusellenőrzés, séma/14 migráció, build, érvényes éles konfiguráció, production smoke és mentés-visszaállítás sikeres; utóbbinál 19 tábla és 14 migráció egyezett. A 36127543344 távoli CI minden lépése sikeres, beleértve a valódi worker SIGTERM-próbát. Nyitott a domain/jogi adat, tulajdonos által végzendő mobil böngészőpróba, billentyűzetes böngészőpróba, élő forrás részlegeshibája, riasztás, staging és M6/M7 külső szolgáltatói kapui.
- [x] M9 – helyi P1-megvalósítás, migrációk és automatikus ellenőrzések kész. FIN01 lender-szerződésre vár; FUL01 D07 felhatalmazására vár. A teljes UNAS-olvasó import sikeres; feedpartner-befogadás, tulajdonosi termékpublikálás és kézi mobilpróba még nyitott.
- [ ] M10 – átadás és éles működés ellenőrzése.

## Blokkoló külső feltételek

- [x] M0-B1 – npm registry elérése és lockfile létrehozása.
- [x] M1-B1 – Docker Engine elindult, a projekt PostgreSQL adatbázisa egészséges.
- [x] M2-B1 – hivatalos dokumentáció, szerveroldali kulcs és HC-paraméter, `ET160I` és teljes katalógus csak olvasó kéréssel ellenőrizve; első adatbázis-import sikeres.
- [ ] M3-B1 – HC márkaazonosító, jóváhagyott képek és márkairányelvek.
- [x] M4-B1 – Az UNAS alapdevizáját a csak olvasó `getSetting` hívás `HUF` kóddal igazolta; az import pénznemeltérésnél megáll. A szállítás díja és köre is megerősítve: minden magyar címre és termékre; házhoz 0 Ft, emeletre 19 900 Ft szállításonként.
- [x] M5-B1 – készletmodell és teljesítési döntés. Az UNAS csak olvasott készlete időbélyegzett tükör; a rendelés kezelői készletdöntésig vár, automatikus foglalás és fizetés nélkül. A 2 órás ár- és készletfrissességi határ, az idempotens vendégrendelés és a kézi megerősítés tesztelve.
- [ ] M6-B1 – a kiválasztott SimplePay kereskedői fiókja, szerződése, sandbox-hozzáférése és titkos kulcsa; a belső fizetési alapmodellek már elkészültek.
- [ ] M7-B1 – külső: eladói és ÁFA-adatok, vásárlói számlázási mezők, kiállítás időzítése és számlaküldés tulajdonosi/könyvelői jóváhagyása; Számlázz.hu és MailerSend tesztfiók, kulcs, hitelesített küldődomain, webhook-URL és staging domain; végpontpróbák és rejtett forrásduplikáció ellenőrzése. A helyi kezelői, adapter-, outbox- és számlatárfunkciók elkészültek.

## Aktuális megvalósítási részletek

- M1 – PostgreSQL egészséges; a seed kétszeri futtatása után 12 nem publikált fejlesztői rekord maradt; a worker adatbázis-kapcsolata elindult. A tíz migráció a rendelési pillanatképet, dokumentumverziókat és eseménynaplót is tartalmazza.
- M2 – A legutóbbi teljes olvasás 9 oldalon: 427 forrásrekord, 60 `API engedélyezés=1`, 367 kizárt, 0 hibás. Az ismételt import sikeres, 60 rekord frissült; delta-vízjel, részleges kiesés utáni egyeztetés és import-admin még nyitott.
- M3 – A `unas-preview` fejlesztői mód a helyi HC termékeket mutatja. Az adatbázis-ellenőrzés mind a 60 aktív, valódi HC/UNAS-terméket publikáltnak és forrás szerint rendelhetőnek találta. A mostani UNAS készletfrissítés 60/60 ismert készletet adott; mind a 60 friss és pozitív. Productionben az előnézeti adapter tiltott; a szokásos `unas` adapter csak aktív, publikált, nem teszt terméket ad. Mobilos ellenőrzés a tulajdonos feladata.
- M4 – Elkészült az egész forintos szerveroldali termékösszegzés, a kosár adatmodellje és felülete, a 10 perces ajánlat tárolása és a naponta 03:15-kor futó lejárttakarítás. Házhoz 0 Ft; emeletdíj 19 900 Ft szállításonként, minden magyar címre és termékre. Az UNAS HUF alapdevizája igazolt.
- M4 API-próba – 6 helyettesített kosárútvonal-teszt, 4 helyettesített ajánlatútvonal-teszt, 2 takarítási egységteszt és 1 PostgreSQL-integrációs teszt sikeres. A HUF alapdeviza és az eltérő/hiányzó pénznemnél leálló import is tesztelt. A teljes tesztcsomag 12 fájl/44 teszttel sikeres. A lejárt ajánlat és kosár törlését, az aktív kosár megőrzését és a saját tesztadatok eltávolítását valódi PostgreSQL-en vizsgáltuk.
- M5 – Vendégrendelési űrlap, újraküldésbiztos rendelésrögzítés, szerveroldali ár- és kosárellenőrzés, változatlan termék/cím/árpillanatkép, rendeléskori dokumentumverziók, korlátozott vendégstátusz-oldal és kulccsal védett kezelői sor készült. Kézi készletmegerősítés vagy elutasítás szerepel az eseménynaplóban. Az UNAS-tükör nem foglal, a fizetés nem indul. Éles rendelésfogadás alapból kikapcsolt; jogi verziók és műveleti kulcs nélkül az éles beállítás hibával leáll. Teljes ellenőrzés: 21 tesztfájl/89 teszt, lint, típusellenőrzés és build sikeres.
- M6 – Fizetési kísérlet, eseménynapló és visszatérítés adatmodellje, adatbázis-korlátai és szolgáltatótól független állapotellenőrzése elkészült. 6 új állapotteszt fedi az ismételt/késői eseményt, fizetési adatok egyezését és visszatérítési összeghatárt. Szolgáltatói adapter, fizetési útvonal, átutalás és kezelői visszatérítés még nincs. Teljes ellenőrzés: 22 tesztfájl/95 teszt, lint, típusellenőrzés és production build sikeres; 12 migráció alkalmazva.
- M6 folytatás – SimplePay v2 start/status/query/refund, duplikációvédett IPN, vendég-visszatérési egyeztetés és FINANCE/OWNER visszatérítési felület/API készült. Teljes ellenőrzés: 37 tesztfájl/153 teszt, lint, típusellenőrzés és Prisma-sémaellenőrzés sikeres. A production build helyhiány, a SimplePay sandbox pedig fiók/hozzáférés hiányában nem futott; domain, kereskedői IPN-beállítás és átutalási adatok még szükségesek.
- M7 – Helyben kész: admin szerepkörök és fiókkezelés, minden rendelési állapot és szállítási auditelőzmény, teljesítés, fizetési/visszatérítési/rendelési/számla MailerSend outbox, webhook és hibafelület, Számlázz.hu XML adapter és bizonytalan eredménykezelés, jogosultságvédett/auditált PDF számlatár, üzemeltetési jegyzet. Ellenőrzés: 40 tesztfájl/171 teszt, lint, TypeScript, Prisma séma és 14 migrációs állapot sikeres; production build és kezelői smoke próba sikeres. Külső fiókok/adatok és szolgáltatói próba hiányában a mérföldkő teljes elfogadása nyitott; M7-en kívüli ADM01 tartalom-/szinkronkezelő továbbra is külön backlog-feladat.
