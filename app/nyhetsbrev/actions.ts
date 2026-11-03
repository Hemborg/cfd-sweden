"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  confirmNewsletter,
  withdrawNewsletter,
} from "@/lib/communications/service";
import { assertSameOrigin } from "@/lib/platform/http";
import { platformEnabled } from "@/lib/platform/config";

const token = z.string().regex(/^[A-Za-z0-9_-]{32,128}$/);

export async function confirmNewsletterAction(form: FormData) {
  if (!platformEnabled()) redirect("/nyhetsbrev");
  await assertSameOrigin();
  const ok = await confirmNewsletter(token.parse(form.get("token")));
  redirect(`/nyhetsbrev/bekrafta?status=${ok ? "confirmed" : "invalid"}`);
}

export async function unsubscribeNewsletterAction(form: FormData) {
  if (!platformEnabled()) redirect("/nyhetsbrev");
  await assertSameOrigin();
  const ok = await withdrawNewsletter(token.parse(form.get("token")));
  redirect(`/nyhetsbrev/avregistrera?status=${ok ? "withdrawn" : "invalid"}`);
}
