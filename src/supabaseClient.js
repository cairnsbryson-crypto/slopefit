import { createClient } from "@supabase/supabase-js";

// These come from Vercel's environment variables, never hardcoded here.
// Vite only exposes env vars to the frontend if they're prefixed with
// VITE_ - that's not optional, it's how Vite decides what's safe to
// bundle into the browser code versus what stays server-only.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase environment variables. Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Vercel's project settings."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
