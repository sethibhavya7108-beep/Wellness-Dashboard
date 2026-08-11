"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

let instance: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Browser Supabase client (anon key only).
 *
 * Created lazily so that server-side prerendering never evaluates environment
 * variables that are only present at runtime.
 */
export function createClient() {
  if (instance) return instance;
  const env = publicEnv();
  instance = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return instance;
}
