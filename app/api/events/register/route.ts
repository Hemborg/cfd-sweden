import { NextResponse } from "next/server";
import { platformFeatures } from "@/lib/platform/config";
import {
  parseJson,
  privateJson,
  rateLimit,
  rateLimitSource,
} from "@/lib/platform/http";
import { registrationInputSchema } from "@/lib/events/types";
import { requestFreeEventConfirmation } from "@/lib/events/free-confirmation";

export async function POST(request: Request) {
  if (!platformFeatures().eventRegistration) return privateJson({ error: "not_available" }, 503);
  try {
    const input = await parseJson(request, registrationInputSchema);
    await rateLimitSource(
      `free-event-registration:${input.eventSlug}`,
      5,
      3600,
      request,
    );
    await rateLimitSource("free-event-registration", 10, 3600, request);
    await rateLimit("free-event:global", 100, 60);
    await rateLimit(`free-event:${input.email}`, 4, 600);
    await requestFreeEventConfirmation(input);
    return privateJson({ status: "pending_verification" });
  } catch {
    return NextResponse.json(
      { error: "registration_failed" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
