import { randomBytes } from "node:crypto";
import type { PlatformEvent, Registration, RegistrationStatus } from "./types";

export function ticketCode() {
  return randomBytes(6).toString("hex").toUpperCase();
}
export function registrationOutcome(
  event: Pick<
    PlatformEvent,
    "capacity" | "priceOre" | "registrationOpen" | "published" | "cancelledAt"
  >,
  confirmedCount: number,
): RegistrationStatus {
  if (!event.published || !event.registrationOpen || event.cancelledAt)
    throw new Error("Registration is closed.");
  if (event.capacity != null && confirmedCount >= event.capacity)
    return "waitlisted";
  return event.priceOre > 0 ? "payment_pending" : "confirmed";
}
export function canCheckIn(
  registration: Pick<Registration, "status" | "ticketCode">,
) {
  return (
    registration.status === "confirmed" && Boolean(registration.ticketCode)
  );
}
