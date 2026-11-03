import { PageLayout } from "@/components/PageLayout";
import Link from "next/link";
import { pageContent } from "@/content/site";

export default function TackPage() {
  return (
    <PageLayout
      current="home"
      eyebrow={pageContent.thanks.eyebrow} title={pageContent.thanks.title} intro={pageContent.thanks.intro}
    >
      <section className="subpage-section">
        <article className="large-copy">
          <p>
            {pageContent.thanks.body}{" "}
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
