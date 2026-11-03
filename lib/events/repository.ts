import type { SupabaseClient } from "@supabase/supabase-js";
import { getEvents, type Event as FileEvent } from "@/lib/content/events";
import { platformEnabled } from "@/lib/platform/config";
import { createPublicClient } from "@/lib/platform/db";
import type {
  EventInput,
  PlatformEvent,
  Registration,
  RefundReconciliation,
} from "./types";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
  organiser: string;
  capacity: number | null;
  registration_open: boolean;
  published: boolean;
  price_ore: number;
  currency: "sek";
  external_url: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};
type RegistrationRow = {
  id: string;
  event_id: string;
  email: string;
  name: string;
  status: Registration["status"];
  ticket_code: string | null;
  checkout_session_id: string | null;
  created_at: string;
};

function event(row: EventRow): PlatformEvent {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    organiser: row.organiser,
    capacity: row.capacity,
    registrationOpen: row.registration_open,
    published: row.published,
    priceOre: row.price_ore,
    currency: row.currency,
    externalUrl: row.external_url ?? undefined,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function registration(row: RegistrationRow): Registration {
  return {
    id: row.id,
    eventId: row.event_id,
    email: row.email,
    name: row.name,
    status: row.status,
    ticketCode: row.ticket_code,
    checkoutSessionId: row.checkout_session_id,
    createdAt: row.created_at,
  };
}
function fromFile(row: FileEvent): PlatformEvent {
  const stamp = row.date;
  return {
    id: `file:${row.slug}`,
    slug: row.slug,
    title: row.title,
    description: row.description,
    startsAt: stamp,
    endsAt: null,
    location: row.location,
    organiser: row.organiser,
    capacity: null,
    registrationOpen: row.registrationOpen,
    published: true,
    priceOre: 0,
    currency: "sek",
    externalUrl: row.externalUrl,
    cancelledAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export type EventRepository = {
  listPublic(now?: Date): Promise<PlatformEvent[]>;
  listPublicArchive(): Promise<PlatformEvent[]>;
  getPublicBySlug(slug: string): Promise<PlatformEvent | null>;
  listAdmin(): Promise<PlatformEvent[]>;
  save(input: EventInput): Promise<PlatformEvent>;
  registerFree(input: {
    eventSlug: string;
    email: string;
    name: string;
    ticketCode: string;
  }): Promise<Registration>;
  cancelRegistration(id: string): Promise<void>;
  cancelEvent(id: string): Promise<void>;
  checkIn(ticketCode: string): Promise<Registration>;
  exportRegistrations(eventSlug: string): Promise<Registration[]>;
  listRegistrations(eventSlug: string, query?: string): Promise<Registration[]>;
  listRefundReconciliation(): Promise<RefundReconciliation[]>;
};

async function loadRegistrations(
  client: SupabaseClient,
  eventSlug: string,
  query = "",
): Promise<Registration[]> {
  const request = () => {
    let result = client
      .from("event_registrations")
      .select("*, events!inner(slug)", { count: "exact" })
      .eq("events.slug", eventSlug);
    const term = query.replace(/[,%()]/g, "").slice(0, 100);
    if (term) result = result.or(`email.ilike.%${term}%,name.ilike.%${term}%`);
    return result.order("created_at").order("id");
  };
  const first = await request().range(0, 499);
  if (first.error || first.count === null)
    throw new Error("Kunde inte hämta deltagare.");
  if (first.count > 5000)
    throw new Error(
      "Urvalet överstiger 5 000 deltagare. Begränsa sökningen eller använd en behörig databasexport.",
    );
  const rows = [...(first.data as RegistrationRow[])];
  for (let offset = 500; offset < first.count; offset += 500) {
    const result = await request().range(offset, offset + 499);
    if (result.error || result.count !== first.count)
      throw new Error("Deltagarlistan ändrades. Försök exportera igen.");
    rows.push(...(result.data as RegistrationRow[]));
  }
  if (rows.length !== first.count)
    throw new Error("Exporten blev ofullständig. Försök igen.");
  return rows.map(registration);
}

export function createPlatformEventRepository(
  client: SupabaseClient,
): EventRepository {
  return {
    async listPublic(now = new Date()) {
      const { data, error } = await client
        .from("events")
        .select("*")
        .eq("published", true)
        .is("cancelled_at", null)
        .gte("starts_at", now.toISOString())
        .abortSignal(AbortSignal.timeout(5_000))
        .retry(false)
        .order("starts_at");
      if (error) throw new Error("Kunde inte hämta evenemang.");
      return (data as EventRow[]).map(event);
    },
    async listPublicArchive() {
      const { data, error } = await client
        .from("events")
        .select("*")
        .eq("published", true)
        .abortSignal(AbortSignal.timeout(5_000))
        .retry(false)
        .order("starts_at");
      if (error) throw new Error("Kunde inte hämta evenemang.");
      return (data as EventRow[]).map(event);
    },
    async getPublicBySlug(slug) {
      const { data, error } = await client
        .from("events")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .abortSignal(AbortSignal.timeout(5_000))
        .retry(false)
        .maybeSingle();
      if (error) throw new Error("Kunde inte hämta evenemanget.");
      return data ? event(data as EventRow) : null;
    },
    async listAdmin() {
      const { data, error } = await client
        .from("events")
        .select("*")
        .order("starts_at");
      if (error) throw new Error("Kunde inte hämta evenemangen.");
      return (data as EventRow[]).map(event);
    },
    async save(input) {
      const row = {
        slug: input.slug,
        title: input.title,
        description: input.description,
        starts_at: input.startsAt,
        ends_at: input.endsAt ?? null,
        location: input.location,
        organiser: input.organiser,
        capacity: input.capacity ?? null,
        registration_open: input.registrationOpen,
        published: input.published,
        price_ore: input.priceOre,
        currency: input.currency,
        external_url: input.externalUrl ?? null,
      };
      const { data, error } = await client
        .from("events")
        .upsert(row, { onConflict: "slug" })
        .select("*")
        .single();
      if (error) throw new Error("Kunde inte spara evenemanget.");
      return event(data as EventRow);
    },
    async registerFree(input) {
      const { data, error } = await client.rpc("register_free_event", {
        p_event_slug: input.eventSlug,
        p_email: input.email,
        p_name: input.name,
        p_ticket_code: input.ticketCode,
      });
      if (error) throw new Error("Anmälan kunde inte genomföras.");
      return registration(data as RegistrationRow);
    },
    async cancelRegistration(id) {
      const { error } = await client.rpc("cancel_event_registration", {
        p_registration_id: id,
      });
      if (error) throw new Error("Kunde inte avboka anmälan.");
    },
    async cancelEvent(id) {
      const { error } = await client.rpc("cancel_event", { p_event_id: id });
      if (error) throw new Error("Kunde inte ställa in evenemanget.");
    },
    async checkIn(ticketCode) {
      const { data, error } = await client.rpc("check_in_event_ticket", {
        p_ticket_code: ticketCode,
      });
      if (error) throw new Error("Biljetten kunde inte checkas in.");
      return registration(data as RegistrationRow);
    },
    async exportRegistrations(eventSlug) {
      return loadRegistrations(client, eventSlug);
    },
    async listRegistrations(eventSlug, query = "") {
      return loadRegistrations(client, eventSlug, query);
    },
    async listRefundReconciliation() {
      const { data, error } = await client
        .from("event_payment_attempts")
        .select("*")
        .eq("status", "refund_required")
        .order("created_at");
      if (error) throw new Error("Kunde inte hämta återbetalningar.");
      return (data as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        registrationId: String(row.registration_id),
        checkoutSessionId: row.checkout_session_id
          ? String(row.checkout_session_id)
          : null,
        paymentIntentId: row.payment_intent_id
          ? String(row.payment_intent_id)
          : null,
        priceOre: Number(row.price_ore),
        currency: String(row.currency),
        amountRefunded: Number(row.amount_refunded),
        status: "refund_required",
        createdAt: String(row.created_at),
      }));
    },
  };
}

export function createFileEventRepository(): EventRepository {
  return {
    async listPublic(now = new Date()) {
      return getEvents()
        .map(fromFile)
        .filter((row) => new Date(row.startsAt).getTime() >= now.getTime());
    },
    async listPublicArchive() {
      return getEvents().map(fromFile);
    },
    async getPublicBySlug(slug) {
      const found = getEvents().find((row) => row.slug === slug);
      return found ? fromFile(found) : null;
    },
    async listAdmin() {
      return getEvents().map(fromFile);
    },
    async save() {
      throw new Error("Evenemangsadministration kräver plattformens databas.");
    },
    async registerFree() {
      throw new Error("Evenemangsanmälan är inte aktiverad.");
    },
    async cancelRegistration() {
      throw new Error("Evenemangsanmälan är inte aktiverad.");
    },
    async cancelEvent() {
      throw new Error("Evenemangsanmälan är inte aktiverad.");
    },
    async checkIn() {
      throw new Error("Evenemangsanmälan är inte aktiverad.");
    },
    async exportRegistrations() {
      throw new Error("Evenemangsanmälan är inte aktiverad.");
    },
    async listRegistrations() {
      throw new Error("Evenemangsanmälan är inte aktiverad.");
    },
    async listRefundReconciliation() {
      return [];
    },
  };
}
// Public pages intentionally use the anon client so the database's public RLS
// policy is exercised in production. Privileged actions create their own session/service repository.
export function getEventRepository(): EventRepository {
  return platformEnabled()
    ? createPlatformEventRepository(createPublicClient())
    : createFileEventRepository();
}
