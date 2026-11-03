# CFD Sweden: underlag för oberoende kodgranskning

## Ny plattformsleverans 2026-11-03

Aktuell branch: `codex/cfd-association-platform-20261103`, bas senaste PR #3
`9c40781450c2e7802afae75c2ec8949e8df968bf`. Den nya separata PR:n omfattar
alla A–I-moduler. Den ska granskas, inte mergas eller produktionsaktiveras.

Aktuellt underlag: [kravmatris](platform-requirements.md),
[arkitektur](platform-architecture.md), [driftguide](platform-operations.md),
[admin-/redaktörsguide](platform-admin-guide.md) och [OSS](oss-reuse.md).
Verifieringsresultat och externa luckor finns i matrisen och PR-beskrivningen.
Alla uppgifter nedan om prototypens begränsade funktioner gäller historiska PR #3,
inte den nya plattformens aktiverade kodväg.

Verifierat 2026-11-03. Feature-branch: `codex/cfd-modular-mvp-20261102`.
Mål: `Hemborg/cfd-sweden`, `main`. Verifierad bas: `50860d90b312e6a38cacea00b5755a3f48dec33a`.

**Granskning före merge. Ingen produktionsdriftsättning är godkänd i detta uppdrag.**
Commit, push och PR är uttryckligen godkända. Inga externa migrationer, verkliga mejl,
nyhetsbrevsprenumerationer, kontoändringar eller DNS-ändringar har utförts.

## Resultat och kravstatus

### Uppföljning av PR #3, 2026-11-03

Samtliga sex beställda kodändringar är genomförda på samma feature-branch:

1. Kontaktsida och sidfot saknar `mailto:`. Gemensam `InquiryForm` återanvänder befintlig FormSubmit-leverans med separata kontakt-/intressevarianter, ärendetyp, ämnesrad och tacktext. Ingen ny backend.
2. E-post är obligatoriskt och valideras av webbläsaren; kontaktmeddelande krävs och fält har längdgränser. Kort personuppgiftsinformation och `/integritet` finns. Juridisk komplettering återstår enligt nedan.
3. Listan visar bara kommande evenemang, sorterade efter faktisk tid. Den beräknas per förfrågan utan ombygge. Passerade aktiviteter döljs från listan; befintliga detalj-URL:er och deras sitemap-poster behålls som historiska sidor.
4. `/tack`, inklusive kontaktvarianten, har `noindex, nofollow` och är borttagen ur sitemap.
5. GitHub Actions på varje PR kör lint, typgenerering/typkontroll, enhetstester, produktionsbygge och båda webbläsarsviterna. Ingen deploy, externa nycklar eller skrivbehörighet. Se `ci.md`.
6. Regressionstester täcker validering, kontaktinskick med lokalt mockad FormSubmit, separata tacktexter, mailto-borttagning, integritetslänkar, noindex/sitemap och faktisk renderad evenemangsfiltrering. Mobil (375 px) och dator (1440 px) har verifierats utan overflow.

Inga nya paket tillkommer. Grafisk profil, övrigt innehåll och befintliga URL:er behålls. Browservalidering är inte serverbaserat missbruksskydd. FormSubmit-mottagare/CAPTCHA, databas, leverantörskonton och skarp drift har inte ändrats. Kontaktens tack-URL och ämnesrad är formulärdata i koden, inte en ändring av e-posttjänsten.

**Före skarp drift:** oberoende kodgranskning, föreningens beslut om personuppgiftsansvarig/rättslig grund/lagring och leverantörsvillkor samt kompletterad integritetstext. Ett separat godkänt leveranstest till inkorgen återstår. De tidigare server-/nyhetsbrevsprototypernas integrationsarbete nedan kvarstår; de aktiveras inte av denna uppföljning.

Beställningen avser en körbar prototyp, inte en produktionsklar medlemsplattform.
Den senare beställningen av en svensk version av modersidans utseende ersätter
det ursprungliga kravet att bevara den gamla grafiska profilen.

| Krav | Status i denna leverans | Återstår / avgränsning |
| --- | --- | --- |
| Innehåll separerat från UI | Uppfyllt för befintligt innehåll | Typade objekt, Markdown och redaktionsmall. Senare copy kan uppdateras utan att skriva om komponentlogik. Viss ny presentationscopy ligger i UI. |
| Nyheter/blogg | Uppfyllt | Lista/detaljsida, frontmatter-validering, utkast/framtidsfilter, 404, metadata, RSS och sitemap. Verkliga artiklar behöver tillföras; daterad publicering kräver ett nytt bygge. |
| Befintlig intresseanmälan | Uppfyllt | FormSubmit till föreningens Proton-adress bevarat, nu återanvänt på `/ga-med` och startsidan. Ingen ny mejlleveransprovning gjord i detta uppdrag. |
| Nytt serverhanterat kontaktflöde | Delvis, verifierad lokal demo | Zod, normalisering, honeypot, storleksgräns, rate limit och idempotens fungerar i testläge. Supabase-adapter och SQL finns; verklig databas/RLS och notifieringsleverans är inte integrationstestade. |
| Frivilligt nyhetsbrev | Delvis, verifierad lokal demo | Separat uttryckligt samtycke, pending/confirmed/withdrawn, engångstokens, utgångstid, avregistrering och historik. Utskickskedja och publika bekräftelse-/avregistreringssidor återstår. |
| Evenemang | Publik visning uppfylld, anmälan delvis | Validerad lista/detaljsida, ort/arrangör/tid, externa länkar, 404 och ärligt tomläge. Eventkategori förberedd i gemensam formulärmodell; verkligt event och anmälnings-UI/register/export återstår. |
| Arbetsgrupper/kampanjer | Uppfyllt för publik information | Innehållsdrivna arbetsområden, status och CTA. Namngivna ansvariga, verkliga projektkanaler och aktiviteter kräver redaktionella beslut. |
| Resursbibliotek | Uppfyllt | Fungerande kombinerad filtrering på ämne, typ och samling, inklusive tomläge. |
| Mobil/tillgänglighet/tester | Uppfyllt inom testomfattningen | Tangentbordsmeny, fokus/Escape, responsiva sidor, semantiska formulär och statusmeddelanden. Ingen fullständig WCAG-certifiering eller bred skärmläsarrevision. |
| Modersidans grafiska profil | Uppfyllt som svensk anpassning | Marinblått/vitt/gult, Josefin Sans/Manrope/Martian Mono, fotografisk hero, kort, FAQ, rundade knappar och sidfot. Alla egna undersidor använder samma nya formspråk. |
| Vit svensk logga i separata delar | Uppfyllt för webbanvändning | Symbol, ordmärke, SWEDEN och hel logga återanvändbara. Vitt filter enligt modersidan. Raster i SVG-komponenter, inte äkta vektororiginal; kapiteltextens exakta originaltypsnitt är obekräftat. |
| Gå med utan gammal amerikansk sida | Uppfyllt | Alla anmälningslänkar leder till `/ga-med`; filmlänken går direkt till filmen. Ursprungliga `/#form` fungerar fortfarande. |
| CfD Gear | Uppfyllt | Egen sida i navigation/sidfot/sitemap med kommer snart, utan produkter, priser eller betalflöde. |
| Dokumentation och förvaltning | Uppfyllt | Arkitektur, drift, innehållsmall, databasschema, mejlbegränsningar, designreferens och saklig Next.js/WordPress-jämförelse med separata uppskattningar. |

P1/P2-administration, inloggning/roller, modererade kommentarer, automatisk välkomstmejl,
biljettbetalning, full medlemsportal, CRM/ERP och separat CMS är inte byggda.

## Arkitektur och beroenden

Modulär Next.js App Router-app: `app/` routing, `components/` UI, `content/` redaktionella
objekt och Markdown, `lib/content/` validering/publicering, `lib/forms/` domänmodell och
injicerbara adaptrar, `supabase/migrations/` ej körd SQL, `tests/` automatiska kontroller.
Ingen separat backendserver eller mikroservice införs.

- Next.js och `eslint-config-next`: 16.2.6 → **16.4.4** efter tidigare auditfynd.
- React/React DOM: **19.2.4**, TypeScript och Tailwind 4 behålls.
- Markdown: `gray-matter` **4.0.3**, `remark` **15.0.1**, `remark-html` **16.0.1**.
- Servervalidering: `zod` **4.6.7**.
- Förberedda externa adaptrar: `@supabase/supabase-js` **2.118.0**, `resend` **6.37.0**.
- Tester: `tsx` **4.23.15**, `@playwright/test` **1.64.1**, Node-test runner.

Låsfilen ingår. Supabase/Resend aktiveras inte genom att lägga in nycklar; inga publika
routes skapar dessa klienter. Det är ett medvetet säkerhets- och omfattningsval.

## Färsk verifiering före commit

Node.js 24.19.0, npm 11.17.0, Windows, Chromium. Körda 2026-11-03:

| Kontroll | Resultat |
| --- | --- |
| `npm run lint` | Godkänd |
| `npm run typecheck` | Godkänd |
| `npm test` | 32 godkända |
| `npm run build` | Godkänt produktionsbygge |
| `npm run test:e2e` | 13 godkända |
| `npm run test:content:e2e` | 2 godkända; temporära artiklar borttagna och rent bygge återställt |
| `npm audit --omit=dev` | 0 rapporterade sårbarheter |
| `npm audit` | 16 måttliga i utvecklingsberoenden; 0 höga/kritiska |

Totalt **47 passerade tester**. De täcker bland annat innehåll/länkar, nya Gå med/Gear,
mobilmeny, resursfilter, layout, FormSubmit-kontrakt, API-validering, samtycke,
idempotens, SQL-/adapterkontrakt och publicerings-/demospärrar. Inga testinskick går
till FormSubmit. 13 routes har även kontrollerats i 1499, 768 och 375 px utan overflow
eller upptäckta trasiga bilder. Det färdiga byggets start-, formulär- och Gear-sidor
kontrollerades utan konsolfel vid designleveransen.

## Säkerhetsgranskning och begränsningar

- Genomgång av ändrade/nya commitkandidater, vanliga nyckel-/tokenformat, autentiserade URL:er
  och bildmetadata hittade inga hemligheter eller verkliga formulärinskick. `.env*`,
  `.vercel`, privata nyckelfiler, byggoutput, webbläsarprofiler och testloggar ingår inte.
  Sökningen är inte en garanti mot varje tänkbar hemlighet.
- Föreningens publicerade kontaktadress finns avsiktligt i koden. Fixtures använder testdomäner.
- Demo kräver flagga + loopback och är alltid spärrat på Vercel. Data är processlokal
  och försvinner vid omstart. Denna rate limit är inte en distribuerad produktionslösning.
- SQL har RLS och begränsade grants/RPC, men har aldrig körts mot verklig DB. Mockade
  adaptertester och textbaserade SQL-kontroller är inte bevis på säker RLS i drift.
- Outboxen är endast en notifieringsavsikt. Dispatcher, säker tokenleverans, retry/lease,
  provider-idempotens, Resend-synk, suppression/studs/klagomål och leveranstest återstår.
- Befintligt FormSubmit-flöde har CAPTCHA avstängt och endast honeypot. Det är bevarat
  beteende, inte ett löfte om starkt spamskydd eller verifierad inkorgsleverans.
- Personuppgiftsansvar, rättslig grund, lagringstid, åtkomst, biträden och gallring måste
  beslutas och granskas före nya skarpa persondataflöden. Ingen GDPR-garanti lämnas.
- Fontfiler hämtas vid Next-bygge och serveras därefter lokalt. Bilder är lokala kopior
  av referensens tillgångar; de visar den internationella rörelsen, inte svenska aktiviteter.
- 16 måttliga auditposter i utvecklingsverktygen redovisas öppet. Ingen tvingad större
  ESLint-uppgradering görs inom denna PR.

## Granskningsordning och reproduktion

1. Läs `AGENTS.md`, denna fil och `docs/architecture.md`.
2. Granska `lib/forms/runtime.ts`, API-rutterna och `docs/forms.md` för isoleringen.
3. Granska samtyckesmodell, SQL, mail-/Supabase-adaptrar och tester utan att aktivera externa tjänster.
4. Granska innehåll/publicering, metadata och resursfilter.
5. Granska gemensam design, komponenter och sidor mot `docs/visual-reference.md`.
6. Kör `npm ci`, lint, typecheck, enhetstester, build och båda E2E-kommandona från README.
   Playwright Chromium måste finnas. Testerna startar egna localhost-servrar; lämna port 3400/3401 lediga.

För lokal visning efter bygge: `npm run start -- --hostname 127.0.0.1 --port 3400`.
För det isolerade demot behövs även `CFD_FORM_DEMO_ENABLED=true`; använd endast påhittade
uppgifter på `/experiment/formular`. Skicka inte automatiska testdata genom det verkliga
FormSubmit-formuläret på startsidan eller `/ga-med`.

## Skärmbilder

Fångade från den lokala produktionsversionen utan testuppgifter:

- [Startsida, dator](review/home-desktop.png)
- [Startsida, mobil](review/home-mobile.png)
- [Gå med, dator](review/join-desktop.png)
- [Kontaktformulär, dator](review/contact-desktop.png)
- [Kontaktformulär, mobil](review/contact-mobile.png)

Slutrapporten `prototype-report.md` är historisk och innehåller även jämförelsen mellan
fortsatt Next.js-förvaltning och ett separat WordPress-alternativ. Läs fasdateringar;
dess äldre testtabell ersätts av de färska resultaten ovan.
