import "server-only";
import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/platform/db";
import { encryptPayload } from "./crypto";
import {
  queueMailInput,
  validateTemplateData,
  type MailTemplate,
  type QueueMailInput,
} from "./types";

export async function queueMail(input: QueueMailInput) {
  const parsed = queueMailInput.parse(input);
  const template = parsed.template as MailTemplate;
  const data = validateTemplateData(template, parsed.data);
  const { error } = await createServiceClient().rpc("enqueue_queue_mail", {
    mail_key: parsed.key,
    mail_template: template,
    mail_recipient: parsed.recipient,
    mail_data: encryptPayload(data),
    mail_due: (parsed.due ?? new Date()).toISOString(),
    mail_consent: parsed.consentId ?? null,
  });
  // Provider errors can contain values from the request. Never surface those
  // through an application error, log, or API response.
  if (error) throw new Error("Kunde inte köa e-post.");
}

export type ClaimedMail = {
  key: string;
  template: MailTemplate;
  recipient: string;
  data: unknown;
  attempts: number;
  lease: string;
  consentId: string | null;
  consentEpoch: string | null;
};
export async function claimQueuedMail(limit = 10): Promise<ClaimedMail[]> {
  const worker = randomUUID();
  const { data, error } = await createServiceClient().rpc("claim_queue_mail", {
    worker_token: worker,
    maximum: Math.min(Math.max(limit, 1), 50),
  });
  if (error) throw new Error("Kunde inte hämta e-postkön.");
  return (data ?? []).map((row: Record<string, unknown>) => ({
    key: String(row.key),
    template: String(row.template) as MailTemplate,
    recipient: String(row.recipient),
    data: row.data,
    attempts: Number(row.attempts),
    lease: worker,
    consentId: row.consent_id ? String(row.consent_id) : null,
    consentEpoch: row.consent_epoch ? String(row.consent_epoch) : null,
  }));
}

export async function completeQueuedMail(
  key: string,
  lease: string,
  outcome: "sent" | "retry" | "unknown" | "failed",
  providerId?: string,
  errorText?: string,
) {
  const { error } = await createServiceClient().rpc("complete_queue_mail", {
    mail_key: key,
    worker_token: lease,
    outcome,
    provider_message_id: providerId ?? null,
    failure: errorText?.slice(0, 500) ?? null,
  });
  if (error) throw new Error("Kunde inte uppdatera e-postkön.");
}
export async function markQueuedMailTransport(
  key: string,
  lease: string,
  transport: "smtp" | "resend",
) {
  const { error } = await createServiceClient().rpc(
    "mark_queue_mail_transport",
    { mail_key: key, worker_token: lease, transport_name: transport },
  );
  if (error) throw new Error("Kunde inte markera e-postleveransen.");
}

/** Atomically checks the consent snapshot and campaign lease before queuing. */
export async function queueCampaignMail(
  input: QueueMailInput & { campaignId: string; lease: string },
) {
  const parsed = queueMailInput.parse(input);
  const template = parsed.template as MailTemplate;
  const data = validateTemplateData(template, parsed.data);
  const { data: queued, error } = await createServiceClient().rpc(
    "enqueue_campaign_mail",
    {
      campaign: input.campaignId,
      consent: parsed.consentId,
      worker_token: input.lease,
      mail: {
        key: parsed.key,
        template,
        recipient: parsed.recipient,
        data: encryptPayload(data),
        due: (parsed.due ?? new Date()).toISOString(),
      },
    },
  );
  if (error) throw new Error("Kunde inte köa kampanjutskicket.");
  return queued === true;
}
