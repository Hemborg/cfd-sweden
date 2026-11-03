import { NextResponse } from "next/server";
import { platformEnabled } from "@/lib/platform/config";
import { createContact } from "@/lib/communications/service";
import {
  parseJson,
  privateJson,
  rateLimit,
  rateLimitSource,
} from "@/lib/platform/http";
import { contactSchema } from "@/lib/forms/validation";

export async function POST(request: Request) {
  if (!platformEnabled() || process.env.CFD_CONTACT_BACKEND !== "database")
    return privateJson({ error: "not_available" }, 503);
  try {
    const input = await parseJson(request, contactSchema);
    await rateLimitSource("contact", 10, 600, request);
    await rateLimit("contact:global", 100, 60);
    if (!input.inquiryType)
      return NextResponse.json(
        { error: "contact_failed" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    await rateLimit(`contact:${input.email}`, 4, 600);
    const result = await createContact(input);
    return privateJson(
      { ok: true, duplicate: !result.created },
      result.created ? 201 : 200,
    );
  } catch {
    return NextResponse.json(
      { error: "contact_failed" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
