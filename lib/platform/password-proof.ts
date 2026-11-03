import { createHmac, timingSafeEqual } from "node:crypto";

export const passwordProofCookie = "cfd-password-setup";
function signature(value: string) {
  const secret = process.env.CFD_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Kontosäkerhet saknar konfiguration.");
  return createHmac("sha256", secret)
    .update(`password-setup-v1:${value}`)
    .digest("base64url");
}
/** A short browser-bound proof issued only after Supabase consumes an invite/recovery token. */
export function createPasswordProof(userId: string, now = Date.now()) {
  const value = `${userId}:${now + 600_000}`;
  return `${value}:${signature(value)}`;
}
export function verifyPasswordProof(
  proof: string | undefined,
  userId: string,
  now = Date.now(),
) {
  if (!proof || proof.length > 200) return false;
  const [owner, expiry, supplied] = proof.split(":");
  if (
    owner !== userId ||
    !supplied ||
    !/^\d+$/.test(expiry ?? "") ||
    Number(expiry) <= now ||
    Number(expiry) > now + 600_000
  )
    return false;
  const expected = Buffer.from(signature(`${owner}:${expiry}`));
  const candidate = Buffer.from(supplied);
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}
