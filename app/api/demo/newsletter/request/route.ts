import { demoStore } from "@/lib/forms/store";
import { requestNewsletterConsent } from "@/lib/forms/service";
import { clientKey, demoDisabledResponse, demoIsEnabled, newsletterRateLimit, readSmallJson } from "@/lib/forms/runtime";
import { newsletterSchema } from "@/lib/forms/validation";

export async function POST(request: Request) {
  if (!demoIsEnabled(request)) return demoDisabledResponse();
  if (!newsletterRateLimit.allow(clientKey(), Date.now())) return Response.json({ error: "För många försök. Vänta en stund och försök igen." }, { status: 429 });
  let body: unknown;
  try { body = await readSmallJson(request); } catch { return Response.json({ error: "Förfrågan är för stor eller ogiltig." }, { status: 400 }); }
  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Kontrollera fälten.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const result = await requestNewsletterConsent(demoStore, parsed.data, "localhost-demo");
  // Never email. The token exists only to demonstrate the confirmation step locally.
  return Response.json({ ok: true, alreadyConfirmed: result.alreadyConfirmed, alreadyPending: result.alreadyPending, confirmationToken: result.token, unsubscribeToken: result.unsubscribeToken }, { headers: { "Cache-Control": "no-store" } });
}
