import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

// Allow background work scheduled via `after()` (e.g. repo indexing on
// createProject) to keep running after the response. Vercel clamps this to the
// deployment plan's max (e.g. 60s Hobby, up to 300s Pro).
export const maxDuration = 300;

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => console.error(`tRPC error on ${path ?? "<no-path>"}:`, error)
        : undefined,
  });

export { handler as GET, handler as POST };
