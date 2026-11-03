"use client";

import { useState, type FormEvent } from "react";

export function ConfirmFreeEventRegistration({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/events/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        setMessage("Länken är ogiltig, har gått ut eller redan använts.");
      else {
        window.history.replaceState(
          {},
          "",
          "/evenemang/bekrafta?status=confirmed",
        );
        setMessage(
          result.status === "waitlisted"
            ? "Din e-post är bekräftad. Du står nu på väntelistan."
            : "Din e-post är bekräftad och din plats är registrerad.",
        );
      }
    } catch {
      setMessage("Nätverksfel. Försök igen senare.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="formcard" onSubmit={submit}>
      <button className="button button-primary" disabled={busy}>
        {busy ? "Bekräftar…" : "Bekräfta anmälan"}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
