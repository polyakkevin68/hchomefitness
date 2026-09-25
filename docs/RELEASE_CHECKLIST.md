# Élesítés előtti ellenőrzőlista

Minden pont nyitott, amíg az ellenőrzés és bizonyíték nincs dokumentálva.

## M8 helyi eredmények

- Ellenőrizve: konfigurációs tesztek élesben tiltják a fejlesztői termékmintát, a hiányzó UNAS API-kulcsot/engedélyparamétert, a nem PostgreSQL adatbázis-URL-t és a nem UNAS katalógus mellett engedélyezett rendelést.
- Ellenőrizve: biztonsági HTTP-fejlécek egységtesztben és a futó helyi oldalon; minden API-válaszon gyorsítótár-tiltás.
- Ellenőrizve: az egészségvégpont adatbázis-lekérdezése; adatbázishibánál 503-at ad, nem jelez hamis sikert.
- Ellenőrizve: naplómező engedélylista és adatbázis-cím, Bearer token, kulcs/token/jelszó kitakarása.
- Ellenőrizve: `.env` kizárása a verziókezelésből és titokértékek hiánya a production build kliens- és szerverállományaiból.
- Ellenőrizve helyi próbán: PostgreSQL mentés és külön adatbázisba visszaállítás; 19 tábla és 14 alkalmazott migráció egyezett, az ideiglenes adatbázis és dump eltávolítása lefutott.
- Ellenőrizve: production build külön helyi folyamatban nem szolgálta ki a fixture/előnézeti katalógust; 200, adatbázis-állapot, HSTS és API-gyorsítótár-fejléc rendben.
- Kódban előkészítve: leíró meta szöveg, látható billentyűzetfókusz és csökkentett mozgás beállítás követése. Billentyűzetes böngészőpróba nyitott; a mobilpróbát a tulajdonos végzi el.
- Nyitott: végleges domain híján kanonikus URL, sitemap és robots beállítás.
- Ellenőrizve: 40 tesztfájl/171 teszt, lint, típusellenőrzés, Prisma-séma/14 migráció, production build, érvényes production konfiguráció és három production HTTP smoke kérés.
- Ellenőrizve helyi mérésen: 1000 termék, 50 párhuzamos kliens, 10 perc, 3000 sikeres katalógus API-kérés, 0% hiba, p95 213 ms, p99 273 ms. A külön főoldal-SSR-próba p95 1022 ms volt; nem keverendő össze az API-céllal.
- Ellenőrizve: GitHub Actions 36127543344 alatt PostgreSQL 17, migráció, lint, típusellenőrzés, 124 teszt, worker SIGTERM-leállás és production build sikeres.
- Nem ellenőrzött: staging/TLS, külső sandboxok, mobil és billentyűzetes próba, jogi/kereskedői adatok és production riasztás. Az éles konfiguráció helyi kapcsolattal érvényes.

## Üzlet és adat

- [ ] Eladó, számlakibocsátó, szállítási és szervizfelelős adatai jóváhagyva.
- [ ] Árképzés, ÁFA, kedvezmény és szállítási díj valós adatokkal ellenőrizve.
- [ ] Jogi tájékoztatók és adatmegőrzés jogi/üzemeltetői jóváhagyást kaptak.
- [ ] Minden publikált termék HC márkája és forrása igazolt.

## Technika

- [ ] UNAS/forrás teljes import, delta szinkron és készletkapcsolat tesztfiókkal ellenőrizve.
- [ ] Választott készletmód párhuzamos próbával igazolva.
- [ ] Vendégkosár, szerveroldali quote és idempotens rendelés teljes útja ellenőrizve.
- [ ] Fizetési sandbox callback, timeout, duplikáció és visszatérítés egyeztetése sikeres.
- [ ] Admin OIDC/MFA, szerepkör és objektumszintű hozzáférés ellenőrizve.
- [ ] Számlázás és e-mail tesztadapterrel, duplikációvédelemmel ellenőrizve.
- [x] Helyi PostgreSQL mentés-visszaállítása sikeres; 19 tábla/14 migráció egyezett.
- [x] 1000 termék/50 kliens/10 perces katalógus API-terhelési próba: p95 213 ms, 0% hiba.
- [x] Alkalmazásnapló érzékeny mezőinek szűrése és titokmaszkolása tesztelt.
- [x] Worker valódi SIGTERM-jelre történő leállása GitHub Actions alatt ellenőrizve.
- [ ] Production mentési cél és riasztás ellenőrizve.
- [x] Production fixture tiltása és napló-titokmaszkolás tesztelve; a helyi production-konfiguráció ellenőrzése sikeres.
- [ ] Mobil, billentyűzet és hozzáférhetőség ellenőrizve.
- [ ] Domain, TLS, staging védelem és sitemap/robots beállítva.
