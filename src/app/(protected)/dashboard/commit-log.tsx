"use client";

import useProject from "@/hooks/use-project";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

const CommitLog = () => {
  const { projectId, project } = useProject();
  const { data: commits } = api.project.getCommits.useQuery({ projectId });

  return (
    <>
      <ul className="space-y-6">
        {commits?.map((commit, commitIdx) => {
          return (
            <li key={commit.id} className="relative flex gap-x-4">
              <div
                className={cn(
                  commitIdx === commits.length - 1 ? "h-6" : "-bottom-6",
                  "absolute top-0 left-0 flex w-6 justify-center",
                )}
              >
                <div className="w-px translate-x-1 bg-gray-200"></div>
              </div>

              <>
                <img
                  src={commit.commitAuthorAvatar}
                  alt="commit avatar"
                  className="relative mt-4 size-8 flex-none rounded-full bg-gray-50"
                />
                <div className="flex-auto rounded-md bg-white p-3 ring-1 ring-gray-200 ring-inset">
                  <div className="flex justify-between gap-x-4">
                    <Link
                      target="_blank"
                      href={`${project?.githubUrl}/commits/${commit.commitHash}`}
                      className="py-0.5 text-xs leading-5 text-gray-500"
                    >
                      <span className="font-medium text-gray-900">
                        {commit.commitAuthorName}
                      </span>{" "}
                      <span className="inline-flex items-center">
                        committed
                        <ExternalLink className="ml-1 size-4" />
                      </span>
                    </Link>
                  </div>
                  <span className="font-semibold">{commit.commitMessage}</span>

                  <div className="prose prose-sm mt-2 max-w-none text-gray-600">
                    <ReactMarkdown
                      components={{
                        // Style the bullet points
                        ul: ({ children }) => (
                          <ul className="my-2 list-disc space-y-1 pl-5">
                            {children}
                          </ul>
                        ),
                        li: ({ children }) => (
                          <li className="text-sm leading-6">{children}</li>
                        ),
                        // Style code blocks (inline)
                        code: ({ children, className }) => {
                          const isInline = !className;
                          return isInline ? (
                            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
                              {children}
                            </code>
                          ) : (
                            <code className={className}>{children}</code>
                          );
                        },
                        // Style paragraphs
                        p: ({ children }) => (
                          <p className="my-1 text-sm leading-6">{children}</p>
                        ),
                        // Style strong/bold text
                        strong: ({ children }) => (
                          <strong className="font-semibold text-gray-900">
                            {children}
                          </strong>
                        ),
                      }}
                    >
                      {commit.summary}
                    </ReactMarkdown>
                  </div>
                </div>
              </>
            </li>
          );
        })}
      </ul>
    </>
  );
};

export default CommitLog;
