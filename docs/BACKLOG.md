# Teendők és kiadási terv

Az elsődleges követelményjegyzék: `HC_Home_Fitness_GPT6_Luna_fejlesztesi_terv.md`.

## P0 – első kiadás

- [ ] CAT01 – HC termékkatalógus és kategóriák; csak ellenőrzött HC termék publikálható.
- [ ] CAT02 – keresés, szűrés, rendezés és lapozás megosztható URL-lel.
- [ ] CAT03 – termékoldal, képek, ár, készlet, műszaki adatok, dokumentumok.
- [ ] SYN01 – ismételhető, naplózott import és delta szinkron; HC márkavédelem.
- [x] CART01 – adatbázis-kosár, munkamenetsüti, felületi kosár, mennyiség-/törlésmódosítás, szerveroldali összegzés, 10 perces adatbázis-ajánlat és napi lejárttakarítás elkészült. Helyettesített és valódi PostgreSQL-útvonalteszt sikeres.
- [x] ORD01 – vendég rendelési igény, cím- és rendelés-pillanatképek, idempotens újraküldés és korlátozott rendelésnézet elkészült. Fizetési meghívó az M6-ban készül el.
- [ ] PAY01 – egy bankkártyás szolgáltató teszt- és éles adapterrel; csak hitelesített fizetési állapot.
- [ ] PAY02 – átutalás és engedélyezett offline fizetés.
- [x] INV01 – kézi készletmegerősítés és elutasítás naplózott; közös készlet nem foglalódik automatikusan és a kezelői igazolás kötelező.
- [ ] SHIP01 – valós díjak, nagygépszállítás és átvétel.
- [ ] SVC01 – jóváhagyott összeszerelési és garanciabővítési lehetőségek.
- [ ] ADM01 – védett admin, rendeléskezelés, publikálás, tartalom, szinkron és szerepkörök. Elkészült a védett belépés, munkamenet, szerepkör-alapú rendelési hozzáférés és OWNER által auditált kezelőifiók-létrehozó API; adminfelhasználó-kezelő felület, tartalom- és szinkronkezelés nyitott.
- [ ] MAIL01 – tranzakciós levelek és hibakezelés.
- [ ] BILL01 – egy kijelölt számlázó, idempotencia és bizonytalan eredmény egyeztetése.
- [ ] SEO01 – sitemap, canonical, meta és strukturált adatok.
- [ ] OPS01 – naplózás, riasztás, mentés és visszaállítási próba.
- [ ] LEG01 – jóváhagyott jogi tájékoztatók és hozzájárulások.

## P1 – későbbi kiadás

- [ ] CMP01 – 2–4 termék összehasonlítása.
- [ ] ACC01 – vásárlói fiók, rendeléstörténet és címjegyzék.
- [ ] PRM01 – kuponok, kiegészítőajánlók, akciós kategória.
- [ ] NEWS01 – megerősíthető hírlevél-feliratkozás és leiratkozás.
- [ ] FEED01 – Google Merchant és Árukereső feed.
- [ ] FIN01 – áruhitel tényleges szolgáltatói kapcsolat alapján.
- [ ] FUL01 – forrásrendelés-továbbítás és állapot-visszaolvasás, ha jóváhagyott.
- [ ] REV01 – moderált, valós vásárlói értékelések.
- [ ] CMS01 – szerkeszthető márka- és tájékoztatóoldalak.

## Mérföldkövek

- [x] M0 – környezet, specifikáció, döntések és backlog.
- [x] M1 – alkalmazásváz, PostgreSQL/Prisma, worker, seed, auth alap és CI.
- [x] M2 – UNAS olvasóadapter és megismételt teljes import. (Legutóbb 9 oldal/427 forrásrekord; 60 engedélyezett termék helyi adatbázisba importálva; mind publikálatlan.)
- [x] M3 – kattintható mobil katalógus és arculati alapok; finomhangolás nyitott.
- [x] M4 – kosár, ár és szállítás.
- [x] M5 – rendelések és készlet: idempotens vendégigény, pillanatképek, korlátozott vendéghozzáférés és műveleti készletdöntés.
- [ ] M6 – fizetés és visszatérítés.
- [ ] M7 – admin, teljesítés, számla és értesítések.
- [ ] M8 – élesítés előtti ellenőrzés. Helyben sikeres 32/124 teszt, lint, típusellenőrzés, séma/migráció-ellenőrzés, build, production smoke, napló-titokmaszkolás, mentés-visszaállítás és a 1000 termék/50 kliens/10 perces katalógus API-próba (p95 213 ms, 0% hiba). A távoli CI egyelőre nem indult: az első feltöltést a GitHub „Repository not found” hibával utasította el; a tárhelycím vagy a hozzáférés ellenőrzendő. A későbbre halasztott domain/jogi adatok, böngészős hozzáférhetőség, worker valódi jelre történő leállása és M6/M7 külső szolgáltatói kapui is nyitottak.
- [ ] M9 – P1 funkciók.
- [ ] M10 – átadás és éles működés ellenőrzése.

## Blokkoló külső feltételek

- [x] M0-B1 – npm registry elérése és lockfile létrehozása.
- [x] M1-B1 – Docker Engine elindult, a projekt PostgreSQL adatbázisa egészséges.
- [x] M2-B1 – hivatalos dokumentáció, szerveroldali kulcs és HC-paraméter, `ET160I` és teljes katalógus csak olvasó kéréssel ellenőrizve; első adatbázis-import sikeres.
- [ ] M3-B1 – HC márkaazonosító, jóváhagyott képek és márkairányelvek.
- [x] M4-B1 – Az UNAS alapdevizáját a csak olvasó `getSetting` hívás `HUF` kóddal igazolta; az import pénznemeltérésnél megáll. A szállítás díja és köre is megerősítve: minden magyar címre és termékre; házhoz 0 Ft, emeletre 19 900 Ft szállításonként.
- [x] M5-B1 – készletmodell és teljesítési döntés. Az UNAS csak olvasott készlete időbélyegzett tükör; a rendelés kezelői készletdöntésig vár, automatikus foglalás és fizetés nélkül. A 2 órás ár- és készletfrissességi határ, az idempotens vendégrendelés és a kézi megerősítés tesztelve.
- [ ] M6-B1 – a kiválasztott SimplePay kereskedői fiókja, szerződése, sandbox-hozzáférése és titkos kulcsa; a belső fizetési alapmodellek már elkészültek.
- [ ] M7-B1 – kereskedői adatok és hozzáférések beállítása a kiválasztott Számlázz.hu és MailerSend szolgáltatókhoz; számlázási időzítés és számlaküldés eldöntése; szerepkörök részben megvalósítva.

## Aktuális megvalósítási részletek

- M1 – PostgreSQL egészséges; a seed kétszeri futtatása után 12 nem publikált fejlesztői rekord maradt; a worker adatbázis-kapcsolata elindult. A tíz migráció a rendelési pillanatképet, dokumentumverziókat és eseménynaplót is tartalmazza.
- M2 – A legutóbbi teljes olvasás 9 oldalon: 427 forrásrekord, 60 `API engedélyezés=1`, 367 kizárt, 0 hibás. Az ismételt import sikeres, 60 rekord frissült; delta-vízjel, részleges kiesés utáni egyeztetés és import-admin még nyitott.
- M3 – A `unas-preview` fejlesztői mód 60, még nem publikált HC terméket mutat helyben. Productionben ez az adapter tiltott; szokásos `unas` adapter kizárólag aktív, publikált, nem próba terméket ad. A felület valós képeket és műszaki jellemzőket jelenít meg: 391 kép-URL és 791 jellemző; `ET160I` keresése és adatlapja ellenőrizve. Mobilos ellenőrzés és admin-jóváhagyás még nyitott.
- M4 – Elkészült az egész forintos szerveroldali termékösszegzés, a kosár adatmodellje és felülete, a 10 perces ajánlat tárolása és a naponta 03:15-kor futó lejárttakarítás. Házhoz 0 Ft; emeletdíj 19 900 Ft szállításonként, minden magyar címre és termékre. Az UNAS HUF alapdevizája igazolt.
- M4 API-próba – 6 helyettesített kosárútvonal-teszt, 4 helyettesített ajánlatútvonal-teszt, 2 takarítási egységteszt és 1 PostgreSQL-integrációs teszt sikeres. A HUF alapdeviza és az eltérő/hiányzó pénznemnél leálló import is tesztelt. A teljes tesztcsomag 12 fájl/44 teszttel sikeres. A lejárt ajánlat és kosár törlését, az aktív kosár megőrzését és a saját tesztadatok eltávolítását valódi PostgreSQL-en vizsgáltuk.
- M5 – Vendégrendelési űrlap, újraküldésbiztos rendelésrögzítés, szerveroldali ár- és kosárellenőrzés, változatlan termék/cím/árpillanatkép, rendeléskori dokumentumverziók, korlátozott vendégstátusz-oldal és kulccsal védett kezelői sor készült. Kézi készletmegerősítés vagy elutasítás szerepel az eseménynaplóban. Az UNAS-tükör nem foglal, a fizetés nem indul. Éles rendelésfogadás alapból kikapcsolt; jogi verziók és műveleti kulcs nélkül az éles beállítás hibával leáll. Teljes ellenőrzés: 21 tesztfájl/89 teszt, lint, típusellenőrzés és build sikeres.
- M6 – Fizetési kísérlet, eseménynapló és visszatérítés adatmodellje, adatbázis-korlátai és szolgáltatótól független állapotellenőrzése elkészült. 6 új állapotteszt fedi az ismételt/késői eseményt, fizetési adatok egyezését és visszatérítési összeghatárt. Szolgáltatói adapter, fizetési útvonal, átutalás és kezelői visszatérítés még nincs. Teljes ellenőrzés: 22 tesztfájl/95 teszt, lint, típusellenőrzés és production build sikeres; 12 migráció alkalmazva.
- M7 – Védett adminbelépés, visszavonható sütimunkamenet, próbálkozásnapló és szerepkör-ellenőrzött rendelési API készült. OWNER által védett kezelőifiók API, auditnaplózott helyi szállítási állapotgép, deduplikált feladási értesítési sor és adatmodellek kerültek be. A Számlázz.hu és a MailerSend kiválasztva, de hozzáférésük, feldolgozóik, admin-felhasználói felület és privát számlatár még nincs; a mérföldkő nyitott.
