"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  MessageSquare,
  FileSearch,
  Zap,
  Shield,
  Layers,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex items-center justify-between py-6 sm:py-8">
          <div className="flex items-center">
            <img src="/logo.png" alt="logo" className="h-8 w-auto sm:h-10" />
          </div>
          <Button
            variant="outline"
            className="border-white bg-transparent text-white transition-colors hover:bg-white hover:text-black"
            onClick={() => (window.location.href = "/dashboard")}
          >
            Dashboard
          </Button>
        </header>

        {/* Hero Content */}
        <div className="flex flex-col items-center py-12 text-center sm:py-20 lg:py-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white bg-white/10 px-3 py-1 sm:mb-8 sm:px-4 sm:py-2">
            <Zap className="h-3 w-3 text-white sm:h-4 sm:w-4" />
            <span className="text-xs text-white sm:text-sm">
              AI-Powered Code Intelligence
            </span>
          </div>

          <h1 className="mb-4 max-w-5xl text-4xl leading-tight font-bold sm:mb-6 sm:text-5xl md:text-6xl lg:text-7xl">
            Your Developer Co-Pilot for
            <span className="mt-2 block text-white">Complex Codebases</span>
          </h1>

          <p className="mb-8 max-w-2xl px-4 text-base text-gray-400 sm:mb-12 sm:text-lg md:text-xl">
            Ask questions in natural language and get instant, contextual
            answers about your entire project. No more endless searching through
            files.
          </p>

          <div className="flex w-full flex-col gap-4 px-4 sm:w-auto sm:flex-row">
            <Button
              size="lg"
              className="h-auto bg-white px-6 py-4 text-base text-black transition-colors hover:bg-gray-200 sm:px-8 sm:py-6 sm:text-lg"
              onClick={() => (window.location.href = "/dashboard")}
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-auto border-white bg-transparent px-6 py-4 text-base text-white transition-colors hover:bg-white hover:text-black sm:px-8 sm:py-6 sm:text-lg"
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 gap-6 px-4 py-12 sm:gap-8 sm:py-20 md:grid-cols-3">
          <div className="rounded-lg border border-white bg-white/5 p-6 transition-all hover:border-white/80 hover:bg-white/10 sm:p-8">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white sm:mb-6 sm:h-12 sm:w-12">
              <MessageSquare className="h-5 w-5 text-black sm:h-6 sm:w-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold sm:mb-3 sm:text-xl">
              Natural Language Queries
            </h3>
            <p className="text-sm text-gray-400 sm:text-base">
              Ask questions about your code in plain English. Get instant,
              accurate answers with context.
            </p>
          </div>

          <div className="rounded-lg border border-white bg-white/5 p-6 transition-all hover:border-white/80 hover:bg-white/10 sm:p-8">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white sm:mb-6 sm:h-12 sm:w-12">
              <FileSearch className="h-5 w-5 text-black sm:h-6 sm:w-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold sm:mb-3 sm:text-xl">
              Intelligent Indexing
            </h3>
            <p className="text-sm text-gray-400 sm:text-base">
              Connect your repository and let AI understand your entire codebase
              structure instantly.
            </p>
          </div>

          <div className="rounded-lg border border-white bg-white/5 p-6 transition-all hover:border-white/80 hover:bg-white/10 sm:p-8">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white sm:mb-6 sm:h-12 sm:w-12">
              <Layers className="h-5 w-5 text-black sm:h-6 sm:w-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold sm:mb-3 sm:text-xl">
              Traceable Insights
            </h3>
            <p className="text-sm text-gray-400 sm:text-base">
              Every answer includes file references and code segments for
              complete transparency.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="px-4 py-12 sm:py-20">
          <h2 className="mb-8 text-center text-3xl font-bold sm:mb-16 sm:text-4xl md:text-5xl">
            How It Works
          </h2>
          <div className="mx-auto max-w-4xl space-y-8 sm:space-y-12">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black sm:h-12 sm:w-12">
                <span className="text-lg font-bold sm:text-xl">1</span>
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-xl font-semibold sm:text-2xl">
                  Connect Your Repository
                </h3>
                <p className="text-sm text-gray-400 sm:text-base">
                  Upload your project or link your GitHub repository. Our AI
                  will index every file and understand the structure.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black sm:h-12 sm:w-12">
                <span className="text-lg font-bold sm:text-xl">2</span>
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-xl font-semibold sm:text-2xl">
                  Ask Anything
                </h3>
                <p className="text-sm text-gray-400 sm:text-base">
                  Type your questions naturally: &quot;Where is the
                  authentication logic?&quot; or &quot;How does the payment
                  system work?&quot;
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black sm:h-12 sm:w-12">
                <span className="text-lg font-bold sm:text-xl">3</span>
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-xl font-semibold sm:text-2xl">
                  Get Instant Clarity
                </h3>
                <p className="text-sm text-gray-400 sm:text-base">
                  Receive detailed explanations with exact file references, code
                  snippets, and contextual insights.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="px-4 py-12 sm:py-20">
          <div className="rounded-2xl border border-white bg-white/5 p-8 text-center sm:p-12 md:p-16">
            <Shield className="mx-auto mb-6 h-12 w-12 text-white sm:h-16 sm:w-16" />
            <h2 className="mb-4 text-3xl font-bold sm:mb-6 sm:text-4xl md:text-5xl">
              Ready to Transform Your Workflow?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-base text-gray-400 sm:mb-10 sm:text-lg md:text-xl">
              Join developers who are saving hours every week by understanding
              their codebases faster.
            </p>
            <Button
              size="lg"
              className="h-auto bg-white px-8 py-4 text-base text-black transition-colors hover:bg-gray-200 sm:px-10 sm:py-6 sm:text-lg"
              onClick={() => (window.location.href = "/dashboard")}
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/20 px-4 py-8 sm:py-12">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center">
              <img src="/logo.png" alt="logo" className="h-6 w-auto sm:h-8" />
            </div>
            <p className="text-center text-xs text-gray-500 sm:text-left sm:text-sm">
              © 2025 CodeContext. AI-powered code intelligence platform.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
