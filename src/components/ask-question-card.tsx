"use client";

import { useState, useEffect } from "react";
import { askQuestion } from "@/app/(protected)/dashboard/actions";
import { readStreamableValue } from "@ai-sdk/rsc";
import { api } from "@/trpc/react";
import { useRefetch } from "@/hooks/use-refetch";
import { toast } from "sonner";
import { Bot, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import Link from "next/link";

export function AskQuestionCard({ projectId }: { projectId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const refetch = useRefetch();

  useEffect(() => setMounted(true), []);

  const codeStyle = mounted && resolvedTheme === "light" ? oneLight : oneDark;

  const saveAnswer = api.project.saveAnswer.useMutation({
    onSuccess: async () => {
      toast.success("Saved to Q&A history");
      await refetch();
    },
  });

  async function handleAsk() {
    if (!question.trim() || loading) return;
    setLoading(true);
    setAnswer("");

    try {
      const { output, filesReferences } = await askQuestion(question, projectId);
      const fileRefs = filesReferences as any[];

      let fullAnswer = "";
      for await (const chunk of readStreamableValue(output)) {
        if (chunk) {
          fullAnswer += chunk;
          setAnswer(fullAnswer);
        }
      }

      if (fullAnswer) {
        saveAnswer.mutate({ projectId, question, answer: fullAnswer, filesReferences: fileRefs });
      }
    } catch {
      toast.error("Failed to get answer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-app rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-zinc-400 dark:text-white/40" />
        <h2 className="font-semibold text-zinc-900 dark:text-white">Ask about this codebase</h2>
      </div>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAsk(); }}
        placeholder="How does the auth flow work?…"
        rows={3}
        className="w-full resize-none rounded-xl border border-black/10 dark:border-white/8 bg-black/5 dark:bg-white/4 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/25 outline-none transition-colors focus:border-zinc-400 dark:focus:border-white/30"
      />

      <div className="flex items-center justify-between">
        <Link href="/qa" className="text-xs text-zinc-500 dark:text-white/40 transition-colors hover:text-zinc-900 dark:hover:text-white">
          View all Q&amp;A →
        </Link>
        <button
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-black dark:bg-white dark:text-black dark:hover:bg-white/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {loading ? "Thinking…" : "Ask"}
        </button>
      </div>

      {answer && (
        <div className="border-t border-black/8 dark:border-white/8 pt-4 space-y-3">
          <div className="prose prose-sm max-w-none max-h-64 overflow-y-auto text-zinc-700 dark:text-white/80 dark:prose-invert">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }: any) {
                  const lang = /language-(\w+)/.exec(className ?? "")?.[1];
                  return lang ? (
                    <SyntaxHighlighter style={codeStyle as any} language={lang} PreTag="div" className="rounded-lg text-xs">
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="rounded bg-white/8 px-1 py-0.5 text-xs" {...props}>{children}</code>
                  );
                },
              }}
            >
              {answer}
            </ReactMarkdown>
          </div>
          {saveAnswer.isPending && (
            <p className="flex items-center gap-1 text-[10px] text-white/30">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
