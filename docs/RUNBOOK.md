# Fejlesztői üzemeltetési jegyzet

## Helyi indítás

1. Másold `.env.example` fájlt `.env` néven.
2. Indítsd a PostgreSQL-t: `docker compose up -d adatbazis`.
3. Telepítsd a rögzített függőségeket: `npm.cmd ci`.
4. Migrálj és tölts be fejlesztői adatot: `npm.cmd run db:migrate:deploy`, majd `npm.cmd run db:seed:test`.
5. A helyi, importált termékkatalógushoz állítsd a `.env` fájlban a `CATALOG_ADAPTER="unas-preview"` értéket, majd indítsd a webet `npm.cmd run dev` paranccsal.

Prisma-séma módosítása után futtasd az `npm.cmd exec prisma generate` parancsot, majd állítsd le és indítsd újra a fejlesztői szervert. A már futó Next.js folyamat a korábbi memóriabeli Prisma-klienst használhatja, és az új modellek hiányában futási hibát adhat.

## UNAS API-kulcs helyi tárolása

- A titok helye a projekt gyökerében lévő `.env` fájl. Ez a fájl Gitből ki van zárva; ne másold be forráskódba, `NEXT_PUBLIC_` kezdetű változóba, képernyőképbe vagy csevegésbe.
- A `UNAS_API_KEY=` sor egyenlőségjel után írj be idézőjelek közé egy értéket, például `UNAS_API_KEY="IDE_ILLESZD_BE_A_KULCSOT"`. A mintaszöveget cseréld le a saját kulcsodra.
- A `UNAS_HC_ALLOW_PARAM_ID=` azonosítja az aktuális HC-termékek „API engedélyezés” paraméterét. Az `ET160I` csak olvasó lekérdezésében ennek száma `8773476` volt; az `1` érték elfogadott, a hiányzó vagy `0` érték kizárt.
- Az azonosítót a helyi `.env` fájlban beállítottuk. Egy termék paramétereinek olvasó ellenőrzése: `npm.cmd run unas:parameterek -- ET160I`. Az első termékoldal száraz előnézete: `npm.cmd run unas:elozetes`.
- A kulcs és az azonosító helyben be van állítva. A teljes olvasó lekérés és első adatbázis-import sikeres. A helyi előnézet nem teszi közzé a terméket és nem teszi lehetővé a vásárlást.
- Új szinkron: indítsd a workert `npm.cmd run worker:dev` paranccsal, egy másik terminálban pedig `npm.cmd run unas:import:sorba`. Az import kizárólag az UNAS olvasó API-ját hívja és a saját PostgreSQL adatbázist írja.

## Első kezelő létrehozása

Az adatbázis-migráció után PowerShellben add meg a tulajdonos adatait titkos környezeti változóként, majd futtasd az egyszeri létrehozót:

```powershell
$env:ADMIN_INITIAL_OWNER_EMAIL = Read-Host "Tulajdonosi e-mail"
$titkosJelszo = Read-Host "Legalább 14 karakteres jelszó" -AsSecureString
$env:ADMIN_INITIAL_OWNER_PASSWORD = [System.Net.NetworkCredential]::new("", $titkosJelszo).Password
npm.cmd run admin:elso-tulajdonos
Remove-Item Env:ADMIN_INITIAL_OWNER_EMAIL
Remove-Item Env:ADMIN_INITIAL_OWNER_PASSWORD
Remove-Variable titkosJelszo
```

A létrehozó csak akkor működik, ha még nincs aktív OWNER fiók. A jelszót nem írja ki, és a jelszó értékét tartalmazó változót futás után töröld. A további kezelői fiókokat az OWNER által elérhető `POST /api/kezeles/felhasznalok` API hozza létre.

## Korlátok

- A `unas-preview` valódi forrásból beolvasott, de nem publikált adatokat mutat; a képek csak helyőrzők, a készlet nincs ellenőrizve, rendelés nem adható le.
- A `fixture` minta csak fejlesztői adat. A `unas` normál adapter kizárólag publikált rekordot ad vissza. A `unas-preview` productionben konfigurációs hibát okoz.
- A Docker Engine a gép újraindítása után külön elindítandó; ellenőrizd az `Engine running` állapotot, majd futtasd a `docker compose up -d adatbazis` parancsot. A jelenlegi gépen az adatbázis már fut.
- Az UNAS-ba írás továbbra is tiltott. A SimplePay, MailerSend és Számlázz.hu adapterek alapból kikapcsoltak; külső pénzügyi vagy e-mail művelet csak fiók, titok és jóváhagyott beállítás után tesztelhető.
- Ismeretlen fizetési vagy forrásműveleti eredményt éles rendszerben nem szabad vakon újraküldeni; állapotegyeztetés szükséges.

## Értesítések elakadása

- A háttérfeldolgozó percenként veszi fel a függő leveleket. A `FAILED` állapot biztos elutasítást jelent; kezelői felületen újraindítható, és a művelet naplózódik.
- A `UNKNOWN` állapot hálózati időtúllépés, ismeretlen válasz vagy a szolgáltatói elfogadás utáni adatbázishiba után keletkezik. Ne indítsd újra, mert az eredeti levél már elmehetett. Ellenőrizd a MailerSend üzenetnaplóját, majd egyeztesd az állapotot, mielőtt kézzel beavatkozol.
- A kezelői `/kezeles/ertesitesek` lista a függő, küldés alatt álló, bizonytalan, hibás és kézbesítési eseményeket mutatja. A kézbesítési visszajelzés csak a szolgáltató aláírt webhookjából fogadható el.

## Számlák

- A számlát előbb a jóváhagyott számlázási folyamat szerint kell kiállítani. A `/kezeles/szamlak` felület már kiállított számlaszámot és PDF-et tud privát tárba rögzíteni; csak kifizetett, visszaigazolt rendelést fogad el, és auditál.
- A számlához tartozó kezelői PDF csak FINANCE/OWNER munkamenettel érhető el. Vásárlói link HMAC-aláírt és hét napig érvényes; kiállítási vagy letöltési hibát ne próbálj jogosulatlanul megkerülni.
- Automatikus számlakiállítás csak a számlázási időpont, ÁFA-besorolás, eladói adatok, pénzforgalmi adatok és Számlázz.hu tesztfiók jóváhagyása után kapcsolható be.

## Éles adatbázis

Fejlesztői seedet productionben futtatni tilos. Éles migrációt kizárólag jóváhagyott kiadási folyamat és külön biztonsági mentés mellett szabad végrehajtani. Helyreállítási célérték nincs jóváhagyva.
