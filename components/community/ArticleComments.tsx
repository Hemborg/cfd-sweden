import { getActor } from "@/lib/platform/auth";
import { createPublicClient } from "@/lib/platform/db";
import { platformFeatures } from "@/lib/platform/config";
import { submitComment, submitReport } from "./actions";

export async function ArticleComments({ postSlug }: { postSlug: string }) {
  if (!platformFeatures().comments) return null;
  const [actor, result] = await Promise.all([
    getActor(),
    createPublicClient()
      .from("article_comments")
      .select("id,body,created_at")
      .eq("post_slug", postSlug)
      .eq("status", "approved")
      .order("created_at"),
  ]);
  return (
    <section className="article-comments" aria-labelledby="comments-heading">
      <h2 id="comments-heading">Kommentarer</h2>
      {result.data?.length ? (
        result.data.map((comment) => (
          <article key={comment.id}>
            <p>{comment.body}</p>
            <p>
              Medlem · {new Date(comment.created_at).toLocaleDateString("sv-SE")}
            </p>
            {actor && (
              <form action={submitReport}>
                <input type="hidden" name="commentId" value={comment.id} />
                <label className="field">
                  Anmäl kommentar
                  <input name="reason" required maxLength={500} />
                </label>
                <button>Anmäl</button>
              </form>
            )}
          </article>
        ))
      ) : (
        <p>Inga godkända kommentarer ännu.</p>
      )}
      {actor ? (
        <form action={submitComment}>
          <input type="hidden" name="postSlug" value={postSlug} />
          <label className="field">
            Din kommentar
            <textarea name="body" required maxLength={5000} />
          </label>
          <p>Kommentarer granskas innan de publiceras.</p>
          <button className="submit-button">Skicka för granskning</button>
        </form>
      ) : (
        <p>Logga in som godkänd medlem för att lämna en kommentar.</p>
      )}
    </section>
  );
}
