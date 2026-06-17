/** Diagnoses why Q&A returns "no context": embedding counts + real similarity scores. */
import { createAdminSupabase } from "../src/lib/supabase";
import { generateEmbedding } from "../src/lib/gemini";

const QUESTION = "What programming languages are used in this codebase? Is Rust used?";

async function main() {
  const supabase = createAdminSupabase();

  // 1) Which projects exist and how many embeddings each has
  const { data: projects } = await supabase.from("projects").select("id,name").is("deleted_at", null);
  console.log("Projects + embedding counts:");
  const withEmbeddings: string[] = [];
  for (const p of projects ?? []) {
    const { count } = await supabase
      .from("source_code_embeddings")
      .select("id", { count: "exact", head: true })
      .eq("project_id", p.id);
    console.log(`  ${(count ?? 0).toString().padStart(4)}  ${p.name}  (${p.id})`);
    if ((count ?? 0) > 0) withEmbeddings.push(p.id);
  }

  // 2) Embed the question and check the dimension
  const vec = await generateEmbedding(QUESTION);
  console.log(`\nQuestion embedding dimension: ${vec.length}`);

  // 3) Run the SAME rpc the app uses, but threshold 0, to reveal real scores
  for (const pid of withEmbeddings) {
    const { data, error } = await supabase.rpc("match_source_code", {
      query_embedding: vec,
      match_threshold: 0,
      match_count: 10,
      p_project_id: pid,
    });
    if (error) {
      console.log(`\n❌ match_source_code error for ${pid}: ${error.message}`);
      continue;
    }
    const rows = (data ?? []) as Array<{ file_name: string; similarity: number }>;
    const above = rows.filter((r) => r.similarity >= 0.5).length;
    console.log(`\nTop matches for ${pid}  (${rows.length} returned, ${above} ≥ 0.5 threshold):`);
    rows.forEach((r) => console.log(`  ${r.similarity?.toFixed(3)}  ${r.file_name}`));
  }
}

void main().catch((e) => console.error(e));
