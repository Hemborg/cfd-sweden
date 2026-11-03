# CFD Sweden

Svensk landningssida för Citizens for Disclosure Sweden.

## Föreningsplattform för oberoende granskning

Denna feature-branch utökar senaste PR #3 till kontaktärenden, nyhetsbrev och
transaktionella mejl, medlemsportal med MFA/roller, arbetsgrupper/kampanjer,
Kanban, moderering samt databaspublicerade nyheter och evenemang med biljetter.
Plattformen är avstängd som standard. Den publika grafiska profilen, copy,
URL:er och FormSubmit-flödet bevaras.

Börja med [kravmatris och verifieringsbevis](docs/platform-requirements.md),
[arkitektur](docs/platform-architecture.md), [installation/drift och externa grindar](docs/platform-operations.md),
[administratörs- och redaktörsguide](docs/platform-admin-guide.md) och
[OSS-val](docs/oss-reuse.md). [Granskningsöverlämningen](docs/review-handoff.md)
beskriver även tidigare PR #3. Äldre prototypdokument är historik.

Ingen merge eller produktionspublicering ingår. Resend/Stripe och hosted
Supabase måste verifieras i separat godkänd staging innan skarp aktivering.

## Utveckling

```bash
npm run dev
```

Öppna `http://localhost:3000`.

## Kontroll

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:content:e2e
```

## Publicering

Sajten finns på https://cfdsweden.se och publiceras automatiskt via Vercel när ändringar pushas till `main` i `Hemborg/cfd-sweden`. Kontrollera Vercels commitstatus och den skarpa sajten efter varje publicering.

Repot gjordes publikt med Karls godkännande 2026-10-21 för att möjliggöra gratis samarbete via Vercels GitHub-integration. FredrikArvas får pusha direkt till `main`. Första publiceringen från Fredrik efter bytet ska verifieras mot Vercels status.

Kodagenter: läs [AGENTS.md](AGENTS.md) för bakgrund, genomförda ändringar, formulärinställningar och arbetsrutiner.
