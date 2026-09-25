# Forrás API mezőtérkép

Állapot: **az UNAS nyilvános szerződése, az `ET160I` mintája és a teljes első katalógusimport ellenőrzött**.

Az UNAS API HTTPS/XML, minden hívás POST. A belépés a `login` végponton API-kulccsal történik; a válasz Bearer tokenje kerül a további kérések fejlécébe. A `getProduct` 1, 2 és 3 alapállapotú termékeket kér oldalanként 50 rekorddal. A legutóbbi teljes olvasás 9 oldal és 427 forrásrekord volt; a tulajdonos által kijelölt paraméter 60 terméket engedélyezett. A Premium keret 30, a VIP keret 90 többtermékes lekérés óránként; az import legfeljebb 30 oldalt kér egy futásban. [UNAS általános API-leírás](https://unas.hu/tudastar/api), [belépési kérés és válasz](https://unas.hu/tudastar/api/azonositas-login-keres), [getProduct kérés és korlátok](https://unas.hu/tudastar/api/termekek-getProduct-keres), [termékválasz mezői](https://unas.hu/tudastar/api/termekek-adatszerkezet)

| Belső mező | UNAS forrásmező | Átalakítás és fennmaradó kérdés |
|---|---|---|
| `sourceId` | `Product.Id` | UNAS-azonosító; élő adatból adatbázisba mentve. |
| `sku` | `Product.Sku` | Az első katalógusimport 60 egyedi elfogadott cikkszámot adott. |
| `brand` / importengedély | `Product.Params.Param.Id` + `Value` | A tulajdonos szerint az aktuális HC-termékek „API engedélyezés” paramétere `8773476`; csak az `1` értékű terméket fogadjuk el. Az `ET160I` élő válasz ezt a szabályt igazolja. A hiányzó vagy `0` érték kizárt. Az UNAS termékszerkezet nem dokumentál önálló `Brand` mezőt. |
| `name` | `Product.Name` | Magyar nevek az első élő importban megérkeztek. |
| `priceHuf` | `Product.Prices.Price.Gross` | Az `Actual=1` sor bruttó ára; ha hiányzik, a `normal` sor. A tulajdonos ezt jóváhagyta bolti bruttó árként, HUF-ban, árrés nélkül. Az UNAS-fiók tényleges pénznem-egyezését még ellenőrizni kell. |
| `category` | `Product.Categories.Category` | Az elsődleges, `Type=base` kategória neve. |
| `stock` | `Product.Stocks` / `getStock` | A termékleírás normál szinten mutat készletadatot, de a valós raktár-, változat- és közös készlet-szemantika nincs felmérve; az adapter most nem állít készletet. |
| `images` | `Product.Images.Image.Type` + `SefUrl` | HTTPS `futopadoutlet.hu` képeket fogadunk el. A legutóbbi import 391 URL-t mentett; egy minta URL HTTP 200 választ adott. Az `ET160I` 7 képpel rendelkezik. |
| `attributes` | `Product.Params.Param` | A nyilvános jellemzők mentése bekötve. Az engedélyező paraméter, készlet, szállítási és csatorna/kereskedői adatok ki vannak zárva a megjelenítésből. |

Az adapter csak szerveroldali API-kulcsot fogad, legfeljebb 5 MB-os, DTD/entitás nélküli XML-t elemez, kérésenként időkorlátot és futásonként 30 oldalas biztonsági korlátot alkalmaz. Csak olvasási végpontot hív. A hivatalos leírás szerint a `ContentParam` a visszaküldött mezőket korlátozza, nem szűri a terméktalálatokat; ezért ezt kihagytuk, majd minden terméknél helyben ellenőrizzük a 8773476-os paramétert és az `1` értéket. Az ismételt teljes import sikerült: 9 oldal, 427 rekord, 60 engedélyezett, 367 kizárt, 0 hibás.

Az idempotens, tranzakciós adatbázis-upsert, párhuzamos futási zár és teljes egyeztetés utáni inaktiválás teszttel ellenőrzött. A fejlesztői `unas-preview` az adatbázisban lévő, nem publikált termékeket mutatja, csak `APP_ENV=development` esetén. Delta-vízjel, megszakítás utáni egyeztetés, admin-jóváhagyás és a forrás árpénznemének üzleti ellenőrzése nyitott. A képek és 791 műszaki jellemző élő importtal bekerültek.
