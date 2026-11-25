import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import "./testversion.css";

export const metadata = {
  title: "Tre steg för att utforska ufoområdet – CfD Sweden",
  description: "En interaktiv guide i tre steg: vad vi vet, vad det spelar för roll och varför myndigheterna är tysta.",
  robots: { index: false, follow: false },
};

export default function TestversionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <SiteFooter />
    </>
  );
}
