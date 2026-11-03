import "server-only";
import { createServiceClient } from "@/lib/platform/db";
import { platformConfig } from "@/lib/platform/config";
import {
  eventReference,
  type EventReference,
  type MailTemplate,
  validateTemplateData,
} from "./types";

type EventRow = {
  id: string;
  status: string;
  ticket_code: string | null;
  events:
    { title: string; slug: string } | { title: string; slug: string }[] | null;
};

/** The only non-encrypted queue payload allowed from SQL. It deliberately holds
 * an opaque registration ID, never a URL, token, body, title, or e-mail data. */
export async function resolveQueueReference(
  template: MailTemplate,
  value: unknown,
): Promise<Record<string, unknown>> {
  const parsed = eventReference.safeParse(value);
  if (
    !parsed.success ||
    !["event-registration", "event-waitlist", "event-cancelled"].includes(
      template,
    )
  )
    throw new Error("Ogiltig okrypterad köreferens.");
  return resolveEventReference(
    template as Extract<
      MailTemplate,
      "event-registration" | "event-waitlist" | "event-cancelled"
    >,
    parsed.data,
  );
}

async function resolveEventReference(
  template: Extract<
    MailTemplate,
    "event-registration" | "event-waitlist" | "event-cancelled"
  >,
  reference: EventReference,
) {
  const { data, error } = await createServiceClient()
    .from("event_registrations")
    .select("id,status,ticket_code,events!inner(title,slug)")
    .eq("id", reference.reference.id)
    .maybeSingle();
  if (error || !data) throw new Error("Köreferensen kunde inte lösas.");
  const row = data as EventRow;
  const event = Array.isArray(row.events) ? row.events[0] : row.events;
  if (!event) throw new Error("Köreferensen saknar evenemang.");
  if (template === "event-registration" && row.status !== "confirmed")
    throw new Error("Evenemangsanmälan är inte längre bekräftad.");
  if (template === "event-waitlist" && row.status !== "waitlisted")
    throw new Error("Väntelisteanmälan är inte längre aktiv.");
  if (template === "event-cancelled" && row.status !== "cancelled")
    throw new Error("Avbokningsreferensen är inte aktiv.");
  const url = new URL(
    `/evenemang/${event.slug}`,
    platformConfig().siteUrl,
  ).toString();
  return validateTemplateData(template, {
    eventTitle: event.title,
    ...(template === "event-registration" && row.ticket_code
      ? { ticketCode: row.ticket_code }
      : {}),
    url,
  });
}
