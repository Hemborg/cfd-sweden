import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import EventsPage from "../app/evenemang/page";
import { events } from "../content/site";
import { eventSchema, getEvents, getUpcomingEvents } from "../lib/content/events";

const makeEvent = (slug: string, date: string) => eventSchema.parse({ slug, title: slug, date, location: "Stockholm", organiser: "CfD Sweden", description: "Teknisk testfixture." });

test("visar bara framtida evenemang och inkluderar exakt tidsgräns", () => {
  const now = new Date("2026-11-03T10:00:00.000Z");
  const events = [
    makeEvent("passed", "2026-11-03T10:00:00.001+01:00"),
    makeEvent("equal", "2026-11-03T11:00:00+01:00"),
    makeEvent("future", "2026-11-03T12:00:00+01:00"),
  ];
  assert.deepEqual(getUpcomingEvents(events, now).map((event) => event.slug), ["equal", "future"]);
});

test("sorterar efter absolut tid, även när ISO-offset skiljer sig", () => {
  const now = new Date("2026-11-03T00:00:00Z");
  const events = [
    makeEvent("later-textually", "2026-11-03T04:00:00+02:00"),
    makeEvent("earlier-instant", "2026-11-03T01:30:00+00:00"),
  ];
  assert.deepEqual(getUpcomingEvents(events, now).map((event) => event.slug), ["earlier-instant", "later-textually"]);
});

test("tom lista är ett giltigt kommande-resultat", () => {
  assert.deepEqual(getUpcomingEvents([], new Date("2026-11-03T00:00:00Z")), []);
});

test("evenemangssidan renderar kommande event men behåller passerade event för detalj-URL:er", () => {
  const original = [...events];
  try {
    events.splice(0, events.length,
      { slug: "arkiv-fixture", title: "Passerat fixture-event", date: "2020-01-01T10:00:00+01:00", location: "Arkivort", organiser: "CfD Sweden", description: "Tidigare aktivitet." },
      { slug: "framtid-fixture", title: "Kommande fixture-event", date: "2999-01-01T10:00:00+01:00", location: "Framtidsort", organiser: "CfD Sweden", description: "Kommande aktivitet." },
    );
    assert.deepEqual(getEvents().map((event) => event.slug), ["arkiv-fixture", "framtid-fixture"]);
    const html = renderToStaticMarkup(createElement(EventsPage));
    assert.match(html, /Kommande evenemang/);
    assert.match(html, /Kommande fixture-event/);
    assert.doesNotMatch(html, /Passerat fixture-event/);
  } finally {
    events.splice(0, events.length, ...original);
  }
});
