# Resend-adapter (ej aktiverad)

`lib/forms/mail.ts` är en liten serveradapter för Resend 6.37:s globala
Contacts-API. Den instansieras aldrig av applikationen, läser inga miljövariabler
och gör därför inga nätverksanrop i prototypen.

En framtida outbox-worker måste uttryckligen injicera en Resend-klient, en
verifierad avsändare och en HTTPS-basadress. Den ska skicka notifieringar till
`cfdsweden@proton.me`, använda samma idempotensnyckel vid försök att skicka om
e-post och inte logga mottagare eller leverantörsfel.

Modulen har metoder avsedda att skapa en kontakt efter verifierad bekräftelse
och sätta `unsubscribed: true` efter återkallelse. De anropas inte automatiskt
av prototypens samtyckesflöde. En framtida orkestrering måste kontrollera aktuellt
samtycke och hantera befintliga kontakter, providerfel och ordningen mellan
bekräftelse och återkallelse. Se `docs/forms.md` för återstående dispatcher,
tokenleverans, publik bekräftelsesida och återförsök. Konfiguration ensam räcker inte.
