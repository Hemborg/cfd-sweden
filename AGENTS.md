# CFD Sweden — instruktioner till kodagenter

## Granskningsleverans 2026-11-03

Karl har uttryckligen godkänt commit, push av feature-branchen och en Pull Request mot `main` för oberoende granskning. **Merga inte denna PR, pusha inte till `main` och driftsätt inte produktionssajten utan ett nytt uttryckligt beslut.** Detta överstyr de äldre direktpubliceringsrutinerna nedan för detta uppdrag. Inga externa migrationer, verkliga utskick, persondataöverföringar eller konto-/DNS-ändringar ingår. Den senare beställningen av modersidans grafiska profil överstyr prototypens ursprungliga krav att behålla den gamla designen. Se `docs/review-handoff.md` för omfattning, kravstatus och kvarstående arbete.

## Lokalt experiment 2026-11-02

På grenen `codex/cfd-modular-mvp-20261102` gäller bygguppdragets snävare gräns: endast lokal prototyp. Ingen push, PR, merge, Vercel-deploy, extern migration, verkligt mejl, prenumeration eller kontokonfiguration utan nytt uttryckligt godkännande. Det överstyr publiceringsrutinen nedan för denna gren. Läs `docs/architecture.md`, `docs/operations.md` och `docs/prototype-report.md` för resultat och begränsningar. Startsidan behåller sitt befintliga FormSubmit-flöde; skicka aldrig automatiska testdata dit.

## Projekt och publicering

- Webbplats: https://cfdsweden.se. Next.js App Router, drift hos Vercel.
- Kanoniskt repo: `Hemborg/cfd-sweden`. Produktionsbranch: `main`.
- Karl har godkänt att FredrikArvas får pusha direkt till `main` och därmed publicera. Pull requests är fortsatt användbara för granskning, men krävs inte av detta arbetsflöde.
- Push till `main` ska utlösa Vercels automatiska produktionsbygge. GitHub-åtkomst räcker för det avsedda flödet; separat Vercel-inloggning behövs inte för varje publicering.
- Kontrollera Vercels status på den aktuella committen och den skarpa domänen efter push. En lyckad Git-push är inte bevis för att publiceringen lyckats. Vid fel: läs felmeddelandet och rapportera det, ändra inte commitförfattare eller dela Karls inloggning för att kringgå felet.

## Varför repot blev publikt (2026-10-21)

Repot var tidigare privat. Vercel stoppade Fredriks commit med meddelandet `Git author FredrikArvas must have access to the project on Vercel to create deployments.` Det gällde även automatisk publicering från GitHub, trots att Fredrik kunde ändra repot.

Karl godkände att just detta repo och dess historik görs publika, så att samarbetet kan använda Vercels stöd för gratis samarbete i publika repon. Se [Vercels dokumentation](https://vercel.com/docs/deployments/troubleshoot-project-collaboration). Publik läsåtkomst ger inte andra personer skrivåtkomst. Domän och Vercel-konto ägs och administreras fortsatt av Karl.

Verifierat före denna dokumentationsändring: repot är publikt. Direktpublicering från Fredriks nästa commit efter bytet återstår att verifiera; lova inte att en framtida publicering lyckats utan att kontrollera statusen.

## Genomförda ändringar

- [PR #1](https://github.com/Hemborg/cfd-sweden/pull/1): intresseformuläret skickar via FormSubmit till `cfdsweden@proton.me`; kontaktsidan använder samma adress. Mottagaren har bekräftat aktiveringslänken.
- [PR #2](https://github.com/Hemborg/cfd-sweden/pull/2), av Fredrik: lade till `/tack`, omdirigering efter inskick, dolt honeypotfält och avstängd CAPTCHA.
- Vid granskning rättades tacksidans interna länk till `next/link`, eftersom `<a href="/">` bröt mot ESLint-regeln. Använd `next/link` för interna sidlänkar.
- PR #2 slogs ihop av `Hemborg` med merge-commit `895cf89`. Lint, TypeScript och produktionsbygge passerade. Vercel publicerade committen, och ett tekniskt formulärtest på den skarpa sajten omdirigerades till `/tack`. Ankomst till Proton-inkorgen verifierades inte av agenten.

## Formuläret

- `components/InquiryForm.tsx`: gemensam FormSubmit POST till `https://formsubmit.co/cfdsweden@proton.me`, med separata kontakt-/intressevarianter. E-post krävs; kontakt kräver även meddelande. Ingen automatisk prenumeration.
- `_next`: `https://cfdsweden.se/tack` för intresse, `https://cfdsweden.se/tack?typ=kontakt` för kontakt. Behåll `_honey` tomt och dolt för vanliga besökare. Båda tackvarianterna är noindex och ska hållas utanför sitemap.
- CAPTCHA är avstängd som ett medvetet val för ett enklare inskick. Honeypot ger svagare spamskydd; bevaka spam och leveransproblem. [FormSubmit rekommenderar CAPTCHA](https://formsubmit.co/documentation).
- En lyckad omdirigering bevisar inte mejlleverans. Redovisa separat vad som testats i webbläsaren och vad mottagaren bekräftat i inkorgen. Märk tekniska testinskick tydligt.

## Arbetsrutiner

- Kör `npm ci` vid ny installation, därefter `npm run lint` och `npm run build` före publicering av kodändringar. Kontrollera ändrade flöden på sajten.
- Bevara andras arbete och håll ändringar små.
- Repot är offentligt: checka aldrig in lösenord, API-nycklar, `.env`-filer, medlemsuppgifter eller formulärinskick. `.env*` och `.vercel` ska fortsatt vara ignorerade.
- Ändra inte domän, DNS, kontobehörigheter eller betalplan utan uttryckligt uppdrag från Karl.
