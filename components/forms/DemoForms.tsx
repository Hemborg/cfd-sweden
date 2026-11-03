"use client";

import { useRef, useState, type FormEvent } from "react";

type Result = {
  ok?: boolean;
  error?: string;
  fields?: Record<string, string[]>;
  alreadyConfirmed?: boolean;
  alreadyPending?: boolean;
  confirmationToken?: string;
  unsubscribeToken?: string;
};

async function request(path: string, body: unknown): Promise<Result> {
  const response = await fetch(path, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  return response.json();
}

function failure(result: Result) {
  const details = Object.values(result.fields ?? {}).flat().join(" ");
  return details || result.error || "Ett fel uppstod. Försök igen.";
}

function Honeypot() {
  return <label hidden aria-hidden="true">Företag<input name="company" tabIndex={-1} autoComplete="off" /></label>;
}

export function DemoForms() {
  const [contactMessage, setContactMessage] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [confirmToken, setConfirmToken] = useState("");
  const [unsubscribeToken, setUnsubscribeToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [contactDone, setContactDone] = useState(false);
  const submissionKey = useRef<string | undefined>(undefined);
  const tokenEmail = useRef("");

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    submissionKey.current ??= crypto.randomUUID();
    setBusy(true);
    try {
      const result = await request("/api/demo/contact", {
        email: data.get("email"), firstName: data.get("firstName"), message: data.get("message"),
        category: "general", honeypot: data.get("company"), idempotencyKey: submissionKey.current,
      });
      setContactMessage(result.ok ? "Testinsändning sparad lokalt. Inget mejl skickades." : failure(result));
      if (result.ok) setContactDone(true);
    } catch {
      setContactMessage("Nätverksfel. Du kan försöka igen utan att skapa en dubblett.");
    } finally { setBusy(false); }
  }

  async function requestConsent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    if (email !== tokenEmail.current) { setConfirmToken(""); setUnsubscribeToken(""); }
    setBusy(true);
    try {
      const result = await request("/api/demo/newsletter/request", {
        email, consent: data.get("consent") === "on", honeypot: data.get("company"),
      });
      if (!result.ok) { setNewsletterMessage(failure(result)); return; }
      setNewsletterMessage(result.alreadyConfirmed ? "Samtycket är redan bekräftat lokalt."
        : result.alreadyPending ? "En bekräftelse inväntas redan. Använd den tidigare testlänken."
          : "Bekräftelselänk skapad lokalt. Inget mejl skickades.");
      if (result.confirmationToken) { setConfirmToken(result.confirmationToken); tokenEmail.current = email; }
      if (result.unsubscribeToken) setUnsubscribeToken(result.unsubscribeToken);
    } catch { setNewsletterMessage("Nätverksfel. Försök igen."); }
    finally { setBusy(false); }
  }

  async function changeConsent(action: "confirm" | "unsubscribe") {
    setBusy(true);
    try {
      const result = await request(`/api/demo/newsletter/${action}`, { token: action === "confirm" ? confirmToken : unsubscribeToken });
      setNewsletterMessage(result.ok
        ? action === "confirm" ? "Samtycket är bekräftat lokalt." : "Samtycket är återkallat lokalt."
        : failure(result));
      if (result.ok) {
        setConfirmToken("");
        if (action === "unsubscribe") setUnsubscribeToken("");
      }
    } catch { setNewsletterMessage("Nätverksfel. Försök igen."); }
    finally { setBusy(false); }
  }

  return <div className="demo-forms">
    <form onSubmit={submitContact} aria-labelledby="contact-demo-heading">
      <h2 id="contact-demo-heading">Testa intresseanmälan</h2>
      <p>Använd påhittade testuppgifter. Kontaktanmälan skapar ingen prenumeration.</p>
      <label className="field">E-post<input required name="email" type="email" maxLength={254} disabled={contactDone} /></label>
      <label className="field">Förnamn<input name="firstName" maxLength={100} disabled={contactDone} /></label>
      <label className="field">Meddelande<textarea name="message" maxLength={4000} disabled={contactDone} /></label>
      <Honeypot />
      {!contactDone && <button className="submit-button" type="submit" disabled={busy}>{busy ? "Skickar…" : "Skicka test"}</button>}
      {contactDone && <button className="submit-button" type="button" onClick={() => { submissionKey.current = undefined; setContactDone(false); setContactMessage(""); }}>Ny testanmälan</button>}
      <p role="status" aria-live="polite">{contactMessage}</p>
    </form>

    <form onSubmit={requestConsent} aria-labelledby="newsletter-demo-heading">
      <h2 id="newsletter-demo-heading">Testa dubbel opt-in</h2>
      <label className="field">E-post<input required name="email" type="email" maxLength={254} /></label>
      <label className="consent-choice"><input name="consent" type="checkbox" required />Jag vill frivilligt få nyhetsbrev.</label>
      <p>Samtyckestext för demonstration. Texten måste granskas före skarp användning. Avregistrering kan provas nedan.</p>
      <Honeypot />
      <button className="submit-button" type="submit" disabled={busy}>{busy ? "Skickar…" : "Begär bekräftelse"}</button>
      <p role="status" aria-live="polite">{newsletterMessage}</p>
    </form>

    {(confirmToken || unsubscribeToken) && <section className="demo-confirmation">
      <h2>Prova bekräftelse och avregistrering</h2>
      <p>Dessa knappar ersätter mejllänkar i det lokala testet. Inget skickas till någon inkorg.</p>
      <div className="demo-actions">
        {confirmToken && <button className="submit-button" type="button" disabled={busy} onClick={() => changeConsent("confirm")}>Bekräfta prenumeration</button>}
        {unsubscribeToken && <button className="submit-button" type="button" disabled={busy} onClick={() => changeConsent("unsubscribe")}>Avregistrera test</button>}
      </div>
    </section>}
  </div>;
}
