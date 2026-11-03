import { z } from "zod";
import { requireActor } from "@/lib/platform/auth";
import { parseJson, privateJson, rateLimit } from "@/lib/platform/http";
import { reportArticleComment } from "@/lib/community";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor();
    await rateLimit(`report:${actor.user.id}`, 10, 3600);
    const body = await parseJson(request, z.object({ reason: z.string() }));
    await reportArticleComment(actor.client, {
      commentId: (await params).id,
      reason: body.reason,
    });
    return privateJson({ ok: true }, 201);
  } catch {
    return privateJson({ error: "Anmälan kunde inte tas emot." }, 400);
  }
}
