import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/platform/db";
import { platformConfig, platformEnabled } from "@/lib/platform/config";
export async function GET(request: Request) {
  if (!platformEnabled()) return new Response(null, { status: 404 });
  const query = new URL(request.url).searchParams;
  const code = query.get("code");
  const client = await createSessionClient();
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(
          query.get("next") === "/konto/losenord"
            ? "/konto/losenord"
            : "/medlem",
          platformConfig().siteUrl,
        ),
      );
  }
  return NextResponse.redirect(
    new URL("/logga-in?fel=lank", platformConfig().siteUrl),
  );
}
