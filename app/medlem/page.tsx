import Link from "next/link";
import { requireActor } from "@/lib/platform/auth";
import { TaskBoard } from "@/components/community/TaskBoard";
import { commentTaskAction, moveTaskAction } from "@/app/admin/projekt/actions";

type Group = { id: string; name: string; purpose: string };
type Project = {
  id: string;
  title: string;
  description: string;
  campaign_id: string | null;
};
type TaskRow = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: "backlog" | "todo" | "in_progress" | "review" | "done";
  priority: string;
  position: number;
  due_at: string | null;
  assignee_id: string | null;
};
type TaskComment = { body: string; created_at: string; created_by: string };
type TaskActivity = { action: string; occurred_at: string };

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Medlemsportal | CFD Sweden",
  robots: { index: false, follow: false },
};

export default async function MemberPage({
  searchParams,
}: {
  searchParams: Promise<{ grupp?: string; projekt?: string; uppgift?: string }>;
}) {
  const actor = await requireActor();
  const query = await searchParams;
  const { data: memberships } = await actor.client
    .from("work_group_memberships")
    .select("group_id,membership_role,work_groups(id,name,purpose)");
  const groups = (memberships ?? [])
    .map((membership) =>
      Array.isArray(membership.work_groups)
        ? membership.work_groups[0]
        : membership.work_groups,
    )
    .filter(Boolean) as Group[];
  const groupId = query.grupp ?? groups[0]?.id;
  const { data: campaigns } = groupId
    ? await actor.client.from("campaigns").select("id").eq("group_id", groupId)
    : { data: [] };
  const campaignIds = (campaigns ?? []).map((campaign) => campaign.id);
  const projectFilter = `group_id.eq.${groupId}${campaignIds.length ? `,campaign_id.in.(${campaignIds.join(",")})` : ""}`;
  const { data: projectData } = groupId
    ? await actor.client
        .from("projects")
        .select("id,title,description,campaign_id")
        .eq("archived", false)
        .or(projectFilter)
    : { data: [] };
  const projects = (projectData ?? []) as Project[];
  const projectId = query.projekt ?? projects[0]?.id;
  const { data: taskData } = projectId
    ? await actor.client
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("position")
    : { data: [] };
  const tasks = (taskData ?? []) as TaskRow[];
  const selectedTask =
    tasks.find((task) => task.id === query.uppgift) ?? tasks[0] ?? null;
  const [{ data: profiles }, { data: commentData }, { data: activityData }] =
    await Promise.all([
      actor.client.from("profiles").select("id,display_name"),
      selectedTask
        ? actor.client
            .from("task_comments")
            .select("body,created_at,created_by")
            .eq("task_id", selectedTask.id)
            .order("created_at")
        : Promise.resolve({ data: [] }),
      selectedTask
        ? actor.client
            .from("task_activity")
            .select("action,occurred_at")
            .eq("task_id", selectedTask.id)
            .order("occurred_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] }),
    ]);
  const taskComments = (commentData ?? []) as TaskComment[];
  const taskActivity = (activityData ?? []) as TaskActivity[];
  const names = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
  );
  const canMoveTasks = actor.roles.some(
    (role) =>
      role === "superadmin" ||
      role === "administrator" ||
      role === "group_leader",
  );

  return (
    <main className="portal">
      <header className="portal-header">
        <Link href="/">CFD Sweden</Link>
        <Link href="/konto/sakerhet">Säker inloggning</Link>
        <Link href="/admin">Administration</Link>
      </header>
      <div className="portal-content">
        <h1>Medlemsportal</h1>
        <p>
          Välkommen {actor.profile.display_name || "medlem"}. Här visas bara
          grupper och uppgifter som din inloggning har åtkomst till.
        </p>
        <nav aria-label="Mina grupper">
          {groups.map((group) => (
            <Link
              className="text-link"
              key={group.id}
              href={`/medlem?grupp=${group.id}`}
            >
              {group.name}
            </Link>
          ))}
        </nav>
        {groupId ? (
          <>
            <h2>{groups.find((group) => group.id === groupId)?.name}</h2>
            <nav aria-label="Gruppens projekt">
              {projects.map((project) => (
                <Link
                  className="text-link"
                  key={project.id}
                  href={`/medlem?grupp=${groupId}&projekt=${project.id}`}
                >
                  {project.title}
                </Link>
              ))}
            </nav>
            {projectId && (
              <>
                <TaskBoard
                  tasks={tasks}
                  names={names}
                  onMove={canMoveTasks ? moveTaskAction : undefined}
                  onComment={commentTaskAction}
                />
                {selectedTask && (
                  <section aria-labelledby="task-activity">
                    <h3 id="task-activity">
                      Uppgiftsaktivitet: {selectedTask.title}
                    </h3>
                    <nav aria-label="Uppgifter">
                      {tasks.map((task) => (
                        <Link
                          className="text-link"
                          key={task.id}
                          href={`/medlem?grupp=${groupId}&projekt=${projectId}&uppgift=${task.id}`}
                        >
                          {task.title}
                        </Link>
                      ))}
                    </nav>
                    <h4>Kommentarer</h4>
                    <ul>
                      {taskComments.length ? (
                        taskComments.map((comment, index) => (
                          <li key={`${comment.created_at}-${index}`}>
                            {comment.body} ·{" "}
                            {names.get(comment.created_by) || "Medlem"} ·{" "}
                            {new Date(comment.created_at).toLocaleString(
                              "sv-SE",
                            )}
                          </li>
                        ))
                      ) : (
                        <li>Inga kommentarer ännu.</li>
                      )}
                    </ul>
                    <h4>Aktivitetslogg</h4>
                    <ul>
                      {taskActivity.length ? (
                        taskActivity.map((entry, index) => (
                          <li key={`${entry.occurred_at}-${index}`}>
                            {entry.action} ·{" "}
                            {new Date(entry.occurred_at).toLocaleString(
                              "sv-SE",
                            )}
                          </li>
                        ))
                      ) : (
                        <li>Ingen aktivitet ännu.</li>
                      )}
                    </ul>
                  </section>
                )}
              </>
            )}
          </>
        ) : (
          <p>Du är ännu inte medlem i någon arbetsgrupp.</p>
        )}
      </div>
    </main>
  );
}
