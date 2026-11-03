# Visuell referens: Citizens for Disclosure

## Syfte och avgränsning

Det här är en källverifierad designreferens för den lokala svenska
omformgivningen. Referensen är den live-sajt som hämtades den 3 november 2026
och den lokala fångsten `output/playwright/reference/mother-desktop.png`
(1499 × 1000) med motsvarande `mother.html`.

Det är en **auktoriserad lokal anpassning**, inte en pixelidentisk klon:

- svensk text, längre lokal navigering och redan byggda funktioner ska finnas
  kvar;
- `Gå med` ska gå till den lokala formulärsidan `/ga-med`;
- `CfD Gear` ska gå till `/cfd-gear`, en lokal coming-soon-sida;
- den svenska logotypen ersätter den amerikanska ordmärkesbehandlingen;
- formflöden, innehåll, tillgänglighet och övriga befintliga funktioner får
  inte tas bort för att efterlikna referensens enklare startsida.

## Verifierade design-tokens

Källa: inbäddad CSS på <https://citizensfordisclosure.org/>.

| Token | Värde | Lokal användning |
| --- | --- | --- |
| navy | `#222B60` | mörkblå band och aktiv yta |
| navy-deep | `#161C42` | hero, footer och bildöverlägg |
| blue | `#5273B2` | tunna accenter och kortkant |
| amber | `#F5A021` | primär CTA, linjer och fokus |
| amber-hi | `#FFB43D` | hover på primär CTA |
| ink | `#121212` | mörk text |
| paper | `#F4F6FA` | sidans ljusgrå grund |
| white | `#FFFFFF` | vita ytor och text |
| muted | `#4A5468` | brödtext/sekundär text |
| line | `#D8DEEA` | FAQ- och avdelarlinjer |

Pale hero-text använder `#D9E2F4` och `#E3E9F5`.

## Typografi

Den officiella sajten självhostar följande WOFF2-filer:

- [Josefin Sans 600](https://citizensfordisclosure.org/cfd-assets/fonts/josefin-600.woff2)
  och [700](https://citizensfordisclosure.org/cfd-assets/fonts/josefin-700.woff2):
  rubriker och knappar.
- [Manrope 400](https://citizensfordisclosure.org/cfd-assets/fonts/manrope-400.woff2)
  och [600](https://citizensfordisclosure.org/cfd-assets/fonts/manrope-600.woff2):
  brödtext och FAQ.
- [Martian Mono 500](https://citizensfordisclosure.org/cfd-assets/fonts/martian-mono-500.woff2):
  överrubriker, bildtexter och legal text.

Exakt live-stil: brödtext `1.0625rem` med radavstånd `1.65`; rubriker Josefin
Sans 700; `h1` `clamp(2.9rem, 7.2vw, 5.6rem)` och `h2`
`clamp(1.9rem, 3.8vw, 2.9rem)`. Versala CTA:er använder Josefin Sans 700,
`0.92rem` och `0.08em` letter-spacing. Den tidigare Florida-underradens
ursprungliga font är **inte** verifierad; Josefin Sans är ett visuellt och
officiellt webbsystem-val, inte ett påstående om exakt historisk ordmärkesfont.

## Officiella bilder och attribution

| Roll | Verifierad källa | Användningsnotis |
| --- | --- | --- |
| Horisontell CFD-logotyp | [logo-dark-text.png](https://citizensfordisclosure.org/cfd-assets/img/logo-dark-text.png) (600 × 188) | Referensen gör den vit med `filter: brightness(0) invert(1)`. Lokalt används den godkända svenska vita logotypen, inte en påstått officiell SVG. |
| Hero: silhuetter vid gryning | [hero-2000.jpg](https://citizensfordisclosure.org/cfd-assets/photos/hero-2000.jpg) (2000 × 1333) | Varianter: [1200](https://citizensfordisclosure.org/cfd-assets/photos/hero-1200.jpg), [800](https://citizensfordisclosure.org/cfd-assets/photos/hero-800.jpg). Officiellt bildmaterial från rörelsen, inte en bild av svenska volontärer. |
| Rörelsefoto | [why-1200.jpg](https://citizensfordisclosure.org/cfd-assets/photos/why-1200.jpg) (1200 × 900) | [800-variant](https://citizensfordisclosure.org/cfd-assets/photos/why-800.jpg). Bilden visar internationella CfD-volontärer; skriv aldrig att den föreställer svensk verksamhet. |
| Avslutande stjärnhimmel | [sky-2000.jpg](https://citizensfordisclosure.org/cfd-assets/photos/sky-2000.jpg) (2000 × 1333) | [1000-variant](https://citizensfordisclosure.org/cfd-assets/photos/sky-1000.jpg). |
| Åtgärdskort | [grassroots.svg](https://citizensfordisclosure.org/cfd-assets/icons-cfd/grassroots.svg), [policy.svg](https://citizensfordisclosure.org/cfd-assets/icons-cfd/policy.svg), [right-to-know.svg](https://citizensfordisclosure.org/cfd-assets/icons-cfd/right-to-know.svg), [whistleblower.svg](https://citizensfordisclosure.org/cfd-assets/icons-cfd/whistleblower.svg) | Officiella 64 × 64-vektorer. |

Källsidan beskriver CFD som en New Paradigm Institute-initiative. Se även
[NPI:s lanseringsmeddelande](https://newparadigminstitute.org/learn/library/npi-announces-citizens-for-disclosure-a-grassroots-uap-transparency-initiative/).

## Mätbar layoutreferens

- Maxbredd: `1180px`; sidogutter: `clamp(20px, 4vw, 40px)`.
- Vertikalt sektionsavstånd: `clamp(4rem, 9vw, 7rem)`.
- Headern ligger absolut över hero, med `1.4rem` vertikalt; vit logotypbredd
  `clamp(170px, 22vw, 230px)`.
- Hero: `min-height: min(92vh, 800px)`, padding `8.5rem 0 5.5rem`, djup
  marin bakgrund. På desktop ligger bilden till höger med bredd `82%`,
  `object-position: 60% 62%` och en vänster-till-höger-mask. Mörkt
  gradientöverlägg säkrar läsbar kopia.
- CTA: 2px kant, `999px` radie, padding `1.05rem 1.5rem .9rem`; primär CTA är
  amber utan mörk kant. Åtgärder har `0.85rem` mellanrum.
- Innehållssplit: en kolumn under 900px, annars `1fr 1.05fr` med
  `clamp(2rem, 5vw, 4.5rem)` gap. Bild-/video-/kort-/pelarradie: `8px`.
- Kort: auto-fit från `240px`, gap `1.25rem`, `3px` blå överkant och
  padding `2rem 1.6rem 1.8rem`. Mörkblå informationspelare har i stället
  `3px` amber vänsterkant.
- FAQ: högst `860px`, `1px` `#D8DEEA`-linjer och `1.35rem` vertikal padding
  per fråga.
- Avslutande CTA är centrerad över stjärnhimmeln, med stor nederkant:
  `max(12rem, 22vw)`; footern är `#161C42` följd av en svart legal-remsa.

## Mobilbeteende

Vid `max-width: 760px` döljs vanliga navlänkar; den primära `Gå med`-CTA:n
ligger kvar. Hero blir innehållsdriven (`min-height: 0`), får `7.5rem`
topp-padding och `64vw` botten-padding. Bilden flyttas till en `92vw` hög
bandyta längst ned med vertikal mask; dess officiella position är
`74% 72%`. Sektionens splitar går till en kolumn.

## Rekommenderad lokal struktur

Behåll den visuella rytmen, men mappa den på svensk sajtstruktur:

1. mörk hero med svensk vit logotyp, svensk mission och CTA:er (`/ga-med`,
   `/cfd-gear`);
2. ljus introduktions-/videodel;
3. vit handlings- eller innehållsgrid;
4. mörkblå trovärdighets-/samarbetsdel med korrekt internationell
   bildattribution;
5. FAQ, lokala artiklar, event och formulär där de befintliga funktionerna
   kräver dem;
6. stjärnhimmels-CTA och footer.

Den lokala informationstätheten får vara större än referensens. De visuella
konstanterna ovan är till för sammanhållen identitet, inte för att begränsa
svenska innehålls- eller tillgänglighetskrav.
