# Releasechecklista: publik CFD Sweden med plattformen avstängd

Den här releasen avser den publika webbplatsen. Föreningsplattformens moduler
ligger kvar i repot men aktiveras separat. PR #4 ska granskas före merge;
denna kontroll innebär ingen produktionspublicering.

## Före en separat godkänd publicering

- [ ] Kontrollera grön CI på exakt den commit som ska publiceras.
- [ ] Sätt `CFD_PLATFORM_ENABLED=false` vid både bygge och körning. Endast det
  exakta värdet `true` aktiverar plattformen.
- [ ] Behåll `CFD_CONTACT_BACKEND=formsubmit` (eller lämna den osatt, vilket
  också använder FormSubmit). Låt övriga aktiveringsflaggor vara avstängda.
- [ ] Inga Supabase-, Resend- eller Stripe-nycklar behövs för denna release.
  Skapa inga konton, ändra inga DNS-poster och kör inga externa migrationer.
- [ ] Kontrollera startsida, Kontakta oss, Gå med, nyheter, evenemang och
  mobilmeny i förhandsversionen. Ändra inte FormSubmits befintliga mottagare.

## Fungerar direkt

- Befintliga publika sidor, svensk design/logotyp, navigation, resursfilter och
  CfD Gear med informationen ”Kommer snart”.
- Filbaserade nyheter och evenemang, detaljsidor, metadata, RSS och sitemap.
  Evenemang visar information och eventuell extern informationslänk, men
  **aldrig internt anmälnings- eller betalningsformulär** när plattformen är av.
- Kontakta oss och Gå med använder befintlig FormSubmit POST till
  `https://formsubmit.co/cfdsweden@proton.me`, med samma honeypot, CAPTCHA-inställning
  och tackadresser. Kontakt är fortsatt en kontaktförfrågan, inte medlemsanmälan.
  Ingen ny kontoregistrering eller e-postverifiering införs. Den befintliga
  mottagaraktiveringen ska återanvändas, inte göras om.
- Direktbesök på inaktiva nyhetsbrevs-, evenemangsbekräftelse- och inloggningssidor
  visar lugn information utan aktiva backendformulär. Admin/medlemsområdet leder
  till den inaktiva inloggningssidan. Skyddade API:er förblir stängda.

## Aktiveras senare, efter separat beslut och verifiering

- Supabase: databas, Auth/MFA, roller, medlemsportal, ärendehantering, grupper,
  kampanjer, Kanban, moderering och redaktionell administration.
- Resend: verifierad avsändare, faktisk testleverans, nyhetsbrev/double opt-in,
  transaktionella mejl, webhookar, beständig kö och schemalagd worker/larm.
- Stripe: fullständigt Checkout-prov med testkort, webhookar och återbetalning,
  samt föreningens beslut om betalningsmottagare och villkor.
- Byte från FormSubmit till databasformuläret kräver ett uttryckligt separat
  godkännande. Se [driftguiden](platform-operations.md) och
  [kravmatrisens externa grindar](platform-requirements.md).

## Vad releasekontrollen bevisar

GitHub Actions bygger och kör de publika regressionerna **innan** den lokala
PostgreSQL/Auth/SMTP-stacken startas, utan externa tjänstenycklar eller miljöfiler.
En tillfällig filbaserad aktivitet med `registrationOpen=true` kontrollerar
evenemangsregressionen i ett produktionsbygge på 375 och 1440 px, inklusive axe.
Fixtureinnehåll tas bort och det rena bygget återställs efter testet.

FormSubmit-anrop fångas lokalt i webbläsartesterna: inga verkliga utskick görs.
Testerna verifierar formulärkontrakt, validering och tackflöde, inte aktuell
leverans till Proton-inkorgen. Ingen extern tjänst eller produktion aktiveras av CI.
