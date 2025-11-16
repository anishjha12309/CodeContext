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

  const commitsToCreate = [];

  // Gemini free tier: 10 requests per minute
  // Process commits with 6 second delay between each (10 per minute)
  const DELAY_BETWEEN_COMMITS = 6000; // 6 seconds

  console.log(
    `⚠️  Processing commits with 6s delay to respect Gemini free tier (10 req/min)`,
  );
  const estimatedTimeMin = Math.ceil(
    (unprocessedCommits.length * DELAY_BETWEEN_COMMITS) / 60000,
  );
  console.log(`⏱️  Estimated time: ~${estimatedTimeMin} minutes`);

  for (let index = 0; index < unprocessedCommits.length; index++) {
    const commit = unprocessedCommits[index]!;
    console.log(
      `\n[${index + 1}/${unprocessedCommits.length}] Processing commit: ${commit.commitHash}`,
    );

    // Generate summary with retry logic
    const summary = await withRetry(
      () => summariseCommit(githubUrl, commit.commitHash),
      3,
      `Commit ${commit.commitHash}`,
    );

    if (summary) {
      console.log(`✓ Summary generated for ${commit.commitHash}`);
      commitsToCreate.push({
        projectId: projectId,
        commitHash: commit.commitHash,
        commitMessage: commit.commitMessage,
        commitAuthorName: commit.commitAuthorName,
        commitAuthorAvatar: commit.commitAuthorAvatar,
        commitDate: commit.commitDate,
        summary: summary,
      });
    } else {
      console.warn(`⚠️  Failed to generate summary for ${commit.commitHash}`);
      commitsToCreate.push({
        projectId: projectId,
        commitHash: commit.commitHash,
        commitMessage: commit.commitMessage,
        commitAuthorName: commit.commitAuthorName,
        commitAuthorAvatar: commit.commitAuthorAvatar,
        commitDate: commit.commitDate,
        summary: "Failed to generate summary after retries",
      });
    }

    // Add delay between commits (except for last one)
    if (index < unprocessedCommits.length - 1) {
      const remainingCommits = unprocessedCommits.length - index - 1;
      const remainingTimeMin = Math.ceil(
        (remainingCommits * DELAY_BETWEEN_COMMITS) / 60000,
      );
      console.log(
        `⏳ Waiting 6s before next commit... (${remainingCommits} remaining, ~${remainingTimeMin} min)`,
      );
      await delay(DELAY_BETWEEN_COMMITS);
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
