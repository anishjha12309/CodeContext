"use client";

import { type AppRouter } from "@/server/api/root";
import { getQueryClient } from "./query-client";
import {
  createTRPCClient,
  loggerLink,
  unstable_httpBatchStreamLink,
} from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";

export const api = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function TRPCReactProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  const trpcClient = createTRPCClient<AppRouter>({
    links: [
      loggerLink({
        enabled: (op) =>
          process.env.NODE_ENV === "development" ||
          (op.direction === "down" && op.result instanceof Error),
      }),
      unstable_httpBatchStreamLink({
        transformer: superjson,
        url: `${getBaseUrl()}/api/trpc`,
        headers() {
          const headers = new Headers();
          headers.set("x-trpc-source", "nextjs-react");
          return headers;
        },
      }),
    ],
  });

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </api.Provider>
    </QueryClientProvider>
  );
}
