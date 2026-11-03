"use client";
import { FormEvent, useState } from "react";

export function NewsletterForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    const form = new FormData(event.currentTarget);
    const result = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        consent: form.get("consent") === "on",
        honeypot: "",
      }),
    });
    setState(result.ok ? "done" : "error");
  }
  if (state === "done")
    return (
      <p role="status">Kontrollera din e-post och bekräfta prenumerationen.</p>
    );
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
      <label className="portal-check">
        <input name="consent" type="checkbox" required /> Jag vill få nyhetsbrev
        från CFD Sweden.
      </label>
      <button disabled={state === "sending"}>
        {state === "sending" ? "Skickar…" : "Prenumerera"}
      </button>
      {state === "error" && (
        <p role="alert">
          Det gick inte att registrera prenumerationen. Försök igen.
        </p>
      )}
    </form>
  );
}
