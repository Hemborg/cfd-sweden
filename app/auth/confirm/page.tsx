import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/platform/db";
import { assertSameOrigin } from "@/lib/platform/http";
import { cookies } from "next/headers";
import {
  createPasswordProof,
  passwordProofCookie,
} from "@/lib/platform/password-proof";
import { platformConfig, platformEnabled } from "@/lib/platform/config";

export const metadata = { robots: { index: false, follow: false } };
async function accept(form: FormData) {
  "use server";
  if (!platformEnabled()) redirect("/logga-in");
  await assertSameOrigin();
  const token_hash = z.string().min(32).max(512).parse(form.get("token_hash"));
  const type = z.enum(["invite", "recovery"]).parse(form.get("type"));
  const client = await createSessionClient();
  const { data, error } = await client.auth.verifyOtp({ token_hash, type });
  if (error || !data.user) redirect("/logga-in?fel=lank");
  (await cookies()).set(
    passwordProofCookie,
    createPasswordProof(data.user.id),
    {
      httpOnly: true,
      secure: platformConfig().siteUrl.startsWith("https:"),
      sameSite: "strict",
      path: "/konto/losenord",
      maxAge: 600,
    },
  );
  redirect("/konto/losenord");
}
export default async function Confirm({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const query = await searchParams;
  if (!platformEnabled())
    return (
      <main className="subpage-section portal-narrow">
        <h1>Medlemsportalen är inte öppen ännu</h1>
        <p>Kontolänkar kan inte användas på webbplatsen just nu.</p>
      </main>
    );
  return (
    <main className="subpage-section portal-narrow">
      <h1>Bekräfta din kontolänk</h1>
      <p>
        Fortsätt för att använda inbjudan eller återställa ditt lösenord. Länken
        används först när du trycker på knappen.
      </p>
      <form action={accept}>
        <input type="hidden" name="token_hash" value={query.token_hash ?? ""} />
        <input type="hidden" name="type" value={query.type ?? "invite"} />
        <button className="submit-button">Fortsätt säkert</button>
      </form>
    </main>
  );
}
