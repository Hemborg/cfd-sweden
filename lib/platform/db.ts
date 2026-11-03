import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { platformConfig } from "./config";

export function createServiceClient() {
  if (typeof window !== "undefined") throw new Error("Serveråtkomst krävs.");
  const config = platformConfig();
  return createClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createSessionClient() {
  const config = platformConfig();
  const jar = await cookies();
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (items) => {
        try {
          for (const item of items)
            jar.set(item.name, item.value, item.options);
        } catch {
          /* Server Components refresh through proxy; actions can write. */
        }
      },
    },
  });
}

export function createPublicClient() {
  const config = platformConfig();
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
