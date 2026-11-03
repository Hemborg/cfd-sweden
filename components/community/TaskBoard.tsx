import Link from "next/link";
import type { TaskStatus } from "@/lib/community";
import { taskColumns } from "@/lib/community";
import styles from "./TaskBoard.module.css";

export type BoardTask = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: string;
  position: number;
  due_at: string | null;
  assignee_id: string | null;
};
type Props = {
  tasks: BoardTask[];
  names: Map<string, string>;
  onMove?: (form: FormData) => Promise<void>;
  onComment: (form: FormData) => Promise<void>;
};

export function TaskBoard({ tasks, names, onMove, onComment }: Props) {
  return (
    <div className={styles.board} aria-label="Kanban-tavla">
      {taskColumns.map((column, index) => (
        <section
          className={styles.column}
          key={column.key}
          aria-labelledby={`column-${column.key}`}
        >
          <h2 id={`column-${column.key}`}>{column.label}</h2>
          {tasks
            .filter((task) => task.status === column.key)
            .sort((a, b) => a.position - b.position)
            .map((task) => (
              <article className={styles.card} key={task.id}>
                <h3>{task.title}</h3>
                {task.description && <p>{task.description}</p>}
                <p>
                  Prioritet: {task.priority}
                  {task.due_at &&
                    ` · klart ${new Date(task.due_at).toLocaleDateString("sv-SE")}`}
                  {task.assignee_id &&
                    ` · ${names.get(task.assignee_id) ?? "Tilldelad"}`}
                </p>
                {onMove && (
                  <>
                    <Link
                      className="text-link"
                      href={`/admin/projekt?project=${task.project_id}&task=${task.id}`}
                    >
                      Öppna uppgiftsdetaljer
                    </Link>
                    <form action={onMove}>
                      <input type="hidden" name="id" value={task.id} />
                      <input
                        type="hidden"
                        name="projectId"
                        value={task.project_id}
                      />
                      <input
                        type="hidden"
                        name="position"
                        value={task.position + 1}
                      />
                      <label>
                        Flytta till{" "}
                        <select name="status" defaultValue={task.status}>
                          {taskColumns.map((target) => (
                            <option key={target.key} value={target.key}>
                              {target.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button>Flytta</button>
                    </form>
                  </>
                )}
                <form action={onComment}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <label className="field">
                    Kommentar
                    <textarea name="body" maxLength={5000} required />
                  </label>
                  <button>Kommentera</button>
                </form>
              </article>
            ))}
          {index === 0 &&
            tasks.filter((task) => task.status === column.key).length === 0 && (
              <p>Inga uppgifter.</p>
            )}
        </section>
      ))}
    </div>
  );
}
