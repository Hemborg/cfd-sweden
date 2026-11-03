import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { encryptPayload } from "@/lib/communications/crypto";
import { validateTemplateData } from "@/lib/communications/types";
import { platformConfig, requireFeature } from "@/lib/platform/config";
import { createServiceClient } from "@/lib/platform/db";
import { ticketCode } from "./service";
import type { z } from "zod";
import { registrationInputSchema } from "./types";

type RegistrationInput = z.output<typeof registrationInputSchema>;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("base64url");

export async function requestFreeEventConfirmation(input: RegistrationInput) {
  requireFeature("eventRegistration");
  const service = createServiceClient();
  const { data: event, error: eventError } = await service
    .from("events")
    .select("title,slug")
    .eq("slug", input.eventSlug)
    .maybeSingle();
  if (eventError || !event) throw new Error("Evenemanget kunde inte hittas.");
  const rawToken = token();
  const url = new URL("/evenemang/bekrafta", platformConfig().siteUrl);
  url.searchParams.set("token", rawToken);
  const mailData = encryptPayload(
    validateTemplateData("event-confirmation", {
      eventTitle: event.title,
      url: url.toString(),
    }),
  );
  const { error } = await service.rpc("request_free_event_confirmation", {
    p_event_slug: input.eventSlug,
    p_email: input.email,
    p_name: input.name,
    p_token_hash: hash(rawToken),
    p_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    p_mail_data: mailData,
  });
  if (error) throw new Error("Kunde inte skapa bekräftelsen.");
}

export async function confirmFreeEventRegistration(rawToken: string) {
  requireFeature("eventRegistration");
  const { data, error } = await createServiceClient().rpc(
    "confirm_free_event_registration",
    {
      p_token_hash: hash(rawToken),
      p_ticket_code: ticketCode(),
    },
  );
  if (error) throw new Error("Kunde inte bekräfta anmälan.");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id || !["confirmed", "waitlisted"].includes(row.status))
    return null;
  return { status: String((row as { status: string }).status) };
}
