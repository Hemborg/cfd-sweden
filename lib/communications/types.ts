import { z } from "zod";

export const mailTemplates = [
  "contact-received",
  "contact-owner-notification",
  "newsletter-confirmation",
  "newsletter-confirmed",
  "portal-invitation",
  "account-recovery",
  "welcome",
  "event-confirmation",
  "event-registration",
  "event-cancelled",
  "event-waitlist",
  "event-practical-info",
  "group-invitation",
  "task-assignment",
  "campaign-newsletter",
] as const;
export type MailTemplate = (typeof mailTemplates)[number];
export const eventReference = z.object({
  reference: z.object({
    type: z.literal("event-registration"),
    id: z.string().uuid(),
  }),
});
export type EventReference = z.infer<typeof eventReference>;

const url = z.string().url().max(2_000);
const optionalName = z.string().trim().max(100).optional();
export const templateData = {
  "contact-received": z.object({ reference: z.string().uuid() }),
  "contact-owner-notification": z.object({ submissionId: z.string().uuid() }),
  "newsletter-confirmation": z.object({ url }),
  "newsletter-confirmed": z.object({ unsubscribeUrl: url }),
  "portal-invitation": z.object({ url }),
  "account-recovery": z.object({ url }),
  welcome: z.object({ name: optionalName }),
  "event-confirmation": z.object({ eventTitle: z.string().max(200), url }),
  "event-registration": z.object({
    eventTitle: z.string().max(200),
    ticketCode: z.string().min(6).max(200).optional(),
    cancellationUrl: url.optional(),
    url: url.optional(),
  }),
  "event-cancelled": z.object({ eventTitle: z.string().max(200) }),
  "event-waitlist": z.object({
    eventTitle: z.string().max(200),
    url: url.optional(),
  }),
  "event-practical-info": z.object({
    eventTitle: z.string().max(200),
    message: z.string().trim().min(1).max(10_000),
    url: url.optional(),
  }),
  "group-invitation": z.object({ groupName: z.string().max(200), url }),
  "task-assignment": z.object({ taskTitle: z.string().max(200), url }),
  "campaign-newsletter": z.object({
    campaignId: z.string().uuid(),
    subject: z.string().max(200),
    html: z.string().max(200_000),
    text: z.string().max(100_000),
    unsubscribeUrl: url,
  }),
} as const;

export const queueMailInput = z.object({
  key: z
    .string()
    .min(8)
    .max(200)
    .regex(/^[A-Za-z0-9_:/.-]+$/),
  template: z.enum(mailTemplates),
  recipient: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  data: z.record(z.string(), z.unknown()),
  due: z.coerce.date().optional(),
  consentId: z.string().uuid().nullable().optional(),
});
export type QueueMailInput = z.input<typeof queueMailInput>;
export type QueuedMail = z.infer<typeof queueMailInput>;

export function validateTemplateData(
  template: MailTemplate,
  data: Record<string, unknown>,
) {
  return templateData[template].parse(data);
}
