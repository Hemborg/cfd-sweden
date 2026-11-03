import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import { remark } from "remark";
import html from "remark-html";
import { z } from "zod";

export type Post = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  author: string;
  tags: string[];
  published: boolean;
  seoTitle?: string;
  seoDescription?: string;
  content: string;
};

const postSchema = z.object({
  title: z.string().min(1), date: z.preprocess((value) => value instanceof Date ? value.toISOString().slice(0, 10) : value, z.iso.date()), excerpt: z.string().min(1), author: z.string().min(1), tags: z.array(z.string().min(1)), published: z.boolean(), seoTitle: z.string().min(1).optional(), seoDescription: z.string().min(1).optional(),
});
const postsDirectory = path.join(process.cwd(), "content", "posts");

export function parsePostSource(fileName: string, source: string): Post {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(fileName)) throw new Error(`Ogiltigt postnamn: ${fileName}.`);
  const { data, content } = matter(source);
  const result = postSchema.safeParse(data);
  if (!result.success) throw new Error(`Inlägget ${fileName} har ogiltig frontmatter: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}.`);
  return { slug: fileName.replace(/\.md$/, ""), ...result.data, content };
}

function parsePost(fileName: string): Post { return parsePostSource(fileName, fs.readFileSync(path.join(postsDirectory, fileName), "utf8")); }

export function getAllPosts(): Post[] {
  if (!fs.existsSync(postsDirectory)) return [];
  return fs.readdirSync(postsDirectory).filter((file) => file.endsWith(".md")).map(parsePost);
}

export function selectPublishedPosts(posts: Post[], today = new Date().toISOString().slice(0, 10)): Post[] {
  return posts.filter((post) => post.published && post.date <= today).sort((a, b) => b.date.localeCompare(a.date));
}
export function getPublishedPosts(): Post[] { return selectPublishedPosts(getAllPosts()); }

export function getPublishedPost(slug: string): Post {
  const post = getPublishedPosts().find((candidate) => candidate.slug === slug);
  if (!post) notFound();
  if (!post) throw new Error("Okänd nyhet.");
  return post;
}

export async function renderPostContent(content: string) {
  return String(await remark().use(html).process(content));
}
