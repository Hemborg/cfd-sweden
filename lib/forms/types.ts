export type SubmissionStatus = "received" | "notified";
export type ConsentStatus = "pending" | "confirmed" | "withdrawn";

export type ContactSubmission = {
  id: string;
  createdAt: Date;
  email: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  message?: string;
  category: "general" | "event";
  eventSlug?: string;
  status: SubmissionStatus;
  idempotencyKey: string;
};

export type NewsletterConsent = {
  id: string;
  email: string;
  source: string;
  consentTextVersion: string;
  status: ConsentStatus;
  requestedAt: Date;
  confirmedAt?: Date;
  withdrawnAt?: Date;
  confirmTokenHash?: string;
  confirmTokenExpiresAt?: Date;
  unsubscribeTokenHash: string;
};

export type Notification = {
  id: string;
  submissionId: string;
  kind: "contact" | "newsletter-confirmation";
  status: "queued" | "sent" | "failed" | "superseded";
  attempts: number;
  createdAt: Date;
};

export interface FormStore {
  createSubmissionAndNotification(input: ContactSubmission, notification: Notification): Promise<{ record: ContactSubmission; created: boolean }>;
  findSubmissionByKey(key: string): Promise<ContactSubmission | undefined>;
  getConsentByEmail(email: string): Promise<NewsletterConsent | undefined>;
  requestConsentAndNotification(consent: NewsletterConsent, notification: Notification): Promise<{ consent: NewsletterConsent; created: boolean }>;
  consumeConfirmation(hash: string, now: Date): Promise<boolean>;
  consumeWithdrawal(hash: string, now: Date): Promise<boolean>;
}

export interface Clock { now(): Date }
