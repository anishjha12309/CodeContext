import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminSupabase } from "@/lib/supabase";

export default async function JoinProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId } = await params;
  const supabase = createAdminSupabase();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .is("deleted_at", null)
    .single();

  if (!project) redirect("/dashboard");

  // Add user to project (ignore conflict if already a member)
  await supabase
    .from("user_to_projects")
    .upsert(
      { user_id: userId, project_id: projectId },
      { onConflict: "user_id,project_id", ignoreDuplicates: true },
    );

  redirect("/dashboard");
}
