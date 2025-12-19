"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  MessageSquare,
  FileSearch,
  Zap,
  Shield,
  Layers,
  Code2,
  Cpu,
  ChevronRight,
  Menu,
  X,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "default",
  size = "default",
  className = "",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50";

  const variants = {
    default: "bg-neutral-900 text-neutral-50 shadow hover:bg-neutral-900/90",
    destructive: "bg-red-500 text-neutral-50 shadow-sm hover:bg-red-500/90",
    outline:
      "border border-neutral-200 bg-white shadow-sm hover:bg-neutral-100 hover:text-neutral-900",
    secondary:
      "bg-neutral-100 text-neutral-900 shadow-sm hover:bg-neutral-100/80",
    ghost: "hover:bg-neutral-100 hover:text-neutral-900",
    link: "text-neutral-900 underline-offset-4 hover:underline",
  };

  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "outline";
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  className = "",
}) => {
  const variants = {
    default:
      "border-transparent bg-neutral-900 text-neutral-50 hover:bg-neutral-900/80",
    secondary:
      "border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80",
    outline: "text-neutral-950 border-neutral-200",
  };
  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 focus:outline-none ${variants[variant]} ${className}`}
    >
      {children}
    </div>
  );
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ className = "", children, ...props }) => (
  <div
    className={`rounded-xl border border-neutral-200 bg-white text-neutral-950 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${className}`}
    {...props}
  >
    {children}
  </div>
);

const DotBackground = () => (
  <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] [bg-size:16px_16px]"></div>
);

const Spotlight = () => (
  <div className="pointer-events-none absolute -top-40 right-0 left-0 mx-auto h-[500px] w-full max-w-3xl bg-linear-to-b from-neutral-100 to-transparent opacity-40 blur-3xl"></div>
);

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-white font-sans text-neutral-950 antialiased selection:bg-neutral-900 selection:text-white">
      <DotBackground />
      <Spotlight />

      <header
        className={`fixed top-0 z-50 w-full transition-all duration-200 ${scrolled ? "border-b border-neutral-200 bg-white/80 backdrop-blur-md" : "bg-transparent"}`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div
              className="flex cursor-pointer items-center gap-2"
              onClick={scrollToTop}
            >
              <img src="/logo.png" alt="logo" className="h-8 w-auto sm:h-10" />
            </div>

            {/* Desktop Nav */}
            <div className="hidden items-center gap-8 md:flex">
              <nav className="flex gap-6">
                <a
                  href="#"
                  className="text-sm font-medium text-neutral-600 transition-colors hover:text-black"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  className="text-sm font-medium text-neutral-600 transition-colors hover:text-black"
                >
                  How it Works
                </a>
                <a
                  href="/billing"
                  className="text-sm font-medium text-neutral-600 transition-colors hover:text-black"
                >
                  Pricing
                </a>
              </nav>
              <div className="flex items-center gap-4 border-l border-neutral-200 pl-6">
                <Link
                  href="/sign-in"
                  className="text-sm font-medium text-neutral-900 hover:text-neutral-700"
                >
                  Sign in
                </Link>
                <Button
                  size="sm"
                  onClick={() => (window.location.href = "/dashboard")}
                  className="rounded-full px-6"
                >
                  Dashboard
                </Button>
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200 hover:bg-neutral-100 active:scale-95"
                aria-label="Toggle menu"
              >
                <div className="relative h-5 w-5">
                  <span
                    className={`absolute left-0 block h-0.5 w-5 transform bg-neutral-900 transition-all duration-300 ease-out ${
                      mobileMenuOpen ? "top-2 rotate-45" : "top-0.5"
                    }`}
                  />
                  <span
                    className={`absolute left-0 top-2 block h-0.5 w-5 bg-neutral-900 transition-all duration-200 ${
                      mobileMenuOpen ? "opacity-0" : "opacity-100"
                    }`}
                  />
                  <span
                    className={`absolute left-0 block h-0.5 w-5 transform bg-neutral-900 transition-all duration-300 ease-out ${
                      mobileMenuOpen ? "top-2 -rotate-45" : "top-3.5"
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        <div
          className={`absolute left-0 right-0 top-16 z-40 transform overflow-hidden border-b border-neutral-200 bg-white transition-all duration-300 ease-out md:hidden ${
            mobileMenuOpen ? "max-h-64 opacity-100 shadow-lg" : "max-h-0 border-b-0 opacity-0"
          }`}
        >
          <div className="container mx-auto px-4 py-3">
            <nav className="flex flex-col">
              <a
                href="#"
                className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                How it Works
              </a>
              <a
                href="/billing"
                className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
            </nav>
            <div className="mt-2 flex items-center gap-2 border-t border-neutral-100 pt-3">
              <Link
                href="/sign-in"
                className="flex-1 rounded-md px-3 py-2 text-center text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
              <Button
                size="sm"
                className="flex-1 justify-center rounded-md"
                onClick={() => (window.location.href = "/dashboard")}
              >
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 sm:pt-32">
        {/* Hero Section */}
        <section className="relative container mx-auto px-4 pb-20 text-center sm:px-6 lg:px-8">
          <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-5xl duration-1000">
            {/* Badge */}
            <div className="mb-8 flex justify-center">
              <Badge
                variant="secondary"
                className="gap-2 py-1 pr-3 pl-1 transition-colors hover:bg-neutral-200/50"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-white">
                  <Zap className="h-3 w-3" />
                </div>
                <span className="tracking-wide text-neutral-600">
                  AI-Powered Code Intelligence v2.0
                </span>
              </Badge>
            </div>

            {/* Main Heading with Gradient Text */}
            <h1 className="mb-8 text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
              Your Developer Co-Pilot for{" "}
              <span className="bg-linear-to-b from-neutral-800 via-neutral-600 to-neutral-400 bg-clip-text text-transparent">
                Complex Codebases
              </span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-neutral-500 sm:text-xl">
              Ask questions in natural language and get instant, contextual
              answers about your entire project. No more endless searching
              through files.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="h-12 w-full rounded-full px-8 text-base shadow-lg shadow-neutral-200 sm:w-auto"
                onClick={() => (window.location.href = "/dashboard")}
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 w-full rounded-full border-neutral-200 px-8 text-base hover:bg-neutral-50 sm:w-auto"
              >
                Learn More
              </Button>
            </div>

            {/* Glassmorphism Code Window (Aceternity Style) */}
            <div className="relative mx-auto mt-20 max-w-5xl rounded-2xl border border-neutral-200 bg-white/50 p-2 shadow-[0_0_50px_-12px_rgba(0,0,0,0.1)] backdrop-blur-xl">
              <div className="overflow-hidden rounded-xl bg-neutral-950 p-4 text-left font-mono text-sm shadow-inner sm:p-8 sm:text-base">
                <div className="mb-4 flex gap-2 border-b border-neutral-800 pb-4">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <div className="ml-auto text-xs text-neutral-500">
                    bash &mdash; 80x24
                  </div>
                </div>
                <div className="space-y-3 font-light">
                  <div className="flex">
                    <span className="mr-4 w-6 text-right text-neutral-600 select-none">
                      1
                    </span>
                    <span className="text-green-400">
                      $ ai analyze --repo ./my-complex-project
                    </span>
                  </div>
                  <div className="flex">
                    <span className="mr-4 w-6 text-right text-neutral-600 select-none">
                      2
                    </span>
                    <span className="text-neutral-300">
                      Indexing 1,402 files...{" "}
                      <span className="text-neutral-500">[Done 0.4s]</span>
                    </span>
                  </div>
                  <div className="flex">
                    <span className="mr-4 w-6 text-right text-neutral-600 select-none">
                      3
                    </span>
                    <span className="text-neutral-300">
                      Understanding dependency graph...{" "}
                      <span className="text-neutral-500">[Done 0.2s]</span>
                    </span>
                  </div>
                  <div className="flex py-2">
                    <span className="mr-4 w-6 text-right text-neutral-600 select-none">
                      4
                    </span>
                    <span className="flex items-center gap-2 text-white">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500"></span>
                      User: &quot;Explain how the authentication middleware
                      handles JWT expiry&quot;
                    </span>
                  </div>
                  <div className="ml-9 flex rounded border-l border-neutral-800 bg-neutral-900/50 p-2 pl-10">
                    <span className="text-xs leading-relaxed text-neutral-400">
                      Based on{" "}
                      <span className="text-blue-400 underline underline-offset-2">
                        /src/middleware/auth.ts
                      </span>{" "}
                      lines 45-82:
                      <br />
                      The middleware checks the `exp` claim. If expired, it
                      attempts to refresh using the `refreshToken` stored in
                      HttpOnly cookies before throwing a 401.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section (Bento Grid Style) */}
        <section className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="mb-16 max-w-2xl">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Built for scale &amp; complexity.
            </h2>
            <p className="text-lg text-neutral-500">
              Our engine digests your entire repository to provide context-aware
              answers that simple LLMs miss.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Large Card */}
            <Card className="group relative flex flex-col justify-between overflow-hidden p-8 md:col-span-2">
              <div className="absolute top-0 right-0 h-64 w-64 rounded-bl-full bg-linear-to-bl from-neutral-100 to-transparent opacity-50 transition-transform duration-500 group-hover:scale-110"></div>
              <div>
                <div className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
                  <MessageSquare className="h-5 w-5 text-neutral-900" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">
                  Natural Language Queries
                </h3>
                <p className="max-w-md text-neutral-500">
                  Stop grepping. Ask &quot;How does the payment retry logic
                  work?&quot; and get a plain English explanation with pointers.
                </p>
              </div>
              <div className="mt-8 flex gap-2">
                <Badge
                  variant="secondary"
                  className="border border-neutral-200 bg-white"
                >
                  Semantic Search
                </Badge>
                <Badge
                  variant="secondary"
                  className="border border-neutral-200 bg-white"
                >
                  Context Aware
                </Badge>
              </div>
            </Card>

            {/* Tall Card with Pretty Code Snippet */}
            <Card className="group border-neutral-900 bg-neutral-950 p-8 text-white md:row-span-2">
              <div className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800 text-white">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Traceable Insights</h3>
              <p className="mb-8 text-neutral-400">
                No hallucinations. Every answer is cited with direct links to
                the specific lines of code.
              </p>
              <div className="relative h-40 w-full overflow-hidden rounded border border-neutral-800 bg-neutral-900 p-3 font-mono text-xs">
                <div className="space-y-1 text-neutral-400">
                  <div className="text-yellow-500">{`{`}</div>
                  <div className="pl-2">
                    <span className="text-blue-400">&quot;file&quot;</span>:{" "}
                    <span className="text-green-400">
                      &quot;payment_svc.ts&quot;
                    </span>
                    ,
                  </div>
                  <div className="pl-2">
                    <span className="text-blue-400">&quot;context&quot;</span>:{" "}
                    <span className="text-green-400">
                      &quot;retry logic&quot;
                    </span>
                    ,
                  </div>
                  <div className="pl-2">
                    <span className="text-blue-400">&quot;lines&quot;</span>: [
                    <span className="text-purple-400">120</span>,{" "}
                    <span className="text-purple-400">145</span>],
                  </div>
                  <div className="pl-2">
                    <span className="text-blue-400">
                      &quot;confidence&quot;
                    </span>
                    : <span className="text-purple-400">0.98</span>
                  </div>
                  <div className="text-yellow-500">{`}`}</div>
                </div>
                <div className="absolute right-3 bottom-3 text-[10px] text-neutral-600">
                  source_map.json
                </div>
              </div>
            </Card>

            {/* Regular Card */}
            <Card className="group relative overflow-hidden p-8">
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-blue-50 blur-2xl transition-colors group-hover:bg-blue-100"></div>
              <div className="relative z-10">
                <div className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
                  <FileSearch className="h-5 w-5 text-neutral-900" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">
                  Intelligent Indexing
                </h3>
                <p className="text-neutral-500">
                  Connect your repository and let AI understand your entire
                  codebase structure instantly.
                </p>
              </div>
            </Card>

            {/* Regular Card */}
            <Card className="group relative overflow-hidden p-8">
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-purple-50 blur-2xl transition-colors group-hover:bg-purple-100"></div>
              <div className="relative z-10">
                <div className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
                  <Shield className="h-5 w-5 text-neutral-900" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">
                  Enterprise Security
                </h3>
                <p className="text-neutral-500">
                  SOC2 compliant. Your code is processed in ephemeral containers
                  and never used for training.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* Steps Section */}
        <section
          className="border-y border-neutral-100 bg-neutral-50/50 py-24"
          id="how-it-works"
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                How it Works
              </h2>
              <p className="text-neutral-500">
                Simple integration. Powerful results.
              </p>
            </div>

            <div className="relative grid gap-8 md:grid-cols-3">
              {/* Connecting Line (Desktop) */}
              <div className="absolute top-12 right-[16%] left-[16%] -z-10 hidden h-0.5 bg-linear-to-r from-neutral-200 via-neutral-200 to-neutral-200 md:block"></div>

              {[
                {
                  title: "Connect",
                  desc: "Link GitHub/GitLab repo",
                  icon: Code2,
                },
                { title: "Analyze", desc: "AI indexes logic flow", icon: Cpu },
                {
                  title: "Ask",
                  desc: "Get instant answers",
                  icon: MessageSquare,
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center bg-white/0 text-center md:bg-transparent"
                >
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-neutral-900 text-white shadow-xl ring-1 ring-neutral-100">
                    <step.icon className="h-8 w-8" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-neutral-900">
                    {step.title}
                  </h3>
                  <p className="text-sm text-neutral-500">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section (Inverted) */}
        <section className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-neutral-900 px-6 py-24 text-center shadow-2xl sm:px-16">
            {/* Abstract background shapes */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 h-80 w-80 rounded-full bg-neutral-800 opacity-50 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-80 w-80 rounded-full bg-neutral-700 opacity-50 blur-3xl"></div>

            <div className="relative z-10 mx-auto max-w-3xl">
              <h2 className="mb-6 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                Ready to debug faster?
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-lg text-neutral-300">
                Join thousands of developers who use CodeContext to understand
                legacy codebases in seconds, not hours.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-12 rounded-full bg-white px-8 text-neutral-900 hover:bg-neutral-200"
                  onClick={() => (window.location.href = "/dashboard")}
                >
                  Start Free Trial
                </Button>
                <div className="flex items-center gap-2 text-sm text-neutral-400 sm:ml-4">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>14-day free trial</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>No CC required</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-100 bg-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="logo" className="h-6 w-auto" />
            </div>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-neutral-500 md:justify-end">
              <a href="#" className="transition-colors hover:text-neutral-900">
                Privacy Policy
              </a>
              <a href="#" className="transition-colors hover:text-neutral-900">
                Terms of Service
              </a>
              <a href="#" className="transition-colors hover:text-neutral-900">
                Twitter
              </a>
              <a href="#" className="transition-colors hover:text-neutral-900">
                GitHub
              </a>
            </div>
            <p className="text-xs text-neutral-400">© 2025 CodeContext Inc.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
