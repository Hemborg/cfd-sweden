import { NewsletterLayout } from "@/components/communications/newsletter-layout";
import { unsubscribeNewsletterAction } from "../actions";
type Props = { searchParams: Promise<{ token?: string; status?: string }> };
export const metadata = {
  title: "Avregistrera nyhetsbrev | CFD Sweden",
  robots: { index: false, follow: false },
};
export default async function UnsubscribeNewsletterPage({
  searchParams,
}: Props) {
  const { token, status } = await searchParams;
  if (status === "withdrawn")
    return (
      <NewsletterLayout title="Du är avregistrerad">
        <p>Du kommer inte längre att få nyhetsbrev från CFD Sweden.</p>
      </NewsletterLayout>
    );
  if (!token)
    return (
      <NewsletterLayout title="Avregistrera nyhetsbrev">
        <p>Länken saknas eller är inte längre giltig.</p>
      </NewsletterLayout>
    );
  return (
    <NewsletterLayout title="Avregistrera nyhetsbrev">
      <p>Vill du avregistrera dig från CFD Swedens nyhetsbrev?</p>
      {status === "invalid" && (
        <p role="alert">Länken är ogiltig eller har redan använts.</p>
      )}
      <form action={unsubscribeNewsletterAction}>
        <input type="hidden" name="token" value={token} />
        <button>Avregistrera</button>
      </form>
    </NewsletterLayout>
  );
}
