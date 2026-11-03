import "server-only";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/platform/db";
import { decryptPayload, isEncryptedPayload } from "./crypto";
import {
  claimQueuedMail,
  completeQueuedMail,
  markQueuedMailTransport,
  type ClaimedMail,
} from "./queue";
import { renderMail } from "./templates";
import { validateTemplateData } from "./types";
import { resolveQueueReference } from "./references";
import { dispatchDueCampaigns } from "./campaigns";

function transport() {
  return process.env.CFD_MAIL_TRANSPORT ?? "disabled";
}
function localHost(host: string) {
  return ["localhost", "127.0.0.1", "::1"].includes(host);
}
function approvedResendRecipient(email: string) {
  const mode = process.env.CFD_MAIL_MODE ?? "test";
  if (mode === "live")
    return (
      process.env.CFD_EXTERNAL_SERVICES_APPROVED === "true" &&
      process.env.CFD_RESEND_LIVE_APPROVED === "true" &&
      process.env.CFD_MAIL_LEGAL_APPROVED === "true"
    );
  return (
    mode === "test" &&
    (process.env.CFD_RESEND_TEST_RECIPIENTS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
      .includes(email.toLowerCase())
  );
}
async function stillDeliverable(item: ClaimedMail) {
  if (!item.consentId) return true;
  const { data, error } = await createServiceClient()
    .from("newsletter_consents")
    .select("status,suppressed_at,delivery_epoch")
    .eq("id", item.consentId)
    .maybeSingle();
  if (error) throw new Error("Kunde inte kontrollera samtycket före leverans.");
  if (item.consentEpoch && data?.delivery_epoch !== item.consentEpoch)
    return false;
  return item.template === "newsletter-confirmation"
    ? data?.status === "pending" && !data.suppressed_at
    : data?.status === "confirmed" && !data.suppressed_at;
}

async function send(item: ClaimedMail) {
  // Only a strict opaque event reference may be plain SQL data. Everything
  // else, particularly any link or token, is an app-created AEAD envelope.
  const data = isEncryptedPayload(item.data)
    ? validateTemplateData(
        item.template,
        decryptPayload<Record<string, unknown>>(item.data),
      )
    : await resolveQueueReference(item.template, item.data);
  const message = await renderMail(item.template, data);
  if (item.consentId && !(await stillDeliverable(item)))
    return {
      state: "failed" as const,
      error: "Mottagaren saknar aktivt samtycke eller är spärrad.",
    };
  if (transport() === "smtp") {
    await markQueuedMailTransport(item.key, item.lease, "smtp");
    const host = process.env.CFD_SMTP_HOST ?? "";
    if (!localHost(host) || !item.recipient.endsWith("@example.test"))
      return {
        state: "failed" as const,
        error: "SMTP är begränsad till lokal syntetisk fångst.",
      };
    const client = nodemailer.createTransport({
      host,
      port: Number(process.env.CFD_SMTP_PORT ?? 1025),
      secure: false,
    });
    try {
      const result = await client.sendMail({
        from: process.env.CFD_MAIL_FROM ?? "CFD Sweden <noreply@example.test>",
        to: item.recipient,
        subject: message.subject,
        text: message.text,
        html: message.html,
        headers: { "X-CFD-Queue-Key": item.key },
      });
      return { state: "sent" as const, providerId: result.messageId };
    } catch {
      return {
        state: "unknown" as const,
        error: "SMTP-resultatet är okänt; sändningen återförsöks inte blint.",
      };
    }
  }
  if (
    transport() !== "resend" ||
    process.env.CFD_RESEND_ENABLED !== "true" ||
    !approvedResendRecipient(item.recipient)
  )
    return {
      state: "failed" as const,
      error:
        "Extern e-post är inte uttryckligen aktiverad för denna mottagare.",
    };
  const key = process.env.RESEND_API_KEY;
  const from = process.env.CFD_MAIL_FROM;
  if (!key || !from)
    return {
      state: "failed" as const,
      error: "Resend-avsändare eller nyckel saknas.",
    };
  await markQueuedMailTransport(item.key, item.lease, "resend");
  try {
    const result = await new Resend(key).emails.send(
      {
        from,
        to: [item.recipient],
        subject: message.subject,
        text: message.text,
        html: message.html,
      },
      { idempotencyKey: item.key },
    );
    return result.error
      ? {
          state: "retry" as const,
          error: "Resend avvisade leveransen före sändning.",
        }
      : { state: "sent" as const, providerId: result.data?.id };
  } catch {
    return {
      state: "retry" as const,
      error:
        "Resend-resultatet är oklart; samma idempotensnyckel återförsöks inom 24 timmar.",
    };
  }
}

export async function runMailWorker(limit = 10) {
  // A missing configuration must never turn queued messages into a successful
  // no-op. Local integration explicitly uses SMTP/Mailpit.
  const service = createServiceClient();
  if (transport() === "disabled") {
    await service.rpc("record_worker_heartbeat", { processed: 0 });
    return { claimed: 0, completed: 0, disabled: true };
  }
  const { data: retentionDeleted, error: retentionError } = await service.rpc(
    "apply_communications_retention",
  );
  if (retentionError)
    throw new Error("Kunde inte tillämpa godkänd gallringspolicy.");
  const expanded = await dispatchDueCampaigns(3);
  const claimed = await claimQueuedMail(limit);
  let completed = 0;
  for (const item of claimed) {
    try {
      const result = await send(item);
      await completeQueuedMail(
        item.key,
        item.lease,
        result.state,
        result.providerId,
        result.error,
      );
      completed += 1;
    } catch (error) {
      await completeQueuedMail(
        item.key,
        item.lease,
        "unknown",
        undefined,
        error instanceof Error ? error.message : "Oväntat workerfel",
      );
    }
  }
  const { error } = await service.rpc("record_worker_heartbeat", {
    processed: completed,
  });
  if (error) throw new Error("Kunde inte registrera worker-heartbeat.");
  return {
    claimed: claimed.length,
    completed,
    expanded,
    retentionDeleted: Number(retentionDeleted ?? 0),
  };
}
