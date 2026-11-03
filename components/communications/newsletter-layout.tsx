import { PageLayout } from "@/components/PageLayout";
export function NewsletterLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <PageLayout
      current="join"
      eyebrow="Nyhetsbrev"
      title={title}
      intro="Dina val gäller bara nyhetsbrevet."
    >
      <section className="subpage-section portal-narrow">{children}</section>
    </PageLayout>
  );
}
