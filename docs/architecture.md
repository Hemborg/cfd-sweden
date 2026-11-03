# Lokal CFD-prototyp: arkitekturbeslut

> Historik för PR #3/prototypen. För den nya valbara föreningsplattformen gäller [plattformens arkitektur](platform-architecture.md), [driftguide](platform-operations.md) och [kravmatris](platform-requirements.md).

Datum: 2026-11-02. Bas: `50860d90b312e6a38cacea00b5755a3f48dec33a`.
Gren: `codex/cfd-modular-mvp-20261102`. Ingen push, merge, deploy eller ändring av externa tjänster ingår.

Uppdatering 2026-11-03: användaren har därefter beställt en full visuell anpassning till citizensfordisclosure.org samt commit/push och PR för oberoende granskning. Planens ursprungliga designbevarande är därmed ersatt av `visual-reference.md`. Routing, modulgränser och isolering av formulärdemot gäller fortfarande. Merge och produktionsdriftsättning är fortsatt förbjudna i detta uppdrag. Se `review-handoff.md` för aktuell leveransstatus; plantexten nedan beskriver den första prototypfasen.

## Plan och bevarat beteende

1. Spara regressionsevidens för de åtta befintliga sidornas text, länkar och FormSubmit-kontrakt innan innehållet flyttas.
2. Flytta befintlig copy till typade innehållsfiler. Behåll URL:er, färger, typografi och komponentstruktur. Lägg till filbaserade nyheter och evenemang med verkliga tomma tillstånd.
3. Bygg ett separat lokalt testflöde för kontakt och nyhetsbrev. Startsidan behåller FormSubmit. Inga verkliga mejl eller personuppgifter används.
4. Inför privat databasmodell, validering, idempotens, samtyckeslivscykel och antispam. Testadaptrar bevisar lokal funktion; externa integrationer bedöms separat.
5. Verifiera innehållsregression, enhetstester, lokala webbläsarflöden, lint, typkontroll och produktionsbygge. Dokumentera drift och återstående beslut.

## ADR 1: behåll en modulär Next.js-app

`app/` ansvarar för routing, `components/` för UI, `content/` för föreningens innehåll, `lib/content/` för validerad filinläsning och `lib/forms/` för inskick/samtycke/adaptrar. Ingen separat backendserver, auth eller CMS i P0. Befintlig design återanvänds. Elaine får en textmall och tydliga filvägar.

Nyheter använder Markdown, inte exekverbar MDX. Frontmatter valideras; opublicerade eller framtidsdaterade inlägg ska inte hamna i listor, slug-sidor, RSS eller sitemap. Markdown-HTML saneras. Inga exempelnyheter eller påhittade evenemang publiceras.

## ADR 2: isolera experiment från befintlig insamling

Det nuvarande FormSubmit-formuläret och dess måladress ändras inte. Det nya flödet får en separat experimentsida och API. Standardläget är avstängt. Demonstrationsläget använder endast minne och testutskick; externa nycklar får inte aktivera nätverksanrop automatiskt. Serverkontroller, inte en dold länk, avgör åtkomst. Persondata får inte loggas eller exponeras i publika läs-API:er.

Postgres/Supabase är framtida beständig lagring. SQL och RLS granskas lokalt, men ingen migration körs mot externa databaser. En adapter med mockade kontraktstester är inte verifierad databasdrift. Resend förbereds för transaktionell dubbel opt-in och kontaktstatus, inte en egen kampanjmotor. Inga nyhetsbrev skickas i detta uppdrag.

## ADR 3: separera engagemang och prenumeration

Ett kontaktinskick innebär aldrig nyhetsbrevssamtycke. Nyhetsbrev kräver ett eget uttryckligt val, sedan en tidsbegränsad bekräftelse. Samtyckets textversion, källa och tid sparas, återkallelse stöds. Lagringstid, ansvarig, laglig grund, personuppgiftsbiträden och rutiner är föreningsbeslut före skarp användning.

## Prioritering

- P0: innehåll, blogg, evenemang, arbetsområden/kampanjer, mobilmeny, lokalt fungerande formulär/samtycke, schema och tester.
- P1: produktionskonfiguration, verklig DB/mail-verifiering, åtkomst för ansvariga, backuper, övervakning och eventuell redaktörsroll.
- P2: kommentarer endast med modereringsansvar, betalbiljetter via etablerad tjänst, CMS först efter konstaterat redaktionellt behov.

## Beroenden

Basen använde Next.js 16.2.6 och React 19.2.4. Säkerhetsgranskningen visade kända kritiska brister i den gamla Next-versionen. Prototypen uppdaterar därför Next.js och `eslint-config-next` tillsammans till 16.4.4 och behåller React/React DOM 19.2.4. Detta påverkar endast den lokala grenen. Se `research.md` för rådgivningar och kompatibilitet.

Små avgränsade tillägg: `gray-matter`, `remark`, `remark-html` för Markdown; `zod` för validering; officiella Supabase/Resend-klienter för isolerade adaptrar; `tsx` och `@playwright/test` för automatiska tester. Exakta installerade versioner låses i `package-lock.json`. Källor, licenser och återbruk dokumenteras i `research.md`. Inga globala installationer.
