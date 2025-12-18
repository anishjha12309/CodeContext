import { db } from "@/server/db";
import { Octokit } from "octokit";
import axios from "axios";
import { aiSummariseCommit } from "./gemini";

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

type Response = {
  commitHash: string;
  commitMessage: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: string;
};

export const getCommitHashes = async (
  githubUrl: string,
): Promise<Response[]> => {
  const [owner, repo] = githubUrl.split("/").slice(-2);
  if (!owner || !repo) {
    throw new Error("Invalid github url");
  }
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
  });

  const sortedCommits = data.sort(
    (a: any, b: any) =>
      new Date(b.commit.author.date).getTime() -
      new Date(a.commit.author.date).getTime(),
  ) as any[];

  return sortedCommits.slice(0, 10).map((commit: any) => ({
    commitHash: commit.sha as string,
    commitMessage: commit.commit?.message ?? "",
    commitAuthorName: commit.commit?.author?.name ?? "",
    commitAuthorAvatar: commit?.author?.avatar_url ?? "",
    commitDate: commit.commit?.author?.date ?? "",
  }));
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  context = "",
): Promise<T | null> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const is429 =
        error?.message?.includes("429") ||
        error?.message?.includes("quota") ||
        error?.message?.includes("Too Many Requests");
      const isLastAttempt = attempt === maxRetries;

      if (is429) {
        // Try to extract retry delay from error message
        const retryMatch = error?.message?.match(/retry in ([\d.]+)s/);
        const retryDelay = retryMatch
          ? parseFloat(retryMatch[1]) * 1000
          : 60000; // Default to 60 seconds

        if (isLastAttempt) {
          console.error(`❌ ${context}: Failed after ${maxRetries} attempts`);
          return null;
        }

        console.log(
          `⏳ ${context}: Rate limited. Waiting ${Math.ceil(retryDelay / 1000)}s (attempt ${attempt}/${maxRetries})...`,
        );
        await delay(retryDelay);
      } else {
        console.error(`✗ ${context}: ${error?.message || error}`);
        return null;
      }
    }
  }
  return null;
};

export const pollCommits = async (projectId: string) => {
  const { project, githubUrl } = await fetchProjectGithubUrl(projectId);
  const commitHashes = await getCommitHashes(githubUrl);
  const unprocessedCommits = await filterUnprocessedCommits(
    projectId,
    commitHashes,
  );

  console.log(`Found ${unprocessedCommits.length} unprocessed commits`);

  if (unprocessedCommits.length === 0) {
    console.log("No commits to process");
    return { count: 0 };
  }

  const commitsToCreate: Array<{
    projectId: string;
    commitHash: string;
    commitMessage: string;
    commitAuthorName: string;
    commitAuthorAvatar: string;
    commitDate: string;
    summary: string;
  }> = [];

  // Process 2 commits in parallel (safe at 15 RPM = 7.5 RPM effective rate)
  const PARALLEL_COMMITS = 2;
  const DELAY_BETWEEN_BATCHES = 4100; // 4.1s to stay under 15 RPM

  console.log(
    `⚡ Processing commits in parallel (${PARALLEL_COMMITS} at a time, 4s between batches)`,
  );
  const estimatedTimeMin = Math.ceil(
    (Math.ceil(unprocessedCommits.length / PARALLEL_COMMITS) * DELAY_BETWEEN_BATCHES) / 60000,
  );
  console.log(`⏱️  Estimated time: ~${estimatedTimeMin} minutes`);

  for (let i = 0; i < unprocessedCommits.length; i += PARALLEL_COMMITS) {
    const batch = unprocessedCommits.slice(i, i + PARALLEL_COMMITS);
    const batchNum = Math.floor(i / PARALLEL_COMMITS) + 1;
    const totalBatches = Math.ceil(unprocessedCommits.length / PARALLEL_COMMITS);

    console.log(`\n📦 Batch ${batchNum}/${totalBatches}: Processing ${batch.length} commits`);

    // Process batch in parallel
    const batchPromises = batch.map(async (commit) => {
      console.log(`  → ${commit.commitHash.slice(0, 7)}: Generating summary...`);
      
      const summary = await withRetry(
        () => summariseCommit(githubUrl, commit.commitHash),
        3,
        `Commit ${commit.commitHash.slice(0, 7)}`,
      );

      if (summary) {
        console.log(`  ✓ ${commit.commitHash.slice(0, 7)}: Summary complete`);
        return {
          projectId: projectId,
          commitHash: commit.commitHash,
          commitMessage: commit.commitMessage,
          commitAuthorName: commit.commitAuthorName,
          commitAuthorAvatar: commit.commitAuthorAvatar,
          commitDate: commit.commitDate,
          summary: summary,
        };
      } else {
        console.warn(`  ⚠️  ${commit.commitHash.slice(0, 7)}: Failed, using fallback`);
        return {
          projectId: projectId,
          commitHash: commit.commitHash,
          commitMessage: commit.commitMessage,
          commitAuthorName: commit.commitAuthorName,
          commitAuthorAvatar: commit.commitAuthorAvatar,
          commitDate: commit.commitDate,
          summary: "Failed to generate summary after retries",
        };
      }
    });

    const results = await Promise.all(batchPromises);
    commitsToCreate.push(...results);

    // Delay before next batch (except for last one)
    if (i + PARALLEL_COMMITS < unprocessedCommits.length) {
      const remaining = Math.ceil((unprocessedCommits.length - i - PARALLEL_COMMITS) / PARALLEL_COMMITS);
      console.log(`  ⏳ Next batch in 4s... (${remaining} batches remaining)`);
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }

  if (commitsToCreate.length === 0) {
    console.log("No commits to create");
    return { count: 0 };
  }

  console.log(`\n💾 Saving ${commitsToCreate.length} commits to database...`);
  const commits = await db.commit.createMany({
    data: commitsToCreate,
  });

  console.log(`✅ Created ${commits.count} commit records`);
  return commits;
};

async function summariseCommit(githubUrl: string, commitHash: string) {
  try {
    // Fetch the diff
    const { data } = await axios.get(`${githubUrl}/commit/${commitHash}.diff`, {
      headers: {
        Accept: "application/vnd.github.v3.diff",
      },
      timeout: 10000, // 10 second timeout
    });

    if (!data || typeof data !== "string") {
      console.warn(`No diff data for commit ${commitHash}`);
      return "No changes detected in diff";
    }

    console.log(`  Diff size: ${data.length} characters`);

    // Call AI to summarize (this is where rate limiting happens)
    const summary = await aiSummariseCommit(data);

    if (!summary || summary.trim().length === 0) {
      console.warn(`Empty summary returned for commit ${commitHash}`);
      return "Summary generation returned empty result";
    }

    return summary.trim();
  } catch (error) {
    console.error(`Error in summariseCommit for ${commitHash}:`, error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch diff: ${error.message}`);
    }
    throw error;
  }
}

async function fetchProjectGithubUrl(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      githubUrl: true,
    },
  });

  if (!project?.githubUrl) {
    throw new Error("Project has no github url");
  }

  return { project, githubUrl: project.githubUrl };
}

async function filterUnprocessedCommits(
  projectId: string,
  commitHashes: Response[],
) {
  const processedCommits = await db.commit.findMany({
    where: { projectId },
  });

  const unprocessedCommits = commitHashes.filter(
    (commit) =>
      !processedCommits.some(
        (processedCommit) => processedCommit.commitHash === commit.commitHash,
      ),
  );

  return unprocessedCommits;
}
