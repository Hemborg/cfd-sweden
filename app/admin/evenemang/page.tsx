import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/platform/auth";
import { createPlatformEventRepository } from "@/lib/events/repository";
import { eventInputSchema } from "@/lib/events/types";
import { assertSameOrigin } from "@/lib/platform/http";
import { platformConfig } from "@/lib/platform/config";
import { encryptPayload } from "@/lib/communications/crypto";
import { createHash, randomUUID } from "node:crypto";

function value(form: FormData, name: string) {
  const item = form.get(name);
  return typeof item === "string" ? item : "";
}
export default async function AdminEventsPage() {
  const actor = await requireRoles(["administrator", "editor"]);
  const canManageParticipants = actor.roles.some(
    (role) => role === "administrator" || role === "superadmin",
  );
  const repository = createPlatformEventRepository(actor.client);
  const events = await repository.listAdmin();
  const registrations = canManageParticipants
    ? await Promise.all(
        events.map(
          async (event) =>
            [
              event.slug,
              await repository.listRegistrations(event.slug),
            ] as const,
        ),
      )
    : [];
  const refundReconciliation = canManageParticipants
    ? await repository.listRefundReconciliation()
    : [];
  async function save(form: FormData) {
    "use server";
    await assertSameOrigin();
    const actor = await requireRoles(["administrator", "editor"]);
    const input = eventInputSchema.parse({
      slug: value(form, "slug"),
      title: value(form, "title"),
      description: value(form, "description"),
      startsAt: new Date(`${value(form, "startsAt")}Z`).toISOString(),
      endsAt: value(form, "endsAt")
        ? new Date(`${value(form, "endsAt")}Z`).toISOString()
        : null,
      location: value(form, "location"),
      organiser: value(form, "organiser"),
      capacity: value(form, "capacity")
        ? Number(value(form, "capacity"))
        : null,
      registrationOpen: form.get("registrationOpen") === "on",
      published: form.get("published") === "on",
      priceOre: Number(value(form, "priceOre") || 0),
      currency: "sek",
      externalUrl: value(form, "externalUrl") || undefined,
    });
    await createPlatformEventRepository(actor.client).save(input);
    revalidatePath("/evenemang");
    revalidatePath(`/evenemang/${input.slug}`);
    revalidatePath("/sitemap.xml");
  }
  async function cancelRegistration(form: FormData) {
    "use server";
    await assertSameOrigin();
    const actor = await requireRoles(["administrator"]);
    await createPlatformEventRepository(actor.client).cancelRegistration(
      value(form, "registrationId"),
    );
    revalidatePath("/admin/evenemang");
  }
  async function cancelEvent(form: FormData) {
    "use server";
    await assertSameOrigin();
    const actor = await requireRoles(["administrator"]);
    await createPlatformEventRepository(actor.client).cancelEvent(
      value(form, "eventId"),
    );
    revalidatePath("/evenemang");
    revalidatePath("/admin/evenemang");
  }
  async function checkIn(form: FormData) {
    "use server";
    await assertSameOrigin();
    const actor = await requireRoles(["administrator"]);
    const ticketCode = value(form, "ticketCode").trim().toUpperCase();
    if (!/^[A-Z0-9]{12}$/.test(ticketCode))
      throw new Error("Ogiltig biljettkod.");
    await createPlatformEventRepository(actor.client).checkIn(ticketCode);
    revalidatePath("/admin/evenemang");
  }
  async function sendPracticalInfo(form: FormData) {
    "use server";
    await assertSameOrigin();
    const actor = await requireRoles(["administrator"]);
    const eventId = value(form, "eventId");
    const requestId = value(form, "actionId");
    const message = value(form, "message").trim();
    if (
      !/^[0-9a-f-]{36}$/i.test(requestId) ||
      !message ||
      message.length > 4_000
    )
      throw new Error("Ogiltigt utskick.");
    const event = (
      await createPlatformEventRepository(actor.client).listAdmin()
    ).find((candidate) => candidate.id === eventId);
    if (!event) throw new Error("Okänt evenemang.");
    const recipients = (
      await createPlatformEventRepository(actor.client).listRegistrations(
        event.slug,
      )
    ).filter((row) => row.status === "confirmed");
    const digest = createHash("sha256").update(message, "utf8").digest("hex");
    const mails = recipients.map((row) => ({
      registrationId: row.id,
      recipient: row.email,
      key: `event:${row.id}:practical:${requestId}`,
      data: encryptPayload({
        eventTitle: event.title,
        message,
        url: `${platformConfig().siteUrl}/evenemang/${event.slug}`,
      }),
    }));
    const { error } = await actor.client.rpc(
      "create_event_practical_message_and_queue",
      {
        p_event_id: eventId,
        p_request_id: requestId,
        p_digest: digest,
        p_message: message,
        p_mails: mails,
      },
    );
    if (error) throw new Error("Kunde inte skapa utskicket.");
  }
  return (
    <section>
      <h1>Evenemang</h1>
      {canManageParticipants && (
        <>
          <section aria-labelledby="refund-title">
            <h2 id="refund-title">Återbetalningar att stämma av</h2>
            <p>
              Kontrollera betalningsreferensen i Stripe och genomför
              återbetalning enligt föreningens beslut. Denna lista uppdateras
              först efter verifierad återbetalningswebhook. Ingen knapp här
              debiterar eller återbetalar pengar.
            </p>
            {refundReconciliation.length === 0 ? (
              <p>Inga återbetalningar väntar på avstämning.</p>
            ) : (
              <ul>
                {refundReconciliation.map((attempt) => (
                  <li key={attempt.id}>
                    Betalning:{" "}
                    {attempt.paymentIntentId || "inväntar betalningsreferens"},
                    Checkout: {attempt.checkoutSessionId}, kvar att återbetala:{" "}
                    {(
                      (attempt.priceOre - attempt.amountRefunded) /
                      100
                    ).toLocaleString("sv-SE")}{" "}
                    SEK
                  </li>
                ))}
              </ul>
            )}
          </section>
          <form className="formcard" action={checkIn}>
            <label>
              Checka in biljett
              <input name="ticketCode" required pattern="[A-Z0-9]{12}" />
            </label>
            <button>Checka in</button>
          </form>
        </>
      )}
      <form className="formcard" action={save}>
        <label>
          Slug
          <input name="slug" required pattern="[a-z0-9-]+" />
        </label>
        <label>
          Rubrik
          <input name="title" required />
        </label>
        <label>
          Beskrivning
          <textarea name="description" required />
        </label>
        <label>
          Start (UTC)
          <input name="startsAt" type="datetime-local" required />
        </label>
        <label>
          Slut (UTC)
          <input name="endsAt" type="datetime-local" />
        </label>
        <label>
          Plats
          <input name="location" required />
        </label>
        <label>
          Arrangör
          <input name="organiser" required />
        </label>
        <label>
          Extern länk
          <input name="externalUrl" type="url" />
        </label>
        <label>
          Platser
          <input name="capacity" type="number" min="1" />
        </label>
        <label>
          Pris i öre
          <input name="priceOre" type="number" min="0" defaultValue="0" />
        </label>
        <label>
          <input name="registrationOpen" type="checkbox" /> Öppna anmälan
        </label>
        <label>
          <input name="published" type="checkbox" /> Publicera
        </label>
        <button>Spara evenemang</button>
      </form>
      {events.map((event) => (
        <details key={event.id}>
          <summary>
            {event.title} ({event.published ? "publicerat" : "utkast"})
          </summary>
          <form className="formcard" action={save}>
            <input type="hidden" name="slug" value={event.slug} />
            <label>
              Rubrik
              <input name="title" required defaultValue={event.title} />
            </label>
            <label>
              Beskrivning
              <textarea
                name="description"
                required
                defaultValue={event.description}
              />
            </label>
            <label>
              Start (UTC)
              <input
                name="startsAt"
                type="datetime-local"
                required
                defaultValue={event.startsAt.slice(0, 16)}
              />
            </label>
            <label>
              Slut (UTC)
              <input
                name="endsAt"
                type="datetime-local"
                defaultValue={event.endsAt?.slice(0, 16)}
              />
            </label>
            <label>
              Plats
              <input name="location" required defaultValue={event.location} />
            </label>
            <label>
              Arrangör
              <input name="organiser" required defaultValue={event.organiser} />
            </label>
            <label>
              Extern länk
              <input
                name="externalUrl"
                type="url"
                defaultValue={event.externalUrl ?? ""}
              />
            </label>
            <label>
              Platser
              <input
                name="capacity"
                type="number"
                min="1"
                defaultValue={event.capacity ?? ""}
              />
            </label>
            <label>
              Pris i öre
              <input
                name="priceOre"
                type="number"
                min="0"
                defaultValue={event.priceOre}
              />
            </label>
            <label>
              <input
                name="registrationOpen"
                type="checkbox"
                defaultChecked={event.registrationOpen}
              />{" "}
              Öppna anmälan
            </label>
            <label>
              <input
                name="published"
                type="checkbox"
                defaultChecked={event.published}
              />{" "}
              Publicera
            </label>
            <button>Spara ändring</button>
          </form>
          {canManageParticipants && (
            <>
              <form action={cancelEvent}>
                <input type="hidden" name="eventId" value={event.id} />
                <button>Ställ in evenemang</button>
              </form>
              <form className="formcard" action={sendPracticalInfo}>
                <input type="hidden" name="eventId" value={event.id} />
                <input type="hidden" name="actionId" value={randomUUID()} />
                <p>
                  Högst 500 bekräftade deltagare per praktiskt utskick. Hela
                  mottagarlistan kontrolleras innan något köas.
                </p>
                <label>
                  Praktisk information till bekräftade deltagare
                  <textarea name="message" required />
                </label>
                <button>Skicka praktisk information</button>
              </form>
              <p>
                <a href={`/api/events/${event.slug}/export`}>
                  Exportera deltagare (CSV)
                </a>
              </p>
              <ul>
                {(
                  registrations.find(([slug]) => slug === event.slug)?.[1] ?? []
                ).map((registration) => (
                  <li key={registration.id}>
                    {registration.name} · {registration.email} ·{" "}
                    {registration.status} ·{" "}
                    {registration.ticketCode ?? "ingen biljett"}
                    {registration.status === "refunded" && " (återbetalad)"}
                    {registration.status === "payment_pending" &&
                      " (betalning inväntas)"}{" "}
                    {registration.status !== "cancelled" &&
                      registration.status !== "refunded" && (
                        <form action={cancelRegistration}>
                          <input
                            type="hidden"
                            name="registrationId"
                            value={registration.id}
                          />
                          <button>
                            Avboka
                            {event.priceOre > 0
                              ? " (återbetalar inte automatiskt)"
                              : ""}
                          </button>
                        </form>
                      )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </details>
      ))}
    </section>
  );
}
