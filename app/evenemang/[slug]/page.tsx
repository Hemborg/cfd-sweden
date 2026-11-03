import { notFound } from "next/navigation";
import { PageLayout } from "@/components/PageLayout";
import { site } from "@/content/site";
import { getEventRepository } from "@/lib/events/repository";
import { EventRegistrationForm } from "@/components/events/EventRegistrationForm";

export const dynamic = "force-dynamic";
async function findEvent(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  const event = await getEventRepository().getPublicBySlug(slug);
  if (!event) notFound();
  return event;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const event = await findEvent(params);
  return {
    title: `${event.title} | ${site.name}`,
    description: event.description,
    alternates: { canonical: `/evenemang/${event.slug}` },
  };
}
export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const event = await findEvent(params);
  return (
    <PageLayout
      current="events"
      eyebrow={new Date(event.startsAt).toLocaleString("sv-SE", {
        timeZone: "Europe/Stockholm",
      })}
      title={event.title}
      intro={event.description}
    >
      <section className="subpage-section article-copy">
        <p>Ort: {event.location}</p>
        <p>Arrangör: {event.organiser}</p>
        {event.externalUrl && (
          <a className="text-link" href={event.externalUrl}>
            Extern information
          </a>
        )}
        {event.cancelledAt ? (
          <p role="status">Detta evenemang är inställt. Anmälan är stängd.</p>
        ) : (
          event.registrationOpen && (
            <EventRegistrationForm
              eventSlug={event.slug}
              paid={event.priceOre > 0}
            />
          )
        )}
      </section>
    </PageLayout>
  );
}
