/** Confirms Groq fallback model availability + shows per-model daily headroom. */
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! });

async function probe(model: string) {
  try {
    const { text } = await generateText({ model: groq(model), prompt: "Reply with: ok" });
    console.log(`✅ ${model} -> "${text.trim().slice(0, 20)}"`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const m = /Limit (\d+), Used (\d+)/.exec(msg);
    if (/rate_limit|429|TPD|tokens per day/i.test(msg)) {
      console.log(`⛔ ${model} -> RATE LIMITED${m ? ` (used ${m[2]}/${m[1]} today)` : ""}`);
    } else {
      console.log(`❌ ${model} -> ${msg.slice(0, 100)}`);
    }
  }
}

async function main() {
  for (const m of ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-120b"]) {
    await probe(m);
  }
}
void main();
