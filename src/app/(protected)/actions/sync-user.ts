"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { createAdminSupabase } from "@/lib/supabase";

export async function syncUser() {
  const { userId } = await auth();
  if (!userId) return;

  const user = await currentUser();
  if (!user) return;

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
}
