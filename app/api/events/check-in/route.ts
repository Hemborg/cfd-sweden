import { platformEnabled } from "@/lib/platform/config";
import { requireRoles } from "@/lib/platform/auth";
import { parseJson, privateJson } from "@/lib/platform/http";
import { checkinInputSchema } from "@/lib/events/types";
import { createPlatformEventRepository } from "@/lib/events/repository";

export async function POST(request: Request) {
  if (!platformEnabled()) return privateJson({ error: "not_available" }, 503);
  try {
    const actor = await requireRoles(["administrator"]);
    const input = await parseJson(request, checkinInputSchema);
    const registration = await createPlatformEventRepository(
      actor.client,
    ).checkIn(input.ticketCode);
    return privateJson({ status: registration.status, checkedIn: true });
  } catch {
    return privateJson({ error: "checkin_failed" }, 400);
  }
}
