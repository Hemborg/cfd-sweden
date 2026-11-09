import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { platformEnabled, platformFeatures } from "@/lib/platform/config";
import { login, requestRecovery } from "./actions";

export const metadata = {
  title: "Logga in | CfD Sweden",
  robots: { index: false, follow: false },
};
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ fel?: string; skickat?: string }>;
}) {
  const query = await searchParams;
  return (
    <main>
      <Header current="join" />
      <section className="subpage-section portal-narrow">
        <h1>Logga in</h1>
        {!platformEnabled() ? (
          <p>
            Medlemsportalen är ännu inte öppnad. Du kan fortfarande kontakta oss
            via webbplatsens kontaktformulär.
          </p>
        ) : (
          <>
            {query.fel && (
              <p role="alert">
                Det gick inte att logga in. Kontrollera uppgifterna och försök
                igen.
              </p>
            )}
            {query.skickat && platformFeatures().email && (
              <p role="status">
                Om adressen har ett konto får du instruktioner för
                återställning.
              </p>
            )}
            <form action={login}>
              <label className="field">
                E-post
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                  maxLength={254}
                />
              </label>
              <label className="field">
                Lösenord
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  maxLength={128}
                />
              </label>
              <button className="submit-button">Logga in</button>
            </form>
            {platformFeatures().email ? <details>
              <summary>Glömt lösenordet?</summary>
              <form action={requestRecovery}>
                <label className="field">
                  E-post för återställning
                  <input type="email" name="email" required maxLength={254} />
                </label>
                <button className="submit-button">
                  Skicka återställningslänk
                </button>
              </form>
            </details> : <p>Behöver du hjälp med ditt konto? Kontakta föreningens administratör. Återställning via e-post är inte aktiverad.</p>}
            <p>
              Konton skapas genom en inbjudan från föreningen. En
              kontaktförfrågan skapar inget konto.
            </p>
          </>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
