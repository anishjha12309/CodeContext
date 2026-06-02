// Two clients: anon (browser, subject to RLS) and service role (server, bypasses RLS).
// Never use the admin client on the frontend — it has full DB access.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}
function getAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
}
function getServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY!;
}

// Lazy browser client singleton — used for file uploads on the client side
let _browserClient: SupabaseClient | null = null;
export function getBrowserSupabase() {
  if (!_browserClient) {
    _browserClient = createClient(getUrl(), getAnonKey());
  }
  return _browserClient;
}

// Server-side admin client — bypasses RLS, created fresh per call
export function createAdminSupabase() {
  return createClient(getUrl(), getServiceKey(), {
    auth: { persistSession: false },
  });
}

export async function uploadFile(
  file: File,
  setProgress?: (progress: number) => void,
): Promise<string> {
  const client = getBrowserSupabase();
  const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

  if (setProgress) setProgress(0);

  const { error } = await client.storage
    .from("meetings")
    .upload(uniqueName, file, { cacheControl: "3600", upsert: false });

  if (error) throw error;
  if (setProgress) setProgress(100);

  const { data } = client.storage.from("meetings").getPublicUrl(uniqueName);
  return data.publicUrl;
}
