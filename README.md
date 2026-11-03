# CFD Sweden

Svensk landningssida för Citizens for Disclosure Sweden.

## Prototyp och design för kodgranskning

Denna feature-branch innehåller en modulär prototyp och en svensk anpassning av modersidans grafiska profil. Den lämnas som Pull Request för oberoende granskning, utan merge eller produktionspublicering. Börja med [granskningsöverlämningen](docs/review-handoff.md), [arkitekturen](docs/architecture.md), [kör- och förvaltningsguiden](docs/operations.md), [formulärens begränsningar](docs/forms.md) och [prototypens historiska slutrapport](docs/prototype-report.md). Publiceringsinstruktionen längre ned beskriver det befintliga produktionsflödet och ger inte tillstånd att publicera denna PR.

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
