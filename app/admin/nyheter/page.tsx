import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/platform/auth";
import { createPlatformEditorialRepository } from "@/lib/editorial/platform-repository";
import { articleInputSchema } from "@/lib/editorial/types";
import { assertSameOrigin } from "@/lib/platform/http";

function text(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export default async function AdminNewsPage() {
  const actor = await requireRoles(["editor", "administrator"]);
  const repository = createPlatformEditorialRepository(actor.client);
  const articles = await repository.listAdmin();
  async function save(form: FormData) {
    "use server";
    await assertSameOrigin();
    const actor = await requireRoles(["editor", "administrator"]);
    const status = text(form, "status") === "published" ? "published" : "draft";
    const parsed = articleInputSchema.parse({
      slug: text(form, "slug"),
      title: text(form, "title"),
      excerpt: text(form, "excerpt"),
      body: text(form, "body"),
      tags: text(form, "tags")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      status,
      publishedAt: status === "published" ? new Date().toISOString() : null,
      seoTitle: text(form, "seoTitle") || null,
      seoDescription: text(form, "seoDescription") || null,
    });
    const input = {
      ...parsed,
      publishedAt: parsed.publishedAt ?? null,
      seoTitle: parsed.seoTitle ?? null,
      seoDescription: parsed.seoDescription ?? null,
    };
    await createPlatformEditorialRepository(actor.client).save(input);
    revalidatePath("/nyheter");
    revalidatePath(`/nyheter/${input.slug}`);
    revalidatePath("/rss.xml");
    revalidatePath("/sitemap.xml");
  }
  return (
    <section>
      <h1>Nyheter</h1>
      <form className="formcard" action={save}>
        <label>
          Slug
          <input name="slug" required pattern="[a-z0-9-]+" />
        </label>
        <label>
          Rubrik
          <input name="title" required />
        </label>
        <label>
          Ingress
          <textarea name="excerpt" required />
        </label>
        <label>
          Text (Markdown)
          <textarea name="body" required />
        </label>
        <label>
          Taggar, separerade med komma
          <input name="tags" />
        </label>
        <label>
          SEO-rubrik
          <input name="seoTitle" />
        </label>
        <label>
          SEO-beskrivning
          <textarea name="seoDescription" />
        </label>
        <label>
          Status
          <select name="status">
            <option value="draft">Utkast</option>
            <option value="published">Publicerad</option>
          </select>
        </label>
        <button>Spara nyhet</button>
      </form>
      {articles.map((article) => (
        <details key={article.id}>
          <summary>
            {article.title} ({article.status})
          </summary>
          <form className="formcard" action={save}>
            <input type="hidden" name="slug" value={article.slug} />
            <label>
              Rubrik
              <input name="title" required defaultValue={article.title} />
            </label>
            <label>
              Ingress
              <textarea
                name="excerpt"
                required
                defaultValue={article.excerpt}
              />
            </label>
            <label>
              Text (Markdown)
              <textarea name="body" required defaultValue={article.body} />
            </label>
            <label>
              Taggar
              <input name="tags" defaultValue={article.tags.join(", ")} />
            </label>
            <label>
              SEO-rubrik
              <input name="seoTitle" defaultValue={article.seoTitle ?? ""} />
            </label>
            <label>
              SEO-beskrivning
              <textarea
                name="seoDescription"
                defaultValue={article.seoDescription ?? ""}
              />
            </label>
            <label>
              Status
              <select name="status" defaultValue={article.status}>
                <option value="draft">Utkast</option>
                <option value="published">Publicerad</option>
              </select>
            </label>
            <button>Spara ändring</button>
          </form>
        </details>
      ))}
    </section>
  );
}
