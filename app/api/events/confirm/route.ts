import { NextResponse } from "next/server";
import { platformFeatures } from "@/lib/platform/config";
import { confirmFreeEventRegistration } from "@/lib/events/free-confirmation";
import { parseJson, privateJson, rateLimitSource } from "@/lib/platform/http";
import { z } from "zod";

const confirmationInput = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/),
});

export async function POST(request: Request) {
  if (!platformFeatures().eventRegistration) return privateJson({ error: "not_available" }, 503);
  try {
    const input = await parseJson(request, confirmationInput);
    await rateLimitSource("free-event-confirmation", 10, 3600, request);
    const registration = await confirmFreeEventRegistration(input.token);
    if (!registration) return privateJson({ error: "invalid_or_expired" }, 400);
    return privateJson({ status: registration.status });
  } catch {
    return NextResponse.json(
      { error: "confirmation_failed" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
