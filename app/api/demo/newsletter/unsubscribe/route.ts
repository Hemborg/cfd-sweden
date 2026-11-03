import { withdrawNewsletterConsent } from "@/lib/forms/service";
import { demoStore } from "@/lib/forms/store";
import { demoDisabledResponse, demoIsEnabled, readSmallJson } from "@/lib/forms/runtime";

export async function POST(request: Request) {
  if (!demoIsEnabled(request)) return demoDisabledResponse();
  const body = await readSmallJson(request).catch(() => null);
  const token = body && typeof body === "object" && "token" in body && typeof body.token === "string" ? body.token : undefined;
  if (!token) return Response.json({ error: "Ogiltig avregistreringslänk." }, { status: 400 });
  const withdrawn = await withdrawNewsletterConsent(demoStore, token);
  return withdrawn ? Response.json({ ok: true }) : Response.json({ error: "Länken är ogiltig eller redan använd." }, { status: 400 });
}
