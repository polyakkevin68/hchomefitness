# Műszaki felépítés

## Alap

Egy Next.js App Router és TypeScript alkalmazás szolgálja ki a felületet és a saját API-t. PostgreSQL tárolja a katalógust és a helyi rendelési adatokat. Prisma végzi a típusos adatelérést és a sémamigrációt. A háttérfeladatok PostgreSQL-alapú pg-boss sorban futnak.

## Modulhatárok

- `src/catalog`: belső termékszerződés és cserélhető katalógus-adapter.
- `src/worker`: tartós háttérfeladat-feldolgozó.
- `prisma`: adatmodell, migrációk és kizárólag fejlesztői seed.
- Külső API-kat a böngésző nem hív közvetlenül. Titok csak szerverfolyamatban tárolható.

Az UNAS olvasóadapter és helyi adatbázis-import működik. A kezelői belépés, szerepkör-ellenőrzés és helyi rendelésteljesítés elkészült. Fizetési, számlázási és e-mail szolgáltató még nincs bekötve. Az UNAS-ba író API-művelet nincs engedélyezve.

## Készlet és pénzügyi biztonság

A forráskészlet olvasása önmagában nem foglal készletet. Az alapműködés kézi készletmegerősítés. A rendelés, ár, szállítás, fizetés és admin-jogosultság szerveroldali ellenőrzést igényel. A jelenlegi váz még nem tesz lehetővé vásárlást vagy pénzmozgást.

## Fejlesztői minták

A fixture-adapter csak nem production környezetben, `CATALOG_ADAPTER=fixture` beállítással ad vissza adatokat. A seed 12 jelölt HC mintarekordot hoz létre nem publikált státuszban. Ezek nem valós importált termékek, nem tartalmaznak hiteles termékfotót és nem rendelhetők meg.

A `CATALOG_ADAPTER=unas-preview` kizárólag fejlesztésben jeleníti meg az aktív, nem publikált UNAS-termékeket a prototípushoz; vásárlás nem lehetséges. Productionben a mód tiltott. A normál `unas` adapter aktív, közzétett, nem próba HC termékeket olvas. Az import megőrzi a biztonságos forrásképeket és a szűrt műszaki jellemzőket.
