import { demoStore } from "@/lib/forms/store";
import { receiveContact } from "@/lib/forms/service";
import { clientKey, contactRateLimit, demoDisabledResponse, demoIsEnabled, readSmallJson } from "@/lib/forms/runtime";
import { contactSchema } from "@/lib/forms/validation";

export async function POST(request: Request) {
  if (!demoIsEnabled(request)) return demoDisabledResponse();
  if (!contactRateLimit.allow(clientKey(), Date.now())) return Response.json({ error: "För många försök. Vänta en stund och försök igen." }, { status: 429 });
  let body: unknown;
  try { body = await readSmallJson(request); } catch { return Response.json({ error: "Förfrågan är för stor eller ogiltig." }, { status: 400 }); }
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Kontrollera fälten.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const result = await receiveContact(demoStore, parsed.data);
  if (!result.ok) return Response.json({ error: result.code === "idempotency_conflict" ? "Samma insändningsnyckel användes med ändrat innehåll." : "Evenemanget kan inte ta emot anmälningar just nu." }, { status: result.code === "idempotency_conflict" ? 409 : 400 });
  return Response.json({ ok: true, duplicate: result.duplicate }, { status: result.duplicate ? 200 : 201 });
}
