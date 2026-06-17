/** Reads Cerebras rate-limit headers (RPM/TPM/RPD/TPD) for the current key. */
const KEY = process.env.CEREBRAS_API_KEY!;

async function main() {
  const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-oss-120b",
      messages: [{ role: "user", content: "hi" }],
      max_completion_tokens: 1,
    }),
  });

  console.log(`status: ${res.status}\n`);
  console.log("rate-limit headers:");
  for (const [k, v] of res.headers.entries()) {
    if (k.includes("ratelimit") || k.includes("retry")) console.log(`  ${k}: ${v}`);
  }
  if (!res.ok) console.log(`\nbody: ${(await res.text()).slice(0, 300)}`);
}
void main();
