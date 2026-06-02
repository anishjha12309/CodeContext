"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderGit2, Loader2, GitBranch, KeyRound, Tag } from "lucide-react";
import { useRefetch } from "@/hooks/use-refetch";

const schema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  githubUrl: z
    .string()
    .url("Enter a valid URL")
    .refine((url) => url.includes("github.com"), { message: "Must be a GitHub URL" }),
  githubToken: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CreatePage() {
  const router = useRouter();
  const refetch = useRefetch();
  const { data: credits } = api.project.getMyCredits.useQuery();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const createProject = api.project.createProject.useMutation({
    onSuccess: async () => {
      toast.success("Project created! Indexing in progress…");
      await refetch();
      router.push("/dashboard");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const onSubmit = (data: FormValues) => {
    if ((credits ?? 0) < 50) {
      toast.error("You need 50 credits to create a project.");
      return;
    }
    createProject.mutate(data);
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="glass-app-strong w-full max-w-md rounded-2xl p-8">
        {/* Header */}
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500">
            <FolderGit2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white">New Project</h1>
            <p className="text-xs text-zinc-500">
              Costs 50 credits · you have {credits ?? 0}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Project name */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <Tag className="h-3.5 w-3.5" />
              Project name
            </label>
            <input
              {...register("name")}
              placeholder="My awesome project"
              className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none transition-colors focus:border-sky-500"
            />
            {errors.name && <p className="error-message">{errors.name.message}</p>}
          </div>

          {/* GitHub URL */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <GitBranch className="h-3.5 w-3.5" />
              GitHub URL
            </label>
            <input
              {...register("githubUrl")}
              placeholder="https://github.com/owner/repo"
              className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none transition-colors focus:border-sky-500"
            />
            {errors.githubUrl && <p className="error-message">{errors.githubUrl.message}</p>}
          </div>

          {/* GitHub token */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <KeyRound className="h-3.5 w-3.5" />
              GitHub token
              <span className="ml-1 font-normal text-zinc-400 dark:text-zinc-600">(optional, for private repos)</span>
            </label>
            <input
              {...register("githubToken")}
              type="password"
              placeholder="ghp_…"
              className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none transition-colors focus:border-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={createProject.isPending}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white transition-all hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createProject.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating project…
              </>
            ) : (
              "Create project"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
