// Handles meeting audio uploads server-side using the admin Supabase client.
// Must be a server route (not a client upload) to bypass storage RLS.
import { auth } from "@clerk/nextjs/server";
import { createAdminSupabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const supabase = createAdminSupabase();
  const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;

  const { error } = await supabase.storage
    .from("meetings")
    .upload(uniqueName, file, { cacheControl: "3600", upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabase.storage.from("meetings").getPublicUrl(uniqueName);
  return NextResponse.json({ url: data.publicUrl });
}
