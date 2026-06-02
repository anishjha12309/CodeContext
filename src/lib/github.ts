import { Octokit } from "octokit";
import { createAdminSupabase } from "./supabase";
import { summariseCommit } from "./groq";

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

type CommitData = {
  commitHash: string;
  commitMessage: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: string;
};

export async function getCommitHashes(githubUrl: string): Promise<CommitData[]> {
  const [owner, repo] = githubUrl.split("/").slice(-2);
  if (!owner || !repo) throw new Error("Invalid GitHub URL");

  const { data } = await octokit.rest.repos.listCommits({ owner, repo, per_page: 15 });

  return data
    .sort(
      (a, b) =>
        new Date(b.commit.author?.date ?? 0).getTime() -
        new Date(a.commit.author?.date ?? 0).getTime(),
    )
    .slice(0, 10)
    .map((c) => ({
      commitHash: c.sha,
      commitMessage: c.commit.message ?? "",
      commitAuthorName: c.commit.author?.name ?? "",
      commitAuthorAvatar: c.author?.avatar_url ?? "",
      commitDate: c.commit.author?.date ?? new Date().toISOString(),
    }));
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  label = "",
): Promise<T | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const is429 =
        err?.message?.includes("429") ||
        err?.message?.includes("quota") ||
        err?.message?.includes("Too Many Requests");
      if (is429 && attempt < retries) {
        const wait = (attempt === 1 ? 4 : 8) * 1000;
        console.log(`⏳ ${label}: rate limited, retrying in ${wait / 1000}s`);
        await delay(wait);
      } else {
        console.error(`✗ ${label}:`, err?.message ?? err);
        return null;
      }
    }
  }
  return null;
}

async function fetchDiff(githubUrl: string, commitHash: string): Promise<string | null> {
  try {
    const response = await fetch(`${githubUrl}/commit/${commitHash}.diff`, {
      headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function pollCommits(projectId: string) {
  const supabase = createAdminSupabase();

  const { data: project } = await supabase
    .from("projects")
    .select("github_url")
    .eq("id", projectId)
    .single();

  if (!project?.github_url) throw new Error("Project has no GitHub URL");

  const hashes = await getCommitHashes(project.github_url);

  const { data: existing } = await supabase
    .from("commits")
    .select("commit_hash")
    .eq("project_id", projectId);

  const existingHashes = new Set((existing ?? []).map((c) => c.commit_hash));
  const unprocessed = hashes.filter((h) => !existingHashes.has(h.commitHash));

  if (unprocessed.length === 0) return { count: 0 };
  console.log(`Processing ${unprocessed.length} new commits…`);

  const toInsert: Array<{
    project_id: string;
    commit_hash: string;
    commit_message: string;
    commit_author_name: string;
    commit_author_avatar: string;
    commit_date: string;
    summary: string;
  }> = [];

  // Process 2 at a time to stay under Groq 30 RPM
  const BATCH = 2;
  const BATCH_DELAY = 4200;

  for (let i = 0; i < unprocessed.length; i += BATCH) {
    const batch = unprocessed.slice(i, i + BATCH);

    const results = await Promise.all(
      batch.map(async (commit) => {
        const diff = await fetchDiff(project.github_url, commit.commitHash);
        if (!diff) return null;

        const summary = await withRetry(
          () => summariseCommit(diff),
          3,
          commit.commitHash.slice(0, 7),
        );

        return {
          project_id: projectId,
          commit_hash: commit.commitHash,
          commit_message: commit.commitMessage,
          commit_author_name: commit.commitAuthorName,
          commit_author_avatar: commit.commitAuthorAvatar,
          commit_date: commit.commitDate,
          summary: summary ?? "Summary generation failed",
        };
      }),
    );

    toInsert.push(...results.filter((r): r is NonNullable<typeof r> => r !== null));

    if (i + BATCH < unprocessed.length) await delay(BATCH_DELAY);
  }

  if (toInsert.length === 0) return { count: 0 };

  const { error } = await supabase.from("commits").insert(toInsert);
  if (error) throw error;

  console.log(`✅ Inserted ${toInsert.length} commits`);
  return { count: toInsert.length };
}
