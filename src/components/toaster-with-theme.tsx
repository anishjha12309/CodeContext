"use client";

import { Toaster } from "sonner";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ToasterWithTheme() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <Toaster
      richColors
      theme={mounted ? (resolvedTheme as "dark" | "light") : "dark"}
      position="bottom-right"
    />
  );
}
