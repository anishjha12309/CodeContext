// tRPC router for all project operations — CRUD, Q&A, commits, meetings, and billing.
// All procedures run as admin Supabase but scope reads/writes to ctx.userId.
import { z } from "zod";
import { after } from "next/server";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { pollCommits } from "@/lib/github";
import { indexGithubRepo } from "@/lib/github-loader";
import type { SupabaseClient } from "@supabase/supabase-js";

const CREDITS_PROJECT = 50;

async function assertProjectMember(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
) {
  const { data } = await supabase
    .from("user_to_projects")
    .select("id")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .single();
  if (!data) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this project" });
  }
}

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

      // Index code + poll commits in the background. `after()` keeps the
      // serverless function alive until this resolves (up to the route's
      // maxDuration). A bare `void promise` would be killed the instant the
      // response is sent on Vercel, leaving the repo stuck on "Indexing…".
      after(async () => {
        try {
          await Promise.all([
            indexGithubRepo(project.id, input.githubUrl, input.githubToken),
            pollCommits(project.id),
          ]);
        } catch (err) {
          console.error("Background indexing failed:", err);
        }
      });

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
      await assertProjectMember(ctx.supabase, ctx.userId, input.projectId);

      const { data } = await ctx.supabase
        .from("commits")
        .select("*")
        .eq("project_id", input.projectId)
        .order("commit_date", { ascending: false });

      // Deduplicate by hash in case concurrent pollCommits runs produced duplicates
      const seen = new Set<string>();
      return (data ?? []).filter((c) => {
        if (seen.has(c.commit_hash)) return false;
        seen.add(c.commit_hash);
        return true;
      });
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
      await assertProjectMember(ctx.supabase, ctx.userId, input.projectId);

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
      await assertProjectMember(ctx.supabase, ctx.userId, input.projectId);

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
      await assertProjectMember(ctx.supabase, ctx.userId, input.projectId);

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
      await assertProjectMember(ctx.supabase, ctx.userId, input.projectId);

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
      const { data: meeting } = await ctx.supabase
        .from("meetings")
        .select("*, issues(*)")
        .eq("id", input.meetingId)
        .single();

      if (!meeting) throw new TRPCError({ code: "NOT_FOUND" });
      await assertProjectMember(ctx.supabase, ctx.userId, meeting.project_id);

      return meeting;
    }),

  deleteMeeting: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data: meeting } = await ctx.supabase
        .from("meetings")
        .select("project_id")
        .eq("id", input.meetingId)
        .single();

      if (!meeting) throw new TRPCError({ code: "NOT_FOUND" });
      await assertProjectMember(ctx.supabase, ctx.userId, meeting.project_id);

      await ctx.supabase.from("meetings").delete().eq("id", input.meetingId);
    }),

  // ── Team ─────────────────────────────────────────────────────────
  getTeamMembers: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertProjectMember(ctx.supabase, ctx.userId, input.projectId);

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
      await assertProjectMember(ctx.supabase, ctx.userId, input.projectId);

      await ctx.supabase
        .from("projects")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", input.projectId);
    }),
});
