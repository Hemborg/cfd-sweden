import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { testDatabase } from "./helpers";
import { Webhook } from "standardwebhooks";
import { Resend } from "resend";
import { queueMail } from "@/lib/communications/queue";
import { runMailWorker } from "@/lib/communications/dispatch";
import { POST as resendWebhook } from "@/app/api/webhooks/resend/route";

const envelope = {
  v: 1,
  iv: "AAAAAAAAAAAAAAAA",
  ciphertext: "AA",
  tag: "AAAAAAAAAAAAAAAAAAAAAA",
};
test("real Postgres serializes DOI, permits pending confirmation, and suppresses queued mail on withdrawal", async () => {
  const pool = testDatabase();
  const suffix = randomUUID();
  const email = `doi-${suffix}@example.test`;
  const ids = [randomUUID(), randomUUID()];
  const consent = (id: string, n: number) => ({
    id,
    email,
    source: "integration",
    consentTextVersion: "test",
    confirmTokenHash: `confirm-${suffix}-${n}`,
    confirmTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
    unsubscribeTokenHash: `unsub-${suffix}`,
    unsubscribeTokenEncrypted: envelope,
  });
  const mail = (id: string) => ({
    key: `newsletter-confirmation/${id}`,
    template: "newsletter-confirmation",
    recipient: email,
    data: envelope,
    due: new Date().toISOString(),
    consentId: id,
  });
  try {
    const replies = await Promise.all(
      ids.map((id, n) =>
        pool.query(
          "select public.request_newsletter_with_queue($1::jsonb,$2::jsonb) result",
          [JSON.stringify(consent(id, n)), JSON.stringify(mail(id))],
        ),
      ),
    );
    assert.equal(
      replies.filter((r) => r.rows[0].result.state === "requested").length,
      1,
    );
    assert.equal(
      (
        await pool.query(
          "select count(*)::int count from public.queue_mail where recipient=$1",
          [email],
        )
      ).rows[0].count,
      1,
    );
    assert.equal(
      (
        await pool.query("select * from public.claim_queue_mail($1,1)", [
          randomUUID(),
        ])
      ).rowCount,
      1,
    );
    assert.equal(
      (
        await pool.query(
          "select public.withdraw_newsletter_consent($1,now()) ok",
          [`unsub-${suffix}`],
        )
      ).rows[0].ok,
      true,
    );
    assert.equal(
      (
        await pool.query(
          "select status from public.queue_mail where recipient=$1",
          [email],
        )
      ).rows[0].status,
      "superseded",
    );
  } finally {
    await pool.query("delete from public.queue_mail where recipient=$1", [
      email,
    ]);
    await pool.query(
      "delete from public.newsletter_consent_events where consent_id in (select id from public.newsletter_consents where email=$1)",
      [email],
    );
    await pool.query("delete from public.newsletter_consents where email=$1", [
      email,
    ]);
    await pool.end();
  }
});

test("real Mailpit accepts local synthetic SMTP", async () => {
  const nodemailer = (await import("nodemailer")).default;
  const transport = nodemailer.createTransport({
    host: "127.0.0.1",
    port: 54325,
    secure: false,
  });
  const id = randomUUID();
  const subject = `communications-${id}`;
  assert.ok(
    (
      await transport.sendMail({
        from: "CFD Sweden <noreply@example.test>",
        to: `smtp-${id}@example.test`,
        subject,
        text: "integration",
      })
    ).messageId,
  );
  const listed = (await fetch(
    "http://127.0.0.1:54324/api/v1/messages?limit=100",
  ).then((r) => r.json())) as { messages?: { Subject?: string }[] };
  assert.ok(listed.messages?.some((message) => message.Subject === subject));
});

test("worker encrypts queued payload then delivers it to Mailpit", async () => {
  const old = process.env.CFD_MAIL_TRANSPORT;
  process.env.CFD_MAIL_TRANSPORT = "smtp";
  const id = randomUUID();
  const email = `worker-${id}@example.test`;
  const key = `welcome/${id}`;
  try {
    await queueMail({
      key,
      template: "welcome",
      recipient: email,
      data: { name: "Integration" },
      due: new Date("2000-01-01T00:00:00Z"),
    });
    const result = await runMailWorker(10);
    assert.ok(result.completed >= 1);
    const listed = (await fetch(
      "http://127.0.0.1:54324/api/v1/messages?limit=100",
    ).then((r) => r.json())) as {
      messages?: { To?: { Address?: string }[]; Subject?: string }[];
    };
    assert.ok(
      listed.messages?.some(
        (message) =>
          message.To?.some((to) => to.Address === email) &&
          message.Subject === "Välkommen till CFD Sweden",
      ),
    );
  } finally {
    if (old === undefined) delete process.env.CFD_MAIL_TRANSPORT;
    else process.env.CFD_MAIL_TRANSPORT = old;
    const pool = testDatabase();
    await pool.query("delete from public.queue_mail where key=$1", [key]);
    await pool.end();
  }
});

test("real Postgres converts an expired 24-hour mail lease into manual reconciliation", async () => {
  const pool = testDatabase();
  const key = `lease/${randomUUID()}`;
  try {
    await pool.query(
      "select public.enqueue_queue_mail($1,'welcome',$2,$3::jsonb,'1900-01-01T00:00:00Z',null)",
      [key, "lease@example.test", JSON.stringify(envelope)],
    );
    const first = await pool.query(
      "select * from public.claim_queue_mail($1,50)",
      [randomUUID()],
    );
    assert.ok(first.rows.some((row) => row.key === key));
    await pool.query(
      "update public.queue_mail set lease_expires_at=now()-interval '1 second',first_attempt_at=now()-interval '25 hours' where key=$1",
      [key],
    );
    await pool.query("select * from public.claim_queue_mail($1,50)", [
      randomUUID(),
    ]);
    assert.equal(
      (
        await pool.query("select status from public.queue_mail where key=$1", [
          key,
        ])
      ).rows[0].status,
      "unknown",
    );
  } finally {
    await pool.query("delete from public.queue_mail where key=$1", [key]);
    await pool.end();
  }
});

test("expired SMTP stays unknown while an in-window Resend lease is safely reclaimed", async () => {
  const pool = testDatabase();
  const smtpKey = `lease-smtp/${randomUUID()}`;
  const resendKey = `lease-resend/${randomUUID()}`;
  try {
    for (const [key, transport] of [
      [smtpKey, "smtp"],
      [resendKey, "resend"],
    ]) {
      await pool.query(
        "select public.enqueue_queue_mail($1,'welcome',$2,$3::jsonb,'1900-01-01T00:00:00Z',null)",
        [key, `${transport}@example.test`, JSON.stringify(envelope)],
      );
    }
    const claimed = await pool.query(
      "select * from public.claim_queue_mail($1,50)",
      [randomUUID()],
    );
    assert.ok(claimed.rows.some((row) => row.key === smtpKey));
    assert.ok(claimed.rows.some((row) => row.key === resendKey));
    await pool.query(
      "update public.queue_mail set delivery_transport=case when key=$1 then 'smtp' else 'resend' end, lease_expires_at=now()-interval '1 second', first_attempt_at=now()-interval '1 hour' where key=any($2)",
      [smtpKey, [smtpKey, resendKey]],
    );
    const recovered = await pool.query(
      "select * from public.claim_queue_mail($1,50)",
      [randomUUID()],
    );
    assert.ok(recovered.rows.some((row) => row.key === resendKey));
    assert.equal(
      (
        await pool.query("select status from public.queue_mail where key=$1", [
          smtpKey,
        ])
      ).rows[0].status,
      "unknown",
    );
  } finally {
    await pool.query("delete from public.queue_mail where key=any($1)", [
      [smtpKey, resendKey],
    ]);
    await pool.end();
  }
});

test("scheduled campaign snapshots only confirmed unsuppressed recipients", async () => {
  const pool = testDatabase();
  const suffix = randomUUID();
  const campaign = randomUUID();
  const confirmed = randomUUID();
  const pending = randomUUID();
  try {
    await pool.query(
      "insert into public.newsletter_campaigns(id,subject,html,text_body,status,scheduled_for) values($1,'subject','<p>x</p>','x','scheduled',now()-interval '1 second')",
      [campaign],
    );
    for (const [id, email, status] of [
      [confirmed, `ok-${suffix}@example.test`, "confirmed"],
      [pending, `pending-${suffix}@example.test`, "pending"],
    ])
      await pool.query(
        "insert into public.newsletter_consents(id,email,source,consent_text_version,status,requested_at,unsubscribe_token_hash,unsubscribe_token_encrypted) values($1,$2,'test','test',$3,now(),$4,$5::jsonb)",
        [id, email, status, `unsub-${id}`, JSON.stringify(envelope)],
      );
    assert.equal(
      (
        await pool.query(
          "select * from public.claim_due_newsletter_campaigns($1,1)",
          [randomUUID()],
        )
      ).rowCount,
      1,
    );
    await pool.query("select public.snapshot_campaign_recipients($1)", [
      campaign,
    ]);
    const claimed = await pool.query(
      "select * from public.claim_campaign_recipients($1,$2,10)",
      [campaign, randomUUID()],
    );
    assert.equal(claimed.rowCount, 1);
    assert.equal(claimed.rows[0].consent_id, confirmed);
  } finally {
    await pool.query("delete from public.newsletter_campaigns where id=$1", [
      campaign,
    ]);
    await pool.query(
      "delete from public.newsletter_consents where id=any($1)",
      [[confirmed, pending]],
    );
    await pool.end();
  }
});

test("withdrawal and re-consent cannot revive a claimed campaign recipient", async () => {
  const pool = testDatabase();
  const id = randomUUID();
  const consent = randomUUID();
  const campaign = randomUUID();
  const email = `epoch-${id}@example.test`;
  const oldToken = `old-${id}`;
  const newToken = `new-${id}`;
  const lease = randomUUID();
  try {
    await pool.query(
      "insert into public.newsletter_campaigns(id,subject,html,text_body,status,scheduled_for) values($1,'subject','<p>x</p>','x','sending',now())",
      [campaign],
    );
    await pool.query(
      "insert into public.newsletter_consents(id,email,source,consent_text_version,status,requested_at,unsubscribe_token_hash,unsubscribe_token_encrypted) values($1,$2,'test','test','confirmed',now(),$3,$4::jsonb)",
      [consent, email, oldToken, JSON.stringify(envelope)],
    );
    await pool.query("select public.snapshot_campaign_recipients($1)", [
      campaign,
    ]);
    assert.equal(
      (
        await pool.query(
          "select * from public.claim_campaign_recipients($1,$2,1)",
          [campaign, lease],
        )
      ).rowCount,
      1,
    );
    assert.equal(
      (
        await pool.query(
          "select public.withdraw_newsletter_consent($1,now())",
          [oldToken],
        )
      ).rows[0].withdraw_newsletter_consent,
      true,
    );
    const request = {
      id: randomUUID(),
      email,
      source: "test",
      consentTextVersion: "test",
      confirmTokenHash: `confirm-${id}`,
      confirmTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      unsubscribeTokenHash: newToken,
      unsubscribeTokenEncrypted: envelope,
    };
    const mail = {
      key: `newsletter-confirmation/${id}`,
      template: "newsletter-confirmation",
      recipient: email,
      data: envelope,
      due: new Date().toISOString(),
    };
    await pool.query(
      "select public.request_newsletter_with_queue($1::jsonb,$2::jsonb)",
      [JSON.stringify(request), JSON.stringify(mail)],
    );
    assert.equal(
      (
        await pool.query(
          "select public.confirm_newsletter_and_queue($1,now(),$2::jsonb)",
          [
            `confirm-${id}`,
            JSON.stringify({
              key: `newsletter-confirmed/${id}`,
              template: "newsletter-confirmed",
              recipient: email,
              data: envelope,
              due: new Date().toISOString(),
            }),
          ],
        )
      ).rows[0].confirm_newsletter_and_queue,
      true,
    );
    const staleMail = {
      key: `campaign:${campaign}:${consent}`,
      template: "campaign-newsletter",
      recipient: email,
      data: envelope,
      due: new Date().toISOString(),
    };
    assert.equal(
      (
        await pool.query(
          "select public.enqueue_campaign_mail($1,$2,$3,$4::jsonb) queued",
          [campaign, consent, lease, JSON.stringify(staleMail)],
        )
      ).rows[0].queued,
      false,
    );
    assert.equal(
      (
        await pool.query(
          "select count(*)::int count from public.queue_mail where key=$1",
          [staleMail.key],
        )
      ).rows[0].count,
      0,
    );
    assert.equal(
      (
        await pool.query(
          "select status from public.newsletter_campaign_recipients where campaign_id=$1 and consent_id=$2",
          [campaign, consent],
        )
      ).rows[0].status,
      "suppressed",
    );
  } finally {
    await pool.query("delete from public.newsletter_campaigns where id=$1", [
      campaign,
    ]);
    await pool.query("delete from public.queue_mail where recipient=$1", [
      email,
    ]);
    await pool.query(
      "delete from public.newsletter_consent_events where consent_id=$1",
      [consent],
    );
    await pool.query("delete from public.newsletter_consents where id=$1", [
      consent,
    ]);
    await pool.end();
  }
});

test("campaign status becomes sent, failed, or remains cancelled from durable queue outcomes", async () => {
  const pool = testDatabase();
  const id = randomUUID();
  const create = async () => {
    const campaign = randomUUID();
    await pool.query(
      "insert into public.newsletter_campaigns(id,subject,html,text_body,status) values($1,'subject','<p>x</p>','x','queued')",
      [campaign],
    );
    return campaign;
  };
  const complete = async (campaign: string, outcome: "sent" | "failed") => {
    const key = `campaign:${campaign}:${randomUUID()}`;
    const lease = randomUUID();
    await pool.query(
      "select public.enqueue_queue_mail($1,'campaign-newsletter',$2,$3::jsonb,now(),null)",
      [key, `campaign-${id}@example.test`, JSON.stringify(envelope)],
    );
    await pool.query("select * from public.claim_queue_mail($1,1)", [lease]);
    await pool.query("select public.complete_queue_mail($1,$2,$3,null,$4)", [
      key,
      lease,
      outcome,
      outcome === "failed" ? "synthetic failure" : null,
    ]);
    return key;
  };
  const campaigns: string[] = [];
  try {
    const sent = await create();
    campaigns.push(sent);
    await complete(sent, "sent");
    assert.equal(
      (
        await pool.query(
          "select status from public.newsletter_campaigns where id=$1",
          [sent],
        )
      ).rows[0].status,
      "sent",
    );
    const failed = await create();
    campaigns.push(failed);
    await complete(failed, "failed");
    assert.equal(
      (
        await pool.query(
          "select status from public.newsletter_campaigns where id=$1",
          [failed],
        )
      ).rows[0].status,
      "failed",
    );
    const cancelled = await create();
    campaigns.push(cancelled);
    await pool.query("select public.cancel_newsletter_campaign($1)", [
      cancelled,
    ]);
    assert.equal(
      (
        await pool.query(
          "select status from public.newsletter_campaigns where id=$1",
          [cancelled],
        )
      ).rows[0].status,
      "cancelled",
    );
  } finally {
    for (const campaign of campaigns)
      await pool.query("delete from public.newsletter_campaigns where id=$1", [
        campaign,
      ]);
    await pool.query("delete from public.queue_mail where recipient=$1", [
      `campaign-${id}@example.test`,
    ]);
    await pool.end();
  }
});

test("signed Resend-compatible webhook verifies and provider event IDs deduplicate", async () => {
  const secret = `whsec_${Buffer.from(randomUUID()).toString("base64")}`;
  const id = `msg_${randomUUID()}`;
  const payload = JSON.stringify({
    type: "email.bounced",
    data: { to: "bounce@example.test" },
  });
  const timestamp = new Date();
  const signature = new Webhook(secret).sign(id, timestamp, payload);
  const verified = new Resend("re_test_local_dummy").webhooks.verify({
    payload,
    webhookSecret: secret,
    headers: {
      id,
      timestamp: String(Math.floor(timestamp.getTime() / 1000)),
      signature,
    },
  }) as { type: string };
  assert.equal(verified.type, "email.bounced");
  const pool = testDatabase();
  try {
    await pool.query(
      "insert into public.resend_webhook_events(id,event_type,payload) values($1,$2,$3::jsonb) on conflict do nothing",
      [id, verified.type, payload],
    );
    await pool.query(
      "insert into public.resend_webhook_events(id,event_type,payload) values($1,$2,$3::jsonb) on conflict do nothing",
      [id, verified.type, payload],
    );
    assert.equal(
      (
        await pool.query(
          "select count(*)::int count from public.resend_webhook_events where id=$1",
          [id],
        )
      ).rows[0].count,
      1,
    );
  } finally {
    await pool.query("delete from public.resend_webhook_events where id=$1", [
      id,
    ]);
    await pool.end();
  }
});

test("signed Resend route atomically suppresses consent and queued delivery once", async () => {
  const pool = testDatabase();
  const consent = randomUUID();
  const eventId = `evt_${randomUUID()}`;
  const email = `bounce-${consent}@example.test`;
  const key = `campaign/${consent}`;
  const secret = `whsec_${Buffer.from(randomUUID()).toString("base64")}`;
  const payload = JSON.stringify({
    type: "email.bounced",
    data: { to: email },
  });
  const timestamp = new Date();
  const signature = new Webhook(secret).sign(eventId, timestamp, payload);
  const saved = {
    enabled: process.env.CFD_RESEND_ENABLED,
    secret: process.env.RESEND_WEBHOOK_SECRET,
  };
  process.env.CFD_RESEND_ENABLED = "true";
  process.env.RESEND_WEBHOOK_SECRET = secret;
  try {
    await pool.query(
      "insert into public.newsletter_consents(id,email,source,consent_text_version,status,requested_at,unsubscribe_token_hash,unsubscribe_token_encrypted) values($1,$2,'test','test','confirmed',now(),$3,$4::jsonb)",
      [consent, email, `unsub-${consent}`, JSON.stringify(envelope)],
    );
    await pool.query(
      "select public.enqueue_queue_mail($1,'campaign-newsletter',$2,$3::jsonb,now(),$4)",
      [key, email, JSON.stringify(envelope), consent],
    );
    const request = () =>
      new Request("http://127.0.0.1:3400/api/webhooks/resend", {
        method: "POST",
        headers: {
          "svix-id": eventId,
          "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
          "svix-signature": signature,
        },
        body: payload,
      });
    assert.equal((await resendWebhook(request())).status, 204);
    assert.equal((await resendWebhook(request())).status, 204);
    assert.equal(
      (
        await pool.query(
          "select suppressed_at is not null suppressed from public.newsletter_consents where id=$1",
          [consent],
        )
      ).rows[0].suppressed,
      true,
    );
    assert.equal(
      (
        await pool.query("select status from public.queue_mail where key=$1", [
          key,
        ])
      ).rows[0].status,
      "superseded",
    );
    assert.equal(
      (
        await pool.query(
          "select count(*)::int count from public.resend_webhook_events where id=$1",
          [eventId],
        )
      ).rows[0].count,
      1,
    );
  } finally {
    if (saved.enabled === undefined) delete process.env.CFD_RESEND_ENABLED;
    else process.env.CFD_RESEND_ENABLED = saved.enabled;
    if (saved.secret === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
    else process.env.RESEND_WEBHOOK_SECRET = saved.secret;
    await pool.query("delete from public.queue_mail where key=$1", [key]);
    await pool.query("delete from public.resend_webhook_events where id=$1", [
      eventId,
    ]);
    await pool.query("delete from public.newsletter_consents where id=$1", [
      consent,
    ]);
    await pool.end();
  }
});

test("signed Resend delivery webhooks retain only minimal metadata and reconcile the provider message", async () => {
  const pool = testDatabase();
  const eventId = `evt_${randomUUID()}`;
  const key = `delivery/${randomUUID()}`;
  const providerId = `email_${randomUUID()}`;
  const secret = `whsec_${Buffer.from(randomUUID()).toString("base64")}`;
  const payload = JSON.stringify({
    type: "email.delivered",
    data: {
      email_id: providerId,
      to: "not-retained@example.test",
      subject: "not retained",
    },
  });
  const timestamp = new Date();
  const signature = new Webhook(secret).sign(eventId, timestamp, payload);
  const saved = {
    enabled: process.env.CFD_RESEND_ENABLED,
    secret: process.env.RESEND_WEBHOOK_SECRET,
  };
  process.env.CFD_RESEND_ENABLED = "true";
  process.env.RESEND_WEBHOOK_SECRET = secret;
  try {
    await pool.query(
      "select public.enqueue_queue_mail($1,'welcome','delivery@example.test',$2::jsonb,now(),null)",
      [key, JSON.stringify(envelope)],
    );
    await pool.query(
      "update public.queue_mail set status='sent',delivery_transport='resend',provider_id=$2 where key=$1",
      [key, providerId],
    );
    const request = new Request("http://127.0.0.1:3400/api/webhooks/resend", {
      method: "POST",
      headers: {
        "svix-id": eventId,
        "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
        "svix-signature": signature,
      },
      body: payload,
    });
    assert.equal((await resendWebhook(request)).status, 204);
    const mail = (
      await pool.query(
        "select delivery_status,delivered_at is not null delivered from public.queue_mail where key=$1",
        [key],
      )
    ).rows[0];
    assert.deepEqual(mail, { delivery_status: "delivered", delivered: true });
    const receipt = (
      await pool.query(
        "select payload from public.resend_webhook_events where id=$1",
        [eventId],
      )
    ).rows[0].payload;
    assert.deepEqual(receipt, { provider_message_id: providerId });
  } finally {
    if (saved.enabled === undefined) delete process.env.CFD_RESEND_ENABLED;
    else process.env.CFD_RESEND_ENABLED = saved.enabled;
    if (saved.secret === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
    else process.env.RESEND_WEBHOOK_SECRET = saved.secret;
    await pool.query("delete from public.queue_mail where key=$1", [key]);
    await pool.query("delete from public.resend_webhook_events where id=$1", [
      eventId,
    ]);
    await pool.end();
  }
});

test("Resend webhook streaming limit rejects an oversized signed-body candidate", async () => {
  const secret = `whsec_${Buffer.from(randomUUID()).toString("base64")}`;
  const saved = {
    enabled: process.env.CFD_RESEND_ENABLED,
    secret: process.env.RESEND_WEBHOOK_SECRET,
  };
  process.env.CFD_RESEND_ENABLED = "true";
  process.env.RESEND_WEBHOOK_SECRET = secret;
  try {
    const id = `evt_${randomUUID()}`;
    const payload = "x".repeat(65_537);
    const response = await resendWebhook(
      new Request("http://127.0.0.1:3400/api/webhooks/resend", {
        method: "POST",
        headers: {
          "svix-id": id,
          "svix-timestamp": String(Math.floor(Date.now() / 1000)),
          "svix-signature": "not-needed",
        },
        body: payload,
      }),
    );
    assert.equal(response.status, 413);
  } finally {
    if (saved.enabled === undefined) delete process.env.CFD_RESEND_ENABLED;
    else process.env.CFD_RESEND_ENABLED = saved.enabled;
    if (saved.secret === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
    else process.env.RESEND_WEBHOOK_SECRET = saved.secret;
  }
});
