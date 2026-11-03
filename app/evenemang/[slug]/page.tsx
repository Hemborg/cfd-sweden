import { notFound } from "next/navigation";
import { PageLayout } from "@/components/PageLayout";
import { site } from "@/content/site";
import { getEvents } from "@/lib/content/events";

export const dynamicParams = false;
export function generateStaticParams() { return getEvents().map(({ slug }) => ({ slug })); }
async function findEvent(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  const event = getEvents().find((candidate) => candidate.slug === slug);
  if (!event) notFound();
  return event;
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const event = await findEvent(params);
  return { title: `${event.title} | ${site.name}`, description: event.description, alternates: { canonical: `/evenemang/${event.slug}` } };
}
export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = await findEvent(params);
  return <PageLayout current="events" eyebrow={new Date(event.date).toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" })} title={event.title} intro={event.description}>
    <section className="subpage-section article-copy"><p>Ort: {event.location}</p><p>Arrangör: {event.organiser}</p>
      {event.externalUrl && <a className="text-link" href={event.externalUrl}>Extern information</a>}
    </section>
  </PageLayout>;
}
