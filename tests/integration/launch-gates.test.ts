import assert from "node:assert/strict";
import test from "node:test";
import { runMailWorker } from "@/lib/communications/dispatch";
import { dispatchDueCampaigns } from "@/lib/communications/campaigns";
import { queueMail } from "@/lib/communications/queue";
import { submitComment, submitReport } from "@/components/community/actions";
import { moderate } from "@/app/admin/kommentarer/actions";
import { inviteUser, reissueAccountLink } from "@/app/admin/anvandare/actions";
import { requestRecovery } from "@/app/logga-in/actions";
import { confirmNewsletterAction, unsubscribeNewsletterAction } from "@/app/nyhetsbrev/actions";

test("launch configuration blocks disabled routes, actions and workers before any network access", async () => {
  const before = { ...process.env }, originalFetch = globalThis.fetch;
  let requests = 0;
  try {
    process.env.CFD_PLATFORM_ENABLED = "true";
    for (const key of ["CFD_MAIL_ENABLED", "CFD_NEWSLETTER_ENABLED", "CFD_EVENT_REGISTRATION_ENABLED", "CFD_COMMENTS_ENABLED", "CFD_STRIPE_ENABLED"]) process.env[key] = "false";
    process.env.CFD_CONTACT_BACKEND = "formsubmit";
    for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "STRIPE_SECRET_KEY"]) delete process.env[key];
    globalThis.fetch = async () => { requests++; throw new Error("Unexpected external request"); };
    const routes = [
      await import("@/app/api/contact/route"), await import("@/app/api/newsletter/route"),
      await import("@/app/api/events/register/route"), await import("@/app/api/events/confirm/route"),
      await import("@/app/api/events/checkout/route"), await import("@/app/api/events/check-in/route"),
      await import("@/app/api/jobs/mail/route"), await import("@/app/api/webhooks/resend/route"),
      await import("@/app/api/webhooks/stripe/route"), await import("@/app/api/community/comments/route"),
    ];
    for (const route of routes) {
      const response = await route.POST(new Request("http://127.0.0.1/disabled", { method: "POST", body: "{}" }));
      assert.ok([404, 503].includes(response.status));
    }
    const report = await import("@/app/api/community/comments/[id]/report/route");
    const exportEvents = await import("@/app/api/events/[slug]/export/route");
    assert.equal((await exportEvents.GET(new Request("http://127.0.0.1/export"), { params: Promise.resolve({ slug: "disabled" }) })).status, 503);
    assert.equal((await report.POST(new Request("http://127.0.0.1/report", { method: "POST" }), { params: Promise.resolve({ id: "invalid" }) })).status, 503);
    for (const action of [submitComment, submitReport, moderate, inviteUser, reissueAccountLink]) await assert.rejects(() => action(new FormData()), /inte aktiverad/);
    for (const action of [requestRecovery, confirmNewsletterAction, unsubscribeNewsletterAction]) await assert.rejects(() => action(new FormData()), /NEXT_REDIRECT/);
    await assert.rejects(() => queueMail({ key: "disabled-test", template: "welcome", recipient: "disabled@example.test", data: {} }), /inte aktiverad/);
    assert.deepEqual(await runMailWorker(), { claimed: 0, completed: 0, disabled: true });
    assert.equal(await dispatchDueCampaigns(), 0);
    assert.equal(requests, 0);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key];
    Object.assign(process.env, before);
  }
});

test("database outage gives explicit retryable feeds, never a stale file fallback", async () => {
  const original = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:1";
    const { GET: rss } = await import("@/app/rss.xml/route");
    const { GET: sitemap } = await import("@/app/sitemap.xml/route");
    for (const get of [rss, sitemap]) {
      const response = await get();
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      assert.equal(response.headers.get("Retry-After"), "60");
      assert.doesNotMatch(await response.text(), /key|token|127\.0\.0\.1/);
    }
  } finally { if (original === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = original; }
});
