import { requireRoles } from "@/lib/platform/auth";
import { platformFeatures } from "@/lib/platform/config";
import { createServiceClient } from "@/lib/platform/db";
import { resolveUnknownMail, saveRetention } from "./actions";
export default async function SystemPage() {
  const actor = await requireRoles(["administrator"]);
  const [{ data: audit }, { data: settings }, { data: jobs }] =
    await Promise.all([
      actor.client
        .from("audit_log")
        .select("id,occurred_at,action,entity,entity_id")
        .order("id", { ascending: false })
        .limit(50),
      actor.client.from("platform_settings").select("key,value,updated_at"),
      createServiceClient()
        .from("queue_mail")
        .select("key,template,status,delivery_status,attempts,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
  const heartbeat = settings?.find(
    (setting) => setting.key === "worker_heartbeat",
  );
  return (
    <>
      <h1>System och drift</h1>
      <h2>Jobb och leverans</h2>
      <p>
        Senaste arbetarsignal:{" "}
        {!platformFeatures().email ? "Automatiska utskick är avstängda. Kön behandlas inte." : heartbeat?.updated_at ?? "Ingen registrerad. Kontrollera schemaläggaren."}
      </p>
      <p>
        En skickad avisering är inte samma sak som verifierad leverans till
        inkorgen. Leveransstatus uppdateras först genom signerad
        leverantörswebhook. Poster med fel eller okänd status kräver
        uppföljning.
      </p>
      <div className="table-scroll">
        <table>
          <caption>Senaste 50 jobb</caption>
          <thead>
            <tr>
              <th>Typ</th>
              <th>Köstatus</th>
              <th>Leveransstatus</th>
              <th>Försök</th>
              <th>Skapad</th>
            </tr>
          </thead>
          <tbody>
            {jobs?.map((job) => (
              <tr key={job.key}>
                <td>{job.template}</td>
                <td>{job.status}</td>
                <td>{job.delivery_status ?? "Inte bekräftad"}</td>
                <td>{job.attempts}</td>
                <td>{job.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {jobs
        ?.filter((job) => job.status === "unknown")
        .map((job) => (
          <form key={`resolve-${job.key}`} action={resolveUnknownMail}>
            <h3>Avstäm osäker leverans</h3>
            <input type="hidden" name="key" value={job.key} />
            <p>{job.key}</p>
            <label className="field">
              Beslut
              <select name="resolution">
                <option value="sent">Bekräftat skickad</option>
                <option value="superseded">Avbryt, skicka inte igen</option>
              </select>
            </label>
            <label className="field">
              Provider-ID (valfritt)
              <input name="providerId" maxLength={200} />
            </label>
            <label className="field">
              Kontrollunderlag
              <textarea
                name="evidence"
                minLength={5}
                maxLength={400}
                required
              />
            </label>
            <button>Dokumentera beslut</button>
          </form>
        ))}
      {actor.roles.includes("superadmin") && (
        <>
          <h2>Gallringsbeslut</h2>
          <p>
            Ingen automatisk gallring aktiveras utan ett dokumenterat beslut.
            Ange föreningens beslut, inte en teknisk standardtid.
          </p>
          <form action={saveRetention}>
            <label className="field">
              Antal dagar för avslutade kontaktärenden
              <input
                type="number"
                min={1}
                max={3650}
                name="contactDays"
                required
              />
            </label>
            <label className="field">
              Beslutsreferens
              <input name="decision" minLength={5} maxLength={300} required />
            </label>
            <label className="portal-check">
              <input type="checkbox" name="approved" required /> Föreningen har
              godkänt policyn
            </label>
            <button>Spara beslutad policy</button>
          </form>
        </>
      )}
      <h2>Revisionsspår</h2>
      <div className="table-scroll">
        <table>
          <caption>Senaste 50 administrativa händelser</caption>
          <thead>
            <tr>
              <th>Tid</th>
              <th>Åtgärd</th>
              <th>Område</th>
              <th>Intern identitet</th>
            </tr>
          </thead>
          <tbody>
            {audit?.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.occurred_at}</td>
                <td>{entry.action}</td>
                <td>{entry.entity}</td>
                <td>{entry.entity_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
