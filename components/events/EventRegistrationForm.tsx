"use client";

import { useState, type FormEvent } from "react";

export function EventRegistrationForm({
  eventSlug,
  paid,
}: {
  eventSlug: string;
  paid: boolean;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch(
        paid ? "/api/events/checkout" : "/api/events/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventSlug,
            name: form.get("name"),
            email: form.get("email"),
          }),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        setMessage("Anmälan kunde inte genomföras. Försök igen senare.");
      else if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      else if (result.status === "pending_verification")
        setMessage(
          "Kontrollera din e-post och bekräfta anmälan innan en plats reserveras.",
        );
      else
        setMessage(
          result.status === "waitlisted"
            ? "Du står nu på väntelistan."
            : "Tack, din anmälan är registrerad.",
        );
    } catch {
      setMessage("Nätverksfel. Kontrollera anslutningen och försök igen.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="formcard" onSubmit={submit}>
      <h2>{paid ? "Köp biljett" : "Anmäl dig"}</h2>
      <label>
        Namn
        <input required name="name" autoComplete="name" />
      </label>
      <label>
        E-post
        <input required name="email" type="email" autoComplete="email" />
      </label>
      <button className="button button-primary" disabled={busy}>
        {busy ? "Skickar…" : paid ? "Gå vidare till betalning" : "Anmäl mig"}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
