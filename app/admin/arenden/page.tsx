import Link from "next/link";
import { requireRoles } from "@/lib/platform/auth";
import { deleteContactAction, updateContactAction } from "./actions";
type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    sort?: string;
  }>;
};
export default async function ContactCasesPage({ searchParams }: Props) {
  const actor = await requireRoles(["administrator"]);
  const params = await searchParams;
  const q = (params.q ?? "").replace(/[,%()]/g, "").slice(0, 100);
  const status = ["new", "in_progress", "responded", "closed"].includes(
    params.status ?? "",
  )
    ? params.status
    : "";
  const page = Math.max(0, Number(params.page ?? 0) || 0);
  const sort = params.sort === "oldest" ? "oldest" : "newest";
  let request = actor.client
    .from("contact_submissions")
    .select(
      "id,created_at,email,first_name,last_name,city,message,metadata,category,event_slug,status,assigned_to",
      { count: "exact" },
    )
    .order("created_at", { ascending: sort === "oldest" })
    .range(page * 50, page * 50 + 49);
  if (status) request = request.eq("status", status);
  if (q)
    request = request.or(
      `email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`,
    );
  const [{ data: cases, count }, { data: people }] = await Promise.all([
    request,
    actor.client
      .from("profiles")
      .select("id,display_name")
      .eq("approved", true)
      .order("display_name"),
  ]);
  const labels: Record<string, string> = {
    topic: "Ärende",
    phone: "Telefon",
    postalCode: "Postnummer",
    country: "Land",
    region: "Region",
  };
  const showMetadata = (raw: unknown) =>
    Object.entries(
      (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>,
    )
      .filter(([, v]) => v)
      .map(([k, v]) => `${labels[k] ?? k}: ${String(v)}`)
      .join(" · ");
  const query = `q=${encodeURIComponent(q)}&status=${status}&sort=${sort}`;
  return (
    <>
      <h1>Kontaktärenden</h1>
      <form method="get">
        <label>
          Sök
          <input name="q" defaultValue={q} />
        </label>
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="">Alla statusar</option>
            {["new", "in_progress", "responded", "closed"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Sortering
          <select name="sort" defaultValue={sort}>
            <option value="newest">Nyast först</option>
            <option value="oldest">Äldst först</option>
          </select>
        </label>
        <button>Sök</button>
        <Link href="/api/contact/export">Exportera CSV</Link>
      </form>
      <p>
        {count ?? 0} träffar. Sida {page + 1}.
      </p>
      <nav aria-label="Sidindelning">
        {page > 0 && (
          <Link href={`/admin/arenden?${query}&page=${page - 1}`}>
            Föregående
          </Link>
        )}{" "}
        {(page + 1) * 50 < (count ?? 0) && (
          <Link href={`/admin/arenden?${query}&page=${page + 1}`}>Nästa</Link>
        )}
      </nav>
      {cases?.map((item) => (
        <section key={item.id}>
          <h2>
            {item.first_name || item.last_name
              ? `${item.first_name ?? ""} ${item.last_name ?? ""}`
              : item.email}
          </h2>
          <p>
            {item.email}
            {item.city ? ` · ${item.city}` : ""} ·{" "}
            {new Date(item.created_at).toLocaleString("sv-SE")}
          </p>
          <p>{item.message || "(inget meddelande)"}</p>
          {showMetadata(item.metadata) && (
            <p>Uppgifter: {showMetadata(item.metadata)}</p>
          )}
          <form action={updateContactAction}>
            <input type="hidden" name="id" value={item.id} />
            <label>
              Status
              <select name="status" defaultValue={item.status}>
                {["new", "in_progress", "responded", "closed"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Ansvarig
              <select name="assignedTo" defaultValue={item.assigned_to ?? ""}>
                <option value="">Ingen</option>
                {people?.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.display_name}
                  </option>
                ))}
              </select>
            </label>
            <button>Spara</button>
          </form>
          <form action={deleteContactAction}>
            <input type="hidden" name="id" value={item.id} />
            <button>Radera permanent</button>
          </form>
        </section>
      ))}
    </>
  );
}
