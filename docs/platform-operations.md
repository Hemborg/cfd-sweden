# Driftguide: CFD Sweden-plattformen

Detta är en kod- och testmiljöguide, inte ett bevis på att någon extern miljö
är konfigurerad. Plattformen är av som standard. Aktivera eller distribuera
inte genom att enbart fylla i hemligheter.

## Lokal, isolerad verifiering

Förutsätter Docker och Node 24.

```powershell
npm ci
npm run platform:start
npm run platform:migrate
npm run platform:seed
npm run test:integration
npm run test:restore
npm run platform:import
npm run build:platform
npm run test:platform:e2e
```

`platform:start` skapar en ignorerad `.env.platform.local` med lokala,
slumpade nycklar och startar Postgres, GoTrue, PostgREST, Kong och Mailpit på
loopback. `platform:migrate` vägrar ändrade redan tillämpade migrationer;
använd då endast för den syntetiska stacken:

```powershell
npm run platform:reset
npm run platform:migrate
npm run platform:seed
```

Mailpit finns lokalt på `http://127.0.0.1:54324`. Stoppa miljön med
`npm run platform:stop`. Den lokala `CFD_TEST_DATABASE_URL` får aldrig peka på
en delad eller skarp databas.

## Produktionsförberedelse och release

1. Ta en verifierad, krypterad PostgreSQL-backup och testa återläsning i en
   separat, tom testdatabas. `npm run test:restore` bevisar den lokala proceduren
   och vägrar externa databaser; använd leverantörens granskade restoreverktyg
   för en godkänd extern miljö, ändra inte skriptets säkerhetsspärrar.
2. Granska migrationerna i ordning och kör dem med en transaktionell,
   behörig migrationsprocess. Ändra aldrig en redan applicerad migration;
   skapa en ny korrigeringsmigration.
3. Konfigurera `CFD_SITE_URL` till den slutliga HTTPS-originen samt Supabase
   URL, anon key och server-only service role key. Bekräfta redirect-URL:er i
   Supabase Auth före release.
4. Sätt `CFD_PLATFORM_ENABLED=true` först efter RLS/Auth/integrationstester.
   Behåll `CFD_CONTACT_BACKEND=formsubmit` tills föreningen har godkänt ett
   separat formulärbyte. Databasformuläret kräver dessutom
   `CFD_CONTACT_BACKEND=database`.
5. Kör `npm run lint`, `npm run typecheck`, `npm test`,
   `npm run test:integration`, `npm run test:e2e` och
   `npm run test:content:e2e` i releaselanen.

Rollback av applikationskod görs till föregående kända deployment. Databasdata
återställs inte genom rollback: använd en testad backup/restore-plan och ny
framåtriktad migration. Stoppa mail-jobbet före återställning så samma köpost
inte processas mot fel databas.

## Jobb, e-post och övervakning

`POST /api/jobs/mail` kräver `Authorization: Bearer <CFD_JOB_SECRET>`. Någon
schemaläggare är inte provisionerad av denna kod. Driftansvarig måste skapa en
autentiserad HTTP-scheduler med dokumenterad frekvens, timeout och larm.
Endpointen uppdaterar `platform_settings.worker_heartbeat`; `/admin/system`
visar senaste signal och köstatus. Larma på utebliven heartbeat, `unknown`,
`failed`, växande `retry` eller lång köålder.

Kön är Postgres-baserad med lease, `SKIP LOCKED`, beständig nyckel och
Resend-idempotens. `unknown` betyder att leverantörsresultatet inte är säkert:
granska manuellt, återköa inte blint efter 24 timmar.

Lokal SMTP är begränsad till loopback och `@example.test`. Resend testläge
kräver `CFD_MAIL_MODE=test`, `CFD_RESEND_ENABLED=true` och en explicit
`CFD_RESEND_TEST_RECIPIENTS`-allowlist. Live kräver dessutom alla tre:
`CFD_EXTERNAL_SERVICES_APPROVED=true`, `CFD_RESEND_LIVE_APPROVED=true` och
`CFD_MAIL_LEGAL_APPROVED=true`, samt verifierad avsändardomän/SPF/DKIM/DMARC,
Resend-webhooksecret och en föreningsgodkänd rättslig grund.

Vid incident: stoppa scheduler, bevara kö/audit/webhookdata, bedöm om några
`unknown` kan ha levererats, rotera berörd hemlighet och återaktivera först efter
lokal återgivning av händelsekedjan. Logga aldrig tokenlänkar, service keys,
råa meddelanden eller personuppgifter i incidentkanalen.

## Gallring och kryptering

`/admin/system` låter en superadmin spara en beslutad `contactDays`-policy.
Arbetaren raderar endast kontaktärenden när retention är uttryckligen godkänd
och dagar är 1–3650. Samtyckesbevis gallras inte automatiskt. Juridisk grund,
biträdesavtal, retention av samtycke, exportansvar och access owners kräver
föreningsbeslut; dessa är inte tekniska standardvärden.

`CFD_MAIL_ENCRYPTION_KEY` är en 32-byte base64-nyckel och krypterar
återställningsbara tokenpayloads. Säkerhetskopiera den i samma kontrollerade
hemlighetsvalv som databasen. Nyckelrotation kräver en plan som kan dekryptera
äldre kö-/unsubscribe-payloads tills de löpt ut eller migrerats; byt inte
nyckeln oåterkalleligt medan sådana poster finns.

## Supabase: tom miljö till första administratör

Utförs endast efter separat beslut i ett valt Supabase-projekt. Skapa projekt
i beslutad region, dokumentera ägare/backupnivå och stäng av publik signup.
Aktivera TOTP. Sätt Site URL till exakt HTTPS-origin och begränsa redirectlistan
till `/auth/callback` och `/konto/losenord` på samma origin. Vår egen leveranskö
använder `generateLink` och `/auth/confirm`, inte Supabases automatiska e-postutskick.
Behåll båda nyckeltyperna i serverns hemlighetslager, service role aldrig i `NEXT_PUBLIC_*`.

Granska och tillämpa samtliga `supabase/migrations/*.sql` i namnordning med
databasägaren. Den första filen är den tidigare prototypens grundschema; senare
filer migrerar den till den gemensamma plattformen. Kör aldrig om redan tillämpade
migrationer. Kör RLS-negativtester mot syntetiska konton i en separat stagingmiljö.

Skapa första Auth-användaren i den behöriga Supabase-administrationen med en
identitetskontrollerad ägare och säker tillfällig inloggning. Kopiera användarens
UUID, kontrollera adressen i `auth.users`, och kör följande som databasägare.
Ersätt UUID på båda raderna; lägg inte lösenord i SQL eller Git:

```sql
begin;
update public.profiles set approved=true, suspended=false
where id='REPLACE_WITH_VERIFIED_AUTH_UUID'::uuid;
insert into public.user_roles(user_id,role)
values ('REPLACE_WITH_VERIFIED_AUTH_UUID'::uuid,'superadmin');
commit;
```

Profilen skapas av Auth-triggern. Kontrollera att exakt en profil uppdaterades
innan commit; avbryt annars. Logga in, öppna `/konto/sakerhet`, registrera TOTP
och verifiera AAL2. Bjud in en andra identitetskontrollerad ägare via admin och
tilldela superadmin där. Syntetiska testkonton och `.test-platform/accounts.json`
får aldrig importeras till produktion.

## Bevara filbaserat innehåll vid aktivering

`npm run platform:import` provar importen mot endast den lokala testdatabasen.
För granskning utan databasanslutning: sätt `CFD_CONTENT_IMPORT_OWNER` till en
verifierad redaktörs UUID och kör
`node --import tsx scripts/platform-import-content.mts --sql`.
SQL-utkastet hamnar i ignorerade `.test-platform/content-import.sql`. Det bevarar
slugs, texter, publiceringsstatus, datum och metadata och använder `ON CONFLICT
DO NOTHING`. Granska antal och innehåll innan en separat godkänd import. Kör
inte plattformen med tom databas om den filbaserade sajten har publicerat innehåll.

## Extern e-postverifiering

1. Välj avsändare och testmottagare som föreningen godkänt. Lägg Resendnyckel och
   webhooksecret i staginghemligheter, aldrig i tester eller PR.
2. Konfigurera verifierad domän enligt Resends aktuella DNS-instruktioner efter
   separat DNS-godkännande. Denna PR ändrar inga poster.
3. Registrera `/api/webhooks/resend` för `email.delivered`, `email.bounced` och
   `email.complained`. Testa signerade callbacks och omleverans av samma event.
4. Använd testläge och mottagarallowlist. Prova kontakt, DOI, återregistrering,
   avregistrering och samtliga transaktionella mallar. Bekräfta faktisk inkorg,
   provider-ID och webhookstatus. Lokal Mailpit är inte bevis på Resendleverans.
5. Skapa en skyddad POST-scheduler för `/api/jobs/mail`, exempelvis varje minut,
   med `CFD_JOB_SECRET`. Verifiera timeout, tillräcklig kapacitet och larm. Ingen
   leveransgaranti finns utan en aktiv scheduler.

## Stripe testläge och finansiella beslut

Sätt `CFD_STRIPE_ENABLED=true`, `CFD_STRIPE_MODE=test`, testnyckel,
testwebhooksecret och godkänd extern anslutning endast i staging. Registrera
`checkout.session.completed` och `charge.refunded` på `/api/webhooks/stripe`.
Endast kortbetalning används; fördröjda betalmetoder är inte aktiverade.
Skapa ett syntetiskt SEK-evenemang och prova leverantörens testkort:
godkänd betalning, nekad betalning, avbruten/utgången Checkout, dubbla webhooks,
full/delåterbetalning och incheckning. Kontrollera provider-ID, unik biljett och
beständig återbetalningsavstämning. Lokalt SDK-signerade händelser bevisar
webhookhanteringen men inte att hosted Checkout fungerar mot Stripe.

Priset anges i öre. Skatt räknas inte automatiskt ut: föreningen måste besluta
skattehantering och om det visade priset inkluderar eventuell skatt. Godkänn
betalningsmottagare, kontoverifiering, bokföring, kvitton, ånger-/avboknings- och
återbetalningsregler. Live kräver separat `CFD_STRIPE_MODE=live`, skarpa nycklar,
`CFD_STRIPE_LIVE_APPROVED=true` och `CFD_PAYMENT_POLICY_APPROVED=true`.

## Nätverksgränser, personuppgifter och larm

Publika inskick begränsas per adress, betrodd källa och globalt. På Vercel används
dess överskrivna `x-forwarded-for`; se [request headers](https://vercel.com/docs/headers/request-headers).
Fristående externa servrar nekas tills en betrodd proxyadapter implementerats.
Rå IP lagras inte; HMAC-räknare gallras efter två dagar av jobbet. Komplettera
med leverantörens bot-/brandväggsskydd vid verkliga missbruksförsök. Delade nät
delar kvot. Obegränsad motståndskraft mot distribuerade attacker utlovas inte.

Föreningen måste fastställa juridiskt namn och kontakt för personuppgiftsansvarig,
ändamål/rättslig grund per ärende, medlemskap och betalning, biträdesavtal och
eventuella tredjelandsöverföringar, gallring av ärenden/medlemskap/samtyckesbevis/
köer/audit, rättighetsbegäranden, incidentansvar och informationstexter.
`/integritet` beskriver tekniken men ersätter inte dessa beslut. Kontaktgallring
är av tills beslutad policy sparats; övrig PII raderas genom en dokumenterad,
behörig process. Lägg inte personuppgifter i loggverktyg eller publika ärenden.

Övervakningen ska larma på utebliven worker i fem minuter, växande köålder,
okända leveranser, permanenta fel, webhookfel, väntande återbetalningar och
misslyckad backup. `/admin/system` visar underlag; externa larm är inte skapade
av PR:n. Säkerhetskopiera databas, Auth och krypteringsnycklar, krypterat och
åtkomstbegränsat, och öva återställning regelbundet. Dokumentera RPO/RTO.

## Beroenden och releasechecklista

Använd Node 24 och `npm ci`. Uppdatera låsta SDK-versioner i en separat PR efter
release notes/licenskontroll och hela CI. Kör `npm audit`; använd inte
`npm audit fix --force` för att tysta varningar genom ramverksnedgradering.
Granska även måttliga transitiva sårbarheter mot faktisk exponeringsväg.

Release kräver oberoende kodgranskning, grön CI, stagingprov ovan, fullständig
dataskydds-/betalpolicy, backup/restoreprov och uttryckligt godkännande. Börja
med plattformen avstängd om tjänsterna inte verifierats. Återställ vid fel
föregående applikation och stoppa scheduler; byt inte tillbaka till ett tomt
filrepo under pågående verksamhet utan att säkra ny databaspublicerad data.
# Senare produktionsuppdrag

Det senaste uppdragets hostade driftprocess finns i [production-operations.md](production-operations.md).
Följ dess produktionsgrind och [verifieringsstatus](production-status.md). Nedanstående lokala testprocess behåller sina anslutningsspärrar.
