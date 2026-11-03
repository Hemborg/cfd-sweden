import { requireRoles } from "@/lib/platform/auth";
import {
  cancelNewsletterCampaignAction,
  saveNewsletterCampaignAction,
  sendNewsletterCampaignAction,
} from "./actions";
type Props = {
  searchParams: Promise<{ q?: string; consent?: string; page?: string }>;
};
export default async function NewsletterAdminPage({ searchParams }: Props) {
  const actor = await requireRoles(["administrator"]);
  const params = await searchParams;
  const q = (params.q ?? "").replace(/[,%()]/g, "").slice(0, 100);
  const consent = ["pending", "confirmed", "withdrawn"].includes(
    params.consent ?? "",
  )
    ? params.consent
    : "";
  const page = Math.max(0, Number(params.page ?? 0) || 0);
  const size = 50;
  const { data: campaigns } = await actor.client
    .from("newsletter_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  let subscribers = actor.client
    .from("newsletter_consents")
    .select(
      "id,email,status,requested_at,confirmed_at,withdrawn_at,suppressed_at,suppression_reason",
      { count: "exact" },
    )
    .order("requested_at", { ascending: false })
    .range(page * size, page * size + size - 1);
  if (consent) subscribers = subscribers.eq("status", consent);
  if (q) subscribers = subscribers.ilike("email", `%${q}%`);
  const { data: rows, count } = await subscribers;
  const editor = (item?: {
    id: string;
    subject: string;
    html: string;
    text_body: string;
    scheduled_for: string | null;
    status: string;
  }) => (
    <>
      <form action={saveNewsletterCampaignAction}>
        <h2>{item ? `Utkast: ${item.subject}` : "Nytt utkast"}</h2>
        {item && <input type="hidden" name="id" value={item.id} />}
        <label className="field">
          Ämnesrad
          <input
            name="subject"
            required
            maxLength={200}
            defaultValue={item?.subject}
          />
        </label>
        <label className="field">
          HTML
          <textarea
            name="html"
            required
            maxLength={200000}
            defaultValue={item?.html}
          />
        </label>
        <label className="field">
          Textversion
          <textarea
            name="text"
            required
            maxLength={100000}
            defaultValue={item?.text_body}
          />
        </label>
        <label className="field">
          Schemalägg (valfritt, UTC)
          <input
            name="scheduledFor"
            type="datetime-local"
            defaultValue={
              item?.scheduled_for ? item.scheduled_for.slice(0, 16) : ""
            }
          />
        </label>
        <p className="field-help">
          Tiden tolkas som UTC, inte som administratörens lokala tid.
        </p>
        <button>Spara utkast</button>
      </form>
      {item && (
        <form action={sendNewsletterCampaignAction}>
          <input type="hidden" name="id" value={item.id} />
          <button disabled={!["draft", "scheduled"].includes(item.status)}>
            Köa utskick nu
          </button>
        </form>
      )}
    </>
  );
  return (
    <>
      <h1>Nyhetsbrev</h1>
      <p>
        Utkast skickas aldrig direkt. ”Köa utskick” skapar en individuell,
        samtyckesstyrd leverans per bekräftad prenumerant.
      </p>
      <section>
        <h2>Prenumeranter</h2>
        <form method="get">
          <label>
            Sök e-post
            <input name="q" defaultValue={q} />
          </label>
          <label>
            Status
            <select name="consent" defaultValue={consent}>
              <option value="">Alla</option>
              {["pending", "confirmed", "withdrawn"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <button>Sök</button>
        </form>
        <p>
          {count ?? 0} träffar. Sida {page + 1}.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>E-post</th>
                <th>Status</th>
                <th>Begärd</th>
                <th>Suppression</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((row) => (
                <tr key={row.id}>
                  <td>{row.email}</td>
                  <td>{row.status}</td>
                  <td>{row.requested_at}</td>
                  <td>
                    {row.suppressed_at
                      ? `${row.suppression_reason ?? "spärrad"} ${row.suppressed_at}`
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {page > 0 && (
          <a
            href={`/admin/nyhetsbrev?q=${encodeURIComponent(q)}&consent=${consent}&page=${page - 1}`}
          >
            Föregående
          </a>
        )}{" "}
        {(page + 1) * size < (count ?? 0) && (
          <a
            href={`/admin/nyhetsbrev?q=${encodeURIComponent(q)}&consent=${consent}&page=${page + 1}`}
          >
            Nästa
          </a>
        )}
      </section>
      {editor()}
      {campaigns?.map((item) => (
        <section key={item.id}>
          {editor(item)}
          <p>Status: {item.status}</p>
          <details>
            <summary>Förhandsgranska</summary>
            <iframe
              title={`Förhandsgranskning ${item.subject}`}
              sandbox=""
              srcDoc={item.html}
            />
          </details>
          {["draft", "scheduled", "sending", "queued"].includes(
            item.status,
          ) && (
            <form action={cancelNewsletterCampaignAction}>
              <input type="hidden" name="id" value={item.id} />
              <button>Avbryt utskick</button>
            </form>
          )}
        </section>
      ))}
    </>
  );
}
