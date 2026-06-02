"use client";

import { useState } from "react";
import { askQuestion } from "@/app/(protected)/dashboard/actions";
import { readStreamableValue } from "@ai-sdk/rsc";
import { api } from "@/trpc/react";
import { useRefetch } from "@/hooks/use-refetch";
import { toast } from "sonner";
import { Bot, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import Link from "next/link";

export function AskQuestionCard({ projectId }: { projectId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [refs, setRefs] = useState<any[]>([]);
  const refetch = useRefetch();

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
    setRefs([]);

    try {
      const { output, filesReferences } = await askQuestion(question, projectId);
      const fileRefs = filesReferences as any[];
      setRefs(fileRefs);

      let fullAnswer = "";
      for await (const chunk of readStreamableValue(output)) {
        if (chunk) {
          fullAnswer += chunk;
          setAnswer(fullAnswer);
        }
      }

      // Auto-save after streaming completes
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
    <div className="glass rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-sky-400" />
        <h2 className="font-semibold text-white">Ask about this codebase</h2>
      </div>

      <div className="relative">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAsk();
          }}
          placeholder="How does the auth flow work?…"
          rows={3}
          className="w-full resize-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-sky-500 transition-colors"
        />
      </div>

      <div className="flex items-center justify-between">
        <Link href="/qa" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          View all Q&A →
        </Link>
        <button
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 transition-all"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {loading ? "Thinking…" : "Ask"}
        </button>
      </div>

      {answer && (
        <div className="border-t border-white/8 pt-4 space-y-3">
          <div className="prose prose-invert prose-sm max-w-none text-zinc-300 max-h-64 overflow-y-auto">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }: any) {
                  const lang = /language-(\w+)/.exec(className ?? "")?.[1];
                  return lang ? (
                    <SyntaxHighlighter style={oneDark as any} language={lang} PreTag="div" className="rounded-lg text-xs">
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="rounded bg-white/10 px-1 py-0.5 text-xs" {...props}>{children}</code>
                  );
                },
              }}
            >
              {answer}
            </ReactMarkdown>
          </div>
          {saveAnswer.isPending && (
            <p className="text-[10px] text-zinc-600 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
