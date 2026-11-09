import { SlidingRateLimit } from "./security";

export const contactRateLimit = new SlidingRateLimit();
export const newsletterRateLimit = new SlidingRateLimit(3);

export function demoIsEnabled(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!host) return false;
  let hostname: string;
  try { hostname = new URL(`http://${host}`).hostname; } catch { return false; }
  const local = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  if (!local || process.env.CfD_FORM_DEMO_ENABLED !== "true" || process.env.VERCEL) return false;
  if (!origin) return true;
  try { return new URL(origin).origin === `http://${host}`; } catch { return false; }
}

export function demoDisabledResponse() {
  return Response.json({ error: "Formulärprototypen är endast aktiverad för localhost i testläge." }, { status: 404 });
}

export function clientKey() {
  // The demo accepts loopback only, so a user-controlled forwarded header adds no value.
  return "local-demo";
}

export async function readSmallJson(request: Request, maxBytes = 16_384): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > maxBytes) throw new Error("body_too_large");
  if (!request.body) return JSON.parse("");
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel(); throw new Error("body_too_large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
