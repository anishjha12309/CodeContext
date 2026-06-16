// Walks a GitHub repo tree, summarises each file via Cerebras, generates embeddings
// via Gemini, and stores everything in Supabase for semantic search.
import { Octokit } from "octokit";
import { batchSummariseCode } from "./cerebras";
import { generateEmbedding } from "./gemini";
import { createAdminSupabase } from "./supabase";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const MAX_FILES = 50;
const CONTENT_MIN = 50;
const CONTENT_MAX = 50_000;

const SKIP_PATTERNS = [
  /\.env/,
  /package-lock\.json/,
  /yarn\.lock/,
  /pnpm-lock/,
  /bun\.lock/,
  /node_modules\//,
  /\.next\//,
  /dist\//,
  /build\//,
  /coverage\//,
  /generated\//,
  /\.min\./,
  /\.d\.ts$/,
  /\.map$/,
  /\.snap$/,
  /\.(png|jpg|jpeg|gif|svg|ico|webp|avif|bmp)$/,
  /\.(woff2?|ttf|eot|otf)$/,
  /\.(mp[34]|wav|ogg|mov|avi|webm|flac)$/,
  /\.(zip|tar|gz|rar|7z)$/,
  /\.(pdf|docx?|xlsx?)$/,
  /\.(css|scss|sass|less)$/,
  /readme\.md$/i,
  /changelog\.md$/i,
  /license/i,
  /\.gitignore$/,
  /\.prettierrc/,
  /eslint\.config/,
  /tsconfig\.json$/,
  /next\.config/,
  /tailwind\.config/,
  /postcss\.config/,
  /\.(test|spec)\./,
  /__tests__\//,
  /\.github\//,
  /Dockerfile/,
];

function shouldSkip(path: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(path));
}

// strips null bytes and control chars that would corrupt the DB insert
function sanitize(str: string): string {
  return str.replace(/\0/g, "").replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

function parseGithubUrl(url: string): { owner: string; repo: string } {
  const clean = url.trim().replace(/\/$/, "").replace(/\.git$/, "");
  const match = clean.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match?.[1] || !match?.[2]) throw new Error(`Invalid GitHub URL: ${url}`);
  return { owner: match[1], repo: match[2] };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// backs off 5s then 10s on 429s before giving up
async function withRetry<T>(fn: () => Promise<T>, label = ""): Promise<T | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const is429 = err?.message?.includes("429") || err?.message?.includes("quota");
      if (is429 && attempt < 3) {
        await delay(attempt * 5000);
      } else {
        console.error(`✗ ${label}:`, err?.message ?? err);
        return null;
      }
    }
  }
  return null;
}

export async function indexGithubRepo(
  projectId: string,
  githubUrl: string,
  githubToken?: string,
) {
  const { owner, repo } = parseGithubUrl(githubUrl);
  const token = githubToken ?? process.env.GITHUB_TOKEN;
  const client = new Octokit({ auth: token });

  console.log(`\n🔄 Indexing ${owner}/${repo}`);

  // Get default branch
  const { data: repoData } = await client.rest.repos.get({ owner, repo });
  const branch = repoData.default_branch;

  // Get the full file tree
  const { data: ref } = await client.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });

  const { data: tree } = await client.rest.git.getTree({
    owner,
    repo,
    tree_sha: ref.object.sha,
    recursive: "1",
  });

  // Filter files
  const candidates = tree.tree.filter(
    (item) =>
      item.type === "blob" &&
      item.path &&
      !shouldSkip(item.path) &&
      (item.size ?? 0) >= CONTENT_MIN &&
      (item.size ?? 0) <= CONTENT_MAX,
  );

  const files = candidates.slice(0, MAX_FILES);
  console.log(`📝 ${files.length} files to process (${candidates.length} candidates)`);

  if (files.length === 0) return { indexed: 0, failed: 0 };

  // ── PHASE 1: Fetch file contents (batches of 10) ──────────────────
  console.log("\n📥 Phase 1: Fetching file contents…");
  type FileEntry = { path: string; content: string };
  const fetched: FileEntry[] = [];

  const FETCH_BATCH = 10;
  for (let i = 0; i < files.length; i += FETCH_BATCH) {
    const batch = files.slice(i, i + FETCH_BATCH);
    const results = await Promise.all(
      batch.map(async (file) => {
        try {
          const { data } = await client.rest.repos.getContent({
            owner,
            repo,
            path: file.path!,
            ref: branch,
          });
          if (Array.isArray(data) || !("content" in data)) return null;
          const text = Buffer.from(data.content, "base64").toString("utf-8");
          return { path: file.path!, content: text } satisfies FileEntry;
        } catch {
          return null;
        }
      }),
    );
    fetched.push(...results.filter((r): r is FileEntry => r !== null));
    if (i + FETCH_BATCH < files.length) await delay(500);
  }

  console.log(`✓ Fetched ${fetched.length} files`);

  // ── PHASE 2: Generate summaries via Cerebras (parallel, high TPM) ──
  console.log("\n🤖 Phase 2: Generating summaries via Cerebras…");

  // Cerebras free tier: 8K context, 60-100K TPM → process in parallel batches
  const SUMMARY_BATCH = 10;
  const summaries: Array<{ path: string; content: string; summary: string }> = [];

  for (let i = 0; i < fetched.length; i += SUMMARY_BATCH) {
    const batch = fetched.slice(i, i + SUMMARY_BATCH);
    const batchNum = Math.floor(i / SUMMARY_BATCH) + 1;
    const total = Math.ceil(fetched.length / SUMMARY_BATCH);
    console.log(`  Batch ${batchNum}/${total}: ${batch.length} files`);

    const results = await withRetry(
      () =>
        batchSummariseCode(
          batch.map((f) => ({ fileName: f.path, code: f.content })),
        ),
      `Summary batch ${batchNum}`,
    );

    if (results) {
      for (let j = 0; j < batch.length; j++) {
        const file = batch[j]!;
        summaries.push({
          path: file.path,
          content: file.content,
          summary: results[j] ?? "",
        });
      }
    }

    // Small delay to avoid bursting Cerebras
    if (i + SUMMARY_BATCH < fetched.length) await delay(1000);
  }

  console.log(`✓ ${summaries.length} summaries generated`);

  // ── PHASE 3: Generate embeddings via Gemini (batches of 25, 1500 RPM) ──
  console.log("\n🔢 Phase 3: Generating embeddings via Gemini…");

  const EMBED_BATCH = 25;
  const EMBED_DELAY = 1200;
  type EmbedEntry = {
    project_id: string;
    file_name: string;
    source_code: string;
    summary: string;
    embedding: number[];
  };
  const embeddings: EmbedEntry[] = [];

  for (let i = 0; i < summaries.length; i += EMBED_BATCH) {
    const batch = summaries.slice(i, i + EMBED_BATCH);
    const batchNum = Math.floor(i / EMBED_BATCH) + 1;
    const total = Math.ceil(summaries.length / EMBED_BATCH);
    console.log(`  Embedding batch ${batchNum}/${total}`);

    const results = await Promise.all(
      batch.map(async (item) => {
        const vec = await withRetry(
          () => generateEmbedding(item.summary || item.path),
          `Embedding ${item.path}`,
        );
        if (!vec) return null;
        return {
          project_id: projectId,
          file_name: sanitize(item.path),
          source_code: sanitize(item.content),
          summary: sanitize(item.summary),
          embedding: vec,
        } satisfies EmbedEntry;
      }),
    );

    embeddings.push(...results.filter((r): r is EmbedEntry => r !== null));
    if (i + EMBED_BATCH < summaries.length) await delay(EMBED_DELAY);
  }

  console.log(`✓ ${embeddings.length} embeddings generated`);

  // ── PHASE 4: Save to Supabase ─────────────────────────────────────
  console.log("\n💾 Phase 4: Saving to Supabase…");
  const supabase = createAdminSupabase();

  let indexed = 0;
  let failed = 0;

  // Insert one row at a time. A single bulk insert ships every file's source in
  // one large POST, which Supabase's Cloudflare WAF can flag as malicious
  // (code often contains SQLi/XSS-like patterns) and block the whole batch.
  // Per-row inserts keep payloads small and isolate any file the WAF rejects.
  // Supabase's Cloudflare WAF returns an HTML block page (not a Postgres error)
  // when a row's source_code matches an attack signature (common in HTML/JS).
  const isWafBlock = (msg?: string) =>
    !!msg && (msg.includes("<!DOCTYPE html") || msg.toLowerCase().includes("cloudflare"));

  for (const { embedding, ...row } of embeddings) {
    let { data: inserted, error: insertErr } = await supabase
      .from("source_code_embeddings")
      .insert(row)
      .select("id")
      .single();

    // If the WAF blocked this file, retry with truncated source so the row
    // (and its searchable summary + embedding) still gets indexed.
    if ((insertErr || !inserted) && isWafBlock(insertErr?.message)) {
      console.warn(`⚠ WAF blocked ${row.file_name}; retrying with truncated source`);
      ({ data: inserted, error: insertErr } = await supabase
        .from("source_code_embeddings")
        .insert({ ...row, source_code: row.source_code.slice(0, 500) })
        .select("id")
        .single());
    }

    if (insertErr || !inserted) {
      failed++;
      console.error(`✗ Insert failed for ${row.file_name}:`, insertErr?.message?.slice(0, 200));
      continue;
    }

    const { error } = await supabase.rpc("set_embedding", {
      p_id: inserted.id,
      p_embedding: `[${embedding.join(",")}]`,
    });

    if (error) {
      failed++;
      console.error(`✗ Vector update failed for ${row.file_name}:`, error.message);
    } else {
      indexed++;
    }
  }

  console.log(`\n✅ Indexed ${indexed}, failed ${failed}`);
  return { indexed, failed };
}
