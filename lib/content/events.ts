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
export type Event = z.infer<typeof eventSchema>;

function eventTime(event: Event) {
  const timestamp = Date.parse(event.date);
  if (Number.isNaN(timestamp)) throw new Error(`Evenemang ${event.slug} har ett ogiltigt datum.`);
  return timestamp;
}

export function getEvents() {
  const result = z.array(eventSchema).parse(events);
  if (new Set(result.map((event) => event.slug)).size !== result.length) throw new Error("Evenemang måste ha unika slug-värden.");
  return result.sort((a, b) => eventTime(a) - eventTime(b));
}

/** Events at the exact current instant remain upcoming; passed events are omitted. */
export function getUpcomingEvents(eventEntries: Event[] = getEvents(), now: Date = new Date()) {
  const nowTimestamp = now.getTime();
  return eventEntries.filter((event) => eventTime(event) >= nowTimestamp).sort((a, b) => eventTime(a) - eventTime(b));
}
