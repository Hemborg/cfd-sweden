import type { ContactSubmission, FormStore, NewsletterConsent, Notification } from "./types";

export class MemoryFormStore implements FormStore {
  readonly submissions = new Map<string, ContactSubmission>();
  readonly keys = new Map<string, string>();
  readonly consents = new Map<string, NewsletterConsent>();
  readonly notifications: Notification[] = [];
  readonly consentEvents: { consentId: string; type: "requested" | "confirmed" | "withdrawn"; at: Date; source: string; textVersion: string }[] = [];
  private recordConsentEvent(consent: NewsletterConsent, type: "requested" | "confirmed" | "withdrawn", at: Date) {
    this.consentEvents.push({ consentId: consent.id, type, at, source: consent.source, textVersion: consent.consentTextVersion });
    if (type !== "requested") {
      for (const notification of this.notifications) {
        if (notification.submissionId === consent.id && notification.kind === "newsletter-confirmation" && notification.status === "queued") notification.status = "superseded";
      }
    }
  }
  private async createSubmission(input: ContactSubmission) {
    const existingId = this.keys.get(input.idempotencyKey);
    if (existingId) return { record: this.submissions.get(existingId)!, created: false };
    this.submissions.set(input.id, input); this.keys.set(input.idempotencyKey, input.id);
    return { record: input, created: true };
  }
  async createSubmissionAndNotification(input: ContactSubmission, notification: Notification) {
    const saved = await this.createSubmission(input);
    if (saved.created) this.notifications.push(notification);
    return saved;
  }
  async findSubmissionByKey(key: string) { const id = this.keys.get(key); return id ? this.submissions.get(id) : undefined; }
  async getConsentByEmail(email: string) { return this.consents.get(email); }
  /** Test fixture helper; it is not part of the runtime FormStore contract. */
  async saveConsent(consent: NewsletterConsent) { this.consents.set(consent.email, consent); }
  async requestConsentAndNotification(consent: NewsletterConsent, notification: Notification) {
    const previous = this.consents.get(consent.email);
    if (previous?.status === "confirmed" || (previous?.status === "pending" && previous.confirmTokenExpiresAt && previous.confirmTokenExpiresAt > consent.requestedAt)) {
      return { consent: previous, created: false };
    }
    const saved = { ...consent, id: previous?.id ?? consent.id };
    for (const notice of this.notifications) {
      if (notice.submissionId === saved.id && notice.kind === "newsletter-confirmation" && notice.status === "queued") notice.status = "superseded";
    }
    this.consents.set(saved.email, saved);
    this.notifications.push({ ...notification, submissionId: saved.id });
    this.recordConsentEvent(saved, "requested", saved.requestedAt);
    return { consent: saved, created: true };
  }
  async consumeConfirmation(hash: string, now: Date) {
    const consent = [...this.consents.values()].find((item) => item.confirmTokenHash === hash);
    if (!consent || consent.status !== "pending" || !consent.confirmTokenExpiresAt || consent.confirmTokenExpiresAt <= now) return false;
    consent.status = "confirmed"; consent.confirmedAt = now; consent.confirmTokenHash = undefined; consent.confirmTokenExpiresAt = undefined;
    this.consents.set(consent.email, consent);
    this.recordConsentEvent(consent, "confirmed", now);
    return true;
  }
  async consumeWithdrawal(hash: string, now: Date) {
    const consent = [...this.consents.values()].find((item) => item.unsubscribeTokenHash === hash);
    if (!consent || consent.status === "withdrawn") return false;
    consent.status = "withdrawn"; consent.withdrawnAt = now; consent.confirmTokenHash = undefined; consent.confirmTokenExpiresAt = undefined;
    this.consents.set(consent.email, consent);
    this.recordConsentEvent(consent, "withdrawn", now);
    return true;
  }
}

// Intentionally process-local: it powers only the localhost demo and is never a production datastore.
export const demoStore = new MemoryFormStore();
