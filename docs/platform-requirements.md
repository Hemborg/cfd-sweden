# Kravmatris och verifieringsbevis

Beställning: färdigställ föreningsplattform A–I, 2026-11-03. Bas är senaste
PR #3, `9c40781450c2e7802afae75c2ec8949e8df968bf`. Leveransen ligger på
`codex/cfd-association-platform-20261103` och lämnas i en separat PR mot main.
Ingen produktionsmiljö, DNS, produktionsdatabas eller extern tjänst har aktiverats.

Releaseuppföljning för den publika sajten: se [releasechecklistan](public-release-checklist.md).
Plattformen avstängd är nu uttryckligen verifierad med 47 enhetstester,
13 publika webbläsartester och 4 innehålls-/releaseprov. Det inkluderar ett öppet
filbaserat evenemang utan anmälningsformulär och direkta inaktiva kontolänkar.
Produktionsbygget passerar utan Supabase-, Resend- eller Stripe-konfiguration;
den lokala tjänstestacken var stoppad under dessa prov. Den fullständiga CI-körningen
för aktuell commit länkas från PR #4. De externa grindarna för själva
föreningsplattformen nedan gäller fortsatt.

**Definitioner:** Implementerad avser fungerande kod, migration och användarflöde.
Lokalt verifierad avser riktig PostgreSQL, Auth/PostgREST, SMTP/Mailpit eller
webbläsare. SDK-signerade webhooktester kontaktar inte Stripe/Resend. Ingen rad
nedan betyder produktionsverifierad. “Nej” under aktivering betyder att de uttryckliga
driftsgrindarna måste passeras innan funktionen får slås på i skarp miljö.

## A–I

| Område | Implementerad | Testad och bevis | Extern tjänst verifierad | Redo för skarp aktivering | Återstående grind |
| --- | --- | --- | --- | --- | --- |
| A Kontaktärenden | Ja | `communications`, `foundation`, `platform-flows`: lagring, idempotens, SMTP, handläggning, åtkomst | Nej; lokal SMTP/Postgres | Nej | G1–G3, separat godkännande av FormSubmit-byte |
| B Nyhetsbrev | Ja | `communications`, `platform-flows`, `platform-activities`: DOI, engångstoken, återkallelse, epok, kö, kampanj och webhook | Nej; lokal SMTP och signerade fixtures | Nej | G1–G3, mottagar-/avsändarprov |
| C Automatiska mejl | Ja | Verklig SMTP, krypterad kö, leases, retries, webhook och kontoinbjudan/återställning | Nej; ingen Resend-inkorg verifierad | Nej | G2–G3, scheduler och larm |
| D Evenemang/biljetter | Ja | `editorial-events`, `event-export`, `payment-replay`, `stripe-webhook`, `platform-activities` | Nej; Stripe SDK-signatur verifierad lokalt | Nej | G1–G4; hosted Checkout/testkort återstår |
| E Auth och roller | Ja | `foundation`, `community`, `platform-accounts`, `platform-flows`: riktig Auth, TOTP/AAL2, negativa RLS-prov | Nej; lokala officiella Auth/PostgREST-containrar | Nej | G1, första skarpa ägare/återställningsprov |
| F Grupper/kampanjer | Ja | `community`, `platform-community`: privat/publik projektion, riktiga JWT/RPC, tilldelning | Nej; samma lokala databas/Auth | Nej | G1, utsedda ansvariga och medlemsdata |
| G Kanban/projekt | Ja | `community`, enhetstester, `platform-community`: beständig flytt, gruppgränser, kommentarer/logg | Nej; samma lokala databas/Auth | Nej | G1, ansvariga/gruppstruktur |
| H Kommentarer | Ja | `community`, `platform-community`: pending, moderation, publicerad artikel, privata profiler | Nej; samma lokala databas/Auth | Nej | G1, utsedda moderatorer |
| I Admin/innehåll | Ja | `platform-flows`, `platform-activities`, baseline/content-tests: publicering, RSS, sitemap, metadata, mobil/desktop | Nej; ingen extern miljö aktiverad | Nej | G1, innehållsimport och redaktionellt godkännande |

## Detaljerad täckning

| Beställd del | Implementation och verifieringsyta |
| --- | --- |
| A Servervalidering, spam, beständig rate limit, idempotens | Zod/origin/body-gräns, honeypot, HMAC-källa/adress/global kvot; SQL-räknare med gallring. `platform-security`, `foundation`, `communications` |
| A Ärendestatus, ansvarig, sök/filter/sort/export/radering | `/admin/arenden`, RLS, CSV-formelskydd och paginering, revisionsspår; kontaktflöde i `platform-flows` |
| A Notifiering och avsändarbekräftelse | Transaktionell outbox, två separata mallar; `communications` med riktig SMTP |
| A Ingen automatisk prenumeration/konto, reserv | Separata kontakt-/samtyckes-/Auth-modeller. `CFD_CONTACT_BACKEND=formsubmit` är default och spärrar nya kontakt-API:t |
| B Frivilligt samtycke, DOI, TTL/engångstoken, avregistrering/återregistrering/historik | `/nyhetsbrev` och bekräftelse/avregistreringssidor. Samtyckesepoker låser mottagarsnapshot och gammal leverans; SQL- och browserregressioner |
| B Admin prenumeranter, utkast, preview, schemaläggning, säkra massutskick | `/admin/nyhetsbrev`; sandboxad HTML-preview, UTC, batchgräns, beständig mottagarsnapshot, stopp av köad kampanj |
| B/C Leveransstatus, studs, fel/retries/dubbelutskick | Signerad Resendwebhook, leveransprojektion, provider-ID, unika nycklar, 24h-säker återhämtning, okänt SMTP-utfall kräver avstämning |
| C Alla beställda mallar | Kontakt, prenumeration, portalinbjudan, recovery, välkomstbrev, eventbekräftelse/biljett/väntelista/avbokning/praktisk info, gruppinbjudan och uppgiftstilldelning |
| D Skapa/redigera/publicera/datum/plats/arrangör/pris/kapacitet/stängning | `/admin/evenemang`, Zod, MFA/RLS. Redaktör får innehållsåtkomst utan deltagar-/betalningsdata |
| D Gratisanmälan, deltagare, export, avbokning/väntelista/praktisk info | E-postägande bekräftas före platsbokning; eventlås för kapacitet och köordning. CSV sidvis över PostgREST-gräns; hela utskicksurvalet valideras atomärt |
| D Checkout, SEK, signatur, ticket-ID, incheckning, återbetalningar | Officiell Stripe SDK, oföränderliga försök/pris, unik biljett, serverincheckning och monotona återbetalningskvittotillstånd; samtidighets- och replaytester |
| D Nekad/avbruten/utgången betalning | Ingen biljett från success-URL; timeout släpper reservation, sen betalning blir avstämningsärende. Hosted providerprov kvar enligt G4 |
| E Sex roller, flera uppdrag, session, invite/recovery, MFA | Gemensam Auth, cookieuppfräschning, verifierat getUser, TOTP och RLS; aktuell lösenordsverifiering eller tidsbegränsat engångsbevis för lösenordsbyte |
| E Obehörig läsning/ändring/radering | Negativa RLS-prov för medlem, annan grupp, redaktör, anonym och AAL1-admin; sista aktiva superadmin skyddas |
| F Grupper, ledare, deltagare, syfte, offentliga uppdateringar, kampanjmål/status/ägare | `/admin/grupper`, `/admin/kampanjer`; publika `/grupper` läser särskild projektion. Privata projekt och uppgifter följer grupp/campaign-medlemskap |
| G Projekt, uppgifter, ansvarig, UTC-datum, prioritet/status, kommentarer/logg/filter | `/admin/projekt` och `/medlem`, fem kolumner, formulär/knappar och tangentbord; beständig serverkontroll och RLS. Drag-and-drop är valfritt och har inte införts |
| H Formulär/validering/spam/säker text/modereringskö/godkänn/avvisa/dölj/radera/anmäl | `ArticleComments`, `/admin/kommentarer`, text-escaping och rate limits; ingen privat e-post i publik projektion |
| I Samlad admin, systemfel/drift, Git-copy, dynamiskt innehåll | Rollstyrd meny till samtliga moduler, `/admin/system` för kö/audit/heartbeat. `content/site.ts` för statisk copy. Databasrepository för löpande innehåll utan Git-publicering |

## Testlager

Lokal slutkontroll 2026-11-03: lint och TypeScript passerar; **45/45
enhetstester**, **35/35 integrationstester**, **13/13 publika regressioner**,
**2/2 publiceringsfixturetester** och **11/11 plattformswebbläsartester** passerar.
Produktionsbygge passerar både med plattform av och med isolerad plattform aktiv.
Alla elva adminvyer har även kontrollerats med superadmin på 390/1440 px (axe,
overflow och rätt faktisk URL), så en obehörighetsredirect inte räknas som godkänt
sidtest. Mobil-/desktopskärmbilder har granskats lokalt.

Samtliga 16 migrationsfiler har körts från tom databas. Återställningsprovet
återskapade åtta syntetiska profiler, 31 RLS-tabeller och 45 policyer i en separat
tom databas. Anonym läsning av kontaktärenden nekades efter restore.
Stagingkontroll av Git-index hittade inga förbjudna miljöfiler eller vanliga
credential-/privatnyckelmönster. Kontrollen är inte ett formellt säkerhetsintyg.

| Kommando | Vad det faktiskt verifierar |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Kodregler och typkontroll |
| `npm test` | Validering, domänregler, säkerhetsgränser, befintliga innehålls- och prototypregressioner |
| `npm run platform:reset`, `platform:migrate`, `platform:seed` | Migration från tom lokal databas och åtta syntetiska Auth-konton |
| `npm run test:integration` | Verklig PostgreSQL/RLS/transaktion/samtidighet, faktisk Auth/TOTP/JWT/PostgREST, SMTP/Mailpit och rå signerad webhookhantering |
| `npm run test:restore` | `pg_dump`/`pg_restore` till separat tom lokal databas, profil-/policyantal och nekad anonym ärendeåtkomst |
| `npm run build`, `npm run test:e2e`, `npm run test:content:e2e` | Befintlig publik sajt med plattform av, publicerade fil-fixtures och SEO |
| `npm run build:platform`, `npm run test:platform:e2e` | Aktiverad lokal plattform i produktionsbygge, riktiga användarflöden, axe och overflow vid 390/1440 px |
| `npm audit --audit-level=high` | Beroendeinventering; inte bevis att alla måttliga fynd är åtgärdade |

Det lokala testlagret vägrar externa databaser. Mailpit accepterar endast
syntetiska `@example.test`-mottagare. Varken riktiga betalningar eller mejl till
föreningsmedlemmar ingår. GitHub Actions kör samma lager med läsbehörighet och
utan deploysteg/hemligheter; faktisk grön körning anges i PR:n.

## Externa grindar före skarp drift

- **G1:** Oberoende granskning och grön CI; godkänt Supabase-projekt/region, backup,
  Auth-redirects, migrations- och stagingprov, första superadmins/MFA, innehållsimport
  och separat publiceringsbeslut.
- **G2:** Personuppgiftsansvarig, ändamål/rättsliga grunder, biträdesavtal/överföringar,
  gallring, rättighetsbegäranden, behörighetsägare, incidentansvar och korrekt
  integritetsinformation. Inga juridiska godkännanden har hittats på.
- **G3:** Resendkonto, verifierad avsändare/DNS efter särskilt beslut, allowlistat
  stagingprov med faktisk inkorg, webhookar, scheduler, larm och leveransövervakning.
- **G4:** Stripe testkonto/API-nycklar och full hosted Checkout-test med testkort,
  avbrott/refund/replay; beslutad skatt, betalningsmottagare, kvitto/bokföring och
  avboknings-/återbetalningspolicy. Separat livegodkännande krävs.

## Kända begränsningar för granskaren

Exporten stoppar uttryckligen över 5 000 eventdeltagare respektive 10 000
kontaktärenden; praktisk eventinformation är begränsad till 500 bekräftade
deltagare per atomärt utskick. För större urval krävs en behörig, granskad
batchprocess. Delade IP-adresser delar missbrukskvot. Arkiverings-/gallringsbeslut
för andra personuppgifter än kontaktärenden kräver en dokumenterad adminprocess.
Drag-and-drop, CRM/ERP och filuppladdning ingår inte.

Dependency audit vid leverans: **18 måttliga, 0 höga, 0 kritiska**. Fynden följer
transitiv `minimatch` i ESLint-verktygen och `glob` i React Emails verktygskedja.
Inget publikt formulär accepterar globmönster. npm föreslår inkompatibla större
nedgraderingar som automatisk fix; dessa har inte genomförts. Detta är en
kvarvarande beroenderisk att följa, inte en ren audit.
