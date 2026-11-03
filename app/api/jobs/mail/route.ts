import { timingSafeEqual } from "node:crypto";
import { platformFeatures } from "@/lib/platform/config";
import { privateJson } from "@/lib/platform/http";
import { runMailWorker } from "@/lib/communications/dispatch";
import { createServiceClient } from "@/lib/platform/db";

function authorised(request: Request) {
  const secret = process.env.CFD_JOB_SECRET;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!secret || secret.length < 32 || !supplied) return false;
  const expected = Buffer.from(secret);
  const candidate = Buffer.from(supplied);
  return (
    expected.length === candidate.length && timingSafeEqual(expected, candidate)
  );
}

export async function POST(request: Request) {
  if (!platformFeatures().email || !authorised(request))
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  try {
    const { error } = await createServiceClient().rpc("prune_rate_limits");
    if (error) throw new Error("Rate-limit maintenance failed");
    return privateJson(await runMailWorker(20));
  } catch {
    return privateJson({ error: "worker_failed" }, 503);
  }
}
