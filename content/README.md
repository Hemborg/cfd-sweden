# Innehåll för CFD Sweden

`site.ts` innehåller den befintliga webbplatsens texter och navigation:

| Innehåll | Objekt |
| --- | --- |
| Startsidan | `homeContent`, `formContent` |
| Om oss | `pageContent.about`, `aboutWorkAreas` |
| Vårt arbete | `pageContent.work`, `workGroups`, `engagementContent` |
| New Paradigm | `pageContent.paradigm` |
| Lär dig mer | `pageContent.learn`, `resourceItems`, `resourceFacets`, `libraryContent` |
| Take action | `pageContent.action`, `campaigns`, `engagementContent` |
| Kontakt och tack | `pageContent.contact`, `pageContent.thanks` |
| Sidhuvud och gemensam CTA | `navigation`, `pageContent.header`, `pageContent.sharedCta` |
| Nyheter och evenemang | `newsContent`, `pageContent.events`, `events` |
| Metadata och fasta adresser | `site` |

## Mall för Elaine

För varje textändring: ange sidans URL, objekt/sektion, den nya texten, eventuella
länkmål, godkänd av och datum. Ingen komponentlogik behöver ändras. Ändra inte
formulärets tekniska fältnamn, POST-adress eller redirect i en copyändring.

Nyhetsmall: `templates/nyhet.md`. Färdiga texter läggs i `posts/`. Mallar och
tomma listor är avsiktliga: inga nyheter eller aktiviteter har hittats på.
Ett GitHub-publicerat utkast är fortfarande offentligt läsbart som källfil.

Evenemang kräver en unik ASCII-slug, rubrik, datum/tid med tidszon, ort, arrangör
och beskrivning. Extern länk måste använda HTTPS. `registrationOpen` är en
förberedelse för det separata test-API:et och ersätter inte ett färdigt publikt
anmälningsflöde. Ett framtida verkligt arrangemang behöver redaktionellt godkännande.

Arbetsområdenas status är tills vidare arbetsinriktningar, inte påståenden om
beslutade projekt eller bemannade grupper. CTA går till befintlig intresseanmälan.
Varje arbetsområde/kampanj kan få egna `status` och `cta: { label, href }` när
föreningen anger dem. Länka bara till ett verkligt projekt eller en beslutad gruppkanal.

Kör lint, tester och bygge efter ändring. Mer instruktioner finns i
`docs/operations.md`.
