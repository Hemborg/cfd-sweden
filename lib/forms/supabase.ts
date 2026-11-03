import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactSubmission, FormStore, NewsletterConsent, Notification } from "./types";

type Row = Record<string, unknown>;
const toDate = (value: unknown) => value ? new Date(String(value)) : undefined;
const contactFromRow = (row: Row): ContactSubmission => ({
  id: String(row.id), createdAt: new Date(String(row.created_at)), email: String(row.email),
  firstName: row.first_name ? String(row.first_name) : undefined, lastName: row.last_name ? String(row.last_name) : undefined,
  city: row.city ? String(row.city) : undefined, message: row.message ? String(row.message) : undefined,
  category: row.category as ContactSubmission["category"], eventSlug: row.event_slug ? String(row.event_slug) : undefined,
  status: row.status as ContactSubmission["status"], idempotencyKey: String(row.idempotency_key),
});
const consentFromRow = (row: Row): NewsletterConsent => ({
  id: String(row.id), email: String(row.email), source: String(row.source), consentTextVersion: String(row.consent_text_version ?? "unreviewed-prototype"), status: row.status as NewsletterConsent["status"],
  requestedAt: new Date(String(row.requested_at)), confirmedAt: toDate(row.confirmed_at), withdrawnAt: toDate(row.withdrawn_at),
  confirmTokenHash: row.confirm_token_hash ? String(row.confirm_token_hash) : undefined,
  confirmTokenExpiresAt: toDate(row.confirm_token_expires_at), unsubscribeTokenHash: String(row.unsubscribe_token_hash),
});

/** Server-only adapter. It is injectable for contract tests and never constructed by a route. */
export class SupabaseFormStore implements FormStore {
  constructor(private readonly client: SupabaseClient) {
    if (typeof window !== "undefined") throw new Error("Databasadaptern får endast användas på servern.");
  }
  private async rpc<T>(name: string, args: Row): Promise<T> {
    const { data, error } = await this.client.rpc(name, args);
    if (error) throw new Error(`Supabase ${name} failed.`);
    return data as T;
  }
  async createSubmissionAndNotification(input: ContactSubmission, notification: Notification) { const raw = await this.rpc<{ record: Row; created: boolean }>("save_contact_submission_with_outbox", { submission: input, notification }); return { record: contactFromRow(raw.record), created: raw.created }; }
  async findSubmissionByKey(key: string) {
    const { data, error } = await this.client.from("contact_submissions").select("*").eq("idempotency_key", key).maybeSingle();
    if (error) throw new Error("Supabase contact lookup failed."); return data ? contactFromRow(data) : undefined;
  }
  async getConsentByEmail(email: string) {
    const { data, error } = await this.client.from("newsletter_consents").select("*").eq("email", email).maybeSingle();
    if (error) throw new Error("Supabase consent lookup failed."); return data ? consentFromRow(data) : undefined;
  }
  async requestConsentAndNotification(consent: NewsletterConsent, notification: Notification) {
    const raw = await this.rpc<{ consent: Row; created: boolean }>("request_newsletter_consent_with_outbox", { consent, notification });
    return { consent: consentFromRow(raw.consent), created: raw.created };
  }
  async consumeConfirmation(hash: string, now: Date) { return this.rpc<boolean>("consume_newsletter_confirmation", { token_hash: hash, occurred_at: now.toISOString() }); }
  async consumeWithdrawal(hash: string, now: Date) { return this.rpc<boolean>("withdraw_newsletter_consent", { token_hash: hash, occurred_at: now.toISOString() }); }
}

export function createSupabaseFormStore(client: SupabaseClient): FormStore { return new SupabaseFormStore(client); }
