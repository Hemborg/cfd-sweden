import { platformFeatures } from "@/lib/platform/config";

export function paymentConfig() {
  const key = process.env.STRIPE_SECRET_KEY;
  const mode = process.env.CfD_STRIPE_MODE ?? "test";
  if (
    !platformFeatures().payments ||
    process.env.CfD_EXTERNAL_SERVICES_APPROVED !== "true" ||
    !key
  )
    return null;
  if (mode === "test" && key.startsWith("sk_test_"))
    return { key, live: false };
  if (
    mode === "live" &&
    key.startsWith("sk_live_") &&
    process.env.CfD_STRIPE_LIVE_APPROVED === "true" &&
    process.env.CfD_PAYMENT_POLICY_APPROVED === "true"
  )
    return { key, live: true };
  return null;
}
