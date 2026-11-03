import Link from "next/link";
import { requireActor } from "@/lib/platform/auth";
import { MfaForm } from "./MfaForm";
export const metadata = { robots: { index: false, follow: false } };
export default async function SecurityPage() {
  const actor = await requireActor();
  const { data } = await actor.client.auth.mfa.listFactors();
  return (
    <main className="subpage-section portal-narrow">
      <h1>Säker inloggning</h1>
      <p>
        Administrativa uppdrag kräver tvåstegsverifiering. Använd en
        autentiseringsapp med tidsbaserade engångskoder.
      </p>
      {actor.aal === "aal2" ? (
        <p>
          Du har verifierat denna session.{" "}
          <Link href="/admin">Öppna administrationen</Link>.
        </p>
      ) : (
        <MfaForm
          factorId={
            data?.totp.find((factor) => factor.status === "verified")?.id
          }
        />
      )}
      <Link href="/medlem">Till medlemsportalen</Link>
    </main>
  );
}
