# Documentation — Cerebras batched code summarisation

_Last updated: 2026-06-17_

This document explains a change to how repository indexing generates code
summaries, why it was needed, and how it behaves now.

## TL;DR

Indexing used to call Cerebras **once per file** to summarise it. The Cerebras
free tier allows only **5 requests/minute**, so any repo with more than a few
files blew past the limit — and because the rate-limit errors were silently
swallowed, most files ended up with **empty summaries** and were embedded by
their **file path alone**, badly degrading Q&A search quality.

Now indexing **summarises many files in a single request** and **paces requests**
to stay within the free-tier limits. A repo's files are grouped into a handful
of requests instead of one-per-file.

## Background: how summaries feed search

During indexing ([`src/lib/github-loader.ts`](src/lib/github-loader.ts)):

1. Fetch up to 50 source files from the repo.
2. **Cerebras summarises each file** (≤60 words).
3. **Gemini embeds the _summary_** into a 3072-dim vector.
4. The vector + summary + source are stored in `source_code_embeddings`.

The embedding is computed from the **summary**, not the raw code
(`generateEmbedding(item.summary || item.path)`). So if a summary is missing,
the file is embedded by its path — which is nearly useless for matching
natural-language questions. Summaries are therefore load-bearing for retrieval.

## The problem: Cerebras free-tier rate limits

Measured from the live API (`x-ratelimit-*` response headers) for the project's
key:

| Limit | Value |
| --- | --- |
| Requests / minute | **5** |
| Requests / hour | 150 |
| Requests / day | 2,400 |
| Tokens / minute | 30,000 |
| Tokens / day | 1,000,000 |

The model (`gpt-oss-120b`) has a 128K context window, so **context size is not
the constraint — the 5 requests/minute ceiling is.**

### Why the old approach failed silently

- `batchSummariseCode` fired **one request per file**, ~10 in parallel per wave.
- With a 5 RPM ceiling, roughly the first 5 requests/minute succeeded; the rest
  got HTTP 429.
- `summariseCode` caught its own error and returned `""`, so the failure never
  propagated. Indexing logged `✅ Indexed N, failed 0` and looked healthy.
- Result: for a 50-file repo, only ~5 files got real summaries in the first
  minute; the rest were embedded by path. Search "worked" only because file
  paths (e.g. `src/app/server.py`) carry some meaning.

## The fix

### 1. Summarise many files per request

[`src/lib/cerebras.ts`](src/lib/cerebras.ts) now exposes:

```ts
summariseFiles(files: { fileName: string; code: string }[]): Promise<string[]>
```

- Sends **one** Cerebras request containing all files in the batch, each
  introduced by a `<<<N>>> path` marker.
- Asks the model to reply with one `<<<N>>> summary` line per file.
- Parses the response by **delimiter** (regex), not JSON — summaries routinely
  contain quotes/braces/backticks that would break `JSON.parse`.
- Returns one summary per input file, in order (`""` only if a specific file's
  line couldn't be parsed).
- **Throws on API/rate-limit errors** (no longer swallowed) so the caller can
  retry with backoff.

### 2. Pack files into size-bounded batches and pace requests

Phase 2 of [`src/lib/github-loader.ts`](src/lib/github-loader.ts) greedily packs
files into batches and spaces the requests out:

| Parameter | Value | Purpose |
| --- | --- | --- |
| `PER_FILE_CHARS` | 8,000 | Max source chars per file inside a batch (big files truncated, never dropped) |
| `BATCH_CHAR_BUDGET` | 18,000 | Max combined chars per request (≈4.5K input tokens — well under 30K TPM) |
| `MAX_FILES_PER_BATCH` | 10 | Keeps each request's output small enough to parse reliably |
| `REQUEST_INTERVAL_MS` | 13,000 | ~13s between requests → ≤5 requests/minute |

So a 50-file repo is summarised in roughly **6–11 requests** instead of 50, each
within the token budget, paced to respect 5 RPM.

### 3. Retry detection broadened

`withRetry` in the loader now treats `statusCode === 429` and messages matching
`429 | quota | rate limit | too many requests | queue_exceeded` as retryable, so
genuine Cerebras throttling backs off (5s, then 10s) instead of being treated as
a hard failure.

## Trade-offs & caveats

- **Per-file truncation.** Files are capped at 8,000 chars inside a batch
  (previously 20,000 for a single-file request). Very large files get a
  slightly shallower summary — an acceptable trade for fitting the token budget
  and summarising *every* file instead of ~10%.
- **Indexing takes longer (by design).** Pacing at ~13s/request means a 50-file
  repo spends ~1.5–2.5 minutes in the summary phase. This runs in the background
  via `after()`; the tRPC route's `maxDuration` is set to 300s
  ([`src/app/api/trpc/[trpc]/route.ts`](src/app/api/trpc/[trpc]/route.ts)).
- **Serverless plan limits still apply.** On Vercel Hobby (≤60s function
  duration) a large repo's indexing can still be cut off mid-way — the proper
  long-term fix is a dedicated background queue. Batching greatly reduces the
  request count but cannot beat the platform's max execution time.
- **A wrong/missing `CEREBRAS_API_KEY` now fails loudly** in logs instead of
  silently producing empty summaries.

## How to verify

- `bun scripts/check-batch-summary.ts` — confirms multiple files are summarised
  in a single request and parsed back correctly.
- `bun scripts/check-cerebras-limits.ts` — prints the current `x-ratelimit-*`
  headers (RPM/TPM/RPD/TPD) for your key.
- `bun scripts/check-apis.ts` — overall health check across GitHub, Groq,
  Gemini, and Cerebras.

## Files changed

- `src/lib/cerebras.ts` — replaced `summariseCode`/`batchSummariseCode` with
  `summariseFiles` (multi-file, single request, delimiter-parsed, throws on
  error). Exports `PER_FILE_CHARS`.
- `src/lib/github-loader.ts` — Phase 2 rewritten to pack files into
  size-bounded batches and pace requests under 5 RPM / 30K TPM; broadened
  retry detection.

## Tuning

If you upgrade the Cerebras tier (higher RPM/TPM), lower `REQUEST_INTERVAL_MS`
and/or raise `BATCH_CHAR_BUDGET` in `src/lib/github-loader.ts` to index faster.
If you see truncated summaries on large files, raise `PER_FILE_CHARS` in
`src/lib/cerebras.ts` (and keep `BATCH_CHAR_BUDGET` comfortably under your TPM).
