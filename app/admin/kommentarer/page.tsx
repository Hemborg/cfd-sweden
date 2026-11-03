import { requireRoles } from "@/lib/platform/auth";
import { platformFeatures } from "@/lib/platform/config";
import { moderate } from "./actions";
export default async function CommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await requireRoles(["moderator"]);
  if (!platformFeatures().comments) return <section><h1>Kommentarer och moderering</h1><p>Publika kommentarer är inte aktiverade.</p></section>;
  const query = await searchParams;
  let request = actor.client
    .from("article_comments")
    .select(
      "id,post_slug,body,status,reporter_count,created_at,profiles!article_comments_created_by_fkey(display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (query.status) request = request.eq("status", query.status);
  const { data: comments, error } = await request;
  if (error) throw new Error("Kommentarerna kunde inte hämtas.");
  return (
    <>
      <h1>Kommentarer och moderering</h1>
      <p>
        Privata e-postadresser visas inte här. Publicera bara kommentarer som
        föreningens moderator godkänner.
      </p>
      <form method="get">
        <label className="field">
          Status
          <select name="status" defaultValue={query.status ?? "pending"}>
            <option value="">Alla</option>
            {["pending", "approved", "rejected", "hidden", "deleted"].map(
              (status) => (
                <option key={status}>{status}</option>
              ),
            )}
          </select>
        </label>
        <button>Filtrera</button>
      </form>
      <div className="table-scroll">
        <table>
          <caption>Senaste 100 kommentarer</caption>
          <thead>
            <tr>
              <th>Artikel</th>
              <th>Text</th>
              <th>Status</th>
              <th>Anmälningar</th>
              <th>Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            {comments?.map((comment) => (
              <tr key={comment.id}>
                <td>{comment.post_slug}</td>
                <td>{comment.body}</td>
                <td>{comment.status}</td>
                <td>{comment.reporter_count}</td>
                <td>
                  <form action={moderate}>
                    <input type="hidden" name="id" value={comment.id} />
                    <select name="status" aria-label="Modereringsbeslut" defaultValue={comment.status}>
                      <option value="approved">Godkänn</option>
                      <option value="rejected">Avvisa</option>
                      <option value="hidden">Dölj</option>
                      <option value="deleted">Radera</option>
                    </select>
                    <button>Spara</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
