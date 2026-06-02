// tRPC router for all project operations — CRUD, Q&A, commits, meetings, and billing.
// All procedures run as admin Supabase but scope reads/writes to ctx.userId.
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { pollCommits } from "@/lib/github";
import { indexGithubRepo } from "@/lib/github-loader";

const CREDITS_PROJECT = 50;

export const projectRouter = createTRPCRouter({
  // ── Credits ──────────────────────────────────────────────────────
  getMyCredits: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from("users")
      .select("credits")
      .eq("id", ctx.userId)
      .single();
    return data?.credits ?? 0;
  }),

  // ── Projects ─────────────────────────────────────────────────────
  createProject: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        githubUrl: z.string().url(),
        githubToken: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: user } = await ctx.supabase
        .from("users")
        .select("credits")
        .eq("id", ctx.userId)
        .single();

      if (!user || user.credits < CREDITS_PROJECT) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `You need ${CREDITS_PROJECT} credits to create a project (you have ${user?.credits ?? 0}).`,
        });
      }

      // Deduct credits first (atomic via DB function)
      await ctx.supabase.rpc("decrement_credits", {
        p_user_id: ctx.userId,
        p_amount: CREDITS_PROJECT,
      });

      // Create project
      const { data: project, error } = await ctx.supabase
        .from("projects")
        .insert({ name: input.name, github_url: input.githubUrl })
        .select()
        .single();

      if (error || !project) {
        // Refund credits if project creation failed
        await ctx.supabase.rpc("increment_credits", {
          p_user_id: ctx.userId,
          p_amount: CREDITS_PROJECT,
        });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error?.message });
      }

      // Add creator as member
      await ctx.supabase
        .from("user_to_projects")
        .insert({ user_id: ctx.userId, project_id: project.id });

      // Index and poll in parallel (fire-and-forget — long running)
      void Promise.all([
        indexGithubRepo(project.id, input.githubUrl, input.githubToken),
        pollCommits(project.id),
      ]).catch(console.error);

      return project;
    }),

  getProjects: protectedProcedure.query(async ({ ctx }) => {
    const { data: membership } = await ctx.supabase
      .from("user_to_projects")
      .select("project_id")
      .eq("user_id", ctx.userId);

    if (!membership?.length) return [];

    const ids = membership.map((m) => m.project_id);
    const { data } = await ctx.supabase
      .from("projects")
      .select("*")
      .in("id", ids)
      .is("deleted_at", null);

    return data ?? [];
  }),

  getCommits: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Poll for new commits async (don't await)
      void pollCommits(input.projectId).catch(console.error);

      const { data } = await ctx.supabase
        .from("commits")
        .select("*")
        .eq("project_id", input.projectId)
        .order("commit_date", { ascending: false });

      return data ?? [];
    }),

  // ── Q&A ──────────────────────────────────────────────────────────
  saveAnswer: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        question: z.string(),
        answer: z.string(),
        filesReferences: z.any(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("questions")
        .insert({
          project_id: input.projectId,
          user_id: ctx.userId,
          question: input.question,
          answer: input.answer,
          files_references: input.filesReferences,
        })
        .select()
        .single();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  getQuestions: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from("questions")
        .select("*, users(image_url, first_name, last_name)")
        .eq("project_id", input.projectId)
        .order("created_at", { ascending: false });

      return data ?? [];
    }),

  // ── Meetings ─────────────────────────────────────────────────────
  uploadMeeting: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        meetingUrl: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("meetings")
        .insert({
          project_id: input.projectId,
          meeting_url: input.meetingUrl,
          name: input.name,
          status: "PROCESSING",
        })
        .select()
        .single();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  getMeetings: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from("meetings")
        .select("*, issues(*)")
        .eq("project_id", input.projectId)
        .order("created_at", { ascending: false });

      return data ?? [];
    }),

  getMeetingById: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from("meetings")
        .select("*, issues(*)")
        .eq("id", input.meetingId)
        .single();

      return data;
    }),

  deleteMeeting: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase.from("meetings").delete().eq("id", input.meetingId);
    }),

  // ── Team ─────────────────────────────────────────────────────────
  getTeamMembers: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from("user_to_projects")
        .select("*, users(*)")
        .eq("project_id", input.projectId);

      return data ?? [];
    }),

  deleteQuestion: protectedProcedure
    .input(z.object({ questionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase
        .from("questions")
        .delete()
        .eq("id", input.questionId)
        .eq("user_id", ctx.userId);
    }),

  archiveProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase
        .from("projects")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", input.projectId);
    }),
});
