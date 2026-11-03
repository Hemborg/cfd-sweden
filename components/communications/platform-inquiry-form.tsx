"use client";
import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { ArrowIcon } from "@/components/ArrowIcon";
import { formContent, homeContent } from "@/content/site";

const fieldOptions: Record<
  string,
  { autoComplete: string; maxLength: number }
> = {
  firstName: { autoComplete: "given-name", maxLength: 100 },
  lastName: { autoComplete: "family-name", maxLength: 100 },
  postalCode: { autoComplete: "postal-code", maxLength: 20 },
  city: { autoComplete: "address-level2", maxLength: 100 },
  email: { autoComplete: "email", maxLength: 254 },
  phone: { autoComplete: "tel", maxLength: 50 },
};

/** Drop-in form for the explicitly approved database backend. The caller keeps
 * InquiryForm/FormSubmit as the default and renders this only behind both the
 * platform and CFD_CONTACT_BACKEND=database gates. */
export function PlatformInquiryForm({
  variant,
}: {
  variant: "join" | "contact";
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const submissionKey = useRef(crypto.randomUUID());
  const isContact = variant === "contact";
  const id = `${variant}-form`;
  const fields = homeContent.fields.filter(
    (field) =>
      !isContact || ["firstName", "lastName", "email"].includes(field.name),
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          firstName: data.get("firstName") || "",
          lastName: data.get("lastName") || "",
          city: data.get("city") || "",
          message: data.get("message") || "",
          metadata: {
            topic: data.get("topic") || undefined,
            phone: data.get("phone") || undefined,
            postalCode: data.get("postalCode") || undefined,
            country: data.get("country") || undefined,
            region: data.get("region") || undefined,
          },
          category: "general",
          inquiryType: variant,
          eventSlug: "",
          honeypot: data.get("_honey") || "",
          idempotencyKey: submissionKey.current,
        }),
      });
      setState(response.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }
  if (state === "done")
    return (
      <aside className="form-panel form-card" aria-live="polite">
        <h2>Tack</h2>
        <p>
          Vi har tagit emot din förfrågan och skickar en bekräftelse till din
          e-postadress.
        </p>
      </aside>
    );
  return (
    <aside
      id={isContact ? "kontaktformular" : undefined}
      className="form-panel form-card"
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`}>
        {isContact ? (
          "Skicka ett meddelande"
        ) : (
          <>
            {homeContent.formHeading.firstLine}
            <span>{homeContent.formHeading.secondLine}</span>
          </>
        )}
      </h2>
      <p className="form-help">
        {isContact
          ? "För frågor, tips, press och samarbete. Detta är ingen medlemsanmälan. E-post och meddelande är obligatoriska."
          : "E-post är obligatoriskt. Övriga uppgifter är frivilliga."}
      </p>
      <form onSubmit={submit} aria-describedby={`${id}-privacy`}>
        <input
          type="text"
          name="_honey"
          style={{ display: "none" }}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <div className="field-grid">
          {fields.map((field) => (
            <label className="field" key={field.name}>
              {field.label}
              <input
                name={field.name}
                type={field.type}
                required={field.name === "email"}
                {...fieldOptions[field.name]}
              />
            </label>
          ))}
          {!isContact && (
            <>
              <label className="field">
                {formContent.countryLabel}
                <select name="country" defaultValue="Sverige">
                  {formContent.countries.map((country) => (
                    <option key={country}>{country}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                {formContent.regionLabel}
                <select name="region" defaultValue="">
                  <option value="">{formContent.regionPlaceholder}</option>
                  {formContent.regions.map((region) => (
                    <option key={region}>{region}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          {isContact && (
            <div className="field">
              <label htmlFor={`${id}-topic`}>Ärende</label>
              <select
                id={`${id}-topic`}
                name="topic"
                defaultValue="Allmän fråga"
              >
                {[
                  "Allmän fråga",
                  "Tips",
                  "Press",
                  "Samarbete",
                  "Personuppgifter",
                ].map((topic) => (
                  <option key={topic}>{topic}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <label className="field full">
          {isContact ? "Meddelande" : formContent.messageLabel}
          <textarea
            name="message"
            rows={5}
            required={isContact}
            minLength={isContact ? 2 : undefined}
            maxLength={3500}
          />
        </label>
        <p className="form-help" id={`${id}-privacy`}>
          CFD Sweden använder uppgifterna för att{" "}
          {isContact ? "besvara din förfrågan" : "följa upp ditt intresse"}.
          Ingen automatisk prenumeration skapas. Undvik känsliga
          personuppgifter.{" "}
          <Link className="text-link" href="/integritet">
            Läs om personuppgifter och integritet
          </Link>
          .
        </p>
        <button
          className="submit-button"
          type="submit"
          disabled={state === "sending"}
        >
          {state === "sending" ? (
            "Skickar…"
          ) : (
            <>
              {isContact ? "Skicka meddelande" : formContent.submitLabel}{" "}
              <ArrowIcon />
            </>
          )}
        </button>
        {state === "error" && (
          <p className="form-help" role="alert">
            Det gick inte att skicka formuläret. Försök igen.
          </p>
        )}
      </form>
    </aside>
  );
}
