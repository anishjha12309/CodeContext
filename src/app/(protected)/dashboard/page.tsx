"use client";

import { api } from "@/trpc/react";
import { useProject } from "@/hooks/use-project";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, GitCommit, FolderOpen } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { motion } from "motion/react";
import { AskQuestionCard } from "@/components/ask-question-card";
import { InviteTeamCard } from "@/components/invite-team-card";

export default function DashboardPage() {
  const { project, projectId } = useProject();

  const { data: commits, isLoading } = api.project.getCommits.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  if (!project) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <div className="glass-app flex h-16 w-16 items-center justify-center rounded-2xl">
          <FolderOpen className="h-8 w-8 text-sky-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            No project selected
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Select a project from the sidebar or create a new one.
          </p>
        </div>
        <Link
          href="/create"
          className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-500"
        >
          Create project
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {project.name}
          </h1>
          <a
            href={project.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-sky-600 dark:hover:text-sky-400"
          >
            <span className="max-w-xs truncate">{project.github_url}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>
        <InviteTeamCard projectId={project.id} />
      </div>

      {/* Ask question — full width, auto height */}
      <AskQuestionCard projectId={project.id} />

      {/* Recent commits — full width below */}
      <div className="glass-app rounded-2xl p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-zinc-900 dark:text-white">
          <GitCommit className="h-4 w-4 text-sky-500" />
          Recent Commits
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-black/5 dark:bg-white/5"
              />
            ))}
          </div>
        ) : commits?.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-600">
            No commits yet — indexing in progress.
          </p>
        ) : (
          <div className="max-h-[480px] space-y-2.5 overflow-y-auto pr-1">
            {commits?.map((commit, i) => (
              <motion.div
                key={commit.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-app rounded-xl p-3.5"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={commit.commit_author_avatar} />
                    <AvatarFallback className="bg-sky-900 text-xs text-sky-200">
                      {commit.commit_author_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-white">
                        {commit.commit_author_name}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-black/10 text-[10px] text-zinc-500 dark:border-white/10 dark:text-zinc-500"
                      >
                        {commit.commit_hash.slice(0, 7)}
                      </Badge>
                      <span className="ml-auto text-[10px] text-zinc-500 dark:text-zinc-600">
                        {formatDistanceToNow(new Date(commit.commit_date), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {commit.commit_message}
                    </p>
                    {commit.summary && (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
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
