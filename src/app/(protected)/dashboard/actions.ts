"use server";
// Server action for the Q&A feature. Embeds the question, runs a pgvector similarity
// search against indexed source code, then streams the answer back via Groq.

import { streamText } from "ai";
import { createStreamableValue } from "@ai-sdk/rsc";
import { groq, GROQ_MODEL } from "@/lib/groq";
import { generateEmbedding } from "@/lib/gemini";
import { createAdminSupabase } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

const CREDITS_PER_QUESTION = 1;

export async function askQuestion(question: string, projectId: string) {
  const stream = createStreamableValue<string>();

  const { userId } = await auth();
  if (!userId) {
    stream.update("You must be logged in to ask questions.");
    stream.done();
    return { output: stream.value, filesReferences: [] };
  }

  const supabase = createAdminSupabase();

  const { data: user } = await supabase
    .from("users")
    .select("credits")
    .eq("id", userId)
    .single();

  if (!user || user.credits < CREDITS_PER_QUESTION) {
    stream.update(
      `Insufficient credits. You need ${CREDITS_PER_QUESTION} credit to ask a question. Please purchase more from the Billing page.`,
    );
    stream.done();
    return { output: stream.value, filesReferences: [] };
  }

  // Deduct credit atomically before processing
  await supabase.rpc("decrement_credits", {
    p_user_id: userId,
    p_amount: CREDITS_PER_QUESTION,
  });

  let queryVector: number[];
  try {
    queryVector = await generateEmbedding(question);
    if (!Array.isArray(queryVector) || queryVector.some((v) => typeof v !== "number" || isNaN(v))) {
      throw new Error("Invalid embedding returned");
    }
  } catch {
    stream.update("Failed to generate question embedding. Please try again.");
    stream.done();
    return { output: stream.value, filesReferences: [] };
  }

  // gemini-embedding-001 produces low absolute cosine scores — even strongly
  // relevant files land around 0.55-0.60 — so a 0.5 cutoff filters out valid
  // matches. Use a low threshold and let match_count cap to the top results.
  const { data: results } = await supabase.rpc("match_source_code", {
    query_embedding: queryVector,
    match_threshold: 0.3,
    match_count: 10,
    p_project_id: projectId,
  });

  const filesReferences = (results ?? []) as Array<{
    id: string;
    file_name: string;
    source_code: string;
    summary: string;
    similarity: number;
  }>;

  // No indexed code matched — answering would just produce a generic "no
  // context" reply while still spending a credit and Groq tokens. Refund the
  // credit and explain instead (most commonly: indexing hasn't finished, or an
  // un-indexed project is selected).
  if (filesReferences.length === 0) {
    await supabase.rpc("increment_credits", {
      p_user_id: userId,
      p_amount: CREDITS_PER_QUESTION,
    });
    stream.update(
      "I couldn't find any indexed code for this project yet. If you just created it, indexing may still be running (it can take a few minutes for large repos). Otherwise, make sure an indexed project is selected. Your credit was not charged.",
    );
    stream.done();
    return { output: stream.value, filesReferences: [] };
  }

  const context = filesReferences
    .map(
      (f) =>
        `Source: ${f.file_name}\nSummary: ${f.summary}\nCode:\n${f.source_code.slice(0, 2000)}`,
    )
    .join("\n\n---\n\n");

  (async () => {
    try {
      const result = streamText({
        model: groq(GROQ_MODEL),
        prompt: `You are an AI code assistant helping developers understand their codebase.
Answer questions based on the provided source code context.

GUIDELINES:
- Ground answers in the provided context
- Reference specific files when explaining
- Break down complex logic step by step
- If context is insufficient, say so clearly
- Be concise but thorough

CONTEXT:
${context}

QUESTION: ${question}

Provide a thorough, helpful answer:`,
      });

      for await (const delta of result.textStream) {
        stream.update(delta);
      }
      stream.done();
    } catch (err: any) {
      if (err?.message?.includes("429") || err?.message?.includes("quota")) {
        stream.update("Rate limit hit. Please wait a moment and try again.");
      } else {
        stream.update("An error occurred while processing your question. Please try again.");
      }
      stream.done();
    }
  })();

  return { output: stream.value, filesReferences };
}
