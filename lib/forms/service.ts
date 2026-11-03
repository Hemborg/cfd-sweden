import { newId, newToken, tokenHash } from "./security";
import { getEvents } from "@/lib/content/events";
import type { ContactInput, NewsletterInput } from "./validation";
import type { Clock, FormStore, NewsletterConsent } from "./types";

const systemClock: Clock = { now: () => new Date() };
const DAY = 24 * 60 * 60 * 1000;
// Events are editorial data. With the current truthful empty list, no event registration is accepted.
export const approvedEventSlugs = new Set(getEvents().filter((event) => event.registrationOpen).map((event) => event.slug));

export async function receiveContact(store: FormStore, input: ContactInput, clock = systemClock) {
  if (input.category === "event" && !approvedEventSlugs.has(input.eventSlug!)) {
    return { ok: false as const, code: "unknown_event" as const };
  }
  const record = {
    id: newId(), createdAt: clock.now(), email: input.email, firstName: input.firstName || undefined,
    lastName: input.lastName || undefined, city: input.city || undefined, message: input.message || undefined,
    category: input.category, eventSlug: input.eventSlug || undefined, status: "received" as const, idempotencyKey: input.idempotencyKey,
  };
  const prior = await store.findSubmissionByKey(input.idempotencyKey);
  if (prior && (prior.email !== record.email || prior.firstName !== record.firstName || prior.lastName !== record.lastName || prior.city !== record.city || prior.message !== record.message || prior.category !== record.category || prior.eventSlug !== record.eventSlug)) {
    return { ok: false as const, code: "idempotency_conflict" as const };
  }
  const saved = await store.createSubmissionAndNotification(record, { id: newId(), submissionId: record.id, kind: "contact", status: "queued", attempts: 0, createdAt: clock.now() });
  if (!saved.created && (saved.record.email !== record.email || saved.record.firstName !== record.firstName || saved.record.lastName !== record.lastName || saved.record.city !== record.city || saved.record.message !== record.message || saved.record.category !== record.category || saved.record.eventSlug !== record.eventSlug)) {
    return { ok: false as const, code: "idempotency_conflict" as const };
  }
  return { ok: true as const, submission: saved.record, duplicate: !saved.created };
}

export async function requestNewsletterConsent(store: FormStore, input: NewsletterInput, source: string, clock = systemClock) {
  const existing = await store.getConsentByEmail(input.email);
  const token = newToken(); const unsubscribeToken = newToken(); const now = clock.now();
  const consent: NewsletterConsent = {
    id: existing?.id ?? newId(), email: input.email, source, status: "pending", requestedAt: now,
    consentTextVersion: "unreviewed-prototype",
    confirmTokenHash: tokenHash(token), confirmTokenExpiresAt: new Date(now.getTime() + DAY),
    unsubscribeTokenHash: tokenHash(unsubscribeToken),
  };
  const saved = await store.requestConsentAndNotification(consent, { id: newId(), submissionId: consent.id, kind: "newsletter-confirmation", status: "queued", attempts: 0, createdAt: now });
  if (!saved.created) return {
    ok: true as const, alreadyConfirmed: saved.consent.status === "confirmed",
    alreadyPending: saved.consent.status === "pending", token: undefined, unsubscribeToken: undefined,
  };
  // A queued record proves intent in the demo. A mail provider adapter is deliberately not invoked.
  return { ok: true as const, alreadyConfirmed: false, alreadyPending: false, token, unsubscribeToken };
}

export async function confirmNewsletterConsent(store: FormStore, token: string, clock = systemClock) {
  return store.consumeConfirmation(tokenHash(token), clock.now());
}

export async function withdrawNewsletterConsent(store: FormStore, token: string, clock = systemClock) {
  return store.consumeWithdrawal(tokenHash(token), clock.now());
}
