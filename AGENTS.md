# CFD Sweden — instruktioner till kodagenter

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

- `app/page.tsx`: FormSubmit POST till `https://formsubmit.co/cfdsweden@proton.me`.
- `_next`: `https://cfdsweden.se/tack`. Behåll `_honey` tomt och dolt för vanliga besökare.
- CAPTCHA är avstängd som ett medvetet val för ett enklare inskick. Honeypot ger svagare spamskydd; bevaka spam och leveransproblem. [FormSubmit rekommenderar CAPTCHA](https://formsubmit.co/documentation).
- En lyckad omdirigering bevisar inte mejlleverans. Redovisa separat vad som testats i webbläsaren och vad mottagaren bekräftat i inkorgen. Märk tekniska testinskick tydligt.

## Arbetsrutiner

- Kör `npm ci` vid ny installation, därefter `npm run lint` och `npm run build` före publicering av kodändringar. Kontrollera ändrade flöden på sajten.
- Bevara andras arbete och håll ändringar små.
- Repot är offentligt: checka aldrig in lösenord, API-nycklar, `.env`-filer, medlemsuppgifter eller formulärinskick. `.env*` och `.vercel` ska fortsatt vara ignorerade.
- Ändra inte domän, DNS, kontobehörigheter eller betalplan utan uttryckligt uppdrag från Karl.
