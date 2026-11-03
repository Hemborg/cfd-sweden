# Produktionsberedskap 2026-11-03

**Plattformsversionen är live på `https://cfdsweden.se`.** Den verifierade
produktionsdeploymenten `dpl_3ctGTeYZ83nxoJ9U4ZBD14sPKXpa` kopplades till domänen kl. 15:04
UTC i befintligt Vercel-projekt, utan DNS-ändring. Ett separat produktionsprojekt
finns i Stockholm (`eu-north-1`), medan staging är pausad enligt vald gratisplanslösning.
Produktionsinloggning och MFA behöver ännu verifieras med kontoägaren.

Den godkända koden är `89e9706c4d146958c1ac52d212f9e3ae9b5f66e0` och den
senaste dokumentations-CI:n med 128 tester är [grön](https://github.com/Hemborg/cfd-sweden/actions/runs/41659358406).
Den exakta Vercel-deploymenten är [Ready](https://vercel.com/hemborg-5741s-projects/cfd-sweden/3ctGTeYZ83nxoJ9U4ZBD14sPKXpa).
Se även [PR #5](https://github.com/Hemborg/cfd-sweden/pull/5) för granskningsunderlag
och slutlig merge-SHA när den är dokumenterad där.

## Implementerat och lokalt verifierat

| Område | Resultat |
| --- | --- |
| Design, logotyper, sidtexter och URL:er | Bevarade. Liten kontrastkorrigering för blå etiketttext på ljus bakgrund. |
| Databas och privat administration | `CFD_PLATFORM_ENABLED=true` aktiverar grundplattformen, inte valfria flöden. |
| Artiklar och evenemang | Databas är enda valda källa när grundplattformen är aktiv. Inget tyst återfall till Git vid databasfel. |
| Redaktion | Inloggning med MFA, utkast, privat noindex-förhandsgranskning, publicera, redigera och avpublicera utan ombyggnad. |
| Datum | Framtida artiklar döljs. Redigering behåller publiceringsdatum. Migration 160 tillåter källdatum även för utkast. |
| RSS och sitemap | Aktuella databasposter; vid fel HTTP 503, no-store och Retry-After. Tack- och admin-URL:er ingår inte. |
| Avbrott | Nyheter/evenemang visar begripligt återförsök. Publika läsningar har fem sekunders tidsgräns utan automatiska omtag. Statiska kontaktsidan fungerar fortsatt. |
| Kontakt och Gå med | Befintlig FormSubmit-mottagare, validering, honeypot, integritetsinformation och separata tackflöden. Inget riktigt meddelande skickat. |
| Grupper, projekt, kampanjer och Kanban | Behörig intern administration kvar. Grupp-/uppgiftsändringar fungerar utan att köa mejl när e-post är avstängd. |
| Ej aktiva publika funktioner | Nyhetsbrev, kommentarer, eventanmälan, biljetter, betalning, inbjudningsmejl och återställningsmejl spärras i UI och servergränser. Arbetaren gör inga nätverksanrop när e-post är avstängd. |
| Behörighet | Supabase Auth, serverkontroll, RLS och AAL2 för administrativa roller. Publik signup och anonym inloggning är även avstängda i hostad Supabase. |

## Verifierat hostat produktionsläge

- Separat Supabase-projekt `mreojynpylkitltnwxdu` är aktivt i `eu-north-1`.
  Alla 17 granskade migrationer är installerade utan seed: 31 RLS-skyddade
  tabeller och 45 policyer. Anonyma publika läsningar av innehåll är kontrollerade;
  privata profiler och kontaktärenden nekas.
- Produktionsmiljön i Vercel har 16 variabler. FormSubmit är fortsatt kontaktväg;
  nyhetsbrev, automatiska mejl, eventanmälan, betalningar och kommentarer är avstängda.
  Inga Resend- eller Stripe-nycklar har konfigurerats.
- Publik signup och anonym inloggning är avstängda. Canonical Site URL är
  `https://cfdsweden.se`.
- Det första verkliga administratörskontot är bekräftat, har korrekt profil och har
  tilldelats `superadmin` efter UUID-kontroll. Identiteten publiceras inte i Git.
  Kontoägaren har ännu inte slutfört inloggning och TOTP/AAL2 i produktionsversionen.
- Källinventeringen innehåller 0 artiklar och 0 evenemang. Ingen produktionsimport
  kördes och databasen är tom på redaktionellt innehåll; inga syntetiska
  stagingposter har förts över.
- Före promotion kontrollerades den exakta, Vercel-skyddade
  produktionsdeploymenten i webbläsare: 13 publika rutter fungerar på 390 och
  1440 px utan overflow, felvy eller saknad H1. Efter promotion passerar 32 HTTP-
  kontroller mot `cfdsweden.se`: 14 publika sidor med 200, 3 privata rutter med
  inloggningsredirect, 11 avstängda API:er med 404/503, RSS och sitemap med 200
  samt båda tackvyerna noindex. 13 klientbundlar saknar produktionshemligheter
  och stagingreferens.
- Kontakta oss och Gå med använder fortfarande FormSubmit, med obligatorisk e-post
  och kontaktmeddelande där det krävs. Inga verkliga inskick, betalningar eller utskick
  har gjorts under releasekontrollen.

## Konfiguration och beroenden

Den beställda Supabase-stagingmiljön har nu konfigurerats. Ingen ny datamodell,
autentiseringslösning eller paketdependency har införts.
Next.js, Supabase SDK, Zod, PostgreSQL och de befintliga valfria Resend-/Stripe-modulerna återanvänds.
`lib/platform/config.ts` är den typade funktionskonfigurationen. Varje optional flagga
kräver exakt strängen `true`; standard är stängd. E-post kräver dessutom aktiv transport.
Nyhetsbrev och eventanmälan kräver e-post; betalning kräver eventanmälan och den
befintliga Stripe-konfigurationens godkännanden. Kommentarer har en separat flagga.
FormSubmit väljs även med aktiv databas. Se [driftguiden](production-operations.md)
för det konkreta lanseringsläget och hemlighetshanteringen.

| Roll | Avsedd intern åtkomst | MFA |
| --- | --- | --- |
| Superadmin | Åtkomstbeslut och alla administrativa områden | Ja |
| Administratör | Redaktion, event, grupper, projekt, kontohantering inom befintliga gränser | Ja |
| Redaktör | Artiklar och eventinnehåll; inga deltagar-/betaluppgifter | Ja |
| Gruppansvarig | Egna grupper/projekt/uppgifter | Ja |
| Moderator | Moderering först när kommentarsfunktionen aktiveras | Ja |
| Medlem | Tilldelade privata medlemsytor | Enligt portalens befintliga regler |
| Anonym | Publicerat och tidsmässigt aktuellt innehåll, inga privata medlemsuppgifter | Ej tillämpligt |

## Innehållsinventering och import

Både granskad `main` och leveransgrenen innehåller **0 artiklar och 0 evenemang**.
Statiska sidtexter i `content/site.ts` finns kvar i Git och flyttas inte till ett nytt CMS.
Detta betyder inte att föreningen saknar material utanför Git; sådant material har
inte funnits tillgängligt för denna import.

- Källmanifest SHA-256: `eaa5c850317fa93e42351d95853848637eec24600302164d9ca981e331ac3d83`.
- Verkliga importerade artiklar/event: **0/0** eftersom källinventeringen är tom.
  Syntetiska stagingposter är testdata, inte föreningens importerade innehåll.
- Syntetiskt lokalt test: första körningen 2 artiklar + 1 event, andra körningen
  0 nya och 3 överhoppade. Avvikande befintlig slug stoppar hela transaktionen.
- Markdown, författare, taggar, SEO och tidsstämplar jämförs mot källan.
  Utkast och framtida publiceringar förblir privata. Testdata städas bort efter testet.
- Ursprungliga innehållsfiler bevaras. [Importguide](content-import.md).

## Testresultat

- Lint, TypeScript och produktionsbyggen: godkända.
- 54 enhetstester och 38 integrationstester; de två nya enhetstesterna låser
  stagingverktygets exakta mål och avstängda funktioner.
- 13 befintliga publika webbläsartester, 4 publicerings-/avstängningsregressioner,
  11 tester med full lokal testplattform och 8 tester för det begränsade lanseringsläget.
- Totalt **128 CI-tester**. Ett nytt webbläsartest täcker att artikelstatus förblir
  korrekt efter publicering, ytterligare redigering och avpublicering.
- Separat från CI: verkliga hostade SDK-kontroller av lösenord, TOTP/AAL2,
  redaktionella ändringar och negativa RLS-fall; 2 automatiserade browserfall
  mot lokal Next med hostad databas, samt faktiskt redaktörsflöde i Vercel Preview.
- Alla 17 migrationer installerade i tom isolerad databas. De 16 tidigare filerna är oförändrade.
- Lokal återställningsövning: 8 syntetiska profiler, 31 RLS-tabeller, 45 policyer;
  anonym åtkomst till kontaktärenden nekas också efter återställning.
- Mobil 390 px, desktop 1440 px, tangentbord/navigation och axe-tillgänglighet.
- Hemlighetskontroll: inga träffar för vanliga nyckelformat eller de lokala testhemligheterna
  i versionshanterade/kandidatfiler. Endast `.env.example` versionshanteras.
- Paketgranskning: 0 high/critical, 18 moderate i befintligt beroendeträd.
  Dessa är kvarstående uppgraderingsarbete, inte noll säkerhetsrisk.

FormSubmit har verifierats med avlyssnad/mockad leverans. Ingen riktig inkorgsleverans
har testats. Resend/Stripe kontaktades inte; valfria leveranstester använder syntetisk
lokal SMTP eller verifierade mockar. Lokal Postgres är inte hostad staging.
Utförda hostade kontroller och begränsningar redovisas separat i
[stagingrapporten](hosted-staging.md).

## Återstår efter domänsläpp

1. Kontoägaren ska logga in på den live webbplatsen, enrolera TOTP i egen
   autentiseringsapp och verifiera
   ett administrativt AAL2-flöde. Ingen lösenordsåterställning eller e-postleverans
   ska användas för detta.
2. Lokal återställning av applikationsdata och faktiska Auth-konton är verifierad:
   31 RLS-tabeller, 45 policyer, 17 migrationsposter, sex lösenord och tre TOTP-faktorer.
   Den krypterade stagingkopian ligger lokalt enligt ägarens beslut, men överlever
   inte datorförlust; extern separat lagring och hostad återställningsövning återstår.
   En krypterad första produktionsbackup har kontrollerats lokalt efter release,
   men måste förnyas efter MFA-enrolering. Den är inte ett test av hostad
   produktionsåterställning. [Backupguide](backup-recovery.md).
3. Föreningen beslutar personuppgiftsansvar, leverantörsavtal, gallring, roller,
   redaktionellt ansvar och incident-/backupansvar. Superadminbeslutet ersätter inte dessa ansvarsfördelningsbeslut.

### Återställningsväg

Vid databasavbrott: behåll vald datakälla, visa felstatus, använd kontaktvägen och
återställ databasåtkomst. Slå inte automatiskt av plattformen så att gamla Git-filer
ser aktuella ut. Vid felaktig kodrelease: återaktivera endast en tidigare Vercel-
deployment som har samma produktionsmiljö och kompatibelt schema. Återställ inga
data utan incidentbeslut och verifierad backup. Använd aldrig den pausade staging-
previewn som rollback och kör aldrig `db reset` mot produktion.

### Framtida aktivering

- Resend: godkänd avsändare/domän, personuppgifts-/utskicksbeslut, separata nycklar,
  webhooksignatur, kö-/retryövervakning, testsamtycken och leveransbevis före liveflaggor.
- Stripe: betalnings-/återbetalningsvillkor, testläge, webhook-/beloppskontroll,
  avstämning och kvittoflöde innan separata livegodkännanden.
- Event, nyhetsbrev och kommentarer: aktivera en modul i taget efter rätt beroenden
  och upprepad regression. Bevara opt-in, rate limiting, MFA och RLS.
