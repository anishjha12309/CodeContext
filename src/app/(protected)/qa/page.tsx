"use client";

import { api } from "@/trpc/react";
import { useProject } from "@/hooks/use-project";
import { useRefetch } from "@/hooks/use-refetch";
import { askQuestion } from "@/app/(protected)/dashboard/actions";
import { readStreamableValue } from "@ai-sdk/rsc";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Bot, Send, Loader2, FileCode, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { motion } from "motion/react";

type FileRef = {
  file_name: string;
  source_code: string;
  summary: string;
  similarity: number;
};

export default function QAPage() {
  const { project } = useProject();
  const refetch = useRefetch();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [refs, setRefs] = useState<FileRef[]>([]);
  const [expandedRef, setExpandedRef] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedQ, setSelectedQ] = useState<{ id: string; question: string; answer: string; created_at: string; files_references: unknown; users?: { image_url?: string; first_name?: string } } | null>(null);

  const { data: questions } = api.project.getQuestions.useQuery(
    { projectId: project?.id ?? "" },
    { enabled: !!project?.id },
  );

  const saveAnswer = api.project.saveAnswer.useMutation({
    onSuccess: async () => {
      toast.success("Answer saved");
      await refetch();
    },
  });

  const deleteQuestion = api.project.deleteQuestion.useMutation({
    onSuccess: async () => {
      toast.success("Deleted");
      await refetch();
    },
    onError: () => toast.error("Failed to delete"),
  });

  async function handleAsk() {
    if (!project || !question.trim() || loading) return;
    setLoading(true);
    setAnswer("");
    setRefs([]);

    try {
      const { output, filesReferences } = await askQuestion(question, project.id);
      setRefs(filesReferences as FileRef[]);

      for await (const chunk of readStreamableValue(output)) {
        if (chunk) setAnswer((prev) => prev + chunk);
      }
    } catch {
      toast.error("Failed to get answer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!project || !answer) return;
    setSaving(true);
    try {
      await saveAnswer.mutateAsync({
        projectId: project.id,
        question,
        answer,
        filesReferences: refs,
      });
      setQuestion("");
      setAnswer("");
      setRefs([]);
    } finally {
      setSaving(false);
    }
  }

  if (!project) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-zinc-500">Select a project to use Q&A.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Codebase Q&A</h1>
        <p className="text-sm text-zinc-500 mt-1">Ask questions about {project.name} in plain English.</p>
      </div>

      {/* Input */}
      <div className="glass-strong rounded-2xl p-5 space-y-4">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAsk();
          }}
          placeholder="How does authentication work? What does the billing module do?…"
          rows={3}
          className="w-full resize-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-sky-500 transition-colors"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-600">⌘ + Enter to send · 1 credit per question</span>
          <button
            onClick={handleAsk}
            disabled={loading || !question.trim()}
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sky-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? "Thinking…" : "Ask"}
          </button>
        </div>
      </div>

      {/* Answer */}
      {(answer || loading) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-sky-400" />
            <span className="font-semibold text-white">Answer</span>
            {loading && <Loader2 className="h-3 w-3 animate-spin text-zinc-500 ml-auto" />}
          </div>

          {answer && (
            <div className="prose prose-invert prose-sm max-w-none text-zinc-300">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }: any) {
                    const lang = /language-(\w+)/.exec(className ?? "")?.[1];
                    return lang ? (
                      <SyntaxHighlighter
                        style={oneDark as any}
                        language={lang}
                        PreTag="div"
                        className="rounded-xl text-xs"
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="rounded bg-white/10 px-1 py-0.5 text-xs" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {answer}
              </ReactMarkdown>
            </div>
          )}

          {!loading && answer && (
            <div className="flex items-center justify-between pt-2 border-t border-white/8">
              <div className="flex flex-wrap gap-2">
                {refs.map((ref) => (
                  <button
                    key={ref.file_name}
                    onClick={() =>
                      setExpandedRef(expandedRef === ref.file_name ? null : ref.file_name)
                    }
                    className="glass flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    <FileCode className="h-3 w-3" />
                    {ref.file_name.split("/").pop()}
                    {expandedRef === ref.file_name ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs text-zinc-500 hover:text-sky-400 transition-colors"
              >
                {saving ? "Saving…" : "Save answer"}
              </button>
            </div>
          )}

          {expandedRef && (
            <div className="glass rounded-xl p-3 text-xs">
              <p className="text-zinc-400 font-mono mb-2">{expandedRef}</p>
              <SyntaxHighlighter
                style={oneDark as any}
                language="typescript"
                PreTag="div"
                className="rounded-lg text-xs max-h-64 overflow-auto"
              >
                {refs.find((r) => r.file_name === expandedRef)?.source_code?.slice(0, 3000) ?? ""}
              </SyntaxHighlighter>
            </div>
          )}
        </motion.div>
      )}

      {/* Saved questions */}
      {questions && questions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Saved Q&A</h2>
          {questions.map((q) => (
            <div
              key={q.id}
              onClick={() => setSelectedQ(q as any)}
              className="glass rounded-xl p-4 space-y-3 cursor-pointer hover:bg-white/4 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={(q as any).users?.image_url} />
                  <AvatarFallback className="text-[10px] bg-sky-900 text-sky-200">
                    {((q as any).users?.first_name?.[0] ?? "?").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{q.question}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteQuestion.mutate({ questionId: q.id }); }}
                  disabled={deleteQuestion.isPending}
                  className="shrink-0 rounded-lg p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-zinc-400 line-clamp-2 pl-10">{q.answer}</p>
            </div>
          ))}
        </div>
      )}

      {/* Q&A detail dialog */}
      <Dialog open={!!selectedQ} onOpenChange={(open) => { if (!open) setSelectedQ(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white text-base font-semibold pr-6">
              {selectedQ?.question}
            </DialogTitle>
            <p className="text-xs text-zinc-600">
              {selectedQ && formatDistanceToNow(new Date(selectedQ.created_at), { addSuffix: true })}
            </p>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-1">
            <div className="prose prose-invert prose-sm max-w-none text-zinc-300">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }: any) {
                    const lang = /language-(\w+)/.exec(className ?? "")?.[1];
                    return lang ? (
                      <SyntaxHighlighter style={oneDark as any} language={lang} PreTag="div" className="rounded-xl text-xs">
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="rounded bg-white/10 px-1 py-0.5 text-xs" {...props}>{children}</code>
                    );
                  },
                }}
              >
                {selectedQ?.answer ?? ""}
              </ReactMarkdown>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
