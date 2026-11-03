import assert from "node:assert/strict";
import test from "node:test";
import {
  canCheckIn,
  registrationOutcome,
  ticketCode,
} from "../lib/events/service";
import { eventInputSchema, registrationInputSchema } from "../lib/events/types";

const event = {
  capacity: 1,
  priceOre: 0,
  registrationOpen: true,
  published: true,
  cancelledAt: null,
} as const;
test("free capacity becomes a waitlist without overbooking", () => {
  assert.equal(registrationOutcome(event, 0), "confirmed");
  assert.equal(registrationOutcome(event, 1), "waitlisted");
  assert.equal(
    registrationOutcome({ ...event, priceOre: 5000 }, 0),
    "payment_pending",
  );
});
test("ticket codes and check-in eligibility are strict", () => {
  const code = ticketCode();
  assert.match(code, /^[A-Z0-9]{12}$/);
  assert.equal(canCheckIn({ status: "confirmed", ticketCode: code }), true);
  assert.equal(canCheckIn({ status: "waitlisted", ticketCode: null }), false);
});
test("event and registration validation normalizes only valid public input", () => {
  assert.equal(
    registrationInputSchema.parse({
      eventSlug: "mote",
      email: " A@EXAMPLE.SE ",
      name: "Ada Lovelace",
    }).email,
    "a@example.se",
  );
  assert.throws(() =>
    eventInputSchema.parse({
      slug: "x",
      title: "x",
      description: "x",
      startsAt: "not-a-date",
      location: "x",
      organiser: "x",
    }),
  );
});
