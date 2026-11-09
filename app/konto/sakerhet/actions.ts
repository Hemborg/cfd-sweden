"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { requireActor } from "@/lib/platform/auth";
import { assertSameOrigin, rateLimit } from "@/lib/platform/http";

export type MfaState = {
  error?: string;
  factorId?: string;
  qr?: string;
  secret?: string;
};
export async function enrollMfa(): Promise<MfaState> {
  await assertSameOrigin();
  const actor = await requireActor();
  await rateLimit(`mfa-enroll:${actor.user.id}`, 5, 3600);
  const { data: factors } = await actor.client.auth.mfa.listFactors();
  if (factors?.totp.some((factor) => factor.status === "verified"))
    return {
      error: "Du har redan en verifierad autentiserare. Använd koden nedan.",
    };
  for (const factor of factors?.all ?? [])
    if (factor.factor_type === "totp" && factor.status === "unverified")
      await actor.client.auth.mfa.unenroll({ factorId: factor.id });
  const { data, error } = await actor.client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "CfD Sweden",
  });
  if (error) return { error: "Kunde inte starta aktivering." };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}
export async function verifyMfa(
  _state: MfaState,
  form: FormData,
): Promise<MfaState> {
  await assertSameOrigin();
  const actor = await requireActor();
  await rateLimit(`mfa:${actor.user.id}`, 10, 900);
  const input = z
    .object({ factorId: z.uuid(), code: z.string().regex(/^\d{6}$/) })
    .safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "Ange autentiserarens sexsiffriga kod." };
  const { error } = await actor.client.auth.mfa.challengeAndVerify(input.data);
  if (error) return { error: "Koden kunde inte verifieras." };
  redirect("/admin");
}
