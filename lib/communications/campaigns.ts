import "server-only";
import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/platform/db";
import { platformConfig } from "@/lib/platform/config";
import { decryptPayload } from "./crypto";
import { queueCampaignMail } from "./queue";
type Campaign = {
  id: string;
  subject: string;
  html: string;
  text_body: string;
};
type Recipient = { consent_id: string; email: string };
export async function dispatchDueCampaigns(limit = 3) {
  const service = createServiceClient();
  const worker = randomUUID();
  const { data, error } = await service.rpc("claim_due_newsletter_campaigns", {
    worker_token: worker,
    maximum: Math.min(limit, 10),
  });
  if (error) throw new Error("Kunde inte hämta schemalagda utskick.");
  let queued = 0;
  const maximumPerRun = 150;
  for (const campaign of (data ?? []) as Campaign[]) {
    if (
      (
        await service.rpc("snapshot_campaign_recipients", {
          campaign: campaign.id,
        })
      ).error
    )
      throw new Error("Kunde inte skapa mottagarurval.");
    while (queued < maximumPerRun) {
      const lease = randomUUID();
      const claimed = await service.rpc("claim_campaign_recipients", {
        campaign: campaign.id,
        worker_token: lease,
        maximum: Math.min(50, maximumPerRun - queued),
      });
      if (claimed.error) throw new Error("Kunde inte hämta kampanjmottagare.");
      const recipients = (claimed.data ?? []) as Recipient[];
      if (!recipients.length) break;
      for (const recipient of recipients) {
        const { data: currentCampaign } = await service
          .from("newsletter_campaigns")
          .select("status")
          .eq("id", campaign.id)
          .maybeSingle();
        if (currentCampaign?.status !== "sending") {
          await service.rpc("complete_campaign_recipient", {
            campaign: campaign.id,
            consent: recipient.consent_id,
            worker_token: lease,
            outcome: "suppressed",
          });
          continue;
        }
        const { data: consent } = await service
          .from("newsletter_consents")
          .select("status,suppressed_at,unsubscribe_token_encrypted")
          .eq("id", recipient.consent_id)
          .maybeSingle();
        if (
          consent?.status !== "confirmed" ||
          consent.suppressed_at ||
          !consent.unsubscribe_token_encrypted
        ) {
          await service.rpc("complete_campaign_recipient", {
            campaign: campaign.id,
            consent: recipient.consent_id,
            worker_token: lease,
            outcome: "suppressed",
          });
          continue;
        }
        try {
          const token = decryptPayload<{ token: string }>(
            consent.unsubscribe_token_encrypted,
          ).token;
          const url = new URL(
            "/nyhetsbrev/avregistrera",
            platformConfig().siteUrl,
          );
          url.searchParams.set("token", token);
          const didQueue = await queueCampaignMail({
            campaignId: campaign.id,
            lease,
            key: `campaign:${campaign.id}:${recipient.consent_id}`,
            template: "campaign-newsletter",
            recipient: recipient.email,
            consentId: recipient.consent_id,
            data: {
              campaignId: campaign.id,
              subject: campaign.subject,
              html: campaign.html,
              text: campaign.text_body,
              unsubscribeUrl: url.toString(),
            },
          });
          if (didQueue) queued += 1;
        } catch {
          /* The lease expires; stable queue key makes re-expansion idempotent. */
        }
      }
    }
    if (
      (
        await service.rpc("finish_campaign_expansion", {
          campaign: campaign.id,
        })
      ).error
    )
      throw new Error("Kunde inte färdigställa utskicket.");
    if (queued >= maximumPerRun) break;
  }
  return queued;
}
