// Explicitly injected server adapter; no route constructs it in the prototype.

const OPERATIONS_ADDRESS = "cfdsweden@proton.me";

export type ResendClient = {
  emails: { send(input: { from: string; to: string[]; subject: string; text: string }, options?: { idempotencyKey?: string }): Promise<{ data: unknown; error: unknown }> };
  contacts: {
    create(input: { email: string; unsubscribed?: boolean }): Promise<{ data: unknown; error: unknown }>;
    update(input: { email: string; unsubscribed: boolean }): Promise<{ data: unknown; error: unknown }>;
  };
};

type MailAdapterOptions = { client: ResendClient; verifiedSender: string; confirmationBaseUrl: string };
type SubmissionNotice = { email: string; firstName?: string; lastName?: string; city?: string; message?: string; idempotencyKey: string };

function confirmedBaseUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("Bekräftelseadressen måste vara en ren HTTPS-basadress.");
  return url;
}

function confirmationUrl(baseUrl: URL, token: string) {
  if (!/^[A-Za-z0-9_-]{32,}$/.test(token)) throw new Error("Bekräftelsetoken har fel format.");
  const url = new URL("/nyhetsbrev/bekrafta", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

/**
 * Small explicit production adapter. It neither reads environment variables nor
 * creates a Resend client; a future outbox worker must inject both deliberately.
 */
export function createResendMailAdapter(options: MailAdapterOptions) {
  if (typeof window !== "undefined") throw new Error("Mejladaptern får endast användas på servern.");
  if (!options.verifiedSender.trim()) throw new Error("En verifierad avsändare krävs.");
  const baseUrl = confirmedBaseUrl(options.confirmationBaseUrl);
  const send = async (input: { to: string[]; subject: string; text: string; idempotencyKey: string }) => {
    try {
      const result = await options.client.emails.send({ from: options.verifiedSender, to: input.to, subject: input.subject, text: input.text }, { idempotencyKey: input.idempotencyKey });
      return result.error ? { ok: false as const } : { ok: true as const };
    } catch { return { ok: false as const }; }
  };

  return {
    async sendSubmissionNotification(submission: SubmissionNotice) {
      const name = [submission.firstName, submission.lastName].filter(Boolean).join(" ") || "Ej angivet";
      return send({
        to: [OPERATIONS_ADDRESS], subject: "Ny intresseanmälan – CFD Sweden", idempotencyKey: `contact:${submission.idempotencyKey}`,
        text: `Ny intresseanmälan\nE-post: ${submission.email}\nNamn: ${name}\nOrt: ${submission.city || "Ej angivet"}\nMeddelande: ${submission.message || "Ej angivet"}`,
      });
    },
    async sendDoubleOptIn(email: string, token: string, idempotencyKey: string) {
      const url = confirmationUrl(baseUrl, token);
      return send({ to: [email], subject: "Bekräfta din prenumeration hos CFD Sweden", idempotencyKey: `newsletter:${idempotencyKey}`, text: `Bekräfta din frivilliga prenumeration: ${url}` });
    },
    async syncConfirmedContact(email: string) {
      try { const result = await options.client.contacts.create({ email, unsubscribed: false }); return result.error ? { ok: false as const } : { ok: true as const }; } catch { return { ok: false as const }; }
    },
    async syncWithdrawnContact(email: string) {
      try { const result = await options.client.contacts.update({ email, unsubscribed: true }); return result.error ? { ok: false as const } : { ok: true as const }; } catch { return { ok: false as const }; }
    },
  };
}
