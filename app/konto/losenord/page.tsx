import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/platform/db";
import { assertSameOrigin, rateLimit } from "@/lib/platform/http";
import { queueMail } from "@/lib/communications/queue";
import { cookies } from "next/headers";
import {
  passwordProofCookie,
  verifyPasswordProof,
} from "@/lib/platform/password-proof";
import { platformEnabled } from "@/lib/platform/config";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
async function save(form: FormData) {
  "use server";
  await assertSameOrigin();
  const client = await createSessionClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/logga-in");
  await rateLimit(`password:${user.id}`, 5, 600);
  const jar = await cookies();
  const setup = verifyPasswordProof(
    jar.get(passwordProofCookie)?.value,
    user.id,
  );
  if (!setup) {
    const currentPassword = z
      .string()
      .min(1)
      .max(128)
      .safeParse(form.get("currentPassword"));
    if (!currentPassword.success || !user.email)
      redirect("/konto/losenord?fel=1");
    const verified = await client.auth.signInWithPassword({
      email: user.email,
      password: currentPassword.data,
    });
    if (verified.error || verified.data.user?.id !== user.id)
      redirect("/konto/losenord?fel=1");
  }
  const password = z.string().min(12).max(128).parse(form.get("password"));
  if (password !== form.get("repeat")) redirect("/konto/losenord?fel=1");
  const { error } = await client.auth.updateUser({ password });
  if (error) redirect("/konto/losenord?fel=1");
  jar.set(passwordProofCookie, "", { path: "/konto/losenord", maxAge: 0 });
  const { data: profile } = await client
    .from("profiles")
    .select("approved,suspended")
    .eq("id", user.id)
    .single();
  if (setup && user.email && profile?.approved && !profile.suspended)
    await queueMail({
      key: `welcome:${user.id}`,
      template: "welcome",
      recipient: user.email,
      data: {},
    });
  redirect("/medlem");
}
export default async function PasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ fel?: string }>;
}) {
  if (!platformEnabled()) redirect("/logga-in");
  const client = await createSessionClient();
  const user = (await client.auth.getUser()).data.user;
  if (!user) redirect("/logga-in");
  const setup = verifyPasswordProof(
    (await cookies()).get(passwordProofCookie)?.value,
    user.id,
  );
  return (
    <main className="subpage-section portal-narrow">
      <h1>Välj lösenord</h1>
      {(await searchParams).fel && (
        <p role="alert">
          Lösenordet kunde inte sparas. Kontrollera att båda fälten är lika.
        </p>
      )}
      <form action={save}>
        {!setup && (
          <label className="field">
            Nuvarande lösenord
            <input
              name="currentPassword"
              type="password"
              required
              maxLength={128}
              autoComplete="current-password"
            />
          </label>
        )}
        <label className="field">
          Nytt lösenord, minst 12 tecken
          <input
            name="password"
            type="password"
            minLength={12}
            maxLength={128}
            required
            autoComplete="new-password"
          />
        </label>
        <label className="field">
          Upprepa lösenord
          <input
            name="repeat"
            type="password"
            minLength={12}
            maxLength={128}
            required
            autoComplete="new-password"
          />
        </label>
        <button className="submit-button">Spara lösenord</button>
      </form>
    </main>
  );
}
