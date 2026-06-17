// Code summarisation using Cerebras (gpt-oss-120b).
//
// The binding constraint here is the Cerebras free-tier rate limit (per key):
//   • 5 requests / minute      • 30,000 tokens / minute
//   • 150 req/hour · 2,400 req/day · 1,000,000 tokens/day
//
// gpt-oss-120b itself has a 128K context window, so the 5 RPM ceiling — not the
// context size — is what hurts. Summarising ONE file per request (the old
// approach) means a 50-file repo fires 50 requests, blows past 5 RPM, and most
// requests 429. Those errors were swallowed, so files silently fell back to
// embedding just their path → weak search.
//
// Fix: summarise MANY files in a SINGLE request, and let the caller pace the
// requests to stay under 5 RPM / 30K TPM. See documentation.md for the design.
import { createCerebras } from "@ai-sdk/cerebras";
import { generateText } from "ai";

const cerebras = createCerebras({ apiKey: process.env.CEREBRAS_API_KEY! });
const CEREBRAS_MODEL = "gpt-oss-120b";

// Per-file source cap inside a batch. Bounds per-request tokens (so we fit the
// 30K TPM budget and pack several files per request) — big files are truncated,
// never dropped. Exported so the loader can size its batches consistently.
export const PER_FILE_CHARS = 8_000;

export type FileToSummarise = { fileName: string; code: string };

// Summarises a batch of files in a SINGLE Cerebras request. Returns one summary
// per input file, in the same order ("" if that file's summary can't be
// parsed). Throws on an API/rate-limit error so the caller can retry with
// backoff (we deliberately do NOT swallow errors here — that's what hid the old
// rate-limit failures).
export async function summariseFiles(files: FileToSummarise[]): Promise<string[]> {
  if (files.length === 0) return [];

  const body = files
    .map((f, i) => `<<<${i + 1}>>> ${f.fileName}\n${f.code.slice(0, PER_FILE_CHARS)}`)
    .join("\n\n");

  const prompt = `You are onboarding a junior developer onto a codebase.
Summarise the purpose of EACH file below in at most 60 words — concise and specific.

There are ${files.length} files, each introduced by a marker like "<<<N>>> path".
Respond with one summary per file, each on its own line, formatted EXACTLY as:
<<<1>>> summary of file 1
<<<2>>> summary of file 2
(continue for all ${files.length} files, in order). No preamble, no extra commentary.

${body}`;

  const { text } = await generateText({ model: cerebras(CEREBRAS_MODEL), prompt });

  // Delimiter parsing — far more forgiving than JSON, since summaries routinely
  // contain quotes/braces/backticks that would break JSON.parse.
  const summaries = new Array<string>(files.length).fill("");
  const re = /<<<\s*(\d+)\s*>>>\s*([\s\S]*?)(?=<<<\s*\d+\s*>>>|$)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const idx = Number(match[1]) - 1;
    if (idx >= 0 && idx < files.length) {
      // Drop a leading "path" echo if the model repeated it before the summary.
      summaries[idx] = match[2]!.trim();
    }
  }
  return summaries;
}
