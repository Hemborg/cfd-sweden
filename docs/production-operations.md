# CFD Sweden – hostad driftinstruktion

> Status 2026-11-03: detta är en instruktion för en framtida, manuellt
> kontrollerad staging- och produktionssättning. Den innebär inte att CFD Sweden
> är produktionsklar och bekräftar inte att någon hostad databas, miljövariabel
> eller extern tjänst har konfigurerats.

## Nuvarande verifierade läge

- `main` är `50860d9`. PR #3 och PR #4 är öppna; PR #4:s tidigare
  granskningsunderlag är `24f868b`.
- Vercel-projektet `cfd-sweden` finns i teamet `hemborg-5741s-projects`. Inga
  projektmiljövariabler har lagts till där enligt den granskade inställningssidan.
- Ingen CFD Sweden-databas eller hostad staging-miljö finns verifierad.
- Det inloggade Supabase-kontots två fria projekt används redan för andra
  ändamål. Gränssnittet blockerar
  nya fria projekt på grund av tvåprojektsgränsen.
- Ändra, pausa, radera eller flytta aldrig de andra projekten för denna
  webbplats. Uppgradera inte plan och skapa inte nytt konto utan ett nytt,
  uttryckligt beslut.
- Det finns för närvarande 0 artiklar och 0 evenemang i både `main` och denna
  leveransgren, alltså inget innehåll att importera.

Supabase Free har två fria projekt per ägare/administratör över organisationer;
ett fritt projekt kan dessutom pausas vid låg aktivitet. Se [Supabases
billing-dokumentation](https://supabase.com/docs/guides/platform/billing-on-supabase)
och [pausningsregler](https://supabase.com/docs/guides/platform/free-project-pausing).

## Målarkitektur

```text
Besökare / redaktör
        │
        ├── Next.js på Vercel
        │       ├── FormSubmit → cfdsweden@proton.me
        │       └── Supabase-klient (endast publishable/anon-nyckel)
        │
        └── Supabase per miljö
                ├── Auth: interna konton och TOTP-MFA
                ├── Postgres: RLS, profiler, roller, redaktionellt innehåll
                └── service-role: endast betrodd serverkod, aldrig browsern
```

Använd två separata Supabase-projekt när kvot och uttryckligt beslut tillåter:
ett för staging och ett för produktion. Välj specifika **North EU (Stockholm),
`eu-north-1`**, om tillgängligt. Den breda regionen `Europe` kan även placera
data i London eller Zürich och är därför inte ett EU-specifikt dataresidensval.
[Supabases regiondokumentation](https://supabase.com/docs/guides/platform/regions)

## Begränsat första plattformsläge

När en hostad miljö först är verifierad används följande avsiktliga läge. Alla
hemligheter lagras i Vercel/Supabase, aldrig i Git eller `.env.example`.
De namngivna av/på-värdena nedan är releasekrav och granskningsunderlag; de får
inte ensamma tas som bevis på att en funktionsmodul är avstängd. Varje faktisk
grind ska verifieras mot den commit som ska sättas i staging.

```dotenv
CFD_PLATFORM_ENABLED=true
CFD_CONTACT_BACKEND=formsubmit
CFD_SITE_URL=https://<staging-eller-produktionsdomän>
NEXT_PUBLIC_SUPABASE_URL=https://<projekt-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-nyckel>
SUPABASE_SERVICE_ROLE_KEY=<endast-server-hemlighet>
CFD_RATE_LIMIT_SECRET=<unik-slumphemlighet>
CFD_EXTERNAL_SERVICES_APPROVED=true  # endast efter verifierad hostad miljö
CFD_MAIL_TRANSPORT=disabled
CFD_MAIL_MODE=test
CFD_MAIL_FROM=
CFD_MAIL_OPERATIONS=cfdsweden@proton.me
CFD_RESEND_ENABLED=false
CFD_STRIPE_ENABLED=false
CFD_NEWSLETTER_ENABLED=false
CFD_EVENT_REGISTRATION_ENABLED=false
CFD_COMMENTS_ENABLED=false
CFD_MAIL_ENABLED=false
```

`CONTACT_BACKEND=formsubmit` med mottagaren `cfdsweden@proton.me` är fortsatt
standard för **Kontakta oss** och **Gå med**. Flödena är varken medlemsdatabas
eller administratörskonto. Resend, Stripe och SMTP konfigureras inte nu.

## Databasens migrationskälla

Migreringsfilerna i `supabase/migrations/` är enda källan till schema. Gör inga
strukturella ändringar via Supabase Dashboard, SQL Editor eller Table Editor
efter att migrationsflödet tagits i bruk: det kringgår historiken och kan göra
att `db push` hamnar ur synk. En samordnad aktör kör varje fjärrdeploy.
[Officiell migrationsguide](https://supabase.com/docs/guides/deployment/database-migrations)

Följande **17** filer är den avsedda serien. Artikelplanering ska ha det unika
prefixet `202611030160`; det ersätter det tidigare, inte deployade, dubbla
prefixet `202611030040`.

1. `202611020001_forms_prototype.sql`
2. `202611030010_platform_foundation.sql`
3. `202611030020_communications.sql`
4. `202611030030_editorial_events.sql`
5. `202611030040_community.sql`
6. `202611030050_public_reads.sql`
7. `202611030060_community_fixes.sql`
8. `202611030070_communication_fixes.sql`
9. `202611030080_event_fixes.sql`
10. `202611030090_rate_limit_retention.sql`
11. `202611030100_communications_consent_epoch.sql`
12. `202611030110_community_invitation_rpc.sql`
13. `202611030120_communications_permissions.sql`
14. `202611030130_free_event_confirmation.sql`
15. `202611030140_editor_events.sql`
16. `202611030150_communications_lease_recovery.sql`
17. `202611030160_article_scheduling.sql`

### Stagingpreflight och kontrollerad deploy

1. Kontrollera exakt den godkända serien och ett unikt versionsprefix per fil.
   Byt aldrig namn på en migration som redan är hostad; skapa i stället en ny.
2. Kör den lokala migrations- och testsviten mot den isolerade testdatabasen.
   Det är inte bevis för hostad funktion.
3. När staging faktiskt skapats och behörighet verifierats, skapa/reparera
   CLI-konfiguration med `supabase init` utan att ersätta filerna i
   `supabase/migrations/`. Granska och versionshantera den genererade
   `supabase/config.toml` innan användning.
4. Länka endast staging: `supabase link --project-ref <STAGING_REF>`.
5. Kör `supabase migration list --linked`. Om projektet inte är tomt eller
   historiken avviker: avbryt och dokumentera skillnaden.
6. Granska `supabase db push --linked --dry-run`. Kör sedan stagingdeployen:
   `supabase db push --linked`, utan seed.
7. Spara commit-SHA, projektref, migreringslista före/efter och resultat av
   RLS/Auth-smoketester. Processreturkod ensam är inte ett godkännande.

Använd aldrig `supabase db reset --linked` eller reset med extern `--db-url`;
det är destruktivt. `supabase db pull --linked` används endast för att fånga en
medveten existerande remote-ändring före fortsatt lokal utveckling, inte för att
normalisera okända produktionsändringar. [Miljö- och
migrationsflöde](https://supabase.com/docs/guides/deployment/managing-environments)

Flaggorna är kontrollerade mot [CLI-referensen](https://supabase.com/docs/reference/cli/supabase-db-push).

### Supabase-specifika förutsättningar

Migreringarna kräver hostad Supabase, inte generisk PostgreSQL: de refererar
`auth.users`, installerar en trigger på `auth.users` och använder `auth.uid()`
och `auth.jwt()` i RLS/behörighetsfunktioner. Flera funktioner är `security
definer`; installera dem bara genom den kontrollerade migrationsvägen. Serien
använder både `gen_random_uuid()` och `pg_catalog.gen_random_uuid()`, så hela
serien ska testas på den verkliga stagingversionen innan produktion.

## Första verkliga superadmin utan SMTP

Detta sker endast i en uttryckligen godkänd staging-miljö av en utsedd
operatör. Ingen publik registrering, inbjudan eller e-postleverans används.

1. Öppna **Authentication → Users** i Supabase Dashboard och skapa den namngivna
   administratören med starkt unikt lösenord och bekräftad e-post. Alternativt
   får en betrodd engångsserver använda
   `auth.admin.createUser({ email, password, email_confirm: true })`.
   Service-/secret-nyckeln får aldrig hamna i browsern.
   Stäng först av **Allow new users to sign up** och anonym inloggning i Auth.
   Ange miljöns exakta Site URL och tillåtna callback-URL:er, utan produktionsnycklar i staging.
2. Kontrollera att triggern `auth_profile_created` skapade rätt profilrad och
   notera UUID:t. Som den utsedda operatören i SQL Editor, och endast efter
   kontroll av UUID:t, aktiveras första superadmin:

   ```sql
   update public.profiles
   set approved = true, suspended = false
   where id = '<VERIFIERAD_AUTH_UUID>'::uuid;

   insert into public.user_roles (user_id, role)
   values ('<VERIFIERAD_AUTH_UUID>'::uuid, 'superadmin')
   on conflict do nothing;
   ```

   Detta krävs före att admin-UI:t kan administrera första användaren eftersom
   `set_user_access` redan kräver en inloggad superadmin.
3. Logga in, enrolera TOTP med authenticator-app och slutför challenge/verify.
   Privilegierade roller kräver AAL2; kontrollera därför ett faktiskt adminläs-
   och skrivtest efter MFA.
4. Lägg därefter till interna konton ett i taget med minsta nödvändiga roll och
   egen MFA-verifiering.

Avstängd publik signup betyder att bara befintliga användare kan logga in.
Manuellt bekräftad första användare undviker ett inbjudningsflöde som kräver
e-post. [Auth-konfiguration](https://supabase.com/docs/guides/auth/general-configuration),
[createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser),
[användar-/inbjudningsflöden](https://supabase.com/docs/guides/auth/users) och
[TOTP-MFA](https://supabase.com/docs/guides/auth/auth-mfa/totp).

## Kontrollerad innehållsimport

`scripts/platform-import-content.mts` är avsiktligt skyddad: standardläge
inventerar, `--sql` genererar `.test-platform/content-import.sql` utan
databasanslutning och `--apply-local` vägrar hostade databaser. Försvaga inte
de spärrarna.

När innehåll faktiskt finns ska operatören först skapa och granska SQL lokalt
med en verifierad profil-UUID:

```powershell
$env:CFD_CONTENT_IMPORT_OWNER = '<VERIFIERAD_AUTH_UUID>'
npm exec tsx scripts/platform-import-content.mts --sql
```

Kontrollera att endast förväntade `insert`-satser finns, att
`author_id`/`created_by` pekar på godkänd profil och att antalet rader matchar
källinnehållet. Först därefter får en separat, loggad och godkänd stagingimport
göras i transaktion med `ON_ERROR_STOP`. Ingen webbappkod ska få fjärrimportera.
Importera aldrig produktion före verifierade stagingresultat.

## Backup, återställning och beviskrav

Före varje framtida hostad migrering eller import ska operatören ta en
återställningsbar, krypterat lagrad logisk backup. Supabases rekommenderade
CLI-upplägg är separata dumpfiler för roller, schema och data:

```text
supabase db dump --linked -f roles.sql --role-only
supabase db dump --linked -f schema.sql
supabase db dump --linked -f data.sql --use-copy --data-only
```

En backup räknas inte som verifierad förrän filerna finns, är krypterat skyddade
utanför repot och har ett dokumenterat återställningstest i en isolerad,
icke-produktionsmiljö. Lägg aldrig dumpfiler, databaslösenord, service-nycklar
eller persondata i publika GitHub. Vid återställning måste egna LOGIN-rollers
lösenord sättas om; Storage-objekt ingår inte i databasbackupen. Anpassningar
ovanpå `auth`/`storage` hanteras särskilt; triggern på `auth.users` kommer från
migreringarna. [Backupguide](https://supabase.com/docs/guides/platform/backups)
och [CLI-återställning](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

De tre dumpkommandona är inte ensamma ett verifierat komplett Auth-återställningspaket.
CLI undantar hanterade scheman som `auth` och `storage` som standard. Den hostade
återställningsövningen måste uttryckligen omfatta Auth-identiteter, profilernas
foreign keys, TOTP, sessionsåterkallelse och eventuella Storage-filer enligt
leverantörens återställningsprocess. Kör därefter negativa RLS-tester på målet;
enbart samma tabellantal räcker inte som produktionsbevis.

## Stagingacceptans och produktionsgrind

Hostade syntetiska stagingtester är blockerade eftersom CFD-staging saknas. När
den finns ska följande ha verifierbara bevis: unik migrationhistorik före/efter,
superadmin med TOTP/AAL2, RLS för anonym och inloggad användare, fortsatt
FormSubmit till `cfdsweden@proton.me`, frånvaro av aktiva mail-/nyhetsbrev-/betal-
nings-/eventregistrerings-/kommentarflöden, mobil- och desktopkontroll samt
backup- och återställningsacceptans.

**Först efter separat uttryckligt godkännande av stagingbevisen får någon skapa
eller ändra produktionsdatabas, produktionsmiljövariabler eller publicera
plattformsläge.**

## Redaktionellt ansvar och styrning som återstår

Elaine kan lämna artikeltext, rubrik, ingress, författare, taggar och önskat datum
till utsedd redaktör, eller använda administrationen om föreningen tilldelar
henne redaktörsroll. Spara utkast, öppna den privata förhandsgranskningen och välj
sedan Publicerad. Ett framtida UTC-datum håller artikeln dold tills tiden infaller.
Ändra Status till Utkast för att avpublicera; URL-sluggen ska behållas vid redigering.
Statiska webbtexter och marknadssidor är versionsstyrd kod och ändras genom
normal Git-granskning. Före skarp drift återstår beslut om personuppgiftsansvar,
retention, integritetstext, incident-/återställningsansvar, redaktionsprocess,
administratörsroller och varje extern tjänst.
