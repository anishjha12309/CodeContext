"use client";

import { api } from "@/trpc/react";
import { useProject } from "@/hooks/use-project";
import { useRefetch } from "@/hooks/use-refetch";
import { useDropzone } from "react-dropzone";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Mic, Upload, Trash2, CheckCircle, XCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function MeetingsPage() {
  const { project } = useProject();
  const refetch = useRefetch();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: meetings, isLoading } = api.project.getMeetings.useQuery(
    { projectId: project?.id ?? "" },
    { enabled: !!project?.id, refetchInterval: 5000 },
  );

  const uploadMeeting = api.project.uploadMeeting.useMutation();
  const deleteMeeting = api.project.deleteMeeting.useMutation({
    onSuccess: () => { refetch().catch(console.error); toast.success("Meeting deleted"); },
  });

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0];
    if (!file || !project) return;
    setUploading(true); setProgress(0);
    try {
      setProgress(10);
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload-meeting", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      const { url } = (await res.json()) as { url: string };
      setProgress(80);
      const meeting = await uploadMeeting.mutateAsync({ projectId: project.id, meetingUrl: url, name: file.name });
      await fetch("/api/process-meeting", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ meetingUrl: url, projectId: project.id, meetingId: meeting.id }) });
      await refetch();
      toast.success("Meeting uploaded and processing started");
    } catch (err: any) { toast.error(err.message ?? "Upload failed"); }
    finally { setUploading(false); setProgress(0); }
  }, [project, uploadMeeting, refetch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "audio/*": [".mp3", ".mp4", ".m4a", ".wav", ".ogg", ".webm", ".flac"] },
    maxFiles: 1, disabled: uploading || !project,
  });

  if (!project) return <div className="flex h-96 items-center justify-center"><p className="text-white/40">Select a project to manage meetings.</p></div>;

  const statusBadge = (status: string) => {
    if (status === "COMPLETED") return <div className="flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-400"><CheckCircle className="h-3 w-3" />Done</div>;
    if (status === "FAILED") return <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400"><XCircle className="h-3 w-3" />Failed</div>;
    return <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-white/50"><Loader2 className="h-3 w-3 animate-spin" />Processing</div>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Meetings</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-white/40">Upload audio recordings to get AI-generated chapter summaries.</p>
      </div>

      <div
        {...getRootProps()}
        className={`glass-app-strong cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${isDragActive ? "border-sky-500 bg-sky-500/5" : "border-black/10 dark:border-white/8 hover:border-sky-500/50"} ${uploading || !project ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10">
          <Upload className="h-6 w-6 text-sky-400" />
        </div>
        {uploading ? (
          <>
            <p className="font-semibold text-zinc-900 dark:text-white">Uploading… {progress}%</p>
            <div className="mx-auto mt-3 h-1.5 w-48 rounded-full bg-white/8">
              <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : isDragActive ? (
          <p className="font-semibold text-sky-400">Drop the audio file here</p>
        ) : (
          <>
            <p className="font-semibold text-zinc-900 dark:text-white">Drop audio file or click to upload</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-white/30">MP3, MP4, M4A, WAV, OGG, WEBM, FLAC</p>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/4" />)}</div>
      ) : meetings?.length === 0 ? (
        <div className="glass-app rounded-xl p-8 text-center">
          <Mic className="mx-auto mb-2 h-8 w-8 text-white/20" />
          <p className="text-sm text-white/40">No meetings yet. Upload an audio recording above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings?.map((meeting) => (
            <div key={meeting.id} className="glass-app overflow-hidden rounded-xl">
              <div className="flex items-center gap-4 p-4">
                {statusBadge(meeting.status)}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-900 dark:text-white">{meeting.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-white/30">{formatDistanceToNow(new Date(meeting.created_at), { addSuffix: true })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {meeting.status === "COMPLETED" && (meeting.issues?.length ?? 0) > 0 && (
                    <button onClick={() => setExpandedId(expandedId === meeting.id ? null : meeting.id)} className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white">
                      {expandedId === meeting.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                  <button onClick={() => deleteMeeting.mutate({ meetingId: meeting.id })} className="rounded-lg p-1.5 text-white/25 transition-colors hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {expandedId === meeting.id && meeting.issues && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-white/8">
                    <div className="space-y-3 p-4">
                      {(meeting.issues as Array<{ id: string; start_time: string; end_time: string; gist: string; headline: string; summary: string }>).map((issue) => (
                        <div key={issue.id} className="glass-app rounded-xl p-3">
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className="font-mono text-[10px] text-white/30">{issue.start_time} – {issue.end_time}</span>
                            <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-400">{issue.gist}</span>
                          </div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">{issue.headline}</p>
                          <p className="mt-1 text-xs text-white/40">{issue.summary}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
