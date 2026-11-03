# Hostad staging: verifiering 2026-11-03

Detta är testmiljön för PR #5. Ingen merge, produktionsmigration, ändring av
produktionsvariabler, DNS eller produktionspublicering har genomförts.

## Verifierad miljö

- Supabase: `cfd-sweden-staging`, ref `feubwwglcqbwrurpvpwk`, Free, Stockholm
  (`eu-north-1`), i organisationen `ufotilluap` som ägs av det inloggade kontot.
- Preview: <https://cfd-sweden-git-codex-cfd-producti-2df08b-hemborg-5741s-projects.vercel.app>.
- Vercels 16 variabler omfattar endast `codex/cfd-production-foundation-20261103`
  i Preview. De två `NEXT_PUBLIC_SUPABASE_*`-värdena är publik Config;
  service-role, rate-limit-hemlighet och övriga servervärden är Secret.
- `CFD_PLATFORM_ENABLED=true`, `CFD_CONTACT_BACKEND=formsubmit`, samtliga
  valfria publikflaggor är false och mejltransport är disabled. Inga Stripe-
  eller Resend-nycklar har lagts till.
- Supabase Site URL är exakt branchens Preview-adress. Publik signup och anonym
  inloggning är avstängda. TOTP är aktiverat; AAL1-sessioner med MFA löper ut
  efter 15 minuter utan verifiering. Inga wildcard-redirects har lagts till.
- `vbl` pausades först efter Karls uttryckliga beslut. Datan bevarades. Övriga
  befintliga projekt har inte ändrats. Nuvarande gratisplatser räcker inte för
  ytterligare ett samtidigt aktivt CFD-produktionsprojekt.

## Databas och verkliga tester

Förkontroll: 0 publika tabeller, 0 Auth-användare, 0 Storage-objekt. CLI 3.0.0
torrkörde exakt 17 migrationer utan seed, varefter hela kedjan installerades.
Lokal och hostad migrationshistorik matchar. Resultat: 31 tabeller med RLS,
45 policyer och 17 migrationsposter.

`scripts/hosted-staging-check.mts` är separat från lokala integrationstester.
Den kräver explicit testflagga, exakt stagingref/URL och avstängda valfria
funktioner. Den har verifierat följande mot riktig Supabase:

- Bekräftade syntetiska `@example.test`-konton utan mejl eller inbjudningsflöde.
- Verklig lösenordsinloggning och TOTP-enrollment/challenge till AAL2.
- Nekad redaktörsskrivning före MFA; tillåten efter MFA.
- Skapa, redigera, avpublicera och publicera artiklar; utkast och framtida
  publiceringar förblir osynliga anonymt.
- Redaktör och administratör får hantera eventinnehåll enligt migration 140.
  Medlem får inte skriva artiklar/event; kontrollen verifierar både ändrade
  rader och att värdet i databasen faktiskt förblir oförändrat.
- Anonym nekas privata profiler; medlem får läsa sin egen profil, inte andras.

Testkontonas lösenord/MFA-material finns enbart i ignorerade lokala testfiler.
De får aldrig användas i produktion. Två körningar skapade totalt sex syntetiska
konton. Dessa och testinnehåll finns kvar enbart i staging för fortsatt granskning.

## Webbläsare och byggkontroll

En verklig Chrome-session mot Vercel Preview har verifierat redaktörsinloggning,
MFA-grind, privat noindex-förhandsgranskning, skapande av utkast, publicering,
redigering och avpublicering. Publicering syntes direkt utan ny deployment;
avpublicerad artikel gav 404. Den syntetiska webbläsarartikeln lämnades som utkast.

Kontrollen upptäckte att React kunde återställa ett formulärs statusfält till
dess tidigare standardvärde efter sparning. Redigeringsformuläret får därför en
ny nyckel för varje sparad `updatedAt`, och administrationssidan revalideras.
Ett CI-regressionstest kontrollerar publicera, redigera igen utan statusval och
avpublicera, inklusive vilket värde statusfältet visar efter varje sparning.

`playwright.hosted.config.ts` testar den byggda Next-applikationen på lokal port
3404 med den riktiga stagingdatabasen. Det är separat från den manuella
Vercel-kontrollen. Två tester har passerat:

- 13 publika routes i 390 och 1440 px utan horisontellt överflöde.
- FormSubmit till befintlig Proton-adress, obligatorisk e-post, axe utan
  överträdelser på kontakt-/intresseformulären, dolda utkast/framtida artiklar,
  event utan registreringsformulär, stängda API:er och korrekt RSS/sitemap.

Webbläsarnätverket i dessa automatiserade tester begränsas till loopback;
Next-servern läser Supabase. Inga riktiga formulär skickas och Stripe/Resend
kontaktas inte. Produktionsbygge med staginganslutning har passerat.

## Import

Git innehåller fortfarande 0 artiklar och 0 evenemang att migrera. Verklig import
är därför 0/0, inte en import av de syntetiska testposterna. Filbaserat material
och statiska sidtexter bevaras. Material utanför Git behöver lämnas och granskas
innan det kan ingå i en produktionsimport. Den idempotenta importgeneratorns
bevarande- och konflikttester finns kvar.

## Backup och provad återställning

CLI-exporter togs före installation och efter de syntetiska databastesterna.
Schema, roller, data och migrationshistorik hanteras utanför versionshanteringen.
Krypterade kopior skyddas med Windows DPAPI för operatörens användare under
`%LOCALAPPDATA%/CFD-Sweden/staging-backups/feubwwglcqbwrurpvpwk/`.
Dekrypteringens byteidentitet verifieras. DPAPI är maskin-/användarbundet och
ersätter inte en organisatoriskt beslutad, portabel katastrofbackup.

`scripts/hosted-application-restore.mjs` återställer enbart applikationsdata i
en ny, isolerad lokal PostgreSQL 17-databas. Den vägrar fjärrmål och befintlig
måldatabas. Verifierat: 31 tabeller, 31 RLS-tabeller, 45 policyer, 17 migrationer,
korrekta radantal, två publikt läsbara testartiklar, dolda utkast/framtida poster
och nekad anonym åtkomst till kontakter/profiler. Den egna testdatabasen tas bort
efter övningen; källdatabasen ändras inte.

**Begränsning:** övningen använder sex syntetiska Auth-UUID-platshållare för
foreign keys. Den återställer inte Auth-lösenord, MFA, sessioner, Storage-objekt
eller Supabases krypteringsmaterial. Dataexporten innehåller Auth/Storage-data,
men det bevisar inte en fungerande fullständig Auth-återställning. En separat
återställningsövning med leverantörens stödda process och rätt krypteringsnycklar
återstår före ett påstående om komplett katastrofåterställning.

## Kvar före produktion

1. Besluta kapacitet för en separat produktionsdatabas; ingen betald plan har
   beställts. Pausad staging och aktiv produktion skulle ge separata databaser
   men inte två samtidigt tillgängliga miljöer.
2. Verifiera hela Auth-/MFA-återställningen, samt en portabel och ägarstyrd backup.
   Testad applikationsåterställning är inte tillräcklig för detta krav.
3. Utse verklig superadmin och ansvar för personuppgifter, gallring, leverantörer,
   redaktion och incidenter. Testidentiteter får inte bli produktionskonton.
4. Ta fram den konkreta produktionsplanen när dessa återstående grindar är lösta,
   och invänta Karls uttryckliga godkännande före produktionsändringar.

FormSubmit fungerar fortsatt som befintligt kontaktflöde. Automatisk e-post,
betalningar, eventanmälningar, öppen medlemsregistrering och nyhetsbrev ska
fortsätta vara avstängda även vid den första databaslanseringen.
