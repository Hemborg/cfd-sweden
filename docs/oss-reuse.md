# Återbruk av öppen källkod och integrationskontrakt

Kontrollerat 2026-11-03 mot officiella GitHub-repositorier, npm-registret och
primärdokumentation. Ett versionsnummer här är underlag för ett granskat
lockfile-val, inte ett skäl att automatiskt uppgradera eller aktivera en extern
tjänst.

## Val i korthet

| Område | Val | Avgränsning |
| --- | --- | --- |
| Identitet och data | Supabase Auth, Postgres/RLS och `@supabase/ssr@0.12.7` | Ett gemensamt användar- och behörighetssystem; ingen alternativ auth-tjänst |
| Bakgrundsarbete | Postgres-beständig `queue_mail`/outbox med `FOR UPDATE SKIP LOCKED`-leases | Inget processminne, ingen fire-and-forget-sändning och ingen ny queue-leverantör initialt |
| E-post | Befintlig `resend@6.37.0` och vid mallimplementation `react-email@6.11.6` | Resend är adapter/projektion, inte den auktoritativa samtyckedatabasen |
| SMTP | `nodemailer@10.3.1` endast som uttryckligen konfigurerad test-/reservadapter | Aldrig parallell skarp sändning tillsammans med Resend |
| Betalning | `stripe@23.1.0`, servergenererad hosted Checkout | Biljett efter signerad webhook, aldrig från success-redirect |
| Admin | Projektets egna React/HTML-komponenter | Inga shadcn-källkomponenter är införda i denna implementation |
| Kanban | Projektets egna kontroller | Ingen dnd-kit-integration är införd i denna implementation |
| Tillgänglighet | `@axe-core/playwright@4.14.0` i webbläsartester | Automatiskt stöd, inte ersättning för manuell granskning |

## Upstream-projekt: licens, status och återbruk

GitHub-metadata kontrollerades samma datum. “Aktivt” innebär nylig upstream-
aktivitet och ej arkiverat, inte att varje beroende automatiskt är säkert.

| Projekt | Licens och observerad status | Beslut |
| --- | --- | --- |
| [supabase/supabase](https://github.com/supabase/supabase) | Apache-2.0; aktivt, push 2026-11-03 | Återanvänd plattform, migrations- och RLS-mönster; kopiera inte dashboard-appen |
| [supabase/ssr](https://github.com/supabase/ssr) | MIT; aktivt, release `v0.12.7` 2026-09-08 | Valt bakom lokala klientfabriker; officiellt fortfarande beta |
| [resend/resend-examples](https://github.com/resend/resend-examples) | MIT; aktivt, push 2026-11-01 | Endast referens för små SDK-mönster |
| [resend/resend-double-opt-in-example](https://github.com/resend/resend-double-opt-in-example) | MIT; aktivt, push 2026-08-27 | Endast referens; saknar denna produkts kö-, audit- och webhookkrav |
| [resend/react-email](https://github.com/resend/react-email) | MIT; aktivt, `react-email@6.11.6` 2026-10-29 | Valt för återanvändbara mallar, inte editor förrän särskilt beslut |
| [stripe-samples/checkout-one-time-payments](https://github.com/stripe-samples/checkout-one-time-payments) | MIT; aktivt, push 2026-11-02 | Referens för Checkout/testflöde, inte ett biljett-system att kopiera |
| [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | MIT; aktivt, `shadcn@4.23.0` | Utvärderat men inte infört; den egna administrativa UI-koden räcker i denna leverans |
| [clauderic/dnd-kit](https://github.com/clauderic/dnd-kit) | MIT; aktivt, push 2026-10-31 | Utvärderat men inte infört; Kanban använder tillgängliga serverkontroller och vanliga flyttknappar |

Bevara licensnotiser när faktisk upstream-källkod kopieras och ange exakt
komponent/mall och commit i den PR som för in den.

## 1. Supabase Auth, SSR och behörighet

**Vald version:** `@supabase/ssr@0.12.7`, MIT. Paketet har peer-kravet
`@supabase/supabase-js ^2.114.0`; projektets befintliga `2.118.0` uppfyller det.
Det kräver inga React-beroenden och fungerar med Next 16:s App Router.

Implementationen använder tre lokala, testbara gränser: webbläsarklient med endast public key,
serverklient med request/response-cookies och en strikt server-only
service-klient. Konfigurationen är gemensam och typad:

```ts
platformConfig(): {
  url: string;
  anonKey: string;
  serviceKey: string;
  siteUrl: string;
}
```

Den läser endast `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `CFD_SITE_URL` och spärren
`CFD_PLATFORM_ENABLED`. Service key får aldrig importeras i klientkod eller
användas för användarinitierade läsningar/skrivningar.

Next 16 använder `proxy.ts` för sessionuppfräschning. Använd PKCE och cookies;
kontrollera användare/claims och behörighet i varje server action/route, därefter
RLS med deny-by-default på privata tabeller. UI-skydd är inte behörighetskontroll.
Modellera roller och gruppmedlemskap i normaliserade tabeller så att en person kan
ha flera roller. Kräv AAL2/TOTP för admin-känsliga funktioner och kontrollera den
på server- och databasnivå; en MFA-skärm utan sådan enforcement räcker inte.

`@supabase/ssr` är enligt Supabase beta. Isolera därför dess API och pinna
versionen. Auth-rutter måste vara dynamiska/no-store: Supabase varnar för att
cachade svar med `Set-Cookie` kan läcka en annan användares session.

Källor: [paketval](https://supabase.com/docs/guides/auth/choosing-a-server-package),
[SSR](https://supabase.com/docs/guides/auth/server-side),
[Next 16-proxy/klienter](https://supabase.com/docs/guides/auth/server-side/creating-a-client?environment=client-component),
[cache/PKCE](https://supabase.com/docs/guides/auth/server-side/advanced-guide),
[MFA/AAL](https://supabase.com/docs/guides/auth/auth-mfa).

## 2. Beständig e-postkö och outbox

**Implementerat val:** en delad SQL-modell, inte en extern kö eller PGMQ, med `queue_mail` som bygger
vidare på/migrerar `form_notification_outbox`. Minsta semantiska kontrakt är:

```sql
queue_mail(
  key text primary key, template text, recipient text, data jsonb,
  due timestamptz default now(), consent uuid null,
  status text, attempts integer, locked_at timestamptz null,
  lock_token uuid null, sent_at timestamptz null, provider_id text null,
  last_error text null
)
```

Kontaktärende/samtyckesändring och deras kömeddelanden skrivs i samma transaktion.
`key` är den beständiga affärsidempotensnyckeln och används även mot Resend.
Konsumenten tar ett tidsbegränsat lease/visibility-claim, registrerar försök och
utfall, och kan bara markera skickat med rätt lease. Fel återplaneras; permanent
fel syns i admin/övervakning. Allt väsentligt ska vara beständigt innan leverantör
anropas.

Den lokala modellen använder en beständig Postgres-tabell, tidsbegränsade leases,
`SKIP LOCKED`, beständig idempotensnyckel och 24-timmarsgräns för osäkra providerutfall.
PGMQ utvärderades men används inte i denna implementation. Rå dubbel-opt-in-token får inte bara lagras som en oåterställbar hash
om en senare worker ska skicka länken; lagra tillräcklig krypterad/recoverable
leveransdata eller mynta och persist token atomärt före sändning.

En autentiserad scheduler kan väcka konsumenten, men ersätter inte kön. Vercel återförsöker
inte ett misslyckat cron-anrop och Hobby kan bara köra dagligen; välj före aktivering
en betald Vercel-cadence eller Supabase Cron/Edge Function som möter utlovad
latens. Skydda jobb-routen med den konfigurerade `CFD_JOB_SECRET`.

Källor: [Supabase Queues](https://supabase.com/docs/guides/queues),
[PGMQ](https://supabase.com/docs/guides/queues/pgmq),
[transaktionell Postgres-kö](https://supabase.com/kb/faqs/database/postgres-as-message-queue),
[Vercel Cron-begränsningar](https://vercel.com/docs/cron-jobs/manage-cron-jobs),
[Supabase Cron](https://supabase.com/docs/guides/cron).

## 3. Resend, samtycke och React Email

Behåll `resend@6.37.0` (MIT). Välj den konsoliderade `react-email@6.11.6`
(MIT, Node `>=20.19.0`, React/React DOM `^18 || ^19`) för mallar. Den exporterar
komponenter **och** renderer direkt:

```ts
import { Button, Container, Head, Html, Text, render } from "react-email";
```

Detta verifieras mot
`resend/react-email@096fe9d2b1c064a3509ffdc1b7395ae047c4434c`:
`packages/react-email/src/index.ts` återexporterar `@react-email/render` och
komponenterna. De äldre separata paketen `@react-email/components@1.0.12` och
`@react-email/render@2.2.0` är inte det valda v6-spåret; det förstnämnda har
upstream markerats som utfasat. Ta bort dem ur lockfile innan mallen använder
det konsoliderade importformatet. React Email v6 uppger uttryckligen stöd för
React 19.2 och Next 16.

`nodemailer@10.3.1` (MIT-0, Node `>=20`) är endast en explicit konfigurerad
SMTP-reserv/testadapter. En installation innebär inte fallback: om Resend är
primärleverantör får systemet inte försöka SMTP efter ett oklart Resend-resultat
och därmed riskera dubbla sändningar.

Databasen är samtyckessanningen: normaliserad adress, oföränderliga
samtyckeshändelser, textversion, token-hash/utgång, bekräftelse/återkallelse,
suppressionsstatus och unika leveransnycklar. Resend Contacts/Segments är en
leverantörsprojektion, inte ett samtyckesregister. Resend idempotensnycklar
behålls bara 24 timmar; unik databasnyckel måste leva längre.

Resend-webhooks läser rå body, verifieras med SDK/Svix-hemlighet innan parsing
och dedupliceras på provider-event-ID innan bounce/complaint/unsubscribe påverkar
lokal status. Retries/replays innebär att dubbletter är normala. Aldrig marknads-
utskick till pending, withdrawn, bounced eller complained mottagare.

Källor: [React Email v6](https://resend.com/blog/react-email-6),
[React Email-komponenter](https://react.email/components),
[Resend idempotens](https://resend.com/features/email-api),
[24 h idempotensfönster](https://resend.com/changelog/batch-idempotency-keys/),
[rå webhook-verifiering](https://resend.com/changelog/managing-webhooks-via-api),
[retries/replays](https://resend.com/features/webhooks),
[Contacts/Segments](https://resend.com/changelog/new-contacts-experience).

## 4. Stripe Checkout och biljetter

`stripe@23.1.0` är MIT och kräver Node `>=20`; den är kompatibel med Node 24.
Använd servergenererad hosted Checkout i SEK. `@stripe/stripe-js` behövs inte
för den första redirect-baserade Checkout-varianten. Referensprojektet
`stripe-samples/checkout-one-time-payments` används endast för mönster/testläge.

Skapa en kapacitetssäker reservation och unik affärsnyckel i en transaktion innan
Checkout Session skapas. Lägg reservation/event/pris-referenser i metadata.
Success-URL visar bara resultat. Biljett skapas först när en signerad webhook har
persistats unikt på Stripe event-ID och reservationen atomärt övergått till paid.
Hantera `checkout.session.completed`, `checkout.session.async_payment_succeeded`
och `checkout.session.async_payment_failed`; utgångna/avbrutna reserveringar
släpper platser atomärt.

Webhooken använder raw request body, `Stripe-Signature`, endpoint secret och
`stripe.webhooks.constructEvent` innan affärslogik. Testläge och signerade
fixtures/Stripe CLI krävs före live-aktivering.

Källor: [Checkout-exemplet](https://github.com/stripe-samples/checkout-one-time-payments),
[server-side fulfillment](https://docs.stripe.com/payments/existing-customers?platform=web&ui=stripe-hosted),
[stripe-node webhook-signering](https://github.com/stripe/stripe-node#webhook-signing).

## 5. shadcn, dnd-kit och axe

`shadcn@4.23.0` är MIT och kopierar komponentkälla till projektet. Det är inte
infört här: de befintliga React/HTML-komponenterna täcker nuvarande adminflöden.
Om det väljs senare ska varje lokal källkomponent och dess beroenden granskas
separat; kör inte en hel scaffold eller ändra den publika designen.

dnd-kit är inte infört. Kanban använder vanliga kontroller för flyttning, vilket
fungerar med tangentbord och håller servern som auktoritet för medlemskap,
tillåten status och ordning. En framtida drag-and-drop-funktion kräver ett eget
kompatibilitets- och tillgänglighetstest innan ett dnd-kit-paket läggs till.

`@axe-core/playwright@4.14.0` och `axe-core@4.14.0` är MPL-2.0.
Playwright-paketet kräver Node `>=22.12.0` och `playwright-core >=1`; Node 24 och
projektets Playwright uppfyller detta. Lägg till axe-kontroller i relevanta
webbläsarregressioner men följ upp varje regel manuellt.

Källor: [shadcn manuell installation](https://ui.shadcn.com/docs/installation/manual),
[shadcn källmodell](https://ui.shadcn.com/docs/new),
[dnd-kit sensorer](https://dndkit.com/react/guides/sensors/),
[dnd-kit tangentbord](https://dndkit.com/extend/sensors/keyboard-sensor/),
[legacy-dokumentationens status](https://github.com/dnd-kit/docs).

## Aktiveringsgränser

Kod och mock/testfixtures bevisar inte: Supabase-projekt/migrering/RLS-test mot
riktig testdatabas, Auth redirect-URL/MFA-policy/backup-restore, Resend
domän/SPF/DKIM/DMARC/API- och webhookhemligheter, Stripe-konto/webhook/testläge,
Vercel/Supabase scheduler och larm, eller föreningens beslut om rättslig grund,
biträdesavtal, gallring, export och access owners. Dessa förblir uttryckliga
externa beslut/aktiveringar och får inte beskrivas som produktionsverifierade
förrän bevis finns.
