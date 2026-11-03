import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { z } from "zod";
import { platformConfig } from "./config";
import { createServiceClient } from "./db";

export async function assertSameOrigin(request?: Request) {
  const source = request?.headers ?? (await headers());
  if (source.get("origin") !== platformConfig().siteUrl)
    throw new Error("Otillåtet ursprung.");
}
export async function parseJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.output<T>> {
  await assertSameOrigin(request);
  return schema.parse(JSON.parse(await readLimitedBody(request, 32768)));
}
/** Preserve raw bytes for provider signature verification, without unbounded buffering. */
export async function readLimitedBody(
  request: Request,
  maximum = 65536,
): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Indata saknas.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > maximum) {
      await reader.cancel();
      throw new Error("För stora indata.");
    }
    chunks.push(part.value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
export function privateJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function rateLimit(key: string, limit = 5, windowSeconds = 60) {
  const secret = process.env.CFD_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Hastighetsbegränsning saknar konfiguration.");
  const digest = createHmac("sha256", secret).update(key).digest("hex");
  const { data, error } = await createServiceClient().rpc(
    "consume_rate_limit",
    { bucket_key: digest, maximum: limit, window_seconds: windowSeconds },
  );
  if (error || data !== true)
    throw new Error("För många försök. Vänta och försök igen.");
}
/** Vercel overwrites x-forwarded-for. Never trust caller-provided proxy headers
 * on an arbitrary self-hosted server. Raw addresses are hashed, never persisted. */
export function trustedRequestSource(
  source: Headers,
  siteUrl: string,
  onVercel: boolean,
): string {
  if (new URL(siteUrl).hostname === "127.0.0.1") return "local-loopback";
  const address = source.get("x-forwarded-for")?.trim();
  if (!onVercel || !address || !isIP(address))
    throw new Error("Trusted request source is unavailable.");
  return address;
}
export async function rateLimitSource(
  scope: string,
  maximum: number,
  seconds: number,
  request?: Request,
) {
  const source = request?.headers ?? (await headers());
  const address = trustedRequestSource(
    source,
    platformConfig().siteUrl,
    process.env.VERCEL === "1",
  );
  await rateLimit(`source:${scope}:${address}`, maximum, seconds);
}
export function csv(rows: unknown[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((cell) => {
            let value = String(cell ?? "");
            if (/^[\s]*[=+@-]/.test(value)) value = "'" + value;
            return `"${value.replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\r\n")
  );
}
