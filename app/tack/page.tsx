import { PageLayout } from "@/components/PageLayout";
import Link from "next/link";
import { pageContent } from "@/content/site";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function TackPage({ searchParams }: { searchParams: Promise<{ typ?: string | string[] }> }) {
  const isContact = (await searchParams).typ === "kontakt";
  return (
    <PageLayout
      current="thanks"
      eyebrow={pageContent.thanks.eyebrow} title={pageContent.thanks.title} intro={isContact ? "Ditt meddelande har skickats. Vi återkommer så snart vi kan." : pageContent.thanks.intro}
    >
      <section className="subpage-section">
        <article className="large-copy">
          <p>
            {isContact ? "Tack för att du hörde av dig." : pageContent.thanks.body}{" "}
            <Link className="text-link" href="/">
              {pageContent.thanks.link}
            </Link>
            .
          </p>
        </article>
      </section>
    </PageLayout>
  );
}
