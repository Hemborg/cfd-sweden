"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section role="alert">
      <h1>Åtgärden kunde inte slutföras</h1>
      <p>
        Kontrollera uppgifterna och att du har rätt behörighet. Om problemet
        kvarstår, kontakta föreningens systemansvariga.
      </p>
      <button onClick={reset}>Försök igen</button>
    </section>
  );
}
