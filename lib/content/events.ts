import { z } from "zod";
import { events } from "@/content/site";

export const eventSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1),
  date: z.iso.datetime({ offset: true }),
  location: z.string().trim().min(1),
  organiser: z.string().trim().min(1),
  description: z.string().trim().min(1),
  externalUrl: z.url({ protocol: /^https$/ }).optional(),
  registrationOpen: z.boolean().default(false),
});

export function getEvents() {
  const result = z.array(eventSchema).parse(events);
  if (new Set(result.map((event) => event.slug)).size !== result.length) throw new Error("Evenemang måste ha unika slug-värden.");
  return result.sort((a, b) => a.date.localeCompare(b.date));
}
