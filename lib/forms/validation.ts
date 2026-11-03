import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const contactSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("Ange en giltig e-postadress.")
      .max(254)
      .transform((value) => value.toLowerCase()),
    firstName: optionalText(100),
    lastName: optionalText(100),
    city: optionalText(100),
    message: optionalText(4_000),
    category: z.enum(["general", "event"]).default("general"),
    inquiryType: z.enum(["join", "contact"]).optional(),
    metadata: z
      .object({
        topic: z.string().trim().max(100).optional(),
        phone: z.string().trim().max(50).optional(),
        postalCode: z.string().trim().max(20).optional(),
        country: z.string().trim().max(100).optional(),
        region: z.string().trim().max(100).optional(),
      })
      .optional(),
    eventSlug: optionalText(120),
    honeypot: z
      .string()
      .max(0, "Insändningen kunde inte tas emot.")
      .default(""),
    idempotencyKey: z.string().uuid("Saknar giltig insändningsnyckel."),
  })
  .superRefine((value, ctx) => {
    if (value.category === "event" && !value.eventSlug) {
      ctx.addIssue({
        code: "custom",
        path: ["eventSlug"],
        message: "Välj ett evenemang.",
      });
    }
    if (value.inquiryType === "contact" && !value.message?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["message"],
        message: "Skriv ett meddelande.",
      });
    }
  });

export const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Ange en giltig e-postadress.")
    .max(254)
    .transform((value) => value.toLowerCase()),
  consent: z.literal(true, {
    error: "Du behöver aktivt samtycka till nyhetsbrevet.",
  }),
  honeypot: z
    .string()
    .max(0, "Registreringen kunde inte tas emot.")
    .default(""),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type NewsletterInput = z.infer<typeof newsletterSchema>;
