import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import EventPage from "../app/evenemang/[slug]/page";
import { InquiryForm } from "../components/InquiryForm";
import { events } from "../content/site";

test("event details never offer registration when the platform flag is not exactly true", async () => {
  const originalEvents = [...events];
  const originalFlag = process.env.CfD_PLATFORM_ENABLED;
  try {
    events.push({
      slug: "off-release-fixture", title: "Öppen aktivitet", date: "2999-01-01T10:00:00Z",
      location: "Stockholm", organiser: "CfD Sweden", description: "Publik information.",
      registrationOpen: true, externalUrl: "https://example.org/event",
    });
    for (const flag of [undefined, "", "false", "TRUE", "1"]) {
      if (flag === undefined) delete process.env.CfD_PLATFORM_ENABLED;
      else process.env.CfD_PLATFORM_ENABLED = flag;
      const html = renderToStaticMarkup(await EventPage({ params: Promise.resolve({ slug: "off-release-fixture" }) }));
      assert.match(html, /Öppen aktivitet/);
      assert.match(html, /https:\/\/example.org\/event/);
      assert.doesNotMatch(html, /<form|Anmäl dig|Anmäl mig|Köp biljett|Gå vidare till betalning/, `flag=${flag}`);
    }
  } finally {
    events.splice(0, events.length, ...originalEvents);
    if (originalFlag === undefined) delete process.env.CfD_PLATFORM_ENABLED;
    else process.env.CfD_PLATFORM_ENABLED = originalFlag;
  }
});

test("contact and join default to the existing FormSubmit recipient independently of platform accounts", () => {
  const originalFlag = process.env.CfD_PLATFORM_ENABLED;
  const originalBackend = process.env.CfD_CONTACT_BACKEND;
  try {
    for (const [flag, backend] of [[undefined, undefined], ["false", "database"], ["true", undefined], ["true", "formsubmit"]]) {
      if (flag === undefined) delete process.env.CfD_PLATFORM_ENABLED;
      else process.env.CfD_PLATFORM_ENABLED = flag;
      if (backend === undefined) delete process.env.CfD_CONTACT_BACKEND;
      else process.env.CfD_CONTACT_BACKEND = backend;
      for (const variant of ["contact", "join"] as const) {
        const html = renderToStaticMarkup(createElement(InquiryForm, { variant }));
        assert.match(html, /action="https:\/\/formsubmit.co\/cfdsweden@proton.me"/);
        assert.match(html, /method="POST"/);
        assert.match(html, /name="_honey"/);
        assert.match(html, /name="_captcha" value="false"/);
        assert.doesNotMatch(html, /type="password"|Bekräfta din e-post|\/api\/contact/);
      }
    }
  } finally {
    if (originalFlag === undefined) delete process.env.CfD_PLATFORM_ENABLED;
    else process.env.CfD_PLATFORM_ENABLED = originalFlag;
    if (originalBackend === undefined) delete process.env.CfD_CONTACT_BACKEND;
    else process.env.CfD_CONTACT_BACKEND = originalBackend;
  }
});
