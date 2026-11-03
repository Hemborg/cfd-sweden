# CFD Sweden: resultat av det lokala experimentet

**Historisk fasrapport.** Detta dokument beskriver prototyp- och designarbetet före PR-leveransen. Den aktuella granskningsomfattningen, tillståndet att pusha en feature-branch och färska testresultat redovisas i [review-handoff.md](review-handoff.md). Merge och produktionspublicering ingår inte.

Datum: 2026-11-02. Arbetsgren: `codex/cfd-modular-mvp-20261102`.
Bas och fortfarande verifierad GitHub-main: `50860d90b312e6a38cacea00b5755a3f48dec33a`.
Arbetskopia: `D:\Agents\1 2 3 Lotions\cfd-sweden-mvp-20261102`.

**Resultat:** en körbar lokal prototyp med bevarad befintlig sajt, redigerbara innehållsfiler, statiska nyheter, evenemangsmodell, fungerande resursfilter, mobilmeny och ett isolerat kontakt-/samtyckesdemo. Ingen commit, push, PR, merge, deploy, extern migration eller verkligt mejl har utförts. Produktionssidan och dess FormSubmit-flöde är orörda.

Arbetet tog ungefär **40 minuter kalendertid**, inklusive parallell implementation, källgranskning och verifiering. Det är ett ungefärligt tidsmått för denna session, inte ett löfte om motsvarande produktionstid eller en summering av agenternas parallella arbetstid.

## Obligatoriskt facit

Visuell ombyggnad 2026-11-03: hela den lokala sajten följer nu modersidans marinblå/vita/gula färgsystem, Josefin Sans/Manrope/Martian Mono, bildrika startsida, rundade knappar och gemensamma sidfot. `BrandLogo` har en vit variant med modersidans CSS-filter. `/ga-med` visar det egna återanvända formuläret i den nya designen och alla anmälningslänkar leder dit. `/cfd-gear` visar kommer snart utan köpflöde. Den tidigare externa anmälningssidan används inte längre som filmlänk; filmen länkas direkt. Tre introduktioner som beskrev originalsajten har ersatts med svensk besökartext. De exakta avsiktliga undantagen från den historiska text-/länkbaslinjen dokumenteras i regressionstesterna. Övrigt innehåll och backend-/samtyckesfunktioner har bevarats, inklusive demospärrarna.

Verifiering av ombyggnaden: lint, typkontroll, produktionsbygge, 28 enhetstester, 9 ordinarie webbläsartester och 2 innehålls-/demospärrtester passerar (39 tester). 13 lokala routes kontrollerades i 1499, 768 och 375 px utan horisontell overflow eller upptäckta trasiga bilder. Bilder av startsida, formulär, Gear, bibliotek och Take action finns i `output/playwright/final-*.png`; referens och mätvärden dokumenteras i `visual-reference.md`. Innehållstestets temporära artiklar togs bort och ett rent bygge återställdes. Ingen publicering, tjänsteändring eller verkligt formulärinskick gjordes.

Logouppföljning 2026-11-03: den tidigare förenklade symbolen har ersatts med Karls officiella PNG-master, uppdelad i återanvändbar symbol, ordmärke och separat SWEDEN-text. Samtliga sidhuvuden delar komponenten och favicon använder symbolen. Masterns SHA-256 är oförändrad och varje avkodad pixel i båda beskärningarna jämfördes med originalet. SVG-komponenterna innehåller rasterbilder, inte vektoriserade kurvor; se `brand.md` för upplösningsgränser och typsnittsreservation. Lint, typkontroll, bygge, 28 enhetstester och samtliga 8 ordinarie webbläsartester passerade. Visuell kontroll gjordes vid 1499 och 375 px. Endast lokala ändringar; servern kör på port 3400.

Uppföljning 2026-11-03: användarens visuella kontroll hittade en trasig textspalt på Take action som den ursprungliga kontrollen missat. `.featured-action` har nu en egen enkelspalt i stället för den delade tvåspaltslayouten. Ett nytt geometriskt webbläsartest verifierar etikett, rubrik, brödtext och CTA vid 1499, 1152, 768 och 375 px. Det testet och hela originaltext-/länkregressionen passerade, liksom lint och nytt bygge. Den lokala servern startades om; inget publicerades externt. Testtabellen längre ned redovisar det ursprungliga prototypkörningstillfället.

Statusen **verifierad** avser de lokala bevis som anges, inte produktionscertifiering.

| Del | Status | Bevis/test | Återstående arbete |
| --- | --- | --- | --- |
| Innehåll separerat | **Verifierad** | De åtta ursprungliga sidornas textfragment och länkmål jämförs i webbläsare mot en maskinellt fångad baseline från bascommitten. Copy/navigation/formulärtexter finns i `content/site.ts`; mallar och guide finns. | Elaine levererar och godkänner ny copy. Git-/agentstöd behövs fortfarande för redigering. |
| Nyheter | **Verifierad** | Markdown-parser/validering, utkast/framtidsfilter, HTML-sanering, okänd slug, metadata, sitemap och RSS. Separat verkligt bygge och webbläsartest med temporär artikel, utkast och framtidsinlägg passerade; testinläggen togs bort och rent bygge återställdes. | Föreningen behöver leverera riktiga nyheter. Framtidsdatum kräver nytt bygge vid publicering. |
| Formulär och databas | **Endast demo/mock** | Lokal servervalidering, normalisering, honeypot, storleksgräns, rate limit, idempotens och samtidiga retries testade. Supabase-adapter har mockat kontraktstest; SQL/RLS/grants har statiska kontroller. Det gamla FormSubmit-kontraktet verifieras separat. | **Databasintegration ej verifierad.** SQL måste köras och nekad åtkomst testas i godkänd testmiljö. Beständig rate limit, behörig ärendehantering och notifieringsdispatcher återstår. |
| Nyhetsbrev/samtycke | **Endast demo/mock** | Omarkerat aktivt samtycke, pending → confirmed → withdrawn fungerar i webbläsare. Hashade engångstokens, utgångstid, återregistrering, historik och samtidiga första förfrågningar testade. Resend-anrop provas enbart mot fakes. | Ingen skarp utskickskedja. Tokenleverans, publik bekräftelse-/avregistreringsväg, köarbetare, Resend-synkronisering, leveransprov och granskad personuppgiftstext återstår. Nycklar ensamma räcker inte. |
| Evenemang | **Verifierad** | Publik tom lista, detaljroute och 404 finns. Datamodellen kräver datum/tidszon, ort, arrangör och säkra länkar. Ingen fiktiv aktivitet är inlagd. Samma kontaktmodell förbereder eventkategori och kontrollerar att anmälan är öppnad i innehållet. | Verklig aktivitet och dess publika anmälnings-UI/ansvariga behöver tillkomma. Ingen biljettkassa eller betalning byggd. |
| Arbetsgrupper | **Verifierad** | Befintliga områden/kampanjer bevarade i innehållsdata. Gemensam saklig status, möjlighet till individuell status/CTA och fungerande CTA till befintlig intresseanmälan. | Beslutade gruppansvariga/projektlänkar saknas; de har inte hittats på. Inget internt projektverktyg byggt. |
| Mobil/tillgänglighet | **Verifierad** | Meny öppnas/stängs med tangentbord, Escape återför fokus, aktuell länk markeras. Mobilvy 375 px utan horisontell overflow i kontrollerade sidor. Semantiska formulär, samtyckescheckbox och statusmeddelanden. | Ingen full WCAG-revision eller bred testmatris med skärmläsare genomförd. |
| Säkerhet/tester | **Verifierad** | 28 enhets-/kontraktstester, 7 publika E2E och 2 publicerings-/avstängningstester passerar. Lint, typkontroll och bygge passerar. Runtime-audit: 0 rapporterade sårbarheter. | 16 måttliga auditposter finns kvar i utvecklingsverktygens beroendekedja; ESLint 9 ger supportvarning. Verklig RLS, e-postleverans och produktionsdrift är inte säkerhetsverifierade. |

P1-admin/auth, kommentarer, autoresponder, eventexport och separat CMS är **ej byggda**. De är tilläggspunkter i arkitektur-/driftdokumentationen och har inte gjorts till halvfärdiga publika funktioner.

## Verifiering

| Kontroll | Utfall |
| --- | --- |
| `npm ci` med den slutliga låsfilen | Passerade |
| `npm run lint` | Passerade, 0 fel/varningar i koden |
| `npm run typecheck` | Passerade |
| `npm test` | **28 passerade, 0 misslyckade** |
| `npm run build` | Passerade på Next.js 16.4.4, inga byggvarningar |
| `npm run test:e2e` | **7 passerade, 0 misslyckade** |
| `npm run test:content:e2e` | **2 passerade, 0 misslyckade**, rent bygge återställt |
| `npm audit --omit=dev` | **0** rapporterade sårbarheter |
| Full `npm audit` | 16 måttliga poster i utvecklingsberoenden, inga höga/kritiska kvar |
| `git diff --check` | Passerade |
| Avgränsad sökning efter privata nycklar och vanliga tokenformat | Inga träffar; inte en garanti om uttömmande hemlighetsgranskning |

Playwright ger terminalvarningen om `NO_COLOR`/`FORCE_COLOR`; den påverkar färgutskrift, inte testutfallet. npm varnar också om ej separat godkända installationsskript för esbuild/unrs-resolver; installerad kod klarade körda kontroller. Inga globala installationer gjordes.

## Ändringar och beroenden

Exakt fillista finns i [changed-files.txt](changed-files.txt). Huvuddelarna är:

- `content/`, `lib/content/` och befintliga sidor: copy, modeller, Markdown, RSS och evenemang.
- `components/Header.tsx`, `MobileNav.tsx`, `ResourceLibrary.tsx`, `PageLayout.tsx`, `app/globals.css`: återanvänd design, mobilnavigation, verkliga filter och nya sidors baslayout.
- `lib/forms/`, `components/forms/`, `app/api/demo/`, `app/experiment/`: separata lokala flöden och injicerbara adaptrar.
- `supabase/migrations/`: schema med fyra begränsade RPC-funktioner. SQL är förberett men inte kört.
- `tests/`, Playwright-konfigurationer och `scripts/`: regression, flödestester och tillfälliga publiceringsfixtures.
- `docs/`, README och AGENTS: lokala gränser, källa/licens, drift och detta facit.

Next.js och dess ESLint-konfiguration uppdaterades från **16.2.6 till 16.4.4** efter upptäckta säkerhetsrådgivningar. React/React DOM är fortsatt **19.2.4**. Uppgraderingen är endast lokal. Motivering och officiella rådgivningar finns i [research.md](research.md).

Nya låsta beroenden: `gray-matter 4.0.3`, `remark 15.0.1`, `remark-html 16.0.1`, `zod 4.6.7`, `@supabase/supabase-js 2.118.0`, `resend 6.37.0`. Testverktyg: `tsx 4.23.15` och `@playwright/test 1.64.1`. Ingen komplett exempelapp, CMS, autentisering eller React Email-installation har kopierats in. Säkerhetsuppdateringar inom tillåtna versionsintervall låstes också; ingen `--force`-uppgradering användes.

## Viktiga begränsningar och kostnadsdrivare

Demo är avstängd som standard, kräver loopback och spärras på Vercel. Den använder minne, inte ett varaktigt register. Inga externa nycklar aktiverar leverantörsanrop automatiskt. FormSubmit på startsidan är fortfarande det gamla skarpa flödet; dess mejlleverans har inte provats här.

Den förberedda outboxen beskriver notifieringsavsikt. En färdig dispatcher med tokenleverans, claim/lease, återförsök och providerstatus saknas medvetet. Databasschema och mail-adapter ska därför inte presenteras som klara att aktivera. Se [forms.md](forms.md) och [mail.md](mail.md).

För framtida skarp lösning behövs godkänd Postgres/Supabase-miljö, e-postleverantör/avsändardomän, skyddad administration och beständig trafikbegränsning. Ingen betaltjänst eller nytt konto har beställts. Volym, lagring, backup, e-postutskick och förvaltning styr kostnaden. Supabases fria plan har begränsningar och kan pausas vid inaktivitet; dagliga backuper ingår enligt dess nuvarande Pro-villkor. Resend har separata volymgränser och planer. Val görs först efter faktisk volym och driftskrav. [Supabase-priser](https://supabase.com/pricing), [Resend-priser](https://resend.com/pricing).

Utkast som ligger i det publika GitHub-repot är offentliga som källkod. Inget medlemsregister, hemliga nycklar eller konfidentiellt redaktionsmaterial får läggas där. Samtyckesmallarna är inte juridiskt granskade. Ansvar, ändamål, åtkomst, gallring, biträden och återkallelser är uttryckliga beslutspunkter i [operations.md](operations.md).

## Saklig jämförelse: befintlig Next.js eller WordPress

B är ett bedömt alternativ, inte en genomförd eller verifierad WordPress-prototyp. Ingen förutbestämd teknikvinnare följer av jämförelsen.

| Aspekt | A: förvalta befintlig Next.js | B: WordPress med relevanta tillägg |
| --- | --- | --- |
| Funktionstäckning | Befintliga sidor, filbaserad blogg, evenemang och lokalt formulärdemo finns. Produktionskopplingar återstår. | Sidor, inlägg och redaktörsgränssnitt finns i kärnan. Formulär, event och nyhetsbrev behöver valda tillägg/tjänster och integrationstest. |
| Initial implementation | Ingen design- eller URL-migrering behövs. Denna lokala prototyp finns redan. | Hosting, tema/designanpassning, URL-bevarande, innehållsflytt och pluginval tillkommer. Färdiga tillägg kan minska egen funktionskod. |
| Integrationskomplexitet | Tydliga egna modeller och tester, men vi ansvarar för koppling och felhantering. | Mindre egen kod för standardfunktioner, men ansvar för plugin-kompatibilitet, datamodeller och leverantörskopplingar kvarstår. |
| Design | Befintlig formgivning behålls. | Ska återskapas i tema/block. Ett standardtema kan bli snabbare om ändrad design accepteras. |
| Innehållsadministration | Elaine kan leverera copy separat, men någon behöver Git-/agentflöde. Inget visuellt admin är byggt. | Visuell blockredigering och etablerat publiceringsflöde är en tydlig fördel för återkommande egen redaktionell publicering. |
| Drift | Behåller nuvarande frontend på Vercel; eventuell DB/mail tillkommer. | Traditionell WordPress behöver PHP- och databashosting. Headless kan behålla frontend men innebär två system. |
| Uppdateringar/säkerhet | npm/Next och egen integrationskod behöver regelbundna granskade uppdateringar. Säkerhetsarbetet försvinner inte med AI. | Kärna, tema och plugins behöver uppdateras och kontrolleras. Hanterad hosting kan ta delar av arbetet. |
| Kostnad | Undviker ombyggnad, men egen utveckling, integrationer, DB, mail och driftarbete kostar. | Hosting och eventuella pluginlicenser plus migrering/förvaltning. Billiga standardtillägg kan vara rationella för standardbehov. |
| Flexibilitet | Stor frihet för framtida anpassningar; mer eget kodansvar. | Brett ekosystem och lättillgänglig redaktion, med beroende av valda plugins/teman för specialfunktioner. |

WordPress erbjuder blockbaserad redigering av sidor och inlägg. Dess dokumentation anger PHP-/databaskrav och rekommenderar uppdaterade teman/plugins. [Blockredigeraren](https://wordpress.org/documentation/article/wordpress-block-editor/), [hostingkrav](https://wordpress.org/about/requirements/), [uppdateringar](https://wordpress.org/documentation/article/plugins-themes-auto-updates/).

**Bedömning för nästa beslut:** A har låg migrationskostnad och räcker tekniskt för de avgränsade behov som demonstrerats. B blir särskilt intressant om Elaine och flera andra måste publicera självständigt ofta utan Git eller agenthjälp. Avgör detta genom ett faktiskt redaktionellt arbetsprov. Båda alternativen kan utvecklas med Claude Code/Codex; det avgör inte vilket publiceringsverktyg redaktionen behöver.

## Separat uppskattning för fortsatt arbete

Grova tekniska planeringsintervall, inte offert eller löfte. De förutsätter att omfattningen stannar här och att föreningen fattar nödvändiga beslut.

| Arbete | Rimlig separat uppskattning |
| --- | --- |
| A: produktionskoppla denna prototyp | **4 till 8 arbetsdagar** för DB-/RLS-integration, tokenleverans/dispatcher, Resend-synk, publika formulär/avregistrering, rate limit, skyddad hantering, backup/återläsning och leveransprov. |
| B: motsvarande WordPress-lösning | **5 till 10 arbetsdagar** med rimligt välpassande tillägg och bevarad design/URL:er. En enklare standarddesign kan minska tiden; specialintegrationer kan öka den. Inte verifierat genom byggförsök. |
| Personuppgiftsbeslut och granskning | **0,5 till 2 arbetsdagar aktivt förenings-/granskningsarbete** för en enkel lösning, utöver eventuell rådgivning och väntan på beslut. Samma grundfrågor finns i båda alternativen. |
| Löpande förvaltning A | Budgetera inledningsvis **2 till 4 timmar/månad**, plus redaktion och incidenter, för uppdateringar, leverans-/felkontroll och backupkontroll. |
| Löpande förvaltning B | Budgetera inledningsvis **2 till 6 timmar/månad**, plus redaktion och incidenter. Hanterad hosting och få stabila plugins kan minska arbetsbehovet. |

Inga publika administratörskonton, kommentarer, biljettbetalningar eller full medlemsplattform ingår i dessa intervall. Att införa dem kräver en ny avgränsning.
