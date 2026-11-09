import { JoinForm } from "@/components/JoinForm";
import { PageLayout } from "@/components/PageLayout";

export const metadata = { title: "Gå med | CfD Sweden", description: "Anmäl ditt intresse för CfD Sweden." };

export default function JoinPage() {
  return <PageLayout current="join" eyebrow="Gå med" title="Engagera dig i vår rörelse." intro="Berätta vem du är och hur du vill bidra. Vi återkommer så snart vi kan.">
    <section className="home-join"><div className="section-wrap join-inner"><div className="join-copy"><p className="eyebrow">Citizens for Disclosure Sweden</p><h2>Var med och bygg den svenska rörelsen.</h2><p>Du väljer själv hur mycket du vill engagera dig.</p></div><JoinForm /></div></section>
  </PageLayout>;
}
