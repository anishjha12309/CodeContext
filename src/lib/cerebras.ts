// Code summarisation using Cerebras (gpt-oss-120b). Fast and cheap, used for
// high-volume code summarization that feeds the embeddings/semantic search.
import { createCerebras } from "@ai-sdk/cerebras";
import { generateText } from "ai";

// gpt-oss-120b has a 128K context window (vs the old llama-4-scout's 8K cap),
// so we can pass much more of each file. Its light default reasoning returns a
// concise summary quickly; no reasoningEffort override (low effort showed
// erratic latency). Cap input to keep per-call token cost/latency bounded —
// the loader already filters files to <= 50K chars.
const cerebras = createCerebras({ apiKey: process.env.CEREBRAS_API_KEY! });
const CEREBRAS_MODEL = "gpt-oss-120b";
const MAX_CODE_CHARS = 20_000;

export async function summariseCode(
  fileName: string,
  code: string,
): Promise<string> {
  try {
    const { text } = await generateText({
      model: cerebras(CEREBRAS_MODEL),
      prompt: `You are onboarding a junior developer onto a codebase.
Explain the purpose of "${fileName}" in max 80 words. Be concise and specific.

Code:
${code.slice(0, MAX_CODE_CHARS)}`,
    });
    return text.trim();
  } catch (err) {
    // Stay resilient — one bad file shouldn't fail the batch — but log so a
    // systemic problem (bad key, model removed, quota) is visible in the logs
    // instead of silently producing empty summaries.
    console.error(`✗ Cerebras summary failed for ${fileName}:`, err instanceof Error ? err.message : err);
    return "";
  }
}

export async function batchSummariseCode(
  files: Array<{ fileName: string; code: string }>,
): Promise<string[]> {
  // Process individually so one large file can't blow a shared context window,
  // and fire them in parallel — Cerebras' high TPM handles the concurrency.
  const results = await Promise.all(
    files.map((f) => summariseCode(f.fileName, f.code)),
  );
  return results;
}
