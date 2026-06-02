// Vector embeddings for semantic search. gemini-embedding-001 outputs 3072 dimensions.
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// gemini-embedding-001 outputs 3072-dim by default (text-embedding-004 shut down Jan 2026)
const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
});

export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}
