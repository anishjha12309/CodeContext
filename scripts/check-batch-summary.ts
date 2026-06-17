/** Verifies summariseFiles() returns one summary per file from a single request. */
import { summariseFiles } from "../src/lib/cerebras";

const files = [
  { fileName: "use-debounce.ts", code: "export function useDebounce<T>(v:T,ms=300){const[d,setD]=useState(v);useEffect(()=>{const id=setTimeout(()=>setD(v),ms);return()=>clearTimeout(id)},[v,ms]);return d;}" },
  { fileName: "math.ts", code: "export const add=(a:number,b:number)=>a+b;export const clamp=(n:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,n));" },
  { fileName: "logger.ts", code: "export const log=(...a:unknown[])=>console.log('[app]',...a);export const warn=(...a:unknown[])=>console.warn('[app]',...a);" },
];

async function main() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const summaries = await summariseFiles(files);
      console.log(`Got ${summaries.length} summaries for ${files.length} files:\n`);
      summaries.forEach((s, i) => console.log(`  [${files[i]!.fileName}] ${s || "⚠️ EMPTY"}\n`));
      const ok = summaries.length === files.length && summaries.every((s) => s.length > 0);
      console.log(ok ? "✅ all files summarised in one request" : "⚠️ some summaries missing");
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`attempt ${attempt} failed: ${msg.slice(0, 120)}`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 4000));
    }
  }
}
void main();
