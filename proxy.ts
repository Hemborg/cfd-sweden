import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { platformConfig, platformEnabled } from "@/lib/platform/config";

export async function proxy(request: NextRequest) {
  if (!platformEnabled()) return NextResponse.next();
  const config = platformConfig();
  let response = NextResponse.next({ request });
  const client = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        for (const item of items) request.cookies.set(item.name, item.value);
        response = NextResponse.next({ request });
        for (const item of items)
          response.cookies.set(item.name, item.value, item.options);
      },
    },
  });
  await client.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "same-origin");
  return response;
}
export const config = {
  matcher: [
    "/admin/:path*",
    "/medlem/:path*",
    "/konto/:path*",
    "/logga-in",
    "/auth/:path*",
  ],
};
