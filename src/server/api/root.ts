import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { projectRouter } from "@/server/api/routers/project";

export const appRouter = createTRPCRouter({
  project: projectRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
