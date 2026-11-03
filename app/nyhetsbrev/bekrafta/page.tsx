import { NewsletterLayout } from "@/components/communications/newsletter-layout";
import { confirmNewsletterAction } from "../actions";
import { platformEnabled } from "@/lib/platform/config";
type Props = { searchParams: Promise<{ token?: string; status?: string }> };
export const metadata = {
  title: "Bekräfta prenumeration | CFD Sweden",
  robots: { index: false, follow: false },
};
export default async function ConfirmNewsletterPage({ searchParams }: Props) {
  const { token, status } = await searchParams;
  if (!platformEnabled() || status === "unavailable")
    return (
      <NewsletterLayout title="Nyhetsbrevet är inte öppet ännu">
        <p>Prenumerationer hanteras inte på webbplatsen just nu.</p>
      </NewsletterLayout>
    );
  if (status === "confirmed")
    return (
      <NewsletterLayout title="Prenumerationen är bekräftad">
        <p>
          Tack. Du kan när som helst avregistrera dig via länken i ett utskick.
        </p>
      </NewsletterLayout>
    );
  if (!token)
    return (
      <NewsletterLayout title="Bekräfta prenumeration">
        <p>Länken saknas eller är inte längre giltig.</p>
      </NewsletterLayout>
    );
  return (
    <NewsletterLayout title="Bekräfta prenumeration">
      <p>Bekräfta att du vill få nyhetsbrev från CFD Sweden.</p>
      {status === "invalid" && (
        <p role="alert">Länken är ogiltig eller har redan använts.</p>
      )}
      <form action={confirmNewsletterAction}>
        <input type="hidden" name="token" value={token} />
        <button>Bekräfta prenumeration</button>
      </form>
    </NewsletterLayout>
  );
}
