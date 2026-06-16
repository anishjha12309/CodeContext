"use client";

import { api } from "@/trpc/react";
import { useProject } from "@/hooks/use-project";
import { useRefetch } from "@/hooks/use-refetch";
import { askQuestion } from "@/app/(protected)/dashboard/actions";
import { readStreamableValue } from "@ai-sdk/rsc";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Bot, Send, Loader2, FileCode, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { motion } from "motion/react";
import { useTheme } from "next-themes";

type FileRef = { file_name: string; source_code: string; summary: string; similarity: number };

type SavedQuestion = {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  files_references: FileRef[];
  users?: { image_url?: string; first_name?: string; last_name?: string } | null;
};

export default function QAPage() {
  const { project } = useProject();
  const refetch = useRefetch();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [refs, setRefs] = useState<FileRef[]>([]);
  const [expandedRef, setExpandedRef] = useState<string | null>(null);
  const [selectedQ, setSelectedQ] = useState<SavedQuestion | null>(null);

  useEffect(() => setMounted(true), []);
  const codeStyle = mounted && resolvedTheme === "light" ? oneLight : oneDark;

  const { data: questions } = api.project.getQuestions.useQuery({ projectId: project?.id ?? "" }, { enabled: !!project?.id });
  const saveAnswer = api.project.saveAnswer.useMutation({ onSuccess: async () => { toast.success("Answer saved"); await refetch(); } });
  const deleteQuestion = api.project.deleteQuestion.useMutation({ onSuccess: async () => { toast.success("Deleted"); await refetch(); }, onError: () => toast.error("Failed to delete") });

  async function handleAsk() {
    if (!project || !question.trim() || loading) return;
    setLoading(true); setAnswer(""); setRefs([]);
    try {
      const { output, filesReferences } = await askQuestion(question, project.id);
      const fileRefs = filesReferences as FileRef[];
      setRefs(fileRefs);
      let fullAnswer = "";
      for await (const chunk of readStreamableValue(output)) {
        if (chunk) { fullAnswer += chunk; setAnswer(fullAnswer); }
      }
      if (fullAnswer) {
        saveAnswer.mutate({ projectId: project.id, question, answer: fullAnswer, filesReferences: fileRefs });
      }
    } catch { toast.error("Failed to get answer."); } finally { setLoading(false); }
  }

  if (!project) return <div className="flex h-96 items-center justify-center"><p className="text-zinc-500 dark:text-white/40">Select a project to use Q&amp;A.</p></div>;

  const inputCls = "ios-field w-full rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/25 outline-none";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Codebase Q&amp;A</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-white/40">Ask questions about {project.name} in plain English.</p>
      </div>

      <div className="glass-app-strong ios-specular rounded-3xl p-5 sm:p-6 space-y-4">
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAsk(); }} placeholder="How does authentication work?…" rows={3} className={inputCls} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-500 dark:text-white/30">⌘ + Enter to send · 1 credit per question</span>
          <button onClick={handleAsk} disabled={loading || !question.trim()} className="ios-btn-primary ios-pressable flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? "Thinking…" : "Ask"}
          </button>
        </div>
      </div>

      {(answer || loading) && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-app ios-specular rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-zinc-400 dark:text-white/40" />
            <span className="font-semibold text-zinc-900 dark:text-white">Answer</span>
            {loading && <Loader2 className="ml-auto h-3 w-3 animate-spin text-zinc-400 dark:text-white/30" />}
          </div>
          {answer && (
            <div className="prose prose-sm max-w-none text-zinc-700 dark:text-white/80 dark:prose-invert">
              <ReactMarkdown components={{ code({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) { const lang = /language-(\w+)/.exec(className ?? "")?.[1]; return lang ? <SyntaxHighlighter style={codeStyle as Record<string, React.CSSProperties>} language={lang} PreTag="div" className="rounded-xl text-xs">{String(children).replace(/\n$/, "")}</SyntaxHighlighter> : <code className="rounded bg-black/8 px-1 py-0.5 text-xs dark:bg-white/10" {...props}>{children}</code>; } }}>{answer}</ReactMarkdown>
            </div>
          )}
          {!loading && answer && refs.length > 0 && (
            <div className="border-t border-black/8 dark:border-white/8 pt-3">
              <div className="flex flex-wrap gap-2">
                {refs.map((ref) => (
                  <button key={ref.file_name} onClick={() => setExpandedRef(expandedRef === ref.file_name ? null : ref.file_name)} className="glass-app ios-pressable flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-900 dark:text-white/50 dark:hover:text-white">
                    <FileCode className="h-3 w-3 text-zinc-400 dark:text-white/40" />
                    {ref.file_name.split("/").pop()}
                    {expandedRef === ref.file_name ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            </div>
          )}
          {expandedRef && (
            <div className="glass-app rounded-2xl p-3 text-xs">
              <p className="mb-2 font-mono text-zinc-500 dark:text-white/40">{expandedRef}</p>
              <SyntaxHighlighter style={codeStyle as any} language="typescript" PreTag="div" className="max-h-64 overflow-auto rounded-lg text-xs">{refs.find((r) => r.file_name === expandedRef)?.source_code?.slice(0, 3000) ?? ""}</SyntaxHighlighter>
            </div>
          )}
        </motion.div>
      )}

      {questions && questions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-white/25">Saved Q&amp;A</h2>
          {(questions as SavedQuestion[]).map((q) => (
            <div key={q.id} onClick={() => setSelectedQ(q)} className="glass-app ios-pressable cursor-pointer rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-7 w-7 shrink-0 ring-1 ring-black/5 dark:ring-white/10">
                  <AvatarImage src={q.users?.image_url ?? undefined} />
                  <AvatarFallback className="bg-zinc-200 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{(q.users?.first_name?.[0] ?? "?").toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{q.question}</p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-white/30">{formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteQuestion.mutate({ questionId: q.id }); }} disabled={deleteQuestion.isPending} className="shrink-0 rounded-lg p-1.5 text-zinc-300 dark:text-white/25 transition-colors hover:bg-red-500/10 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="line-clamp-2 pl-10 text-xs text-zinc-600 dark:text-white/50">{q.answer}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selectedQ} onOpenChange={(open) => { if (!open) setSelectedQ(null); }}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="pr-6 text-base font-semibold text-zinc-900 dark:text-white">{selectedQ?.question}</DialogTitle>
            <p className="text-xs text-zinc-400 dark:text-white/30">{selectedQ && formatDistanceToNow(new Date(selectedQ.created_at), { addSuffix: true })}</p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="prose prose-sm max-w-none text-zinc-700 dark:text-white/80 dark:prose-invert">
              <ReactMarkdown components={{ code({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) { const lang = /language-(\w+)/.exec(className ?? "")?.[1]; return lang ? <SyntaxHighlighter style={codeStyle as Record<string, React.CSSProperties>} language={lang} PreTag="div" className="rounded-xl text-xs">{String(children).replace(/\n$/, "")}</SyntaxHighlighter> : <code className="rounded bg-black/8 px-1 py-0.5 text-xs dark:bg-white/10" {...props}>{children}</code>; } }}>{selectedQ?.answer ?? ""}</ReactMarkdown>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
