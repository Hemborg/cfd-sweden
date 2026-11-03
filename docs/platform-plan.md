# Föreningsplattform: genomförandeplan

Beställning 2026-11-03. Bas PR #3 `9c40781`. Ny branch `codex/cfd-association-platform-20261103`. Separat PR; ingen merge eller produktionsaktivering.

## Arkitekturbeslut

Behåll Next.js och hela publika designen. Supabase Auth/SSR är den enda inloggningen. PostgreSQL är auktoritativ lagring för verksamhet, roller, samtycke, bokningar, rate limits och jobb. RLS gäller både direkta API-anrop och UI. Serverkontroller kompletterar RLS. Administrativa roller kräver MFA. FormSubmit är oförändrad reserv/default tills ett separat byte godkänts.

Återanvänd prototypens kontakt-, samtyckes- och outboxtabeller genom nya migrationer, inte en parallell produktionsmodell. Isolerade demotester bevaras som regressioner. Beständiga jobb med lease, SKIP LOCKED, begränsade retries och provider-idempotens ersätter processminne för viktig leverans. Externa adapters aktiveras explicit, aldrig genom bara förekomst av nycklar. SMTP till lokal fångstserver används för verklig lokal leveransverifiering; Resend/Stripe-sandbox redovisas separat.

Nyheter/evenemang får databasstödda repositoryfunktioner och request-time-publicering, med filbaserat innehåll som bevarad bas när plattformen inte är aktiverad. Samma publiceringsurval används i sida, detaljer, metadata, RSS och sitemap. Utkast skyddas i RLS.

## Faser och verifiering

1. Inventera alla befintliga moduler och regressioner; kontrollera OSS-val och lokala testförutsättningar.
2. Auth, roll-/gruppgränser, RLS, migrationer, syntetiska seeds, adminskal och verklig lokal PostgreSQL/Auth.
3. Kontakt, prenumeration, mallar, kö, kampanjutskick, webhooks och leveransstatus.
4. Grupp/campaign/project/task-medlemskap, Kanban, användaradministration och revisionsspår.
5. Redaktionellt innehåll, moderering, event, kapacitet, väntelista, betalning och biljettkontroll.
6. Enhets-, PostgreSQL/RLS-, Auth-, SMTP-, webhook-, samtidighets-, Playwright- och axe-tester. Bevara tidigare publika regressioner.
7. Drift/återställningsprov, guider, kravmatris med bevis och externa luckor, dependency audit, separat PR och grön CI.

## Gemensamma kontrakt för parallella moduler

- `lib/platform/config.ts`: `platformEnabled()`, `platformConfig()`; inga hemligheter i klientkod.
- `lib/platform/db.ts`: `createServiceClient()` server-only; `createSessionClient()` cookie/JWT-scopad. Använd sessionklienten för skyddad CRUD så RLS verkställs.
- `lib/platform/auth.ts`: `getActor()` returnerar `{ user, client, roles, aal, profile }` eller null; `requireActor()` / `requireRoles(roles)`; admin-MFA på server och i SQL.
- SQL `public.has_role(text[])`, `public.is_group_member(uuid)`, `public.can_manage_group(uuid)` finns i grundmigreringen. Rollvärden: `superadmin`, `administrator`, `editor`, `group_leader`, `moderator`, `member`.
- `/admin` är skyddat skal; varje domän har egen sida under `/admin/...` och egna validerade server actions/route handlers. Medlemsyta `/medlem` delar samma identitet och RLS.
- Ingen modul får logga råtokens, meddelanden, personuppgifter eller nycklar. Mutationer verifierar origin, indatastorlek och behörighet. Alla exportsvar är privata/no-store.
- Oberoende moduler äger egna migrationsfiler efter grundmigreringen och egna tester. Paket/låsfil, grundläggande auth och gemensamma verktyg har en ägare.

## Aktiveringsgränser

Inga externa produktionsändringar, skarpa personuppgifter, riktiga betalningar eller mejl till föreningsmedlemmar. Lokala syntetiska testmiljöer är godkända. Externa sandboxkonton/nycklar och föreningsbeslut hanteras som separata verifierings-/aktiveringskrav. Fullständighet får bara markeras med konkret bevis i kravmatrisen.
