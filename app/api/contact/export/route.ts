import { requireRoles } from "@/lib/platform/auth";
import { csv } from "@/lib/platform/http";
export async function GET() {
  const actor = await requireRoles(["administrator"]);
  const rows: unknown[][] = [
    [
      "Skapad",
      "E-post",
      "Förnamn",
      "Efternamn",
      "Ort",
      "Meddelande",
      "Kategori",
      "Status",
    ],
  ];
  let offset = 0;
  while (true) {
    const { data, error, count } = await actor.client
      .from("contact_submissions")
      .select(
        "created_at,email,first_name,last_name,city,message,category,status",
        { count: "exact" },
      )
      .order("id")
      .range(offset, offset + 499);
    if (error || count === null) return new Response(null, { status: 503 });
    if (count > 10_000)
      return new Response(
        "Exporten överstiger 10 000 ärenden. Be systemansvarig om en avgränsad export.",
        { status: 413, headers: { "Cache-Control": "no-store" } },
      );
    rows.push(
      ...(data ?? []).map((item) => [
        item.created_at,
        item.email,
        item.first_name,
        item.last_name,
        item.city,
        item.message,
        item.category,
        item.status,
      ]),
    );
    offset += data?.length ?? 0;
    if (offset >= count) break;
    if (!data?.length) return new Response(null, { status: 503 });
  }
  return new Response(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=kontaktarenden.csv",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
