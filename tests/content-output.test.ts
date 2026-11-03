import assert from "node:assert/strict";
import test from "node:test";
import { eventSchema } from "../lib/content/events";
import { renderRss } from "../lib/content/rss";

test("evenemang kräver verklig datumform, ort och arrangör samt säkra länkar", () => {
  const event = { slug: "teknisk-fixture", title: "Endast test", date: "2026-12-01T18:00:00+01:00", location: "Testort", organiser: "Testarrangör", description: "Teknisk fixture, ej publicerad." };
  assert.equal(eventSchema.parse(event).registrationOpen, false);
  for (const invalid of [
    { ...event, date: "2026-13-50" }, { ...event, location: "" },
    { ...event, organiser: "" }, { ...event, externalUrl: "javascript:alert(1)" },
    { ...event, slug: "../../privat" },
  ]) assert.equal(eventSchema.safeParse(invalid).success, false);
});

test("RSS skyddar XML-strukturen även när rubriker innehåller markeringar", () => {
  const rss = renderRss([{ slug: "teknisk-fixture", title: "A & B <text> ]]>", date: "2026-01-01", excerpt: "<script>test</script>", author: "Test", tags: [], published: true, content: "" }]);
  assert.ok(rss.includes("A &amp; B &lt;text&gt; ]]&gt;"));
  assert.ok(rss.includes("&lt;script&gt;test&lt;/script&gt;"));
  assert.equal((rss.match(/<item>/g) ?? []).length, 1);
  assert.ok(!rss.includes("<script>"));
});
