# Teknikunderlag för prototypen

Kontrollerat 2026-11-02. Underlaget motiverar små återanvändbara mönster; det
gör inte externa konton, databaser eller mejlleveranser till en del av prototypen.

## Blogg

Vercels `examples/blog-starter` är MIT-licensierat. Det visar ett litet och
beprövat mönster: läs Markdown från disk med `gray-matter`, sortera efter datum
och generera en sida per slug. Referensen ska anpassas till App Router och CFD:s
egna presentation, inte kopieras som tema.

- [App Router: generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)
  bekräftar statisk generering av dynamiska segment under bygge.
- [Next.js metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
  beskriver statisk/dynamisk metadata och sitemap/robots som filkonventioner.
- Källreferens (MIT):
  `vercel/next.js@b3ca176d0a462e0a621ef8cd60c329dba6a5b7b6:examples/blog-starter/src/lib/api.ts`.

Implementationen ska använda `generateStaticParams`, `dynamicParams = false`,
`notFound()` och `generateMetadata`. Utkast filtreras alltid före listning,
byggparametrar och RSS/sitemap.

## Nyhetsbrev

Resends officiella exempel `resend/resend-double-opt-in-example` är
MIT-licensierat och använder Next.js App Router. Det lägger först kontakten som
avprenumererad och gör den prenumererad först efter bekräftelsen.

- [Officiellt exempel](https://github.com/resend/resend-double-opt-in-example)
- [Testadresser och simulerade leveranshändelser](https://resend.com/changelog/sending-test-emails)
- [Idempotens för e-postanrop](https://resend.com/features/email-api)

Exemplets kryptotoken är ett demonstrationsmönster, inte något att kopiera
okritiskt: det saknar autentisering, är återanvändbart under sin giltighetstid
och dess route saknar felhantering för skadad token. En verklig lösning ska
skapa en slumpmässig engångstoken, lagra endast dess hash med utgångstid och
`consumed_at`, och konsumera den atomärt. API-nyckeln får endast finnas på
servern. Prototypen använder en testadapter och skickar inga mejl.

Resend ändrade sin modell i november 2025: kontakter är nu globala och
Audiences har namngetts Segments. Undvik därför att låsa egna domänmodeller till
äldre `audienceId`-anrop; kontrollera SDK/API när extern konfiguration godkänns.

- [Resends ändring: globala Contacts och Segments](https://resend.com/changelog/new-contacts-experience)
- [Kontakter, avregistrering och broadcasts](https://resend.com/features/audiences)
- Källreferenser (MIT):
  `resend/resend-double-opt-in-example@753748aa096577cbc0f6e1a063541a0012d3f5a6:src/app/api/subscribe/route.ts`
  och `resend/resend-double-opt-in-example@753748aa096577cbc0f6e1a063541a0012d3f5a6:src/app/api/confirm/route.ts`.

## Databas och åtkomst

För en senare Supabase-konfiguration måste tabeller med personuppgifter ha
explicit RLS, minsta möjliga grants och ingen publik läspolicy. `service_role`
kringgår RLS och får därför endast användas på servern. P0 behöver ingen
slutanvändarautentisering eller publik dataläsning.

- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: User Management](https://supabase.com/docs/guides/auth/managing-user-data)

## WordPress som separat alternativ

WordPress kan ge redaktörsgränssnitt tidigare, men lägger till en PHP-host,
core-, tema- och pluginuppdateringar och uppdateringskontroll. WordPress.org
anger att endast senaste huvudversionen är officiellt supportad och rekommenderar
att teman och plugins hålls uppdaterade. Kostnadsjämförelse kräver senare val av
hosting, reservkopior, redaktörsflöde, formulär- och nyhetsbrevstillägg; inga
prisantaganden görs här.

- [WordPress supportpolicy](https://wordpress.org/documentation/article/supported-versions/)
- [WordPress: automatiska tema- och pluginuppdateringar](https://wordpress.org/documentation/article/plugins-themes-auto-updates/)

## Beroendesäkerhet (lokal kontroll 2026-11-02)

`npm audit --json` på prototypens låsfil rapporterade 24 sårbarhetsposter:
1 kritisk, 7 höga och 16 måttliga. Den enda direkta runtime-posten är
`next@16.2.6`; audit föreslår `next@16.4.4`. Övriga runtime-poster går via
Next (`sharp` och `postcss`). Verktygskedjan står för övriga poster:
`eslint`/`eslint-config-next` är direkta, medan bland annat `minimatch`,
`brace-expansion`, `js-yaml`, `nanoid`, `browserslist` och
`typescript-eslint` är transitiva.

Rekommendationen är att uppgradera **tillsammans** till `next@16.4.4` och
`eslint-config-next@16.4.4`, behålla `react` och `react-dom` på den befintliga
matchade `19.2.4`-versionen, och därefter uppdatera endast låsfilen med vanliga
semver-kompatibla uppdateringar. Next 16.4.4 accepterar React `^19.0.0` och
eslint-config-next 16.4.4 kräver ESLint 9 eller senare, så detta är en minimal
kompatibel ändring. Undvik `npm audit fix --force`: dess förslag inkluderar
felsignalerade/icke meningsfulla större byten kring ESLint. I torrkörning utan
force föreslogs bara 31 vanliga versionsuppdateringar, bland annat
`postcss 8.5.15 -> 8.5.32`, `sharp` via Next samt aktuella ESLint-transitiver.

Detta är en prototypändring, inte en produktionsrelease: kör efteråt en ren
`npm ci`, `npm audit`, lint, typkontroll, bygge och publik rökning före en
eventuell merge.

- [Next.js säkerhetsöversikt](https://github.com/vercel/next.js/security/advisories)
- [Kritisk SVG/Image Optimization-RCE, fix från 16.4.1](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw)
- [Kritisk Cache Components-RCE, fix från 16.4.1](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr)
- [Server Actions-DoS, fix från 16.4.1](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r)

## Granskade exempel och avgränsningar

### Resend Next.js-exempel

`resend/resend-examples` är MIT-licensierat. Den granskade referensen är
`145f130542f2473648c87f694af0d270ac634bd6` (2026-11-02), och dess
`nextjs-resend-examples/typescript` deklarerar Next 16.1.6, React 19.2.4 och
Resend 6.22.0. Det är därför ett mönsterunderlag, inte en versionskälla.

- Godtagbart mönster: servergräns för Resend-klienten och separat notifiering
  till ansvarig. Källor:
  `resend/resend-examples@145f130542f2473648c87f694af0d270ac634bd6:nextjs-resend-examples/typescript/src/lib/resend.ts:L1-L30`
  och
  `resend/resend-examples@145f130542f2473648c87f694af0d270ac634bd6:nextjs-resend-examples/typescript/src/app/contact-form/actions.ts:L1-L113`.
- Förkastat som direkt återbruk: kontaktformuläret validerar bara att fält är
  ifyllda och returnerar leverantörsfel; dess utskick är därför inte lämpligt
  för prototypens krav på Zod, testadapter och inga skarpa mejl.
- Förkastat som verkligt double opt-in: exemplet använder `email.clicked` som
  bekräftelse och matchar sedan mottagarens e-post i en hel audience. Det
  knyter inte klicket till en specifik, oåteranvändbar prenumerationstoken.
  Källor:
  `resend/resend-examples@145f130542f2473648c87f694af0d270ac634bd6:nextjs-resend-examples/typescript/src/app/double-optin/subscribe/route.ts:L1-L112`
  och
  `resend/resend-examples@145f130542f2473648c87f694af0d270ac634bd6:nextjs-resend-examples/typescript/src/app/double-optin/webhook/route.ts:L1-L139`.

### Supabase user-management

`supabase/supabase` är Apache-2.0-licensierat. Den granskade referensen är
`dc3cbeffe8fcdf0b5fd2d9de4633ec88faa68b8d` (2026-11-02). Den använder en
publishable key i browser/server-klienter, cookie-baserad sessionsförnyelse i
Next-proxy och en SQL-migrering med RLS för **användarprofiler**.

- Återanvänd: migrationsfiler i repo, explicit RLS och ett litet serverklient-
  gränssnitt. Källor:
  `supabase/supabase@dc3cbeffe8fcdf0b5fd2d9de4633ec88faa68b8d:examples/user-management/nextjs-user-management/lib/supabase/server.ts:L1-L34`
  och
  `supabase/supabase@dc3cbeffe8fcdf0b5fd2d9de4633ec88faa68b8d:examples/user-management/nextjs-user-management/supabase/migrations/20221017024722_init.sql:L1-L52`.
- Avstå i P0: Auth, browserklient, sessionsproxy, publika profilscheman och
  storage-policyer. Exemplet har en medveten publik `profiles`-läsregel och är
  därmed fel utgångspunkt för privata intresseanmälningar. CFD:s tabeller ska
  inte få någon anonym läsaccess; `service_role` förblir serverhemlighet.

### Senare, inte i prototypen

Pretix är en separat Django-baserad biljettsbutik, licensierad huvudsakligen
AGPL-3.0 med tilläggsvillkor. Det ska utvärderas som en extern/hostad
biljettplattform först när föreningen faktiskt säljer biljetter, inte klonas
eller integreras nu. [Pretix projektstatus och licens](https://github.com/pretix/pretix).

Keystatic integreras inte. Den öppna
[Next.js 16/GitHub storage-frågan](https://github.com/Thinkmill/keystatic/issues/1549)
visar blank adminvy under lokal utveckling i den rapporterade konfigurationen;
den har en uppgiven utvecklingsworkaround men är inget skäl att lägga till CMS
före ett konkret redaktörsbehov.

## Viktigt före en verklig Supabase-anslutning

Supabase och PostgreSQL anger att funktioner är körbara av `PUBLIC` som
standard; en `SECURITY DEFINER` skapad i migration kan då kringgå RLS.
Prototypmigreringen återkallar därför execute från `public`, `anon` och
`authenticated`, använder `set search_path = ''` och ger endast `service_role`
execute. Det är ett lokalt designunderlag, **inte** bevis på konfigurerad
produktion: kör migreringen mot en isolerad Supabase-instans, kontrollera den
faktiska UUID-funktionens schema och lägg tester som verifierar nekad anonym
och autentiserad åtkomst innan externa nycklar eller verkliga personuppgifter
används.

- [Supabase: säkra databasfunktioner och funktionbehörigheter](https://supabase.com/docs/guides/database/functions)
- [Supabase Advisor: security definer som kan anropas av authenticated](https://supabase.com/docs/guides/observability/advisors?lint=0029_authenticated_security_definer_function_executable)
- [PostgreSQL: CREATE FUNCTION och standardbehörighet](https://www.postgresql.org/docs/current/sql-createfunction.html)
