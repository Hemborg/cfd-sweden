# Säker innehållsimport

Importverktyget förbereder Git-baserade artiklar och evenemang för en senare, manuellt godkänd körning. Det har ingen anslutningskod för staging eller produktion och kan därför inte skriva till externa tjänster.

## Nuvarande inventering

Vid införandet finns **0 artiklar** i `content/posts/` och **0 evenemang** i `content/site.ts`. Verktyget skapar inga exempelposter eller andra påhittade data.

```powershell
node --import tsx scripts/platform-import-content.mts
```

Kommandot visar antal, manifestets SHA-256 och eventuella varningar utan att skriva filer eller kontakta databas.

## Granska artefakter

En redaktörs profil-id behövs endast för SQL-artefakten, eftersom databasen kräver en `author_id`/`created_by`.

```powershell
$env:CFD_CONTENT_IMPORT_OWNER = "<verifierat editor-UUID>"
node --import tsx scripts/platform-import-content.mts --sql
```

Det skapar följande ignorerade, lokala granskningsartefakter:

- `.test-platform/content-import.manifest.json` — alla källfält, antal, varningar och SHA-256.
- `.test-platform/content-import.sql` — en transaktion som kan granskas och köras av en separat, uttryckligen godkänd runner.

Kontrollera att SQL-kommentaren och JSON-manifestet har samma SHA-256 innan en godkänd körning. Kör först den granskade SQL-filen mot staging, jämför resultatet och invänta ett nytt uttryckligt produktionsgodkännande. Den här ändringen kör aldrig staging eller produktion.

## Säkerhets- och idempotensregler

SQL-artefakten:

1. inventerar alla artiklar och evenemang från Git och bevarar rubrik, utdrag, Markdown, taggar, författare, SEO-data, status, datum samt tidszoner;
2. hittar varje befintlig rad med samma slug och jämför samtliga importerade fält;
3. listar konfliktantal och sluggar och avbryter hela transaktionen om en befintlig rad skiljer sig;
4. använder `ON CONFLICT DO NOTHING` för en exakt identisk rad, så en andra körning bara rapporterar `skipped`;
5. verifierar efter insättning att databasraderna både finns och fortfarande är identiska med manifestet;
6. redovisar `imported`, `skipped` och `conflicts` per innehållstyp i SQL-resultatet.

Det finns alltså ingen UPSERT och inga befintliga, avvikande rader skrivs över. En konflikt måste undersökas och lösas manuellt genom ett nytt manifest eller en separat, godkänd redaktionell ändring.

## Utkast och datum

`published: false` importeras som `status = 'draft'`, men källdatumet bevaras i `published_at` genom den framåtriktade migrationen `202611030040_article_scheduling.sql`. Migrationen släpper endast den gamla begränsningen som krävde `published_at = null` för utkast. Datumet gör inte utkastet publikt: den publika RLS-regeln kräver fortfarande både `status = 'published'` och ett passerat `published_at`.

Ett framtida evenemang behåller sin ISO-tidszon i `starts_at`. `registration_open` behålls från källan; importverktyget aktiverar inte betalning, anmälan eller externa API:er.

## Endast lokal testkörning

`npm run platform:import` får endast ansluta till exakt `127.0.0.1:54322/cfd_platform_test`. Annan värd, port eller databas stoppas före anslutning. Den kör inte utan den isolerade lokala teststacken och ska inte användas som en produktionsrunner.
