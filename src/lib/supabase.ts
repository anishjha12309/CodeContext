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

// Detects the "can't reach Supabase at all" class of failures (DNS NXDOMAIN,
// connection refused, timeouts) — e.g. when the project is paused/deleted.
// These surface from supabase-js as a fetch failure rather than a Postgres error.
export function isConnectionError(err: unknown): boolean {
  if (!err) return false;
  const parts: string[] = [];
  if (typeof err === "string") parts.push(err);
  if (err instanceof Error) parts.push(err.message);
  if (typeof err === "object") {
    const e = err as { message?: unknown; details?: unknown; cause?: unknown };
    if (typeof e.message === "string") parts.push(e.message);
    if (typeof e.details === "string") parts.push(e.details);
    if (e.cause) parts.push(String((e.cause as { message?: unknown })?.message ?? e.cause));
  }
  const haystack = parts.join(" ").toLowerCase();
  return (
    haystack.includes("fetch failed") ||
    haystack.includes("enotfound") ||
    haystack.includes("getaddrinfo") ||
    haystack.includes("econnrefused") ||
    haystack.includes("etimedout") ||
    haystack.includes("network")
  );
}

// Lightweight connectivity probe used by /api/health. Returns ok:false with a
// reason when the database is unreachable, so failures are obvious.
export async function pingDatabase(): Promise<{ ok: boolean; reason?: string }> {
  try {
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("users").select("id").limit(1);
    if (error) {
      if (isConnectionError(error)) return { ok: false, reason: "unreachable" };
      // A query error (e.g. missing table) still means the DB is reachable.
      return { ok: true };
    }
    return { ok: true };
  } catch (err) {
    if (isConnectionError(err)) return { ok: false, reason: "unreachable" };
    return { ok: false, reason: "error" };
  }
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
