import Link from "next/link";
import { PageLayout } from "@/components/PageLayout";
import { pageContent, site } from "@/content/site";
import { getEventRepository } from "@/lib/events/repository";
import { getUpcomingEvents } from "@/lib/content/events";
import { platformEnabled } from "@/lib/platform/config";

export const metadata = {
  title: `${pageContent.events.eyebrow} | ${site.name}`,
  description: pageContent.events.intro,
  alternates: { canonical: "/evenemang" },
};
export const dynamic = "force-dynamic";
function EventCards({
  events,
}: {
  events: Awaited<
    ReturnType<ReturnType<typeof getEventRepository>["listPublic"]>
  >;
}) {
  return (
    <div className="news-list">
      {events.length === 0 ? (
        <p className="empty-state">{pageContent.events.empty}</p>
      ) : (
        events.map((event) => (
          <article className="outline-card" key={event.slug}>
            <p className="subpage-eyebrow">
              <time dateTime={event.startsAt}>
                {new Date(event.startsAt).toLocaleString("sv-SE", {
                  timeZone: "Europe/Stockholm",
                })}
              </time>
            </p>
            <h2>{event.title}</h2>
            <p>
              {event.location} · {event.organiser}
            </p>
            <p>{event.description}</p>
            <Link
              className="text-link card-link"
              href={`/evenemang/${event.slug}`}
            >
              {pageContent.events.link}
            </Link>
          </article>
        ))
      )}
    </div>
  );
}
async function PlatformEventCards() {
  return <EventCards events={await getEventRepository().listPublic()} />;
}
export default function EventsPage() {
  const fileEvents = platformEnabled()
    ? null
    : getUpcomingEvents().map((event) => ({
        id: `file:${event.slug}`,
        slug: event.slug,
        title: event.title,
        description: event.description,
        startsAt: event.date,
        endsAt: null,
        location: event.location,
        organiser: event.organiser,
        capacity: null,
        registrationOpen: event.registrationOpen,
        published: true,
        priceOre: 0,
        currency: "sek" as const,
        cancelledAt: null,
        createdAt: event.date,
        updatedAt: event.date,
      }));
  return (
    <PageLayout
      current="events"
      eyebrow={pageContent.events.eyebrow}
      title={pageContent.events.title}
      intro={pageContent.events.intro}
    >
      <section className="subpage-section">
        <div className="section-title-row">
          <p className="subpage-eyebrow">Kalender</p>
          <h2>Kommande evenemang</h2>
        </div>
        {fileEvents ? (
          <EventCards events={fileEvents} />
        ) : (
          <PlatformEventCards />
        )}
      </section>
    </PageLayout>
  );
}
