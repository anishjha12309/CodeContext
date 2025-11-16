"use server";

import { streamText } from "ai";
import { createStreamableValue } from "@ai-sdk/rsc";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateEmbedding } from "@/lib/gemini";
import { db } from "@/server/db";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function askQuestion(question: string, projectId: string) {
  const stream = createStreamableValue();

  const queryVector = await generateEmbedding(question);
  const vectorQuery = `[${queryVector.join(",")}]`;
  const result = (await db.$queryRaw`
  SELECT "fileName", "sourceCode", "summary",
  1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) AS similarity
  FROM "SourceCodeEmbedding"
  WHERE 1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) > .5
  AND "projectId" = ${projectId}
  ORDER BY "similarity" DESC
      LIMIT 10
    `) as { fileName: string; sourceCode: string; summary: string }[];
  let context = "";
  for (const doc of result) {
    context += `source: ${doc.fileName}\ncode content: ${doc.sourceCode}\n summary of file: ${doc.summary}\n\n`;
  }

  (async () => {
    const { textStream } = await streamText({
      model: google("gemini-2.5-flash"),
      prompt: `
You are an AI code assistant specializing in codebase analysis. You help developers understand their code by answering questions based on the provided codebase context.

PERSONALITY & TONE:
- Professional yet approachable, like a senior developer mentor
- Clear, concise, and technically accurate
- Patient and thorough in explanations
- Encouraging and constructive

CORE CAPABILITIES:
- Analyze code structure, patterns, and relationships
- Explain functionality with step-by-step breakdowns when needed
- Identify potential issues, bugs, or improvements
- Provide context-aware answers based on the specific codebase
- Reference specific files and code sections when explaining

RESPONSE GUIDELINES:
- Always ground answers in the provided context
- When explaining code, break down complex logic into understandable steps
- Use code examples from the context to illustrate points
- If the context doesn't contain relevant information, clearly state this
- Provide actionable insights when appropriate
- Format code references clearly with file names

START CONTEXT BLOCK
${context}
END OF CONTEXT BLOCK

START QUESTION
${question}
END OF QUESTION

Based on the provided codebase context, answer the question thoroughly. If the context contains relevant code, reference specific files and explain the implementation details. If the context is insufficient, acknowledge this and explain what information would be needed.
      `,
    });

    for await (const delta of textStream) {
      stream.update(delta);
    }

    stream.done();
  })();

  return { output: stream.value, filesReferences: result };
}
