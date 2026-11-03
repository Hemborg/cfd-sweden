"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient, createServiceClient } from "@/lib/platform/db";
import { platformConfig } from "@/lib/platform/config";
import {
  assertSameOrigin,
  rateLimit,
  rateLimitSource,
} from "@/lib/platform/http";
import { queueMail } from "@/lib/communications/queue";
import { createHash } from "node:crypto";

export async function login(form: FormData) {
  await assertSameOrigin();
  await rateLimitSource("login", 60, 900);
  const input = z
    .object({ email: z.email().max(254), password: z.string().min(1).max(128) })
    .safeParse(Object.fromEntries(form));
  if (!input.success) redirect("/logga-in?fel=uppgifter");
  await rateLimit(`login:${input.data.email.toLowerCase()}`, 10, 900);
  const client = await createSessionClient();
  const { error } = await client.auth.signInWithPassword(input.data);
  if (error) redirect("/logga-in?fel=uppgifter");
  redirect("/medlem");
}
export async function logout() {
  await assertSameOrigin();
  const client = await createSessionClient();
  await client.auth.signOut();
  redirect("/logga-in");
}
export async function requestRecovery(form: FormData) {
  await assertSameOrigin();
  await rateLimitSource("recovery", 10, 3600);
  const email = z.email().max(254).parse(form.get("email"));
  await rateLimit(`recovery:${email.toLowerCase()}`, 3, 3600);
  const { data, error } = await createServiceClient().auth.admin.generateLink({
    type: "recovery",
    email,
  });
  if (!error && data.user) {
    const url = new URL("/auth/confirm", platformConfig().siteUrl);
    url.searchParams.set("type", "recovery");
    url.searchParams.set("token_hash", data.properties.hashed_token);
    await queueMail({
      key: `recovery:${data.user.id}:${createHash("sha256").update(data.properties.hashed_token).digest("hex")}`,
      template: "account-recovery",
      recipient: email,
      data: { url: url.toString() },
    });
  }
  redirect("/logga-in?skickat=1");
}
