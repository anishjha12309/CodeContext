// Groq handles two jobs: summarising git diffs (70b model) and transcribing meeting audio (Whisper).
import Groq from "groq-sdk";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// AI SDK provider for streaming and text generation
export const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! });
export const GROQ_MODEL = "llama-3.3-70b-versatile";

function secToTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Commit summary ──────────────────────────────────────────────
export async function summariseCommit(diff: string): Promise<string> {
  const { text } = await generateText({
    model: groq(GROQ_MODEL),
    prompt: `Summarize this git diff in concise bullet points (max 100 words).
Use * for each bullet. Focus on what changed and why it matters.

${diff.slice(0, 8000)}`,
  });
  return text.trim();
}

// ── Audio transcription + chapter generation ─────────────────────
export async function transcribeAudio(audioUrl: string): Promise<{
  text: string;
  chapters: Array<{
    start: string;
    end: string;
    gist: string;
    headline: string;
    summary: string;
  }>;
}> {
  const response = await fetch(audioUrl);
  if (!response.ok)
    throw new Error(`Failed to download audio: ${response.statusText}`);

  const buffer = await response.arrayBuffer();
  const urlPath = new URL(audioUrl).pathname;
  const ext = urlPath.split(".").pop()?.toLowerCase() ?? "mp3";
  const mimeMap: Record<string, string> = {
    mp3: "audio/mpeg",
    mp4: "audio/mp4",
    m4a: "audio/mp4",
    wav: "audio/wav",
    ogg: "audio/ogg",
    webm: "audio/webm",
    flac: "audio/flac",
  };
  const mimeType = mimeMap[ext] ?? "audio/mpeg";
  const file = new File([buffer], `audio.${ext}`, { type: mimeType });

  const raw = await groqClient.audio.transcriptions.create({
    file,
    model: "whisper-large-v3",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  } as Parameters<typeof groqClient.audio.transcriptions.create>[0]);

  // verbose_json response isn't fully typed in groq-sdk; cast safely
  const result = raw as unknown as {
    text: string;
    segments?: Array<{ start: number; end: number; text: string }>;
  };

  const transcript = result.text ?? "";
  const segments = result.segments ?? [];

  if (!transcript.trim())
    throw new Error("No transcript text found (audio might be silent)");

  const chapters = await generateChapters(transcript, segments);
  return { text: transcript, chapters };
}

// falls back to a single full-meeting chapter if the model returns malformed JSON
async function generateChapters(
  transcript: string,
  segments: Array<{ start: number; end: number; text: string }>,
): Promise<
  Array<{
    start: string;
    end: string;
    gist: string;
    headline: string;
    summary: string;
  }>
> {
  const lastSeg = segments[segments.length - 1];
  const duration = lastSeg ? secToTime(lastSeg.end) : "00:00";

  const segText = segments
    .map((s) => `[${secToTime(s.start)}] ${s.text.trim()}`)
    .join("\n")
    .slice(0, 8000);

  try {
    const { text } = await generateText({
      model: groq(GROQ_MODEL),
      prompt: `Analyze this meeting transcript and divide it into 3-7 meaningful chapters.

TRANSCRIPT (with timestamps):
${segText}

Respond with ONLY a valid JSON array — no markdown, no explanation:
[
  {
    "start": "MM:SS",
    "end": "MM:SS",
    "gist": "2-4 word topic",
    "headline": "One clear sentence describing this chapter",
    "summary": "2-3 sentences describing what was discussed"
  }
]

Use real timestamps from the transcript. Meeting ends at ${duration}.`,
    });

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON in response");
    return JSON.parse(match[0]) as Awaited<ReturnType<typeof generateChapters>>;
  } catch {
    return [
      {
        start: "00:00",
        end: duration,
        gist: "Full Meeting",
        headline: "Meeting recording",
        summary:
          transcript.slice(0, 300) + (transcript.length > 300 ? "..." : ""),
      },
    ];
  }
}
