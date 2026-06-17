/**
 * One-off diagnostic: probes every external API the indexing pipeline uses,
 * using the keys in .env, to tell whether anything is rate-limited / quota-
 * exhausted / mis-authenticated right now.
 *
 * Run:  bun scripts/check-apis.ts
 *
 * Safe to delete afterwards. Makes one tiny request per provider; GitHub uses
 * the free /rate_limit endpoint which does NOT consume quota.
 */
import { generateEmbedding } from "../src/lib/gemini";
import { summariseCode } from "../src/lib/cerebras";
import { summariseCommit } from "../src/lib/groq";

type Result = { name: string; status: string; detail: string };
const results: Result[] = [];

function classify(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/429|quota|rate.?limit|Too Many Requests|RESOURCE_EXHAUSTED/i.test(msg))
    return `⛔ RATE-LIMITED / QUOTA EXHAUSTED — ${msg.slice(0, 160)}`;
  if (/401|403|invalid|unauthor|permission|api key/i.test(msg))
    return `🔑 AUTH ERROR (bad/missing key) — ${msg.slice(0, 160)}`;
  return `⚠️  OTHER ERROR — ${msg.slice(0, 160)}`;
}

function envState(name: string): string {
  const v = process.env[name];
  return v ? `set (…${v.slice(-4)})` : "MISSING";
}

// ── GitHub: the only API whose failure can cause the stuck "Indexing…" state ──
async function checkGitHub() {
  const token = process.env.GITHUB_TOKEN;
  try {
    const res = await fetch("https://api.github.com/rate_limit", {
      headers: {
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.status === 401) {
      results.push({ name: "GitHub", status: "🔑 AUTH ERROR", detail: "token rejected (401) — listCommits would fall back to 60 req/hr unauthenticated" });
      return;
    }
    const json = (await res.json()) as { rate?: { limit: number; remaining: number; reset: number } };
    const r = json.rate;
    if (!r) {
      results.push({ name: "GitHub", status: "⚠️  UNKNOWN", detail: JSON.stringify(json).slice(0, 160) });
      return;
    }
    const resetIn = Math.max(0, Math.round((r.reset * 1000 - Date.now()) / 60000));
    const authed = r.limit >= 5000;
    const status = r.remaining === 0 ? "⛔ EXHAUSTED" : "✅ OK";
    results.push({
      name: "GitHub",
      status,
      detail: `${r.remaining}/${r.limit} remaining (${authed ? "authenticated" : "UNAUTHENTICATED — token missing/invalid"}), resets in ~${resetIn}m`,
    });
  } catch (err) {
    results.push({ name: "GitHub", status: "⚠️  ERROR", detail: classify(err) });
  }
}

async function checkGroq() {
  try {
    const out = await summariseCommit("diff --git a/x b/x\n+console.log('hi')");
    results.push({ name: "Groq (commit summaries)", status: "✅ OK", detail: `responded: "${out.slice(0, 50)}…"` });
  } catch (err) {
    results.push({ name: "Groq (commit summaries)", status: "FAIL", detail: classify(err) });
  }
}

async function checkGemini() {
  try {
    const vec = await generateEmbedding("hello world");
    results.push({ name: "Gemini (embeddings)", status: "✅ OK", detail: `returned ${vec.length}-dim vector` });
  } catch (err) {
    results.push({ name: "Gemini (embeddings)", status: "FAIL", detail: classify(err) });
  }
}

async function checkCerebras() {
  try {
    // summariseCode swallows errors and returns "" — so probe and flag empties.
    const out = await summariseCode("test.ts", "export const x = 1;");
    if (!out) {
      results.push({ name: "Cerebras (code summaries)", status: "⚠️  EMPTY", detail: "returned empty string — likely rate-limited/erroring (errors are swallowed in cerebras.ts)" });
    } else {
      results.push({ name: "Cerebras (code summaries)", status: "✅ OK", detail: `responded: "${out.slice(0, 50)}…"` });
    }
  } catch (err) {
    results.push({ name: "Cerebras (code summaries)", status: "FAIL", detail: classify(err) });
  }
}

async function main() {
  console.log("\n🔑 Env keys:");
  for (const k of ["GITHUB_TOKEN", "GROQ_API_KEY", "GEMINI_API_KEY", "CEREBRAS_API_KEY"]) {
    console.log(`   ${k.padEnd(20)} ${envState(k)}`);
  }
  console.log("\n📡 Probing providers…\n");

  await checkGitHub();
  await checkGroq();
  await checkGemini();
  await checkCerebras();

  console.log("──────────────────────────────────────────────");
  for (const r of results) {
    console.log(`${r.status.padEnd(18)} ${r.name}`);
    console.log(`   ${r.detail}\n`);
  }
  console.log("──────────────────────────────────────────────");
  console.log("Note: the dashboard 'Indexing…' state depends ONLY on GitHub commits.");
  console.log("Groq/Gemini/Cerebras quotas affect summary/Q&A quality, not the spinner.\n");
}

void main();
