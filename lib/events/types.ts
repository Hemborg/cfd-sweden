import { z } from "zod";

export const eventInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(120),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(3).max(20_000),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }).nullable().optional(),
  location: z.string().trim().min(2).max(240),
  organiser: z.string().trim().min(2).max(160),
  capacity: z.number().int().positive().max(100_000).nullable().optional(),
  registrationOpen: z.boolean().default(false),
  published: z.boolean().default(false),
  priceOre: z.number().int().min(0).max(10_000_000).default(0),
  currency: z.literal("sek").default("sek"),
  externalUrl: z.string().url().startsWith("https://").nullable().optional(),
});
export type EventInput = z.infer<typeof eventInputSchema>;
export type PlatformEvent = EventInput & {
  id: string;
  externalUrl?: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
};
export type RegistrationStatus =
  "confirmed" | "waitlisted" | "cancelled" | "payment_pending" | "refunded";
export type Registration = {
  id: string;
  eventId: string;
  email: string;
  name: string;
  status: RegistrationStatus;
  ticketCode: string | null;
  checkoutSessionId: string | null;
  createdAt: string;
};
export type RefundReconciliation = {
  id: string;
  registrationId: string;
  checkoutSessionId: string | null;
  paymentIntentId: string | null;
  priceOre: number;
  currency: string;
  amountRefunded: number;
  status: "refund_required" | "paid" | "refunded";
  createdAt: string;
};

export const registrationInputSchema = z.object({
  eventSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  name: z.string().trim().min(2).max(160),
});
export const checkinInputSchema = z.object({
  ticketCode: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{12}$/),
});

export function eventIsUpcoming(
  event: Pick<PlatformEvent, "startsAt" | "published" | "cancelledAt">,
  now = new Date(),
) {
  return (
    event.published &&
    !event.cancelledAt &&
    new Date(event.startsAt).getTime() >= now.getTime()
  );
}
