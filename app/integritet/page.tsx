import Link from "next/link";
import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { platformFeatures } from "@/lib/platform/config";

export const metadata: Metadata = {
  title: "Personuppgifter och integritet | CfD Sweden",
};

export default function PrivacyPage() {
  const features = platformFeatures();
  const databaseContact = features.contactDatabase;
  return (
    <PageLayout
      current="privacy"
      eyebrow="Integritet"
      title="Personuppgifter i våra formulär."
      intro="Här beskriver vi hur kontaktförfrågningar och intresseanmälningar hanteras på webbplatsen."
    >
      <section className="subpage-section">
        <article className="large-copy">
          <h2>Vad du lämnar och varför</h2>
          <p>
            CfD Sweden använder din e-postadress och de uppgifter du själv
            lämnar för att besvara ditt ärende eller följa upp ditt intresse för
            verksamheten. E-post är obligatoriskt i båda formulären.
            Kontaktformuläret kräver också ett meddelande. Övriga
            personuppgifter är frivilliga.
          </p>
          <p>
            En kontaktförfrågan är ingen medlemsanmälan. Inget av formulären
            skapar automatiskt en prenumeration på nyhetsbrev. Lämna inte
            känsliga personuppgifter eller privata uppgifter om andra personer i
            meddelandet.
          </p>
          <h2>Så skickas uppgifterna</h2>
          {databaseContact ? (
            <p>
              När du skickar formuläret sparas förfrågan i föreningens databas
              och är tillgänglig för behöriga handläggare. En bekräftelse och en
              notifiering förmedlas genom föreningens e-postleverantör.
              Förfrågan skapar inget medlemskonto och ingen
              nyhetsbrevsprenumeration.
            </p>
          ) : (
            <p>
              När du skickar formuläret lämnas uppgifterna till FormSubmit, som
              förmedlar meddelandet till CfD Swedens e-postadress hos Proton.
              Formulären sparar inte förfrågningar i webbplatsens databas.
              Uppgifterna finns däremot i e-posthanteringen och behandlas av de
              leverantörer som medverkar i överföringen.
            </p>
          )}
          {features.database && (
            <>
              <h2>Nyhetsbrev, medlemsportal och aktiviteter</h2>
              {features.newsletters && <p>
                Nyhetsbrev kräver ett separat samtycke och bekräftelse via
                e-post. Varje nyhetsbrev innehåller en avregistreringslänk.
                Samtycke, bekräftelse och avregistrering dokumenteras för att
                förhindra oönskade utskick.
              </p>}
              <p>
                Medlemsportalen använder inloggningscookies för din session.
                Behöriga föreningsansvariga hanterar konton, gruppmedlemskap och
                uppgifter. Privata gruppuppgifter visas bara för behöriga
                deltagare. {features.comments && "Kommentarer granskas före publicering och visar inte din e-postadress."}
              </p>
              {features.eventRegistration && <p>
                Vid evenemangsanmälan sparas kontaktuppgifter och
                bokningsstatus. {features.payments && <>Vid ett betalt evenemang hanterar Stripe
                betalningsuppgifterna; föreningen lagrar betalningsreferenser
                och biljettstatus, inte kortuppgifter.</>}
              </p>}
            </>
          )}
          <h2>Frågor, rättelse och radering</h2>
          <p>
            Du kan kontakta CfD Sweden för att begära information om dina
            uppgifter, rättelse eller radering. Använd{" "}
            <Link className="text-link" href="/kontakta-oss#kontaktformular">
              kontaktformuläret
            </Link>{" "}
            och välj ärendet Personuppgifter. Ange bara de uppgifter som behövs
            för att vi ska kunna förstå och hantera din begäran.
          </p>
          <p>
            Du kan också vända dig till{" "}
            <a className="text-link" href="https://www.imy.se/privatperson/">
              Integritetsskyddsmyndigheten (IMY)
            </a>{" "}
            med frågor eller klagomål om personuppgiftsbehandling.
          </p>
        </article>
      </section>
    </PageLayout>
  );
}
