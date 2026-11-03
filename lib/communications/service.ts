import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/platform/db";
import { platformConfig, requireFeature } from "@/lib/platform/config";
import { decryptPayload, encryptPayload } from "./crypto";
import {
  queueMailInput,
  validateTemplateData,
  type MailTemplate,
} from "./types";
import type { ContactInput, NewsletterInput } from "@/lib/forms/validation";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("base64url");
function encryptedMail(
  key: string,
  template: MailTemplate,
  recipient: string,
  data: Record<string, unknown>,
  consentId?: string | null,
) {
  return queueMailInput.parse({
    key,
    template,
    recipient,
    data: encryptPayload(validateTemplateData(template, data)),
    due: new Date(),
    consentId: consentId ?? null,
  });
}

export async function createContact(input: ContactInput) {
  requireFeature("contactDatabase");
  const id = randomUUID();
  const now = new Date();
  const owner = (process.env.CFD_MAIL_OPERATIONS ?? "cfdsweden@proton.me")
    .trim()
    .toLowerCase();
  const receipt = encryptedMail(
    `contact-receipt/${id}`,
    "contact-received",
    input.email,
    { reference: id },
  );
  const notice = encryptedMail(
    `contact-owner/${id}`,
    "contact-owner-notification",
    owner,
    { submissionId: id },
  );
  const submission = {
    id,
    createdAt: now.toISOString(),
    email: input.email,
    firstName: input.firstName || "",
    lastName: input.lastName || "",
    city: input.city || "",
    message: input.message || "",
    metadata: input.metadata ?? {},
    category: input.category,
    inquiryType: input.inquiryType,
    eventSlug: input.eventSlug || "",
    idempotencyKey: input.idempotencyKey,
  };
  const { data, error } = await createServiceClient().rpc(
    "create_contact_and_queue",
    { submission, receipt, owner_notice: notice },
  );
  if (error) throw new Error("Kunde inte spara kontaktärendet.");
  return data as { submission: { id: string }; created: boolean };
}

export async function requestNewsletter(input: NewsletterInput) {
  requireFeature("newsletters");
  const confirmationToken = token();
  const unsubscribeToken = token();
  const config = platformConfig();
  const consentId = randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const confirmationUrl = new URL("/nyhetsbrev/bekrafta", config.siteUrl);
  confirmationUrl.searchParams.set("token", confirmationToken);
  const mail = encryptedMail(
    `newsletter-confirmation/${consentId}`,
    "newsletter-confirmation",
    input.email,
    { url: confirmationUrl.toString() },
    consentId,
  );
  const consent = {
    id: consentId,
    email: input.email,
    source: "cfdsweden.se",
    consentTextVersion: "pending-approval",
    confirmTokenHash: hash(confirmationToken),
    confirmTokenExpiresAt: expires.toISOString(),
    unsubscribeTokenHash: hash(unsubscribeToken),
    unsubscribeTokenEncrypted: encryptPayload({ token: unsubscribeToken }),
  };
  const { data, error } = await createServiceClient().rpc(
    "request_newsletter_with_queue",
    { consent, mail },
  );
  if (error) throw new Error("Kunde inte registrera samtycke.");
  return data as {
    created: boolean;
    state: "confirmed" | "pending" | "requested";
  };
}

export async function confirmNewsletter(rawToken: string) {
  requireFeature("newsletters");
  const service = createServiceClient();
  const tokenHash = hash(rawToken);
  // The recoverable unsubscribe token is encrypted at rest. It is read only in
  // this server flow so the successful confirmation and its receipt can share
  // a valid, recipient-specific unsubscribe URL without storing raw tokens.
  const { data: pending, error: readError } = await service
    .from("newsletter_consents")
    .select("id,email,unsubscribe_token_encrypted")
    .eq("confirm_token_hash", tokenHash)
    .eq("status", "pending")
    .maybeSingle();
  if (readError) throw new Error("Kunde inte kontrollera prenumerationen.");
  if (!pending?.unsubscribe_token_encrypted) return false;
  const payload = decryptPayload<{ token: string }>(
    pending.unsubscribe_token_encrypted,
  );
  const unsubscribeUrl = new URL(
    "/nyhetsbrev/avregistrera",
    platformConfig().siteUrl,
  );
  unsubscribeUrl.searchParams.set("token", payload.token);
  const mail = encryptedMail(
    `newsletter-confirmed/${pending.id}`,
    "newsletter-confirmed",
    pending.email,
    { unsubscribeUrl: unsubscribeUrl.toString() },
    pending.id,
  );
  const { data, error } = await service.rpc("confirm_newsletter_and_queue", {
    token_hash: tokenHash,
    occurred_at: new Date().toISOString(),
    mail,
  });
  if (error) throw new Error("Kunde inte bekräfta prenumerationen.");
  return data === true;
}

export async function withdrawNewsletter(rawToken: string) {
  requireFeature("newsletters");
  const { data, error } = await createServiceClient().rpc(
    "withdraw_newsletter_consent",
    { token_hash: hash(rawToken), occurred_at: new Date().toISOString() },
  );
  if (error) throw new Error("Kunde inte avregistrera prenumerationen.");
  return data === true;
}
