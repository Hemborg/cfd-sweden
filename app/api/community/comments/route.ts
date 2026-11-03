import { platformFeatures } from "@/lib/platform/config";
import { z } from "zod";
import { requireActor } from "@/lib/platform/auth";
import { parseJson, privateJson, rateLimit } from "@/lib/platform/http";
import { addArticleComment } from "@/lib/community";
export async function POST(request: Request) {
  if (!platformFeatures().comments) return privateJson({ error: "not_available" }, 503);
  try {
    const actor = await requireActor();
    await rateLimit(`comment:${actor.user.id}`, 10, 3600);
    const body = await parseJson(
      request,
      z.object({ postSlug: z.string(), body: z.string() }),
    );
    await addArticleComment(actor.client, body);
    return privateJson({ ok: true }, 201);
  } catch {
    return privateJson({ error: "Kommentaren kunde inte tas emot." }, 400);
  }
}
