import Link from "next/link";
import { PageLayout } from "@/components/PageLayout";
import { pageContent, site } from "@/content/site";
import { getEvents } from "@/lib/content/events";

export const metadata = { title: `${pageContent.events.eyebrow} | ${site.name}`, description: pageContent.events.intro, alternates: { canonical: "/evenemang" } };
export default function EventsPage() {
  const events = getEvents();
  return <PageLayout current="events" eyebrow={pageContent.events.eyebrow} title={pageContent.events.title} intro={pageContent.events.intro}>
    <section className="subpage-section"><div className="news-list">
      {events.length === 0 ? <p className="empty-state">{pageContent.events.empty}</p> : events.map((event) => <article className="outline-card" key={event.slug}>
        <p className="subpage-eyebrow"><time dateTime={event.date}>{new Date(event.date).toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" })}</time></p>
        <h2>{event.title}</h2><p>{event.location} · {event.organiser}</p><p>{event.description}</p>
        <Link className="text-link card-link" href={`/evenemang/${event.slug}`}>{pageContent.events.link}</Link>
      </article>)}
    </div></section>
  </PageLayout>;
}
