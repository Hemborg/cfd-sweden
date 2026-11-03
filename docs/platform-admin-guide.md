# Administratörs- och redaktörsguide: CFD Sweden

Den här guiden gäller efter en godkänd plattformsaktivering. Den beskriver de
faktiska vyerna under `/admin`, inte en påstådd skarp konfiguration av externa
tjänster.

## Behörigheter, konto och MFA

Alla konton skapas genom en inbjudan. Kontakt- och nyhetsbrevsformulär skapar
varken medlemskap eller konto. Administrativa vyer kräver en godkänd, ej
avstängd profil och TOTP-MFA (AAL2). Medlemmen använder medlemsportalen utan
MFA men har inte administrativ åtkomst.

| Uppdrag | Faktiska arbetsytor |
| --- | --- |
| Superadmin | Alla arbetsytor och ändring av roller, godkännande och avstängning. |
| Administratör | Kontaktärenden, nyhetsbrev, användare, system/drift, evenemang, grupper, kampanjer, projekt och nyheter. |
| Redaktör | Nyheter och evenemang. Ingen deltagarlista, återbetalningsavstämning, användar- eller kontaktåtkomst. |
| Gruppansvarig | Egna grupper, deras kampanjer och projekt/Kanban. |
| Moderator | Kommentarer och moderering. |
| Medlem | Medlemsportal, egna grupper och relevanta projekt/uppgifter. |

1. I en tom databas skapar utsedd driftansvarig första Auth-användaren,
   motsvarande profil och ett `superadmin`-uppdrag enligt driftguiden. Gör det
   i godkänd Supabase-administration, aldrig med klientnyckel.
2. Under **Administration → Användare**, fyll i namn och e-post under **Bjud
   in medlem**. Länken hamnar i leveranskön och mottagaren väljer lösenord via
   sin engångslänk.
3. **Skicka ny kontolänk** är för ett redan godkänt, aktivt konto. Länken går
   alltid till kontots verifierade adress och kan inte omdirigeras av admin.
4. **Logga in → Glömt lösenordet?** ger ett medvetet generellt svar som inte
   avslöjar om en adress har konto.
5. Användaren öppnar **Säker inloggning**, aktiverar sin autentiserare och
   verifierar engångskoden innan administrativt arbete.

Ha minst två aktiva superadmins. Vid förlorad MFA använder den andra
superadminen den dokumenterade Supabase-adminprocessen och noterar åtgärden i
revisionsspåret. Saknas sådan person används föreningens break-glass-procedur.

## Kontaktärenden

Öppna **Kontaktärenden**. Sökning, statusfilter, nyast/äldst-sortering och
sidindelning gäller listan. Välj ansvarig och uppdatera statusen i ordningen
`new`, `in_progress`, `responded`, `closed`. Extra uppgifter visas med svenska
etiketter där sådana finns.

CSV-export ska endast göras för dokumenterat, godkänt behov. Radering är
permanent. Superadmin kan under **System och drift** aktivera automatisk
gallring först efter att föreningen angett dagar, beslutsreferens och bekräftat
beslutet. Kontaktuppgifter är inte en medlems- eller nyhetsbrevskälla.

## Nyhetsbrev

I **Nyhetsbrev** visas prenumeranter och status. Bara `confirmed`, ej
suppressed samtycken kan tas med i kampanj. `pending` saknar double opt-in och
`withdrawn` får inte återupptas utan en ny frivillig prenumeration.

1. Skapa utkast med ämnesrad, HTML och textversion. Kontrollera den sandboxade
   förhandsvisningen.
2. Spara som utkast eller ange **Schemalägg (valfritt, UTC)**. Tiden tolkas
   alltid som UTC, även om datorn har en annan lokal tidszon.
3. **Köa utskick nu** gör kampanjen redo för arbetaren. Leveranser skapas
   individuellt endast för bekräftade, ej spärrade mottagare.
4. Avbryt från `draft`, `scheduled`, `sending` eller `queued` när utskicket
   måste stoppas. Redan bekräftad extern leverans kan inte tas tillbaka.

`queued` betyder köad. `sent` betyder att berörda meddelanden accepterats av
vald transport, inte att någon läst mejlet. `failed` behöver uppföljning och
`cancelled` har spärrat återstående köposter. Signerade leverantörswebhooks kan
markera enskilda meddelanden som `delivered`, `bounced` eller `complained` i
**System och drift**.

## Nyheter och kommentarer

Redaktör eller administratör arbetar i **Nyheter**. Fyll i URL-namn, rubrik,
ingress, Markdown, taggar och vid behov SEO-rubrik/-beskrivning. Spara som
`draft` för intern kontroll. `published` uppdaterar detaljsida, lista, RSS,
sitemap och metadata utan Git-commit. Att återställa till `draft` döljer
innehållet igen.

Kommentarer till publicerade artiklar hamnar först i modereringskön. Under
**Moderering** väljer moderator eller administratör `approved`, `rejected`,
`hidden` eller `deleted`. Anmälningar syns som antal; e-postadresser visas inte.

## Evenemang

Redaktör eller administratör kan skapa och ändra evenemang under **Evenemang**:
URL-namn, beskrivning, arrangör, plats, kapacitet, SEK-pris, extern länk,
publicering och om anmälan är öppen. Datum och tider anges och visas som UTC.
Kontrollera alltid ett utkast med en vanlig besökarsession innan publicering.

Administratörer ser deltagarlista, sökning, CSV-export, incheckning och kan
avboka en registrering eller ställa in hela evenemanget. Avbokning kan befordra
äldsta väntelisteplatsen. Publicerade inställda evenemang behåller sin URL.

Kostnadsfria anmälningar använder e-postbekräftelse när den funktionen är
aktiverad; registrering och biljett skapas först efter korrekt bekräftelse.
Betalda evenemang skapar aldrig biljett från success-URL: endast signerad
Stripe-webhook bekräftar betalning. Återbetalningar görs inte automatiskt.
**Återbetalningsavstämning** visar poster som behöver hanteras enligt beslutad
policy; gör eventuell Stripe-åtgärd där och invänta webhookstatus.

## Arbetsgrupper, kampanjer och projekt

I **Arbetsgrupper** skapar administratör grupper, sätter namn, syfte och
publik visning. Bjud endast in redan godkända medlemmar med deras befintliga
adress. Välj deltagare eller gruppansvarig. Publicera uppdateringar bara när de
uttryckligen får vara publika; privat syfte och medlemskap får aldrig kopieras.

I **Kampanjer** skapar administratör eller ansvarig för sin grupp en kampanj
med URL-namn, mål, grupp, status och eventuell publik visning. Tilldela
ansvarig eller medverkande till godkända medlemmar. Gruppansvariga kan bara
hantera kampanjer för grupper de leder.

I **Projekt och Kanban** kopplas projekt till arbetsgrupp eller kampanj. Skapa
uppgifter med kolumn, prioritet, förfallodatum och ansvarig. Kolumnerna är
Backlog, Att göra, Pågår, Granskning och Klart. Kort flyttas med vanliga knappar
eller tangentbord och sparas direkt. Välj uppgift för detaljer,
aktivitetslogg och kommentarer; filtrera på ansvarig, status och förfallodatum.

## System och drift

Öppna **System och drift** dagligen. Kontrollera workersignal, köstatus
`retry`, `failed` och `unknown`, plus leveransstatus. `unknown` innebär osäkert
transportutfall och ska avstämmas manuellt mot providerunderlag; återköa inte
blint. En utgången SMTP-lease blir osäker direkt. Resend kan återförsökas med
samma idempotensnyckel under sitt begränsade fönster.

Granska revisionsspåret efter känsliga ändringar. Stoppa den autentiserade
mail-schedulern före återställning eller allvarlig incident. Håll
`CFD_JOB_SECRET` hemlig; den används endast mellan scheduler och
`/api/jobs/mail`.

## Redaktörens checklista

1. Kontrollera URL-namn, svensk copy, länkar, bildrättigheter och datum.
2. Spara som utkast och kontrollera detaljsidan utloggad.
3. Publicera först efter innehållsansvarigs godkännande.
4. Kontrollera listning, metadata och RSS efter publicering.
5. Uppdatera samma post eller evenemang vid korrigering; ändra inte URL-namn
   utan starkt skäl.

## Innan extern aktivering

Resend kräver godkänd avsändardomän, SPF/DKIM/DMARC, webhookhemlighet,
samtyckestext och dataskyddsbeslut. Stripe kräver testkonto, signerade
webhookar, finansansvarig samt skatte-, avgifts- och återbetalningspolicy innan
live-nycklar används. Se `docs/platform-operations.md` för exakt konfiguration,
backup, återställning, scheduler och incidenthantering.
