import { Resend } from "resend";
import { platformFeatures } from "@/lib/platform/config";
import { createServiceClient } from "@/lib/platform/db";
import { readLimitedBody } from "@/lib/platform/http";

type EventData = {
  to?: string | string[];
  email?: string;
  email_id?: string;
  id?: string;
};
type WebhookEvent = { type?: string; data?: EventData };
function recipient(event: WebhookEvent) {
  const value = event.data?.to ?? event.data?.email;
  return (Array.isArray(value) ? value[0] : value)?.trim().toLowerCase();
}
function providerMessageId(event: WebhookEvent) {
  const value = event.data?.email_id ?? event.data?.id;
  return typeof value === "string" && value.length <= 200 ? value : null;
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (
    !platformFeatures().email ||
    !secret ||
    process.env.CFD_RESEND_ENABLED !== "true"
  )
    return new Response(null, { status: 404 });
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature)
    return new Response(null, { status: 400 });
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(declaredSize) || declaredSize > 65_536)
    return new Response(null, { status: 413 });
  let payload: string;
  try {
    payload = await readLimitedBody(request);
  } catch {
    return new Response(null, { status: 413 });
  }
  let event: WebhookEvent;
  // Signature verification is local; this client never makes an API request.
  try {
    event = new Resend("webhook-verification-only").webhooks.verify({
      payload,
      webhookSecret: secret,
      headers: { id, timestamp, signature },
    }) as WebhookEvent;
  } catch {
    return new Response(null, { status: 401 });
  }
  // Keep only reconciliation metadata. The provider body can contain headers and
  // recipient PII; it is verified before this projection and is not retained.
  const { error } = await createServiceClient().rpc("record_resend_webhook", {
    event_id: id,
    event_kind: event.type ?? "unknown",
    event_payload: { provider_message_id: providerMessageId(event) },
    event_recipient: recipient(event) ?? null,
  });
  if (error) return new Response(null, { status: 503 });
  return new Response(null, { status: 204 });
}
