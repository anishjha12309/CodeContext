"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RedirectToDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard");
    router.refresh();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900 dark:border-white"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Setting up your account...
        </p>
      </div>
    </div>
  );
}
