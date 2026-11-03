import Link from "next/link";
import { requireRoles, roleLabels } from "@/lib/platform/auth";
export default async function Dashboard() {
  const actor = await requireRoles([
    "administrator",
    "editor",
    "group_leader",
    "moderator",
  ]);
  return (
    <>
      <h1>Föreningens administration</h1>
      <p>
        Välkommen {actor.profile.display_name || "tillbaka"}. Dina uppdrag:{" "}
        {actor.roles.map((role) => roleLabels[role]).join(", ")}.
      </p>
      <p>
        Menyn visar de delar som dina uppdrag ger åtkomst till. Varje ändring
        kontrolleras även på servern och i databasen.
      </p>
      <Link className="text-link" href="/konto/sakerhet">
        Inloggning och säkerhet
      </Link>
    </>
  );
}
