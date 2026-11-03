import { DemoForms } from "@/components/forms/DemoForms";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

export const metadata = { robots: { index: false, follow: false }, title: "Lokal formulärprototyp | CFD Sweden" };
export const dynamic = "force-dynamic";

export default async function FormExperimentPage() {
  const host = (await headers()).get("host") ?? "";
  let hostname = ""; try { hostname = new URL(`http://${host}`).hostname; } catch { /* 404 below */ }
  if (process.env.CFD_FORM_DEMO_ENABLED !== "true" || process.env.VERCEL || !["localhost", "127.0.0.1", "[::1]"].includes(hostname)) notFound();
  return <main className="demo-page">
    <p className="subpage-eyebrow">CFD Sweden · lokal demonstration</p>
    <h1>Formulärprototyp</h1>
    <p className="demo-intro">Prova intresseanmälan och frivilligt nyhetsbrev med påhittade uppgifter. Inget mejl skickas. Testuppgifterna försvinner vid omstart.</p>
    <DemoForms />
  </main>;
}
