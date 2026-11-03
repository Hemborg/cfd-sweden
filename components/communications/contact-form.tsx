"use client";
import { FormEvent, useRef, useState } from "react";

export function PlatformContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const idempotencyKey = useRef(crypto.randomUUID());
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    const form = new FormData(event.currentTarget);
    const result = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        firstName: form.get("firstName") || "",
        lastName: form.get("lastName") || "",
        city: form.get("city") || "",
        message: form.get("message") || "",
        category: "general",
        inquiryType: "contact",
        eventSlug: "",
        honeypot: "",
        idempotencyKey: idempotencyKey.current,
      }),
    });
    setState(result.ok ? "done" : "error");
  }
  if (state === "done")
    return <p role="status">Tack, vi har tagit emot ditt meddelande.</p>;
  return (
    <form onSubmit={submit}>
      <label className="field">
        E-postadress
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      <label className="field">
        Förnamn
        <input name="firstName" autoComplete="given-name" maxLength={100} />
      </label>
      <label className="field">
        Efternamn
        <input name="lastName" autoComplete="family-name" maxLength={100} />
      </label>
      <label className="field">
        Ort
        <input name="city" autoComplete="address-level2" maxLength={100} />
      </label>
      <label className="field">
        Meddelande
        <textarea name="message" required maxLength={4000} />
      </label>
      <button disabled={state === "sending"}>
        {state === "sending" ? "Skickar…" : "Skicka"}
      </button>
      {state === "error" && (
        <p role="alert">Det gick inte att skicka. Försök igen.</p>
      )}
    </form>
  );
}
