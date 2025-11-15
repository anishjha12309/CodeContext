import { db } from "@/server/db";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { RedirectToDashboard } from "@/components/ui/redirect-to-dashboard";

const SyncUser = async () => {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("User not found");
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const emailAddress = user.emailAddresses[0]?.emailAddress;
  if (!emailAddress) {
    return notFound();
  }

  await db.user.upsert({
    where: {
      id: userId,
    },
    update: {
      emailAddress: emailAddress,
      imageUrl: user.imageUrl,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
    },
    create: {
      id: userId,
      emailAddress: emailAddress,
      imageUrl: user.imageUrl,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
    },
  });

  return <RedirectToDashboard />;
};

export default SyncUser;
