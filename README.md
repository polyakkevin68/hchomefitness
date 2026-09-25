# HC Home Fitness webáruház

Saját fejlesztésű, magyar nyelvű, HUF-alapú webshop. A termékkatalógus forrása a futopadoutlet.hu API-ja lesz. A külső kapcsolat addig kikapcsolva marad, amíg a hivatalos API-hozzáférés nincs beállítva és ellenőrizve.

## Fejlesztői indítás

Szükséges: Node.js 24 LTS, npm, Docker Compose és elérhető npm registry.

```powershell
Copy-Item .env.example .env
docker compose up -d adatbazis
npm.cmd ci
npm.cmd run db:migrate:deploy
npm.cmd run db:seed:test
npm.cmd run dev
```

Nyisd meg a `http://localhost:3000` címet. A kezdőoldalon fejlesztői mintaadatok jelennek meg, amelyek nem rendelhetők meg és nem valódi ajánlatok.

Az automatikus UNAS-frissítéshez külön terminálban indítsd el a feldolgozót:

```powershell
npm.cmd run worker:dev
```

Beállított `UNAS_API_KEY` és `UNAS_HC_ALLOW_PARAM_ID` mellett a termékek és árak óránként, a készlet minden órában külön lekéréssel frissül. A készletolvasás csak pillanatképet tárol; nem foglal az UNAS-ban. A workernek folyamatosan futnia kell, hogy az időzített frissítések elinduljanak.

## Ellenőrzés

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- --configLoader runner
npm.cmd run build
```

Az adatbázis-séma PostgreSQL 17-hez készült. A fejlesztői seed production környezetben tiltott. Éles konfigurációban a `CATALOG_ADAPTER=fixture` beállítást tilos használni. Az UNAS-adapter csak olvasó; rendelés, fizetés és készletírás nincs bekapcsolva.

## Állapot és korlátok

Az aktuális mérföldkő és bizonyítékai a [docs/PROGRESS.md](docs/PROGRESS.md) fájlban találhatók. Az üzleti döntéseket a [docs/DECISIONS.md](docs/DECISIONS.md), a P0/P1 fejlesztési listát a [docs/BACKLOG.md](docs/BACKLOG.md) tartalmazza. A helyi PostgreSQL fejlesztői adatbázis Compose-ból futtatható; a fizetési, számlázási és e-mail szolgáltatók még nincsenek beállítva.
