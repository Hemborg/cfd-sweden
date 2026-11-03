import Link from "next/link";
import { ArrowIcon } from "@/components/Header";
import { formContent, homeContent, site } from "@/content/site";
import { platformEnabled } from "@/lib/platform/config";
import { PlatformInquiryForm } from "@/components/communications/platform-inquiry-form";

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

export function InquiryForm({ variant }: { variant: "join" | "contact" }) {
  if (platformEnabled() && process.env.CFD_CONTACT_BACKEND === "database")
    return <PlatformInquiryForm variant={variant} />;
  const isContact = variant === "contact";
  const id = `${variant}-form`;
  const fields = homeContent.fields.filter(
    (field) =>
      !isContact || ["firstName", "lastName", "email"].includes(field.name),
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
      <form
        action={site.form.action}
        method="POST"
        aria-describedby={`${id}-privacy`}
      >
        <input
          type="hidden"
          name="_next"
          value={`${site.form.redirectUrl}${isContact ? "?typ=kontakt" : ""}`}
        />
        <input
          type="hidden"
          name="_subject"
          value={
            isContact ? "Kontaktförfrågan – CFD Sweden" : site.form.subject
          }
        />
        <input type="hidden" name="inquiryType" value={variant} />
        <input
          type="text"
          name="_honey"
          style={{ display: "none" }}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <input type="hidden" name="_captcha" value="false" />
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
            maxLength={4000}
          />
        </label>
        <p className="form-help" id={`${id}-privacy`}>
          CFD Sweden använder uppgifterna för att{" "}
          {isContact ? "besvara din förfrågan" : "följa upp ditt intresse"}. De
          skickas via FormSubmit till vår e-post hos Proton. Ingen automatisk
          prenumeration skapas. Undvik känsliga personuppgifter.{" "}
          <Link className="text-link" href="/integritet">
            Läs om personuppgifter och integritet
          </Link>
          .
        </p>
        <button className="submit-button" type="submit">
          {isContact ? "Skicka meddelande" : formContent.submitLabel}{" "}
          <ArrowIcon />
        </button>
      </form>
    </aside>
  );
}
