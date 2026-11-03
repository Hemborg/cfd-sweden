# Formulär- och samtyckesprototyp

Den publicerade startsidans FormSubmit-formulär är medvetet oförändrat. Det skickar fortsatt till `cfdsweden@proton.me` och är det enda befintliga skarpa flödet. En omdirigering till `/tack` bevisar inte leverans till inkorgen.

Den nya prototypen finns lokalt på `/experiment/formular`. Starta den endast så här:

```powershell
$env:CFD_FORM_DEMO_ENABLED = "true"
npm run dev -- --hostname 127.0.0.1
```

API-rutterna kräver både den flaggan och en loopback-host (`localhost`, `127.0.0.1` eller `::1`). På Vercel är de alltid spärrade. De lagrar data i processminne, skickar aldrig mejl och anropar aldrig Supabase eller Resend, även om miljövariabler skulle finnas. Skrivningar från en webbläsare måste ha samma HTTP-origin, inklusive port. Minnet försvinner när servern stängs. Detta är därför inte ett register för riktig persondata.

## Flöden

- `POST /api/demo/contact`: Zod-validerad och normaliserad intresseanmälan. Honeypot, 16 KiB-gräns, en processlokal hastighetsbegränsning och UUID-idempotens skyddar demot. Återanvänds samma nyckel med ändrat innehåll returneras konflikt. Processlokal begränsning fungerar inte över flera instanser och är inte ett produktionspåstående. Den litar inte på klientskickad `X-Forwarded-For`.
- `POST /api/demo/newsletter/request`: kräver uttryckligt `consent: true`. Skapar `pending` och ett 32-bytes testtoken. Token lagras endast som SHA-256-digest och har 24 timmars giltighet.
- `POST /api/demo/newsletter/confirm`: är en POST, alltså gör ett klick eller en GET aldrig en förändring. Token kan användas en gång; bekräftelse övergår till `confirmed` och rensar token-digesten.
- `POST /api/demo/newsletter/unsubscribe`: övergår till `withdrawn`. Nyhetsbrevssamtycke är helt skilt från intresseanmälan och är aldrig förvalt.

I en riktig implementering krävs en transaktion/atomisk `update ... where status = 'pending' and confirm_token_hash = ... and expires_at > now()` så två samtidiga bekräftelser inte båda lyckas. Migreringen innehåller den SQL-funktionen; minnesadaptern testar också att ett token bara kan konsumeras en gång, men är inte distribuerad eller transaktionell.

## Databas och åtkomst

`supabase/migrations/202611020001_forms_prototype.sql` definierar tabeller och aktiverar RLS utan klientpolicyer. Den har inte körts. Fyra RPC-funktioner har tom `search_path`, återkallad exekveringsrätt för PUBLIC/anon/authenticated och rättigheter för service_role. Tabellrättigheterna begränsas också. Statiska kontrolltester av SQL-texten är inte verkliga RLS-integrationstester.

Supabase-adaptern tar en uttryckligen injicerad klient och mappar SQL-rader till den typade modellen. Ingen route skapar den. Service-nyckeln får aldrig nå klienten eller Git. Adaptrarna vägrar instansiering i webbläsaren, men ett framtida produktionsbygge måste också granska importgränsen och nycklarnas servermiljö.

## Idempotens och samtyckesbevis

Kontaktpost och notifieringsavsikt sparas atomiskt. Samma UUID med samma normaliserade data återanvänder posten; ändrade data med samma UUID ger 409. UI behåller nyckeln vid nätverksfel och kräver ett nytt testinskick efter framgång.

En prenumerationsförfrågan och notifieringsavsikt sparas atomiskt. Minnesadaptern gör detta synkront, SQL använder ett transaktionslås per adress och radlås. En fortfarande giltig pending-förfrågan återanvänds; den skapar inte en ny token eller köpost. Den första testresponsen innehåller råtoken, endast hash och utgångstid lagras. Om den responsen förloras kan testet startas om med en annan testadress eller serveromstart; säker återleverans av bekräftelse är en produktionsuppgift.

Bekräftad prenumeration återställs inte av en ny förfrågan. Återkallelse ogiltigförklarar bekräftelsen; ny registrering efter återkallelse får nya tokens. Händelsehistoriken behåller källa, textversion och tid för requested/confirmed/withdrawn. Utgångna och återkallade bekräftelser avvisas. Nuvarande textversion är uttryckligen `unreviewed-prototype`.

## Vad som inte är ett färdigt utskickssystem

Outboxen visar **avsikten att notifiera**, inte ett levererat mejl. Ingen köarbetare/dispatcher finns. Den innehåller inga återställbara råtokens. För skarp bekräftelseleverans behövs en granskad lösning som utfärdar token vid dispatch eller lagrar ett krypterat leveransunderlag, atomisk claim/lease, återförsök och provider-idempotens. Resend-adaptern i `lib/forms/mail.ts` är separat testad med fakes; den är inte kopplad till outbox, bekräftelse eller återkallelse. Dess framtida `/nyhetsbrev/bekrafta`-länk är en adapterkonvention, inte en färdig publik route.

Även kontaktstatus hos Resend, dubblett-/återregistreringshantering, avregistreringssynkronisering, suppression och studs/klagomål kräver integrationsarbete. Det räcker alltså **inte** att lägga in API-nycklar för att få ett produktionsklart flöde. Lokal demonstrationskedja och mockade adapteranrop är det som har byggts och testats.

## Innan skarp start

Föreningen behöver fatta dokumenterade beslut om personuppgiftsansvarig, ändamål och rättslig grund, vilka som har åtkomst, gallringstid, personuppgiftsbiträden, incidenthantering och avregistreringsrutin. Konfigurera därefter Supabase, Resend-domän/avsändare, säker tokenlagring och en distribuerad rate limit. Kör integrations- och leveranstest med en sandbox/testadress. Det här dokumentet är inte ett påstående om GDPR-efterlevnad.
