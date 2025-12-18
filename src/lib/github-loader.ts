import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { summariseCode, batchSummariseCode } from "./gemini";
import { Document } from "@langchain/core/documents";
import { generateEmbedding } from "./gemini";
import { db } from "@/server/db";

// Sanitize strings to remove null bytes and control characters that PostgreSQL cannot handle
function sanitizeForPostgres(str: string | null | undefined): string {
  if (!str) return "";

  // Remove null bytes and control characters (except newline, tab, carriage return)
  return str
    .replace(/\0/g, "") // Remove null bytes (0x00)
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); // Remove other control chars
}

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

// Maximum files to process (to stay within API daily limits)
const MAX_FILES_TO_PROCESS = 50;

const shouldProcessFile = (doc: Document): boolean => {
  const source = doc.metadata.source?.toLowerCase() || "";
  const content = doc.pageContent || "";

  // Skip patterns - all the files we should NOT process
  const skipPatterns = [
    // Environment and secrets
    /\.env$/,
    /\.env\./,
    /\.env\.local/,
    /\.env\.example/,

    // Lock files
    /package-lock\.json/,
    /yarn\.lock/,
    /pnpm-lock\.yaml/,
    /bun\.lock/,
    /bun\.lockb/,
    /composer\.lock/,
    /Gemfile\.lock/,
    /poetry\.lock/,
    /Cargo\.lock/,

    // Dependencies and build
    /node_modules\//,
    /vendor\//,
    /\.next\//,
    /dist\//,
    /build\//,
    /out\//,
    /\.output\//,
    /coverage\//,
    /\.turbo\//,
    /\.nuxt\//,
    /\.cache\//,

    // Generated/minified
    /\.min\./,
    /\.bundle\./,
    /\.generated\./,
    /prisma\/client/,
    /@prisma\/client/,
    /generated\//,

    // Binary files
    /\.wasm$/,
    /\.dll$/,
    /\.node$/,
    /\.dylib$/,
    /\.so$/,
    /\.exe$/,
    /\.bin$/,
    /\.pyc$/,
    /\.pyo$/,
    /\.class$/,
    /\.o$/,
    /\.a$/,

    // Images
    /\.png$/,
    /\.jpg$/,
    /\.jpeg$/,
    /\.gif$/,
    /\.svg$/,
    /\.ico$/,
    /\.webp$/,
    /\.avif$/,
    /\.bmp$/,
    /\.tiff?$/,

    // Fonts
    /\.woff2?$/,
    /\.ttf$/,
    /\.eot$/,
    /\.otf$/,

    // Media
    /\.mp[34]$/,
    /\.wav$/,
    /\.ogg$/,
    /\.mov$/,
    /\.avi$/,
    /\.webm$/,

    // Archives
    /\.zip$/,
    /\.tar$/,
    /\.gz$/,
    /\.rar$/,
    /\.7z$/,

    // Documents
    /\.pdf$/,
    /\.doc[x]?$/,
    /\.xls[x]?$/,
    /\.ppt[x]?$/,

    // ===== NON-CODE FILES TO SKIP =====

    // CSS/Styling (not useful for code understanding)
    /\.css$/,
    /\.scss$/,
    /\.sass$/,
    /\.less$/,
    /\.styl$/,
    /tailwind\.config/,
    /postcss\.config/,
    /styles?\//,  // entire styles folders

    // README and docs
    /readme\.md$/,
    /readme\.txt$/,
    /changelog\.md$/,
    /history\.md$/,
    /contributing\.md$/,
    /code_of_conduct\.md$/,
    /license\.md$/,
    /license\.txt$/,
    /license$/,
    /authors$/,
    /contributors$/,
    /docs?\//,  // docs folders

    // Config files (low value for understanding code logic)
    /\.gitignore$/,
    /\.gitattributes$/,
    /\.editorconfig$/,
    /\.prettierrc/,
    /\.prettierignore/,
    /\.eslintrc/,
    /\.eslintignore/,
    /eslint\.config/,
    /prettier\.config/,
    /biome\.json$/,
    /\.stylelintrc/,
    /\.browserslistrc$/,
    /\.nvmrc$/,
    /\.node-version$/,
    /\.ruby-version$/,
    /\.python-version$/,
    /\.tool-versions$/,
    /tsconfig\.json$/,
    /jsconfig\.json$/,
    /next\.config/,
    /vite\.config/,
    /webpack\.config/,
    /rollup\.config/,
    /babel\.config/,
    /\.babelrc/,
    /jest\.config/,
    /vitest\.config/,
    /playwright\.config/,
    /cypress\.config/,
    /karma\.conf/,
    /\.huskyrc/,
    /\.lintstagedrc/,
    /commitlint\.config/,
    /renovate\.json$/,
    /dependabot\.yml$/,
    /\.github\//,  // GitHub workflows etc
    /\.circleci\//,
    /\.gitlab-ci/,
    /Dockerfile$/,
    /docker-compose/,
    /\.dockerignore$/,
    /Makefile$/,
    /Procfile$/,
    /netlify\.toml$/,
    /vercel\.json$/,

    // Test files (usually not needed for understanding main logic)
    /\.test\./,
    /\.spec\./,
    /_test\./,
    /_spec\./,
    /\.stories\./,
    /\.story\./,
    /__tests__\//,
    /__mocks__\//,
    /__fixtures__\//,
    /test\//,
    /tests\//,
    /spec\//,
    /specs\//,
    /e2e\//,
    /cypress\//,
    /playwright\//,

    // Type definitions (auto-generated, low value)
    /\.d\.ts$/,
    /@types\//,
    /types\.ts$/,  // pure type files

    // Declaration files
    /\.map$/,  // source maps
    /\.snap$/,  // jest snapshots
  ];

  if (skipPatterns.some((pattern) => pattern.test(source))) {
    console.log(`⏭️  Skipping (pattern): ${source}`);
    return false;
  }

  // Skip files that are too large (likely generated or data files)
  if (content.length > 50000) {
    console.log(`⏭️  Skipping (too large: ${Math.round(content.length / 1000)}KB): ${source}`);
    return false;
  }

  // Skip files that are too small (likely empty or trivial)
  if (content.length < 50) {
    console.log(`⏭️  Skipping (too small): ${source}`);
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

  // Check if repo is too large for free tier limits
  if (filteredDocs.length > MAX_FILES_TO_PROCESS) {
    const errorMessage = `Repository too large: ${filteredDocs.length} files to process exceeds the limit of ${MAX_FILES_TO_PROCESS} files. ` +
      `This is due to Gemini API free tier daily limits (20 requests/day). ` +
      `Consider using a smaller repository or upgrading to a paid API tier.`;
    console.error(`❌ ${errorMessage}`);
    throw new Error(errorMessage);
  }

  console.log(`✅ Repository size OK: ${filteredDocs.length}/${MAX_FILES_TO_PROCESS} files (within limits)`);

  // ============================================
  // PHASE 1: Generate all summaries (BATCHED - 10 files per API call)
  // ============================================
  const SUMMARY_BATCH_SIZE = 10; // 10 files per API call = 10x reduction in calls
  const GENERATION_DELAY = 4100; // 4.1s between batches to stay under 15 RPM
  
  const totalBatches = Math.ceil(filteredDocs.length / SUMMARY_BATCH_SIZE);
  const apiCalls = totalBatches;
  
  console.log(`\n📝 PHASE 1: Generating summaries for ${filteredDocs.length} files...`);
  console.log(`⚡ BATCHED: ${SUMMARY_BATCH_SIZE} files per API call = ${apiCalls} total API calls`);
  console.log(`⚠️  Rate limit: 15 RPM (one batch every 4 seconds)`);
  
  const estimatedSummaryTimeMin = Math.ceil((totalBatches * GENERATION_DELAY) / 60000);
  console.log(`⏱️  Estimated time for summaries: ~${estimatedSummaryTimeMin} minutes (${Math.round(filteredDocs.length / totalBatches)}x faster than sequential!)`);

  const summaries: Array<{ doc: Document; summary: string; fileName: string }> = [];

  for (let batchIdx = 0; batchIdx < filteredDocs.length; batchIdx += SUMMARY_BATCH_SIZE) {
    const batch = filteredDocs.slice(batchIdx, batchIdx + SUMMARY_BATCH_SIZE);
    const batchNum = Math.floor(batchIdx / SUMMARY_BATCH_SIZE) + 1;
    
    console.log(`\n  📦 Batch ${batchNum}/${totalBatches}: Processing ${batch.length} files`);
    batch.forEach((doc, i) => {
      console.log(`    ${i + 1}. ${doc.metadata.source || 'unknown'}`);
    });
    
    // Prepare files for batch call
    const filesToSummarize = batch.map(doc => ({
      fileName: doc.metadata.source || 'unknown',
      code: doc.pageContent,
    }));
    
    // Make single API call for entire batch
    const batchSummaries = await withRetry(
      () => batchSummariseCode(filesToSummarize),
      3,
      `Batch ${batchNum} (${batch.length} files)`,
    );
    
    if (batchSummaries && batchSummaries.length === batch.length) {
      // Match summaries back to documents
      for (let i = 0; i < batch.length; i++) {
        const doc = batch[i]!;
        const summary = batchSummaries[i];
        const fileName = doc.metadata.source || 'unknown';
        
        if (summary && summary.trim().length > 0) {
          summaries.push({ doc, summary, fileName });
        } else {
          console.warn(`    ⚠️  Empty summary for ${fileName}`);
        }
      }
      console.log(`  ✓ Batch ${batchNum} complete: ${batchSummaries.length} summaries`);
    } else {
      console.warn(`  ⚠️  Batch ${batchNum} failed, skipping ${batch.length} files`);
    }
    
    // Delay before next batch (except for last one)
    if (batchIdx + SUMMARY_BATCH_SIZE < filteredDocs.length) {
      const remainingBatches = totalBatches - batchNum;
      const remainingMin = Math.ceil((remainingBatches * GENERATION_DELAY) / 60000);
      console.log(`  ⏳ Next batch in 4s... (${remainingBatches} batches, ~${remainingMin}min left)`);
      await delay(GENERATION_DELAY);
    }
  }

  console.log(`\n✅ PHASE 1 complete: ${summaries.length}/${filteredDocs.length} summaries generated`);

  if (summaries.length === 0) {
    console.log("⚠️  No summaries generated");
    return [];
  }

  // ============================================
  // PHASE 2: Generate all embeddings (1500 RPM limit)
  // ============================================
  console.log(`\n🔢 PHASE 2: Generating embeddings for ${summaries.length} files...`);
  console.log(`⚡ Rate limit: 1500 RPM (batches of 25 per second)`);
  
  const EMBEDDING_BATCH_SIZE = 25;
  const EMBEDDING_BATCH_DELAY = 1100; // 1.1s between batches of 25 = ~1360 RPM (under 1500)
  const embeddings: Array<{
    summary: string;
    embedding: number[];
    sourceCode: string;
    fileName: string;
  }> = [];

  for (let i = 0; i < summaries.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = summaries.slice(i, i + EMBEDDING_BATCH_SIZE);
    const batchNum = Math.floor(i / EMBEDDING_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(summaries.length / EMBEDDING_BATCH_SIZE);
    
    console.log(`  📦 Embedding batch ${batchNum}/${totalBatches} (${batch.length} files)`);

    // Process batch in parallel
    const batchPromises = batch.map(async ({ doc, summary, fileName }) => {
      const embedding = await withRetry(
        () => generateEmbedding(summary),
        3,
        `Embedding for ${fileName}`,
      );

      if (!embedding) {
        console.warn(`  ⚠️  Failed embedding for ${fileName}`);
        return null;
      }

      return {
        summary,
        embedding,
        sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
        fileName,
      };
    });

    const batchResults = await Promise.all(batchPromises);
    const validResults = batchResults.filter((r): r is NonNullable<typeof r> => r !== null);
    embeddings.push(...validResults);

    console.log(`  ✓ Batch ${batchNum}: ${validResults.length}/${batch.length} succeeded`);

    // Small delay between batches
    if (i + EMBEDDING_BATCH_SIZE < summaries.length) {
      await delay(EMBEDDING_BATCH_DELAY);
    }
  }

  console.log(`\n✅ PHASE 2 complete: ${embeddings.length}/${summaries.length} embeddings generated`);
  
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

    const sanitizedEmbeddings = allEmbeddings.map((embedding) => ({
      summary: sanitizeForPostgres(embedding.summary),
      sourceCode: sanitizeForPostgres(embedding.sourceCode),
      fileName: sanitizeForPostgres(embedding.fileName),
      projectId,
    }));

    console.log("Creating database records...");

    try {
      await db.sourceCodeEmbedding.createMany({
        data: sanitizedEmbeddings,
        skipDuplicates: true,
      });
      console.log(
        `✓ Bulk insert successful: ${sanitizedEmbeddings.length} records`,
      );
    } catch (bulkError: any) {
      console.warn("⚠️  Bulk insert failed, attempting individual inserts...");
      console.error("Bulk error:", bulkError?.message || bulkError);

      let successCount = 0;
      let failCount = 0;

      for (const embedding of sanitizedEmbeddings) {
        try {
          await db.sourceCodeEmbedding.create({
            data: embedding,
          });
          successCount++;
        } catch (individualError: any) {
          failCount++;
          console.error(
            `✗ Failed to insert ${embedding.fileName}:`,
            individualError?.message || individualError,
          );
        }
      }

      console.log(
        `Individual inserts complete: ${successCount} succeeded, ${failCount} failed`,
      );

      if (successCount === 0) {
        throw new Error(
          "All individual inserts failed. Database operation aborted.",
        );
      }
    }

    console.log("Fetching created records...");
    const records = await db.sourceCodeEmbedding.findMany({
      where: {
        projectId,
        fileName: { in: sanitizedEmbeddings.map((e) => e.fileName) },
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
        (e) => sanitizeForPostgres(e.fileName) === record.fileName,
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
      } catch (error: any) {
        failed++;
        console.error(
          `✗ Failed to update embedding for ${record.fileName}:`,
          error?.message || error,
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
