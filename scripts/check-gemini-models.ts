/** Lists models the Gemini API key can access + which support embeddings. */
const KEY = process.env.GEMINI_API_KEY!;

type Model = {
  name: string;
  displayName?: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
};

async function main() {
  console.log(`Key: …${KEY?.slice(-4) ?? "MISSING"}\n`);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}&pageSize=200`,
  );
  if (!res.ok) {
    console.log(`❌ ListModels failed: ${res.status} ${await res.text()}`);
    return;
  }
  const json = (await res.json()) as { models?: Model[] };
  const models = json.models ?? [];

  const embed = models.filter((m) => m.supportedGenerationMethods?.includes("embedContent"));
  console.log(`Embedding-capable models (${embed.length}):`);
  for (const m of embed) {
    console.log(`  • ${m.name.replace("models/", "")}`);
    console.log(`      ${m.displayName ?? ""} — inputTokenLimit=${m.inputTokenLimit ?? "?"}`);
  }

  console.log(`\nAll models (${models.length}): ${models.map((m) => m.name.replace("models/", "")).join(", ")}`);

  // Probe the model the app uses + report output dimension
  console.log("\nProbing current model (gemini-embedding-001):");
  const probe = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text: "hello" }] } }),
    },
  );
  if (probe.ok) {
    const pj = (await probe.json()) as { embedding?: { values?: number[] } };
    console.log(`  ✅ ok — output dimension: ${pj.embedding?.values?.length}`);
  } else {
    console.log(`  ❌ ${probe.status} ${(await probe.text()).slice(0, 200)}`);
  }
}

void main();
