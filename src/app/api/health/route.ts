// Health check — verifies the app can actually reach Supabase.
// GET /api/health → 200 when the database is reachable, 503 with a clear
// message when it's not (e.g. the Supabase project is paused or deleted).
import { NextResponse } from "next/server";
import { pingDatabase } from "@/lib/supabase";

export async function GET() {
  const db = await pingDatabase();

  if (!db.ok) {
    return NextResponse.json(
      {
        status: "error",
        database:
          db.reason === "unreachable"
            ? "Database unreachable — check NEXT_PUBLIC_SUPABASE_URL and that the Supabase project is active (not paused/deleted)."
            : "Database query failed.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ status: "ok", database: "reachable" });
}
