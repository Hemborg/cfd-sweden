import { requireRoles } from "@/lib/platform/auth";
import {
  removeCampaignResponsibility,
  saveCampaignAction,
  setCampaignResponsibility,
} from "./actions";
export default async function CampaignsPage() {
  const actor = await requireRoles(["administrator", "group_leader"]);
  const isAdministrator = actor.roles.some(
    (role) => role === "superadmin" || role === "administrator",
  );
  const [
    { data: campaigns },
    { data: groups },
    { data: memberships },
    { data: profiles },
    { data: assignments },
  ] = await Promise.all([
    actor.client
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false }),
    actor.client.from("work_groups").select("id,name").order("name"),
    actor.client
      .from("work_group_memberships")
      .select("group_id,membership_role")
      .eq("user_id", actor.user.id),
    actor.client
      .from("profiles")
      .select("id,display_name")
      .order("display_name"),
    actor.client
      .from("campaign_assignments")
      .select("campaign_id,user_id,responsibility"),
  ]);
  const managedGroupIds = new Set(
    (memberships ?? [])
      .filter((membership) => membership.membership_role === "leader")
      .map((membership) => membership.group_id),
  );
  const manageableGroups = isAdministrator
    ? (groups ?? [])
    : (groups ?? []).filter((group) => managedGroupIds.has(group.id));
  const canManage = (campaign: { group_id: string | null }) =>
    isAdministrator ||
    (campaign.group_id !== null && managedGroupIds.has(campaign.group_id));
  const editor = (item?: {
    id: string;
    group_id: string | null;
    slug: string;
    title: string;
    goal: string;
    status: string;
    is_public: boolean;
  }) => (
    <form action={saveCampaignAction}>
      <h2>{item ? "Ändra kampanj" : "Ny kampanj"}</h2>
      {item && <input name="id" type="hidden" value={item.id} />}
      <label className="field">
        Rubrik
        <input
          name="title"
          defaultValue={item?.title}
          required
          maxLength={180}
        />
      </label>
      <label className="field">
        URL-namn
        <input
          name="slug"
          defaultValue={item?.slug}
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          maxLength={120}
        />
      </label>
      <label className="field">
        Mål
        <textarea name="goal" defaultValue={item?.goal} maxLength={5000} />
      </label>
      <label className="field">
        Grupp
        <select name="groupId" defaultValue={item?.group_id ?? ""}>
          <option value="">Föreningsgemensam</option>
          {manageableGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Status
        <select name="status" defaultValue={item?.status ?? "draft"}>
          {["draft", "active", "paused", "completed", "archived"].map(
            (status) => (
              <option key={status}>{status}</option>
            ),
          )}
        </select>
      </label>
      <label className="portal-check">
        <input
          type="checkbox"
          name="isPublic"
          defaultChecked={item?.is_public}
        />{" "}
        Visa publikt
      </label>
      <button>Spara kampanj</button>
    </form>
  );
  return (
    <>
      <h1>Kampanjer</h1>
      {(isAdministrator || manageableGroups.length > 0) && editor()}
      {campaigns?.filter(canManage).map((campaign) => (
        <section key={campaign.id}>
          {editor(campaign)}
          <h3>Ansvariga</h3>
          <ul>
            {(assignments ?? [])
              .filter((assignment) => assignment.campaign_id === campaign.id)
              .map((assignment) => (
                <li key={assignment.user_id}>
                  {profiles?.find(
                    (profile) => profile.id === assignment.user_id,
                  )?.display_name || "Medlem"}{" "}
                  · {assignment.responsibility}
                  <form action={removeCampaignResponsibility}>
                    <input
                      type="hidden"
                      name="campaignId"
                      value={campaign.id}
                    />
                    <input
                      type="hidden"
                      name="userId"
                      value={assignment.user_id}
                    />
                    <button>Ta bort</button>
                  </form>
                </li>
              ))}
          </ul>
          <form action={setCampaignResponsibility}>
            <input type="hidden" name="campaignId" value={campaign.id} />
            <label className="field">
              Medlem
              <select name="userId" required defaultValue="">
                <option value="">Välj medlem</option>
                {profiles?.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.display_name || "Medlem utan visningsnamn"}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Ansvar
              <select name="responsibility">
                <option value="responsible">Ansvarig</option>
                <option value="contributor">Medverkande</option>
              </select>
            </label>
            <button>Spara ansvar</button>
          </form>
        </section>
      ))}
    </>
  );
}
