import { ConfirmFreeEventRegistration } from "./ConfirmFreeEventRegistration";
import { PageLayout } from "@/components/PageLayout";

type Props = { searchParams: Promise<{ token?: string }> };
export const metadata = {
  title: "Bekräfta anmälan | CFD Sweden",
  robots: { index: false, follow: false },
};

export default async function ConfirmFreeEventPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const valid = token && /^[A-Za-z0-9_-]{32,128}$/.test(token);
  return (
    <PageLayout
      current="events"
      eyebrow="Evenemang"
      title="Bekräfta anmälan"
      intro="Bekräfta din e-post innan en plats eller väntelisteplats reserveras."
    >
      <section className="subpage-section portal-narrow">
        {valid ? (
          <ConfirmFreeEventRegistration token={token} />
        ) : (
          <p>Länken saknas eller är inte längre giltig.</p>
        )}
      </section>
    </PageLayout>
  );
}
