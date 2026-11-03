"use client";
import { useActionState, useState } from "react";
import { enrollMfa, verifyMfa, type MfaState } from "./actions";

export function MfaForm({ factorId }: { factorId?: string }) {
  const [enrollment, setEnrollment] = useState<MfaState>({ factorId });
  const [state, action, pending] = useActionState(verifyMfa, {});
  const [enrolling, setEnrolling] = useState(false);
  return (
    <div>
      {!enrollment.factorId && (
        <button
          className="submit-button"
          disabled={enrolling}
          onClick={async () => {
            setEnrolling(true);
            try {
              setEnrollment(await enrollMfa());
            } finally {
              setEnrolling(false);
            }
          }}
        >
          Aktivera autentiserare
        </button>
      )}
      {enrollment.error && <p role="alert">{enrollment.error}</p>}
      {enrollment.qr && (
        <>
          <p>
            Skanna koden med din autentiseringsapp. Spara återställningsrutinen
            hos föreningens ansvariga.
          </p>
          {/* QR is a data image supplied by Supabase, never executed as inline SVG. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrollment.qr}
            alt="QR-kod för autentiseringsapp"
            width={220}
            height={220}
          />
          <p>
            Manuell nyckel: <code>{enrollment.secret}</code>
          </p>
        </>
      )}
      {enrollment.factorId && (
        <form action={action}>
          <input type="hidden" name="factorId" value={enrollment.factorId} />
          <label className="field">
            Engångskod
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              required
              maxLength={6}
            />
          </label>
          {state.error && <p role="alert">{state.error}</p>}
          <button className="submit-button" disabled={pending}>
            Verifiera kod
          </button>
        </form>
      )}
    </div>
  );
}
