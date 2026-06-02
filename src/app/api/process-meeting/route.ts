// Long-running route (5 min timeout) that transcribes audio via Groq Whisper,
// splits it into chapters, and persists them as issues in Supabase.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { transcribeAudio } from "@/lib/groq";
import { createAdminSupabase } from "@/lib/supabase";

export const maxDuration = 300;

const bodySchema = z.object({
  meetingUrl: z.string(),
  projectId: z.string(),
  meetingId: z.string(),
});

export async function POST(req: NextRequest) {
  const supabase = createAdminSupabase();
  let meetingId: string | undefined;

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = bodySchema.parse(await req.json());
    meetingId = body.meetingId;

    const { text, chapters } = await transcribeAudio(body.meetingUrl);

    if (chapters.length > 0) {
      await supabase.from("issues").insert(
        chapters.map((ch) => ({
          meeting_id: body.meetingId,
          start_time: ch.start,
          end_time: ch.end,
          gist: ch.gist,
          headline: ch.headline,
          summary: ch.summary,
        })),
      );
    }

    await supabase
      .from("meetings")
      .update({
        status: "COMPLETED",
        name: chapters[0]?.headline ?? text.slice(0, 60),
      })
      .eq("id", body.meetingId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("process-meeting error:", err);

    if (meetingId) {
      await supabase.from("meetings").update({ status: "FAILED" }).eq("id", meetingId);
    }

    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
