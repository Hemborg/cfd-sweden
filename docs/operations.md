# Förvaltning och lokal demonstration

För granskningsleveransen 2026-11-03 är commit, push av feature-branchen och PR mot `main` uttryckligen godkända. Ingen merge eller produktionsdriftsättning är godkänd. Se `review-handoff.md`; begränsningarna för externa tjänster nedan gäller fortfarande.

Denna gren är ett lokalt experiment. Inget i denna instruktion är tillstånd att pusha, deploya, skapa konton, skicka mejl eller köra migrationer på en extern databas. Befintlig produktionssajt använder fortfarande sitt befintliga FormSubmit-flöde.

## Start och kontroll

Kör från repots rot med Node.js 24 och npm. `package-lock.json` låser installationen.

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:content:e2e
```

Webbläsartesterna använder Playwright Chromium och en egen lokal Next-server på `127.0.0.1:3400`. De stoppar externa webbläsaranrop. Ingen testkod skickar till FormSubmit. Om Chromium saknas: installera den projektbundna webbläsaren med `npx playwright install chromium`. Tester får aldrig byta baseURL till den skarpa domänen.

`test:content:e2e` skapar tre uttryckliga, temporära testinlägg endast i den lokala arbetskopian, bygger och provar publicerad/utkast/framtid på port 3401 med formulärdemo avstängd. Skriptets `finally` tar bort exakt de filer det skapade och återbygger utan dem. Kör det inte samtidigt som ett annat bygge eller en server. Vid hårt processavbrott: kontrollera de tre `content/posts/codex-test-*.md`-filerna och återställ ett rent bygge innan någon senare publicering. De ingår inte i leveransen.

För en interaktiv lokal demonstration efter bygge:

```powershell
$env:CFD_FORM_DEMO_ENABLED = 'true'
npm run start -- --hostname 127.0.0.1 --port 3400
```

Öppna `http://127.0.0.1:3400/experiment/formular`. Använd endast påhittad testdata, till exempel adresser under `example.test`. Allt i demo lagras i processminne och försvinner vid omstart. Ingen databas eller mejltjänst anropas. Lägg inte flaggan på Vercel; demonstrationen ska inte vara offentligt åtkomlig. Stäng med Ctrl+C och ta bort flaggan med `Remove-Item Env:CFD_FORM_DEMO_ENABLED`.

Det vanliga formuläret på startsidan har fortfarande FormSubmit som mål. Skicka inte testdata där under denna demonstration. Serverprototypen är avsiktligt separat.

## Elaine: sidtexter

Navigation, sidtexter, resurskort, arbetsområden och kampanjer ligger i `content/`. Börja med mallen där och ange sidans URL, nuvarande text, ersättningstext och godkänd av/datum. Ändra textvärden utan att ändra TSX-komponenter. En kodkunnig kollega kan lägga in texten via Git tills behovet av ett eget redaktörsgränssnitt är bevisat.

Behåll länkmål om inte redaktionen beslutat något annat. Kör tester och granska sidan på mobil innan en senare publicering. Ursprunglig copy är bevarad som en regression mot den granskade basen; när redaktionen uttryckligen ändrar text behöver det testets förväntning uppdateras i samma ändring och granskas.

## Nyheter

Lägg en fil med liten ASCII-slug i `content/posts/`, exempelvis en godkänd rubrik omvandlad till `rubrik-med-bindestreck.md`. Filnamnet ger URL:en `/nyheter/rubrik-med-bindestreck`. Använd innehållsmallen för exakt frontmatter: `title`, citerat datum i formatet `YYYY-MM-DD`, `excerpt`, `author`, `tags`, `published` och eventuella SEO-fält.

Använd `published: false` för utkast. Endast publicerade, ej framtidsdaterade inlägg ska visas. Markdown stödjer text, rubriker, listor och säkra länkar; rå HTML är inte ett sätt att lägga in scripts. Metadata, RSS och sitemap skapas från samma publicerade urval. Inga riktiga nyheter har levererats, så listan är tom.

Publicering är byggbaserad. Ett framtidsdatum schemalägger inte ett nytt Vercel-bygge: ett godkänt nytt bygge behövs när ett inlägg ska bli synligt. Utkast i det publika GitHub-repot är läsbara i källkoden även när de är dolda på sajten. Lägg aldrig konfidentiellt material där.

## Evenemang, arbetsgrupper och kampanjer

Lägg endast in bekräftade evenemang i innehållslistan, med datum/tid inklusive tidszon, ort, arrangör och beskrivning. Visa extern anmälningslänk bara om den är verklig och godkänd. Aktivera inte en anmälningsmöjlighet som saknar färdigt mottagningsflöde. Prototypen innehåller inga fiktiva aktiviteter.

Arbetsområden och kampanjer utgår från befintlig publicerad text. Status ska skilja en allmän arbetsinriktning från en faktisk beslutad aktivitet. Fyll inte påhittade ansvariga, datum eller projektlänkar. GitHub Projects eller en befintlig gruppkanal kan läggas till senare när föreningen anger rätt länk och åtkomst.

## Inkomna ärenden och samtycke

Lokal demo har inget publikt läs-API för ärenden. För verifierade exempel, se automatiska tester och `docs/forms.md`. I en framtida driftmiljö ska utsedda ansvariga läsa via skyddad databasadministration eller ett separat behörighetskontrollerat arbetsflöde. Service-nycklar får aldrig skickas till webbläsaren.

Kontakt och nyhetsbrev är skilda processer. Ett kontaktinskick skapar ingen prenumeration. Nyhetsbrev kräver aktivt samtycke, bekräftelse och möjlighet att återkalla. Att en bekräftelsesida visas är varken bevis för mejlleverans eller för att alla förutsättningar för personuppgiftsbehandling är uppfyllda.

För skarp drift behöver föreningen besluta och dokumentera:

- Personuppgiftsansvarig, kontaktväg och vem som får läsa/hantera uppgifter.
- Ändamål och laglig grund per flöde; granskad informationstext och samtyckesversion.
- Lagringstid för kontaktärenden, obekräftade registreringar, samtyckesbevis, återkallelser och säkerhetsloggar.
- Rutiner för tillgång, rättelse, radering och hantering av incidenter.
- Leverantörer, regioner, biträdesavtal och eventuella överföringar.

Prototypen fastställer inte dessa beslut och garanterar inte GDPR-efterlevnad.

## Databas, notifiering och fel

SQL ligger i `supabase/migrations/`; inga migrationer har körts mot en extern tjänst. Innan det får ske behövs en separat testdatabas, granskad RLS/åtkomst, verifierade roller och rollback-/backupplan. Mockade adaptertester ersätter inte ett integrationstest mot Supabase.

Se `docs/forms.md` för normaliserad modell, idempotens, tokenlivscykel, notifieringar och exakta begränsningar. Lagring och lyckad notifiering måste redovisas separat. Vid mejlfel ska ett redan mottaget ärende inte tappas och ett retry inte skapa ett extra ärende. Logga feltyp, intern händelseidentifierare och försökstid; inte namn, adress, meddelandetext, tokens eller nycklar.

Resend/Supabase-adaptrar får inte aktiveras genom att bara lägga in en nyckel. En senare produktionskoppling behöver explicit konfiguration, serverbegränsad behörighet, gemensam beständig rate limit, testad återförsökshantering, avregistreringssynkronisering och granskad mottagar-/avsändaradress. Notifieringens avsedda mottagare är `cfdsweden@proton.me`; någon verklig notifiering har inte skickats från prototypen.

## Hemligheter

Ingen ny hemlighet behövs för demo. När en produktionskoppling separat godkänts ska projektets servermiljö hantera Supabase-URL och servernyckel, Resend-nyckel och verifierad avsändare. Inga privata nycklar får heta `NEXT_PUBLIC_*`. Hemligheter, exporter, formulärdata och `.env`-filer ska aldrig ligga i Git. Rättigheter för GitHub, Vercel och domänen ändras inte av detta experiment.

## Backuper, återställning och uppdateringar

- Källkod och innehåll: Git-historik ger ändringsspår och möjlighet att återställa till en granskad commit. Den här grenen är ännu lokal; den har inte en extern Git-backup.
- Databas: demo har ingen beständig data. Före framtida drift behövs beslut om backupfrekvens, kryptering, åtkomst, lagringsplats och ett verkligt återläsningstest. Leverantörens backupfunktion och eventuell PITR beror på vald plan.
- Samtycke: återställning får inte återaktivera återkallade prenumerationer. Stäm av återkallelser och leverantörens suppression-lista innan utskick efter återställning.
- Drift: bevaka leveransfel, studs/klagomål, köfel och onormal trafik. Ett lyckat HTTP-svar är inte leveransbevis.
- Beroenden: granska `npm audit` och upstream-säkerhetsmeddelanden regelbundet. Uppdatera i separat gren och kör samma testpaket. Använd inte `npm audit fix --force` utan att granska kompatibilitet.

## Separat produktionssättning

Innan en eventuell merge behövs Karls uttryckliga godkännande, redaktionell granskning, verifierad DB/mail-integration, beslut om personuppgifter och en plan för att ersätta FormSubmit utan dubbla inskick. Produktionsåterställning ska omfatta både koden och eventuella datamigreringar; att backa en Vercel-deploy backar inte databasen automatiskt.
