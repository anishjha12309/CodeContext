import { GoogleGenerativeAI } from "@google/generative-ai";
import { Document } from "@langchain/core/documents";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
});

export const aiSummariseCommit = async (diff: string) => {
  const response = await model.generateContent([
    `You are an expert programmer, and you are trying to summarize a git diff.
Reminders about the git diff format:
For every file, there are a few metadata lines, like (for example):
\`\`\`
diff --git a/lib/index.js b/lib/index.js
index aadf691..bfef603 100644
--- a/lib/index.js
+++ b/lib/index.js
\`\`\`
This means that \`lib/index.js\` was modified in this commit. Note that this is only an example.
Then there is a specifier of the lines that were modified.
A line starting with \`+\` means it was added.
A line that starting with \`-\` means that line was deleted.
A line that starts with neither \`+\` nor \`-\` is code given for context and better understanding.
It is not part of the diff.
[...]

EXAMPLE SUMMARY COMMENTS:
\`\`\`
* Raised the amount of returned recordings from \`10\` to \`100\` [packages/server/recordings_api.ts], [packages/server/constants.ts]
* Fixed a typo in the github action name [.github/workflows/gpt-commit-summarizer.yml]
* Moved the \`octokit\` initialization to a separate file [src/octokit.ts], [src/index.ts]
* Added an OpenAI API for completions [packages/utils/apis/openai.ts]
* Lowered numeric tolerance for test files
\`\`\`
Most commits will have less comments than this examples list.
The last comment does not include the file names,
because there were more than two relevant files in the hypothetical commit.
Do not include parts of the example in your summary.
It is given only as an example of appropriate comments.

Please summarise the following diff file:

${diff}`,
  ]);
  return response.response.text();
};

export async function summariseCode(doc: Document) {
  console.log("getting summary for", doc.metadata.source);
  try {
    const code = doc.pageContent.slice(0, 10000);
    const response = await model.generateContent([
      `You are an intelligent senior software engineer who specialises in onboarding junior software engineers onto projects.`,
      `You are onboarding a junior software engineer and explaining to them the purpose of the ${doc.metadata.source} file.`,
      `Here is the code:`,
      `${code}`,
      `Give a summary no more than 100 words of the code above.`,
    ]);
    return response.response.text();
  } catch (error) {
    return "";
  }
}

export async function generateEmbedding(summary: string) {
  const embeddingModel = genAI.getGenerativeModel({
    model: "text-embedding-004",
  });

  const result = await embeddingModel.embedContent(summary);
  const embedding = result.embedding;
  return embedding.values;
}

/**
 * Batch summarize multiple files in a single API call
 * Returns an array of summaries in the same order as input files
 */
export async function batchSummariseCode(
  files: Array<{ fileName: string; code: string }>
): Promise<string[]> {
  if (files.length === 0) return [];
  
  console.log(`📦 Batch summarizing ${files.length} files in one API call`);
  
  try {
    // Build the prompt with all files
    const filePrompts = files.map((f, i) => {
      const truncatedCode = f.code.slice(0, 8000); // Limit each file to 8000 chars
      return `--- FILE ${i + 1}: ${f.fileName} ---
${truncatedCode}
--- END FILE ${i + 1} ---`;
    }).join("\n\n");

    const response = await model.generateContent([
      `You are an intelligent senior software engineer. Summarize each of the following ${files.length} code files.

IMPORTANT: You MUST respond with EXACTLY ${files.length} summaries, one for each file, in this EXACT format:

[FILE 1]
<summary for file 1, max 80 words>

[FILE 2]
<summary for file 2, max 80 words>

${files.length > 2 ? `[FILE 3]\n<summary for file 3, max 80 words>\n\n` : ''}${files.length > 3 ? `[FILE 4]\n<summary for file 4, max 80 words>\n\n` : ''}${files.length > 4 ? `[FILE 5]\n<summary for file 5, max 80 words>\n\n` : ''}
Each summary should explain the purpose and main functionality of that file. Keep summaries concise.

Here are the files:

${filePrompts}`,
    ]);

    const responseText = response.response.text();
    
    // Parse the response to extract individual summaries
    const summaries: string[] = [];
    
    for (let i = 1; i <= files.length; i++) {
      const startMarker = `[FILE ${i}]`;
      const endMarker = i < files.length ? `[FILE ${i + 1}]` : null;
      
      const startIdx = responseText.indexOf(startMarker);
      if (startIdx === -1) {
        console.warn(`⚠️  Could not find marker ${startMarker}, using fallback`);
        summaries.push(`Summary for ${files[i - 1]?.fileName || 'unknown file'}`);
        continue;
      }
      
      let endIdx: number;
      if (endMarker) {
        endIdx = responseText.indexOf(endMarker);
        if (endIdx === -1) endIdx = responseText.length;
      } else {
        endIdx = responseText.length;
      }
      
      const summary = responseText
        .slice(startIdx + startMarker.length, endIdx)
        .trim();
      
      summaries.push(summary || `Summary for ${files[i - 1]?.fileName || 'unknown file'}`);
    }
    
    console.log(`✓ Extracted ${summaries.length} summaries from batch response`);
    return summaries;
    
  } catch (error) {
    console.error("Batch summarization failed:", error);
    // Return empty summaries for all files
    return files.map(f => `Summary generation failed for ${f.fileName}`);
  }
}

