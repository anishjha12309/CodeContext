import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminSupabase } from "@/lib/supabase";

export default async function SyncUserPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const supabase = createAdminSupabase();

  await supabase.from("users").upsert(
    {
      id: userId,
      image_url: user.imageUrl,
      first_name: user.firstName,
      last_name: user.lastName,
      email_address: user.emailAddresses[0]?.emailAddress ?? "",
    },
    { onConflict: "id" },
  );

  redirect("/dashboard");
}
