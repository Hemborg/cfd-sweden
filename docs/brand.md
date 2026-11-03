# Logotypens delar

Den högupplösta transparenta originalfilen från Karl finns oförändrad i `public/brand/cfd-master.png` (1698 × 532). `cfd-symbol.png` (532 × 532) och `cfd-wordmark.png` (1108 × 324) är beskurna, utan omskalning eller ändrade pixlar. `scripts/prepare-brand.mjs` återskapar delarna och favicon från mastern med projektets befintliga Sharp-installation.

`components/BrandLogo.tsx` exporterar:

- `BrandLogo`: symbol + ordmärke + SWEDEN i originalets proportioner.
- `BrandSymbol`: endast det runda NPI-sigillet.
- `BrandWordmark`: CITIZENS FOR DISCLOSURE med guldlinje. `country` lägger till landsnamnet.
- `BrandCountryName`: endast SWEDEN.

Alla tar vanliga SVG-egenskaper, exempelvis `width`, `height` och `className`. De har tillgängliga namn; använd `decorative` när omgivningen redan beskriver loggan, som i sidhuvudets namngivna hemlänk. `tone="white"` använder exakt modersidans behandling, `filter: brightness(0) invert(1)`, för vita märken på mörka ytor. Sidhuvudet och sidfoten använder den vita varianten utan bakgrundsplatta. `tone="original"` behåller originalfärgerna och passar ljusa ytor.

```tsx
import { BrandLogo, BrandSymbol, BrandWordmark } from "@/components/BrandLogo";

<BrandLogo tone="white" width={230} />
<BrandSymbol width={96} />
<BrandWordmark country width={240} />
```

SVG-komponenterna innehåller rasterbilder och är **inte vektoriserade original**. Räkna med högst cirka 849 CSS-pixlar för hela märket eller 266 CSS-pixlar för symbolen vid dubbla pixeltätheten. Sidhuvudets bild är högst 230 CSS-pixlar bred. För stora tryck eller större symboler behövs ett officiellt vektororiginal eller en separat, granskad vektorisering.

SWEDEN är ett separat textlager i Josefin Sans 600, laddat lokalt via Nexts fontbygge. Den officiella webbplatsen använder Josefin Sans, men Florida-underradens exakta originaltypsnitt är inte bekräftat. Anpassningen ska inte beskrivas som ett officiellt levererat svenskt vektororiginal.

Källor: Karls två bifogade logofiler och [CFD:s officiella webbplats](https://citizensfordisclosure.org/), som själv använder en [PNG-master](https://citizensfordisclosure.org/cfd-assets/img/logo-dark-text.png). Ingen offentligt tillgänglig officiell SVG hittades vid denna kontroll.
