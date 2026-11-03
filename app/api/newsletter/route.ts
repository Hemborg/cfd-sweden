import { NextResponse } from "next/server";
import { platformFeatures } from "@/lib/platform/config";
import { requestNewsletter } from "@/lib/communications/service";
import {
  parseJson,
  privateJson,
  rateLimit,
  rateLimitSource,
} from "@/lib/platform/http";
import { newsletterSchema } from "@/lib/forms/validation";

export async function POST(request: Request) {
  if (!platformFeatures().newsletters) return privateJson({ error: "not_available" }, 503);
  try {
    const input = await parseJson(request, newsletterSchema);
    await rateLimitSource("newsletter", 10, 3600, request);
    await rateLimit("newsletter:global", 100, 60);
    await rateLimit(`newsletter:${input.email}`, 3, 3600);
    const result = await requestNewsletter(input);
    // Never reveal whether the address already has an active subscription.
    return privateJson(
      {
        ok: true,
        status: result.state === "confirmed" ? "pending" : result.state,
      },
      202,
    );
  } catch {
    return NextResponse.json(
      { error: "newsletter_failed" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
