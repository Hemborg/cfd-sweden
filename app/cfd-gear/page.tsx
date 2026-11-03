import Link from "next/link";
import { PageLayout } from "@/components/PageLayout";
import { BrandSymbol } from "@/components/BrandLogo";

export const metadata = { title: "CfD Gear | CFD Sweden", description: "CfD Gear kommer snart till CFD Sweden." };

export default function GearPage() {
  return <PageLayout current="gear" eyebrow="CfD Gear" title="Bär rörelsen med dig." intro="CfD Gear kommer snart till CFD Sweden.">
    <section className="subpage-section gear-section">
      <div className="gear-symbol"><BrandSymbol tone="white" width={180} /></div>
      <div><p className="eyebrow">Kommer snart</p><h2>Vi har något på gång.</h2><p>Här kommer du framöver att hitta produkter med CFD Swedens uttryck. Det finns inget att beställa ännu, men du är varmt välkommen att engagera dig redan nu.</p><Link className="button button-primary" href="/ga-med">Gå med i rörelsen ↗</Link></div>
    </section>
  </PageLayout>;
}
