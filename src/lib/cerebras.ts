import { createCerebras } from "@ai-sdk/cerebras";
import { generateText } from "ai";

// Cerebras: 60-100K TPM, 1M tokens/day free — used for high-volume code summarization
// Context cap on free tier: 8,192 tokens → truncate input to ~5,000 chars per file
const cerebras = createCerebras({ apiKey: process.env.CEREBRAS_API_KEY! });
const CEREBRAS_MODEL = "llama-4-scout-17b-16e-instruct";

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
${code.slice(0, 5000)}`,
    });
    return text.trim();
  } catch {
    return "";
  }
}

export async function batchSummariseCode(
  files: Array<{ fileName: string; code: string }>,
): Promise<string[]> {
  // Process individually — Cerebras free tier has 8K context cap,
  // so we can't batch many large files into one prompt.
  // But at 60-100K TPM we can fire these in parallel safely.
  const results = await Promise.all(
    files.map((f) => summariseCode(f.fileName, f.code)),
  );
  return results;
}
