import { PageLayout } from "@/components/PageLayout";
import { ResourceLibrary } from "@/components/ResourceLibrary";
import { pageContent } from "@/content/site";

export default function LearnPage() {
  return (
    <PageLayout
      current="learn"
      eyebrow={pageContent.learn.eyebrow} title={pageContent.learn.title} intro={pageContent.learn.intro}
    >
      <section className="subpage-section">
        <ResourceLibrary />
      </section>
    </PageLayout>
  );
}
