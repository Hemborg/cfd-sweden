import { createHash, randomBytes, randomUUID } from "node:crypto";

export const newId = () => randomUUID();
export const newToken = () => randomBytes(32).toString("base64url");
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const isLocalRequest = (request: Request) => {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
};

export class SlidingRateLimit {
  private readonly hits = new Map<string, number[]>();
  constructor(private readonly limit = 5, private readonly windowMs = 60_000) {}
  allow(key: string, now: number) {
    const active = (this.hits.get(key) ?? []).filter((time) => now - time < this.windowMs);
    if (active.length >= this.limit) return false;
    active.push(now);
    this.hits.set(key, active);
    return true;
  }
}
