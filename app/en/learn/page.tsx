import type { Metadata } from "next";
import { EnPageLayout } from "@/components/en/EnPageLayout";
import { pageContentEn } from "@/content/site.en";
import { EnResourceLibrary } from "@/components/en/EnResourceLibrary";

export const metadata: Metadata = {
  title: "Learn More",
  description: "Explore UAP history, public hearings, whistleblower protection, and more.",
};

export default function LearnEnPage() {
  return (
    <EnPageLayout
      current="learn"
      eyebrow={pageContentEn.learn.eyebrow}
      title={pageContentEn.learn.title}
      intro={pageContentEn.learn.intro}
    >
      <section className="subpage-section">
        <EnResourceLibrary />
      </section>
    </EnPageLayout>
  );
}
