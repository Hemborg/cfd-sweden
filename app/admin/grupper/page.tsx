import Link from "next/link";
import { requireRoles } from "@/lib/platform/auth";
import {
  createGroup,
  addMember,
  publishGroupUpdate,
  removeMember,
} from "./actions";
export default async function GroupsPage() {
  const actor = await requireRoles(["administrator", "group_leader"]);
  const { data: groups, error } = await actor.client
    .from("work_groups")
    .select(
      "id,slug,name,purpose,public_summary,is_public,work_group_memberships(user_id,membership_role)",
    )
    .order("name");
  if (error) throw new Error("Grupperna kunde inte hämtas.");
  const [{ data: profiles }, { data: memberships }] = await Promise.all([
    actor.client
      .from("profiles")
      .select("id,display_name")
      .order("display_name"),
    actor.client
      .from("work_group_memberships")
      .select("group_id,membership_role")
      .eq("user_id", actor.user.id),
  ]);
  const isAdministrator = actor.roles.some(
    (role) => role === "superadmin" || role === "administrator",
  );
  const managedGroupIds = new Set(
    (memberships ?? [])
      .filter((membership) => membership.membership_role === "leader")
      .map((membership) => membership.group_id),
  );
  return (
    <>
      <h1>Arbetsgrupper</h1>
      <p>
        Endast gruppmedlemmar ser intern information. Publicering gäller enbart
        gruppens sammanfattning och markerade uppdateringar.
      </p>
      {actor.roles.some(
        (role) => role === "superadmin" || role === "administrator",
      ) && (
        <form action={createGroup}>
          <h2>Ny arbetsgrupp</h2>
          <label className="field">
            Namn
            <input name="name" required maxLength={140} />
          </label>
          <label className="field">
            URL-namn
            <input
              name="slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={120}
            />
          </label>
          <label className="field">
            Syfte (internt)
            <textarea name="purpose" maxLength={5000} />
          </label>
          <label className="field">
            Publik sammanfattning
            <textarea name="publicSummary" maxLength={1000} />
          </label>
          <label className="portal-check">
            <input type="checkbox" name="isPublic" /> Visa sammanfattningen
            publikt
          </label>
          <button>Skapa grupp</button>
        </form>
      )}
      {groups?.map((group) => {
        const canManage = isAdministrator || managedGroupIds.has(group.id);
        return (
          <section key={group.id}>
            <h2>{group.name}</h2>
            {canManage && (
              <form action={createGroup}>
                <h3>Ändra grupp</h3>
                <input type="hidden" name="id" value={group.id} />
                <label className="field">
                  Namn
                  <input
                    name="name"
                    defaultValue={group.name}
                    required
                    maxLength={140}
                  />
                </label>
                <label className="field">
                  URL-namn
                  <input
                    name="slug"
                    defaultValue={group.slug}
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    maxLength={120}
                  />
                </label>
                <label className="field">
                  Syfte (internt)
                  <textarea
                    name="purpose"
                    defaultValue={group.purpose}
                    maxLength={5000}
                  />
                </label>
                <label className="field">
                  Publik sammanfattning
                  <textarea
                    name="publicSummary"
                    defaultValue={group.public_summary}
                    maxLength={1000}
                  />
                </label>
                <label className="portal-check">
                  <input
                    type="checkbox"
                    name="isPublic"
                    defaultChecked={group.is_public}
                  />{" "}
                  Visa sammanfattningen publikt
                </label>
                <button>Spara grupp</button>
              </form>
            )}
            <p>
              {group.is_public
                ? "Publik sammanfattning är publicerad."
                : "Gruppen är privat."}
            </p>
            <Link className="text-link" href={`/medlem?grupp=${group.id}`}>
              Öppna i medlemsportalen
            </Link>
            {canManage && (
              <>
                <ul>
                  {group.work_group_memberships.map(
                    (member: { user_id: string; membership_role: string }) => (
                      <li key={member.user_id}>
                        {profiles?.find(
                          (profile) => profile.id === member.user_id,
                        )?.display_name || "Medlem"}{" "}
                        · {member.membership_role}
                        <form action={removeMember}>
                          <input
                            type="hidden"
                            name="groupId"
                            value={group.id}
                          />
                          <input
                            type="hidden"
                            name="userId"
                            value={member.user_id}
                          />
                          <button>Ta bort</button>
                        </form>
                      </li>
                    ),
                  )}
                </ul>
                <form action={addMember}>
                  <h3>Bjud in medlem</h3>
                  <input type="hidden" name="groupId" value={group.id} />
                  <input type="hidden" name="groupName" value={group.name} />
                  <label className="field">
                    E-postadress för inbjudan
                    <input name="email" type="email" required maxLength={254} />
                  </label>
                  <p>
                    Endast redan godkända medlemmar kan läggas till. Adressen
                    visas inte i någon medlemskatalog.
                  </p>
                  <label className="field">
                    Uppdrag
                    <select name="role">
                      <option value="participant">Deltagare</option>
                      <option value="leader">Gruppansvarig</option>
                    </select>
                  </label>
                  <button>Lägg till och köa inbjudan</button>
                </form>
                <form action={publishGroupUpdate}>
                  <h3>Ny gruppuppdatering</h3>
                  <input type="hidden" name="groupId" value={group.id} />
                  <label className="field">
                    Rubrik
                    <input name="title" required maxLength={180} />
                  </label>
                  <label className="field">
                    Text
                    <textarea name="body" required maxLength={10000} />
                  </label>
                  <label className="portal-check">
                    <input type="checkbox" name="isPublic" /> Visa publikt
                  </label>
                  <button>Publicera uppdatering</button>
                </form>
              </>
            )}
          </section>
        );
      })}
    </>
  );
}
