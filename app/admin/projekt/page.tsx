import { z } from "zod";
import { TaskBoard } from "@/components/community/TaskBoard";
import { requireRoles } from "@/lib/platform/auth";
import {
  commentTaskAction,
  moveTaskAction,
  saveProjectAction,
  saveTaskAction,
} from "./actions";

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

type Search = {
  grupp?: string;
  project?: string;
  task?: string;
  ansvarig?: string;
  status?: string;
  forfall?: string;
};

function projectHref(values: Search) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value) params.set(key, value);
  return `?${params.toString()}`;
}

function TaskForm({
  action,
  projectId,
  task,
  profiles,
}: {
  action: typeof saveTaskAction;
  projectId: string;
  task?: TaskRow;
  profiles: { id: string; display_name: string | null }[];
}) {
  return (
    <form action={action}>
      <h3>{task ? "Uppgiftsdetaljer" : "Ny uppgift"}</h3>
      {task && <input type="hidden" name="id" value={task.id} />}
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="position" value={task?.position ?? 1000} />
      <label className="field">
        Rubrik
        <input
          name="title"
          defaultValue={task?.title}
          required
          maxLength={240}
        />
      </label>
      <label className="field">
        Beskrivning
        <textarea
          name="description"
          defaultValue={task?.description}
          maxLength={10000}
        />
      </label>
      <label className="field">
        Kolumn
        <select name="status" defaultValue={task?.status ?? "backlog"}>
          <option value="backlog">Backlog</option>
          <option value="todo">Att göra</option>
          <option value="in_progress">Pågår</option>
          <option value="review">Granskning</option>
          <option value="done">Klart</option>
        </select>
      </label>
      <label className="field">
        Prioritet
        <select name="priority" defaultValue={task?.priority ?? "normal"}>
          <option value="low">Låg</option>
          <option value="normal">Normal</option>
          <option value="high">Hög</option>
          <option value="urgent">Brådskande</option>
        </select>
      </label>
      <label className="field">
        Förfallodatum (UTC)
        <input
          type="datetime-local"
          name="dueAt"
          defaultValue={task?.due_at?.slice(0, 16) ?? ""}
        />
      </label>
      <p>Datum och tid tolkas och sparas som UTC.</p>
      <label className="field">
        Ansvarig
        <select name="assigneeId" defaultValue={task?.assignee_id ?? ""}>
          <option value="">Inte tilldelad</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.display_name || "Medlem"}
            </option>
          ))}
        </select>
      </label>
      {!task && (
        <p>
          Uppgiftsnotiser skickas endast till den valda medlemmens registrerade
          adress.
        </p>
      )}
      <button>{task ? "Spara uppgift" : "Skapa uppgift"}</button>
    </form>
  );
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const actor = await requireRoles(["administrator", "group_leader"]);
  const query = await searchParams;
  const groupId = z.uuid().safeParse(query.grupp).data;
  const [{ data: groups }, { data: campaigns }, { data: profiles }] =
    await Promise.all([
      actor.client.from("work_groups").select("id,name").order("name"),
      actor.client.from("campaigns").select("id,title,group_id").order("title"),
      actor.client
        .from("profiles")
        .select("id,display_name")
        .order("display_name"),
    ]);
  let projectsQuery = actor.client
    .from("projects")
    .select("*")
    .eq("archived", false)
    .order("created_at", { ascending: false });
  if (groupId) {
    const campaignIds = (campaigns ?? [])
      .filter((campaign) => campaign.group_id === groupId)
      .map((campaign) => campaign.id);
    const scope = [
      `group_id.eq.${groupId}`,
      ...(campaignIds.length
        ? [`campaign_id.in.(${campaignIds.join(",")})`]
        : []),
    ];
    projectsQuery = projectsQuery.or(scope.join(","));
  }
  const { data: projects } = await projectsQuery;
  const selected =
    projects?.find((project) => project.id === query.project) ?? projects?.[0];
  let tasks: TaskRow[] = [];
  if (selected) {
    const result = await actor.client
      .from("project_tasks")
      .select("*")
      .eq("project_id", selected.id)
      .order("position");
    tasks = (result.data ?? []) as TaskRow[];
  }
  const filtered = tasks.filter(
    (task) =>
      (!query.ansvarig || task.assignee_id === query.ansvarig) &&
      (!query.status || task.status === query.status) &&
      (!query.forfall ||
        (task.due_at && task.due_at.slice(0, 10) <= query.forfall)),
  );
  const selectedTask = tasks.find((task) => task.id === query.task);
  const [{ data: taskComments }, { data: activity }] = selectedTask
    ? await Promise.all([
        actor.client
          .from("task_comments")
          .select("body,created_at,created_by")
          .eq("task_id", selectedTask.id)
          .order("created_at"),
        actor.client
          .from("task_activity")
          .select("action,detail,occurred_at")
          .eq("task_id", selectedTask.id)
          .order("occurred_at", { ascending: false })
          .limit(50),
      ])
    : [{ data: [] }, { data: [] }];
  const names = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
  );
  const people = profiles ?? [];

  return (
    <>
      <h1>Projekt och Kanban</h1>
      <form action={saveProjectAction}>
        <h2>Nytt projekt</h2>
        <label className="field">
          Namn
          <input name="title" required maxLength={180} />
        </label>
        <label className="field">
          Beskrivning
          <textarea name="description" maxLength={10000} />
        </label>
        <label className="field">
          Arbetsgrupp
          <select name="groupId" defaultValue={groupId ?? ""}>
            <option value="">Välj grupp</option>
            {groups?.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Kampanj
          <select name="campaignId" defaultValue="">
            <option value="">Ingen kampanj</option>
            {campaigns?.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.title}
              </option>
            ))}
          </select>
        </label>
        <button>Skapa projekt</button>
      </form>

      <form method="get" className="filter-strip">
        <label className="field">
          Arbetsgrupp
          <select name="grupp" defaultValue={groupId ?? ""}>
            <option value="">Alla grupper</option>
            {groups?.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <input type="hidden" name="project" value={query.project ?? ""} />
        <input type="hidden" name="task" value={query.task ?? ""} />
        <input type="hidden" name="ansvarig" value={query.ansvarig ?? ""} />
        <input type="hidden" name="status" value={query.status ?? ""} />
        <input type="hidden" name="forfall" value={query.forfall ?? ""} />
        <button>Visa grupp</button>
      </form>

      <nav aria-label="Projekt">
        {projects?.map((project) => (
          <a
            className="text-link"
            key={project.id}
            href={projectHref({
              ...query,
              grupp: groupId,
              project: project.id,
              task: undefined,
            })}
          >
            {project.title}
          </a>
        ))}
      </nav>

      {selected && (
        <>
          <h2>{selected.title}</h2>
          <TaskForm
            action={saveTaskAction}
            projectId={selected.id}
            profiles={people}
          />
          <form method="get" className="filter-strip">
            <input type="hidden" name="grupp" value={groupId ?? ""} />
            <input type="hidden" name="project" value={selected.id} />
            <input type="hidden" name="task" value={query.task ?? ""} />
            <label className="field">
              Ansvarig
              <select name="ansvarig" defaultValue={query.ansvarig ?? ""}>
                <option value="">Alla</option>
                {people.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Status
              <select name="status" defaultValue={query.status ?? ""}>
                <option value="">Alla</option>
                {["backlog", "todo", "in_progress", "review", "done"].map(
                  (status) => (
                    <option key={status}>{status}</option>
                  ),
                )}
              </select>
            </label>
            <label className="field">
              Klart senast
              <input
                type="date"
                name="forfall"
                defaultValue={query.forfall ?? ""}
              />
            </label>
            <button>Filtrera</button>
          </form>
          {selectedTask && (
            <>
              <TaskForm
                action={saveTaskAction}
                projectId={selected.id}
                task={selectedTask}
                profiles={people}
              />
              <section>
                <h3>Aktivitetslogg</h3>
                <ul>
                  {activity?.map((entry, index) => (
                    <li key={`${entry.occurred_at}-${index}`}>
                      {entry.action} · {entry.occurred_at}
                    </li>
                  ))}
                </ul>
                <h3>Kommentarer</h3>
                <ul>
                  {taskComments?.map((comment, index) => (
                    <li key={`${comment.created_at}-${index}`}>
                      {comment.body} · {comment.created_at}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
          <TaskBoard
            tasks={filtered}
            names={names}
            onMove={moveTaskAction}
            onComment={commentTaskAction}
          />
        </>
      )}
    </>
  );
}
