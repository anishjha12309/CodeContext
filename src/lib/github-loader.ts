import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { summariseCode } from "./gemini";
import { Document } from "@langchain/core/documents";
import { generateEmbedding } from "./gemini";
import { db } from "@/server/db";

function parseGithubUrl(githubUrl: string): { owner: string; repo: string } {
  const cleanUrl = githubUrl
    .trim()
    .replace(/\/$/, "")
    .replace(/\.git$/, "");

  const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);

  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid GitHub URL format: ${githubUrl}`);
  }

  return {
    owner: match[1],
    repo: match[2],
  };
}

async function verifyGithubRepo(owner: string, repo: string, token?: string) {
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers,
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}. ` +
          `Message: ${(errorData as any).message || "Unknown error"}`,
      );
    }

    const data = await response.json();
    return {
      exists: true,
      isPrivate: data.private,
      defaultBranch: data.default_branch,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to verify repository: ${String(error)}`);
  }
}

export const loadGithubRepo = async (
  githubUrl: string,
  githubToken?: string,
) => {
  console.log(`Loading GitHub repo: ${githubUrl}`);

  const { owner, repo } = parseGithubUrl(githubUrl);
  console.log(`Parsed: owner=${owner}, repo=${repo}`);

  const token = githubToken || process.env.GITHUB_TOKEN;

  if (!token) {
    console.warn("⚠️  No GitHub token provided. Private repos will fail.");
  }

  const repoInfo = await verifyGithubRepo(owner, repo, token);
  console.log(`Repository verified:`, repoInfo);

  if (repoInfo.isPrivate && !token) {
    throw new Error(
      "This is a private repository but no GitHub token was provided. " +
        "Please provide a valid GitHub token with repo access.",
    );
  }

  const branch = repoInfo.defaultBranch || "main";
  console.log(`Using branch: ${branch}`);

  try {
    const loader = new GithubRepoLoader(githubUrl, {
      accessToken: token || "",
      branch: branch,
      ignoreFiles: [
        // Lock files (keep these ignored)
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "bun.lockb",

        // Images (keep these ignored)
        "*.svg",
        "*.png",
        "*.jpg",
        "*.jpeg",
        "*.gif",
        "*.ico",
        "*.webp",
        "*.avif",

        // Fonts (keep these ignored)
        "*.woff",
        "*.woff2",
        "*.ttf",
        "*.eot",
        "*.otf",

        // Documents (keep these ignored)
        "*.pdf",

        // Build outputs and dependencies (keep these ignored)
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.next/**",
        "**/.turbo/**",
        "**/out/**",
        "**/.output/**",
        "**/coverage/**",
        "**/.nuxt/**",

        // Git and IDE (keep these ignored)
        ".git/**",
        ".gitignore",
        ".vscode/**",
        ".idea/**",

        // Other binary/media files (keep these ignored)
        "*.mp4",
        "*.mp3",
        "*.mov",
        "*.avi",
        "*.zip",
        "*.tar",
        "*.gz",
        "*.rar",

        // Minified files (keep these ignored)
        "*.min.js",
        "*.min.css",
        "*.bundle.js",
      ],
      recursive: true,
      unknown: "warn",
      maxConcurrency: 5,
    });

    console.log(`Starting to load documents...`);
    const docs = await loader.load();
    console.log(`✓ Loaded ${docs.length} documents`);

    if (docs.length === 0) {
      console.warn(
        "⚠️  No documents loaded. Repository might be empty or all files are ignored.",
      );
    }

    return docs;
  } catch (error) {
    console.error("Error loading GitHub repo:", error);

    if (error instanceof Error) {
      if (error.message.includes("404")) {
        throw new Error(
          `Repository not found or branch "${branch}" doesn't exist. ` +
            `Please check the URL and ensure the repository is accessible.`,
        );
      } else if (error.message.includes("401")) {
        throw new Error(
          "Authentication failed. Please provide a valid GitHub token with repo access.",
        );
      } else if (error.message.includes("403")) {
        throw new Error(
          "Access forbidden. This could be due to rate limiting or insufficient permissions. " +
            "Ensure your GitHub token has the necessary scopes (repo for private repos).",
        );
      }
    }

    throw error;
  }
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
        error?.message?.includes("429") || error?.message?.includes("quota");
      const isLastAttempt = attempt === maxRetries;

      if (is429) {
        const retryMatch = error?.message?.match(/retry in ([\d.]+)s/);
        const retryDelay = retryMatch
          ? parseFloat(retryMatch[1]) * 1000
          : 60000;

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

const shouldProcessFile = (doc: Document): boolean => {
  const source = doc.metadata.source?.toLowerCase() || "";

  const skipPatterns = [
    /\.env$/,
    /\.env\./,

    /node_modules\//,
    /\.min\./,
    /\.bundle\./,
    /package-lock/,
    /yarn\.lock/,
    /pnpm-lock/,
    /bun\.lock/,

    /\.generated\./,
    /prisma\/client/,
    /@prisma\/client/,

    /\.wasm$/,
    /\.dll$/,
    /\.node$/,
    /\.dylib$/,
    /\.so$/,
    /\.exe$/,
    /\.bin$/,
  ];

  if (skipPatterns.some((pattern) => pattern.test(source))) {
    console.log(`⏭️  Skipping: ${source}`);
    return false;
  }

  return true;
};

const generateEmbeddings = async (docs: Document[]) => {
  const filteredDocs = docs.filter(shouldProcessFile);
  console.log(
    `📝 Filtered: ${filteredDocs.length}/${docs.length} files will be processed`,
  );

  if (filteredDocs.length === 0) {
    console.log("⚠️  No files to process after filtering");
    return [];
  }

  const BATCH_SIZE = 5;
  const DELAY_BETWEEN_BATCHES = 4000;
  const embeddings = [];

  console.log(
    `Processing ${filteredDocs.length} documents in batches of ${BATCH_SIZE}`,
  );
  console.log(
    `⚠️  Note: Using 12s delay between batches to respect Gemini free tier (15 req/min)`,
  );

  for (let i = 0; i < filteredDocs.length; i += BATCH_SIZE) {
    const batch = filteredDocs.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(filteredDocs.length / BATCH_SIZE);

    console.log(
      `\n📦 Processing batch ${batchNumber}/${totalBatches} (files ${i + 1}-${Math.min(i + BATCH_SIZE, filteredDocs.length)})`,
    );

    const batchPromises = batch.map(async (doc, idx) => {
      const globalIdx = i + idx;
      const fileName = doc?.metadata.source || "unknown";

      console.log(
        `  [${globalIdx + 1}/${filteredDocs.length}] Starting: ${fileName}`,
      );

      const summary = await withRetry(
        () => summariseCode(doc!),
        3,
        `Summary for ${fileName}`,
      );

      if (!summary || summary.trim().length === 0) {
        console.warn(`  ⚠️  Empty/failed summary for ${fileName}, skipping`);
        return null;
      }

      const embedding = await withRetry(
        () => generateEmbedding(summary),
        3,
        `Embedding for ${fileName}`,
      );

      if (!embedding) {
        console.warn(
          `  ⚠️  Failed to generate embedding for ${fileName}, skipping`,
        );
        return null;
      }

      console.log(`  ✓ Completed: ${fileName}`);

      return {
        summary,
        embedding,
        sourceCode: JSON.parse(JSON.stringify(doc?.pageContent)),
        fileName,
      };
    });

    const batchResults = await Promise.all(batchPromises);
    const validResults = batchResults.filter((result) => result !== null);
    embeddings.push(...validResults);

    console.log(
      `✓ Batch ${batchNumber} complete: ${validResults.length}/${batch.length} succeeded`,
    );

    if (i + BATCH_SIZE < filteredDocs.length) {
      const remainingBatches = totalBatches - batchNumber;
      const estimatedTimeMin = Math.ceil(
        (remainingBatches * DELAY_BETWEEN_BATCHES) / 60000,
      );
      console.log(
        `⏳ Waiting 12s before next batch... (Est. ${estimatedTimeMin} min remaining)`,
      );
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }

  return embeddings;
};

export const indexGithubRepo = async (
  projectId: string,
  githubUrl: string,
  githubToken?: string,
) => {
  console.log(`\n🔄 Starting indexing for project ${projectId}`);
  console.log(`Repository: ${githubUrl}`);

  try {
    const docs = await loadGithubRepo(githubUrl, githubToken);

    if (docs.length === 0) {
      console.log("⚠️  No documents to index");
      return { indexed: 0, failed: 0 };
    }

    console.log(`\n📊 Generating embeddings for ${docs.length} files...`);
    const estimatedTimeMin = Math.ceil(((docs.length / 3) * 12) / 60);
    console.log(
      `⏱️  Estimated time: ~${estimatedTimeMin} minutes (due to rate limits)`,
    );

    const allEmbeddings = await generateEmbeddings(docs);

    if (allEmbeddings.length === 0) {
      console.log("⚠️  No embeddings generated");
      return { indexed: 0, failed: 0 };
    }

    console.log(
      `\n💾 Saving ${allEmbeddings.length} embeddings to database...`,
    );

    console.log("Creating database records...");
    await db.sourceCodeEmbedding.createMany({
      data: allEmbeddings.map((embedding) => ({
        summary: embedding.summary,
        sourceCode: embedding.sourceCode,
        fileName: embedding.fileName,
        projectId,
      })),
      skipDuplicates: true,
    });

    console.log("Fetching created records...");
    const records = await db.sourceCodeEmbedding.findMany({
      where: {
        projectId,
        fileName: { in: allEmbeddings.map((e) => e.fileName) },
      },
      select: {
        id: true,
        fileName: true,
      },
    });

    console.log(`Updating ${records.length} vector embeddings...`);
    let indexed = 0;
    let failed = 0;

    for (const record of records) {
      const embedding = allEmbeddings.find(
        (e) => e.fileName === record.fileName,
      );
      if (!embedding) {
        console.warn(`⚠️  No embedding found for ${record.fileName}`);
        failed++;
        continue;
      }

      try {
        await db.$executeRaw`
          UPDATE "SourceCodeEmbedding"
          SET "summaryEmbedding" = ${embedding.embedding}::vector
          WHERE "id" = ${record.id}
        `;
        indexed++;

        if (indexed % 10 === 0) {
          console.log(`  Updated ${indexed}/${records.length} embeddings...`);
        }
      } catch (error) {
        failed++;
        console.error(
          `✗ Failed to update embedding for ${record.fileName}:`,
          error,
        );
      }
    }

    console.log(
      `\n✅ Indexing complete: ${indexed} succeeded, ${failed} failed`,
    );
    return { indexed, failed };
  } catch (error) {
    console.error("\n❌ Indexing failed:", error);
    throw error;
  }
};
