"use client";

import { api } from "@/trpc/react";
import { useProject } from "@/hooks/use-project";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, GitCommit, FolderOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useEffect } from "react";
import { AskQuestionCard } from "@/components/ask-question-card";
import { InviteTeamCard } from "@/components/invite-team-card";
import { cn } from "@/lib/utils";

function CommitSkeleton() {
  const bar = "animate-pulse rounded-full bg-black/8 dark:bg-white/8";
  return (
    <div className="glass-app rounded-2xl p-3.5">
      <div className="flex items-start gap-3">
        <div className={cn("h-8 w-8 shrink-0", bar)} />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className={cn("h-3 w-20", bar)} />
            <div className={cn("h-3 w-12", bar)} />
            <div className={cn("ml-auto h-3 w-16", bar)} />
          </div>
          <div className={cn("h-3 w-3/4", bar)} />
          <div className={cn("h-3 w-1/2", bar)} />
        </div>
      </div>
    </div>
  );
}

function IndexingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <div className="relative">
        <div className="glass-app-strong ios-specular flex h-16 w-16 items-center justify-center rounded-2xl">
          <GitCommit className="h-7 w-7 text-zinc-500 dark:text-white/50" />
        </div>
        <div className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm dark:bg-black border border-zinc-200 dark:border-white/10">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500 dark:text-white/60" />
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Indexing repository…</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-white/40">This can take a few minutes for large repos</p>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 dark:bg-white/50"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { project, projectId } = useProject();

  const { data: commits, isLoading } = api.project.getCommits.useQuery(
    { projectId },
    { enabled: !!project, refetchInterval: 10000 },
  );

  useEffect(() => {
    if (commits && commits.length > 0) {
      toast.dismiss("indexing");
    }
  }, [commits]);

  if (!project) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <div className="glass-app-strong ios-specular flex h-16 w-16 items-center justify-center rounded-2xl">
          <FolderOpen className="h-8 w-8 text-zinc-400 dark:text-white/40" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">No project selected</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-white/50">
            Select a project from the sidebar or create a new one.
          </p>
        </div>
        <Link
          href="/create"
          className="ios-btn-primary ios-pressable rounded-full px-6 py-2.5 text-sm font-semibold"
        >
          Create project
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{project.name}</h1>
          <a
            href={project.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-white/40 transition-colors hover:text-zinc-900 dark:hover:text-white"
          >
            <span className="max-w-xs truncate">{project.github_url}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>
        <InviteTeamCard projectId={project.id} />
      </div>

      {/* Ask question */}
      <AskQuestionCard projectId={project.id} />

      {/* Recent commits */}
      <div className="glass-app ios-specular rounded-3xl p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-zinc-900 dark:text-white">
          <GitCommit className="h-4 w-4 text-zinc-400 dark:text-white/40" />
          Recent Commits
          {isLoading && <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-zinc-400 dark:text-white/30" />}
        </h2>

        {isLoading ? (
          <div className="space-y-2.5">
            {[...Array(4)].map((_, i) => <CommitSkeleton key={i} />)}
          </div>
        ) : commits?.length === 0 ? (
          <IndexingState />
        ) : (
          <div className="max-h-[480px] space-y-2.5 overflow-y-auto pr-1">
            {commits?.map((commit, i) => (
              <motion.div
                key={commit.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-app ios-pressable rounded-2xl p-3.5"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 shrink-0 ring-1 ring-black/5 dark:ring-white/10">
                    <AvatarImage src={commit.commit_author_avatar} />
                    <AvatarFallback className="bg-zinc-200 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {commit.commit_author_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-white">
                        {commit.commit_author_name}
                      </span>
                      <Badge variant="outline" className="border-black/10 font-mono text-[10px] text-zinc-500 dark:border-white/10 dark:text-white/40">
                        {commit.commit_hash.slice(0, 7)}
                      </Badge>
                      <span className="ml-auto text-[10px] text-zinc-500 dark:text-white/25">
                        {formatDistanceToNow(new Date(commit.commit_date), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-zinc-600 dark:text-white/60">
                      {commit.commit_message}
                    </p>
                    {commit.summary && (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-white/40">
                        {commit.summary}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
