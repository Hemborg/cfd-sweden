import Link from "next/link";
import { requireRoles } from "@/lib/platform/auth";
import { logout } from "@/app/logga-in/actions";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Administration | CfD Sweden",
  robots: { index: false, follow: false },
};
const links = [
  ["", "Översikt", "administrator,editor,group_leader,moderator"],
  ["arenden", "Kontaktärenden", "administrator"],
  ["nyhetsbrev", "Nyhetsbrev", "administrator"],
  ["nyheter", "Nyheter", "administrator,editor"],
  ["evenemang", "Evenemang", "administrator,editor"],
  ["grupper", "Arbetsgrupper", "administrator,group_leader"],
  ["kampanjer", "Kampanjer", "administrator,group_leader"],
  ["projekt", "Projekt och Kanban", "administrator,group_leader"],
  ["kommentarer", "Moderering", "moderator"],
  ["anvandare", "Användare", "administrator"],
  ["system", "System och drift", "administrator"],
];
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireRoles([
    "administrator",
    "editor",
    "group_leader",
    "moderator",
  ]);
  return (
    <div className="portal">
      <header className="portal-header">
        <Link href="/">CfD Sweden</Link>
        <Link href="/medlem">Medlemsportal</Link>
        <form action={logout}>
          <button>Logga ut</button>
        </form>
      </header>
      <div className="portal-layout">
        <nav aria-label="Administration">
          {links
            .filter(([, , allowed]) =>
              actor.roles.some(
                (role) =>
                  role === "superadmin" || allowed.split(",").includes(role),
              ),
            )
            .map(([path, label]) => (
              <Link key={path} href={`/admin${path ? `/${path}` : ""}`}>
                {label}
              </Link>
            ))}
        </nav>
        <main className="portal-content">{children}</main>
      </div>
    </div>
  );
}
