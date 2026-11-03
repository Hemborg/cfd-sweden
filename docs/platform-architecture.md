# Föreningsplattformens arkitektur

Detta dokument ersätter prototypbeskrivningen för den valbara föreningsplattformen.
Den publika webbplatsens svenska profil, logotyp, innehåll och tidigare URL:er behålls.

## En modulär monolit

Next.js 16/React 19 ansvarar för publika sidor, medlemsportal och `/admin`.
Server Actions används för inloggad administration; Route Handlers används för
publika formulär, exportsvar, jobb och signerade providerwebhookar. Zod validerar
gränserna. Supabase Auth är enda identitetskälla och PostgreSQL är auktoritativt för
profiler, roller, ärenden, samtycke, innehåll, grupper, uppgifter och bokningar.

`lib/platform` samlar konfiguration, serverklienter, session/rollkontroll, origin-
kontroll, begränsade request bodies, HMAC-baserade hastighetsgränser och CSV-skydd.
`lib/communications`, `lib/editorial`, `lib/events` och `lib/community` är separata
domäner som delar identitet, databas och revisionsspår.

Publika innehållsläsningar använder anon-klienten och RLS. Skyddad CRUD använder
användarens JWT/sessionklient. Service role används endast efter explicit
serverkontroll där en anonym besökare, verifierad webhook eller jobb behöver en
avgränsad privilegierad operation. Den nyckeln är aldrig en webbläsarvariabel.

## Åtkomst

| Roll | Åtkomst |
| --- | --- |
| Superadmin | Samtliga moduler, rolltilldelning, avstängning, driftpolicy |
| Administratör | Verksamhet, innehåll, kontakt, utskick, kontoinbjudan, evenemang |
| Redaktör | Redaktionella nyheter och evenemang |
| Gruppansvarig | Tilldelade grupper, kampanjer och projekt |
| Moderator | Kommentarskö, anmälningar och modereringsbeslut |
| Medlem | Egna gruppers projekt, kommentarer och uppgifter |

En användare kan ha flera roller. Administrativ åtkomst kräver TOTP/AAL2 både
i Next.js och PostgreSQL. Självgodkännande och egen rollhöjning är förbjudna.
Sista aktiva superadmin kan inte avaktiveras eller få rollen borttagen.
Publika gruppvyer visar en uttrycklig projektion, inte interna gruppfält.

## Kommunikation och samtycke

Kontakt skapar ärenden, aldrig medlemskonton eller prenumerationer. FormSubmit
är standard tills `CFD_CONTACT_BACKEND=database` godkänts separat.
Nyhetsbrev kräver frivilligt samtycke och tidsbegränsad engångslänk. Avregistrering
stoppar kvarvarande marknadsföringskö; nytt samtycke återaktiverar inte gamla utskick.

En gemensam beständig `queue_mail` använder unika affärsnycklar, låsta leases,
`SKIP LOCKED`, återförsök och terminala fel. Tokenpayloads krypteras med AES-GCM.
Providerresultat med okänd utgång återförsöks endast inom säkra idempotensramar.
SMTP används endast mot lokala syntetiska mottagare; Resend är extern adapter.
Worker kräver autentiserad scheduler. Webhookar verifieras mot rå body och lagras
som minimala kvitton. Inget kritiskt utskick lämnas åt processminne.

## Innehåll och aktiviteter

Aktiverad plattform läser nyheter och evenemang dynamiskt från PostgreSQL.
Publicering/avpublicering påverkar detaljsidor, metadata, RSS och sitemap direkt.
Filrepositories bevarar den befintliga sajten när plattformen är avstängd. Import
bevarar slugs och skriver aldrig över befintliga databasrader.

Evenemang låses transaktionellt vid bokning. Betalningar har separata, beständiga
försök med pris/valuta/reservation, så en försenad webhook inte kan bekräfta en ny
reservation av misstag. Checkout har 35 minuter, med ytterligare fem minuters
databasbuffert för verifierad webhook. Betalning efter förlorad reservation blir
återbetalningsärende, ingen extra biljett. Biljett skapas endast av verifierad
betalningshändelse; återbetalningar är monotona och gamla deltillstånd kan inte
återställa en redan återbetald biljett. Skarp återbetalning sker enligt beslutad
policy hos Stripe, inte genom en oavsiktlig adminknapp.

Kanban använder återanvändbara kort och formulär med vanliga statuskontroller.
Drag-and-drop infördes inte: samma funktion kan användas med tangentbord och
behöver inget ytterligare klientbibliotek. Kommentarer är text, publiceras först
efter moderering och exponerar inte privata e-postadresser.

## Driftgränser

Plattform, extern anslutning, Resend och Stripe har separata aktiveringsspärrar.
GitHub Actions använder en lokal Docker-stack och syntetiska data utan GitHub-
hemligheter eller deploybehörighet. Hosted Supabase, Resendleverans och Stripe
Checkout mot leverantörens testkonto måste verifieras separat före aktivering.
Se [driftguiden](platform-operations.md), [kravmatrisen](platform-requirements.md)
och [OSS-valen](oss-reuse.md).
