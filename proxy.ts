import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { platformConfig, platformEnabled } from "@/lib/platform/config";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!platformEnabled()) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return response;
  }

  const config = platformConfig();
  let response = NextResponse.next({ request });
  response.headers.set("x-pathname", pathname);

  const client = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        for (const item of items) request.cookies.set(item.name, item.value);
        response = NextResponse.next({ request });
        response.headers.set("x-pathname", pathname);
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
  matcher: ["/((?!_next|api|images|icons|fonts).*)"],
};
