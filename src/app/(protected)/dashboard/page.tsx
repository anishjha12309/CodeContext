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
        <FolderOpen className="h-12 w-12 text-zinc-600" />
        <h2 className="text-xl font-semibold text-white">No project selected</h2>
        <p className="text-zinc-500">Select a project from the sidebar or create a new one.</p>
        <Link
          href="/create"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 transition-colors"
        >
          Create project
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          <a
            href={project.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center gap-1 text-sm text-zinc-500 hover:text-sky-400 transition-colors"
          >
            {project.github_url}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <InviteTeamCard projectId={project.id} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Q&A Card */}
        <AskQuestionCard projectId={project.id} />

        {/* Commit timeline */}
        <div className="glass rounded-2xl p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
            <GitCommit className="h-4 w-4 text-sky-400" />
            Recent Commits
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          ) : commits?.length === 0 ? (
            <p className="text-sm text-zinc-600">No commits yet — indexing in progress.</p>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {commits?.map((commit, i) => (
                <motion.div
                  key={commit.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass rounded-xl p-3.5"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={commit.commit_author_avatar} />
                      <AvatarFallback className="text-xs bg-sky-900 text-sky-200">
                        {commit.commit_author_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-white">
                          {commit.commit_author_name}
                        </span>
                        <Badge variant="outline" className="border-white/10 text-zinc-500 text-[10px]">
                          {commit.commit_hash.slice(0, 7)}
                        </Badge>
                        <span className="text-[10px] text-zinc-600 ml-auto">
                          {formatDistanceToNow(new Date(commit.commit_date), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400 line-clamp-1">
                        {commit.commit_message}
                      </p>
                      {commit.summary && (
                        <p className="mt-1.5 text-xs text-zinc-500 line-clamp-2">
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
    </div>
  );
}
