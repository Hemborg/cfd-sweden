import { requireRoles, roles, roleLabels } from "@/lib/platform/auth";
import { createServiceClient } from "@/lib/platform/db";
import { inviteUser, changeAccess, reissueAccountLink } from "./actions";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sida?: string;
    fel?: string;
    skickat?: string;
  }>;
}) {
  const actor = await requireRoles(["administrator"]);
  const query = await searchParams;
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(query.sida ?? "1") || 1),
  );
  const {
    data: { users },
    error,
  } = await createServiceClient().auth.admin.listUsers({ page, perPage: 50 });
  if (error) throw new Error("Användarna kunde inte hämtas.");
  const { data: profiles } = await actor.client
    .from("profiles")
    .select("id,display_name,approved,suspended")
    .in(
      "id",
      users.map((user) => user.id),
    );
  const { data: assignments } = await actor.client
    .from("user_roles")
    .select("user_id,role")
    .in(
      "user_id",
      users.map((user) => user.id),
    );
  return (
    <>
      <h1>Användare och uppdrag</h1>
      {query.fel && (
        <p role="alert">
          Åtgärden kunde inte slutföras. Kontrollera kontot och behörigheterna.
          Sista aktiva superadmin kan inte tas bort.
        </p>
      )}
      {query.skickat && (
        <p role="status">
          Inbjudan ligger i leveranskön. Köstatus visar när den har skickats.
        </p>
      )}
      <h2>Bjud in medlem</h2>
      <form action={inviteUser}>
        <label className="field">
          Namn
          <input name="name" maxLength={100} required />
        </label>
        <label className="field">
          E-post
          <input name="email" type="email" maxLength={254} required />
        </label>
        <button>Bjud in</button>
      </form>
      <p>
        En inbjudan skapar ett medlemskonto. Administrativa uppdrag tilldelas
        separat av superadmin.
      </p>
      {users.map((user) => {
        const profile = profiles?.find((p) => p.id === user.id);
        const assigned =
          assignments
            ?.filter((r) => r.user_id === user.id)
            .map((r) => r.role) ?? [];
        return (
          <section key={user.id}>
            <h2>{profile?.display_name || "Utan namn"}</h2>
            <p>{user.email}</p>
            {profile?.approved && !profile.suspended && (
              <form action={reissueAccountLink}>
                <input type="hidden" name="id" value={user.id} />
                <button>Skicka ny kontolänk</button>
              </form>
            )}
            {actor.roles.includes("superadmin") ? (
              <form action={changeAccess}>
                <input type="hidden" name="id" value={user.id} />
                <fieldset>
                  <legend>Uppdrag</legend>
                  {roles.map((role) => (
                    <label className="portal-check" key={role}>
                      <input
                        type="checkbox"
                        name="role"
                        value={role}
                        defaultChecked={assigned.includes(role)}
                      />{" "}
                      {roleLabels[role]}
                    </label>
                  ))}
                </fieldset>
                <label className="portal-check">
                  <input
                    type="checkbox"
                    name="approved"
                    defaultChecked={profile?.approved}
                  />{" "}
                  Godkänd
                </label>
                <label className="portal-check">
                  <input
                    type="checkbox"
                    name="suspended"
                    defaultChecked={profile?.suspended}
                  />{" "}
                  Avstängd
                </label>
                <button>Spara åtkomst</button>
              </form>
            ) : (
              <p>
                {assigned
                  .map((role) => roleLabels[role as keyof typeof roleLabels])
                  .join(", ")}
              </p>
            )}
          </section>
        );
      })}
      <nav aria-label="Användarsidor">
        {page > 1 && <a href={`?sida=${page - 1}`}>Föregående sida</a>}
        {users.length === 50 && <a href={`?sida=${page + 1}`}>Nästa sida</a>}
      </nav>
    </>
  );
}
