import { platformFeatures } from "@/lib/platform/config";
import { requireRoles } from "@/lib/platform/auth";
import { csv } from "@/lib/platform/http";
import { createPlatformEventRepository } from "@/lib/events/repository";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!platformFeatures().eventRegistration) return new Response("Not available", { status: 503, headers: { "Cache-Control": "private, no-store" } });
  try {
    const actor = await requireRoles(["administrator"]);
    const { slug } = await params;
    const rows = await createPlatformEventRepository(
      actor.client,
    ).exportRegistrations(slug);
    return new Response(
      csv([
        ["Namn", "E-post", "Status", "Biljett", "Anmäld"],
        ...rows.map((row) => [
          row.name,
          row.email,
          row.status,
          row.ticketCode ?? "",
          row.createdAt,
        ]),
      ]),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="evenemang-${slug}.csv"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return new Response("Export unavailable", {
      status: 403,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
