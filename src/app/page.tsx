import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import dynamic from "next/dynamic";
const HoverBorderGradient = dynamic(() =>
  import("@/components/ui/animated-border-button").then((m) => m.HoverBorderGradient),
);
import {
  ArrowRight,
  Bot,
  GitBranch,
  Mic,
  Sparkles,
  Code2,
  MessageSquare,
  Upload,
} from "lucide-react";
import { SmoothScroll } from "@/components/smooth-scroll";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <SmoothScroll>
      <link rel="preload" href="/sky-hero.webp" as="image" type="image/webp" />
      <div className="relative min-h-screen overflow-x-hidden bg-[#080808] text-white">
        {/* ═══════════════════════════════════════════════════════
          GLASSMORPHISM NAVBAR (Compact, floaty, centered pill)
      ═══════════════════════════════════════════════════════ */}
        <div className="fixed top-4 right-0 left-0 z-50 flex justify-center px-4">
          <nav className="flex items-center gap-6 rounded-full border border-white/15 bg-white/10 px-6 py-2.5 shadow-lg shadow-black/10 backdrop-blur-xl">
            <Link href="/" className="flex items-center gap-2">
              <Logo className="h-5 w-auto text-white" />
            </Link>

            {/* Nav links */}
            <div className="hidden items-center gap-6 md:flex">
              {[
                { label: "Features", href: "#features" },
                { label: "AI Q&A", href: "#ask" },
                { label: "Meetings", href: "#meetings" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-[11px] tracking-widest text-white/70 uppercase transition-colors hover:text-white"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/sign-in"
                className="text-[11px] tracking-widest text-white/70 uppercase transition-colors hover:text-white"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Log In
              </Link>
              <Link
                href="/sign-up"
                className="group flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] tracking-widest text-white uppercase backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/20"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Get Started
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </nav>
        </div>

        {/* ═══════════════════════════════════════════════════════
          SECTION 1 — HERO (Sky background, Origin-style)
      ═══════════════════════════════════════════════════════ */}
        <section
          id="hero"
          className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
        >
          {/* Sky hero background */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url('/sky-hero.webp')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div className="hero-overlay absolute inset-0" />

          <div className="relative z-10 mx-auto max-w-4xl px-6 pt-24 text-center">
            {/* Headline */}
            <h1
              className="text-hero mb-8 text-5xl leading-[1.1] font-light tracking-tight text-white sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              <em className="font-normal italic">Understand</em> your codebase.
            </h1>

            {/* Subtitle */}
            <div className="text-hero-sm mb-4 space-y-1">
              <p
                className="text-base font-medium text-white"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                CodeContext is your AI-powered codebase companion.
              </p>
              <p
                className="mx-auto max-w-lg text-sm text-white/80"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Connect a GitHub repo, ask questions in plain English, and get
                answers grounded in your actual code — plus meeting
                transcription and team Q&A.
              </p>
            </div>

            {/* CTA */}
            <div className="mt-10 mb-10 flex justify-center">
              <Link
                href="/sign-up"
                className="btn-glow group inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 py-3 text-xs font-medium tracking-widest text-white uppercase backdrop-blur-md transition-all duration-300 hover:border-white/35 hover:bg-white/20"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Search bar */}
            <Link
              href="/sign-up"
              className="mx-auto flex max-w-xl items-center rounded-2xl border border-white/10 bg-white/10 px-6 py-4 shadow-lg shadow-black/5 backdrop-blur-lg transition-all duration-300 hover:border-white/20 hover:bg-white/15"
            >
              <span
                className="flex-1 text-left text-sm text-white/70"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                How does the authentication flow work?
              </span>
              <div className="ml-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white/80">
                <ArrowRight className="h-4 w-4 -rotate-45" />
              </div>
            </Link>

            {/* Tagline */}
            <p
              className="text-hero-sm mt-8 text-sm font-medium text-white/80"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Track everything. Ask anything.
            </p>

            {/* Feature pills */}
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              {[
                { icon: GitBranch, label: "GitHub repo analysis" },
                { icon: Bot, label: "AI codebase Q&A" },
                { icon: Mic, label: "Meeting transcription" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs text-white/90 backdrop-blur-md"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  <Icon className="h-3.5 w-3.5 text-sky-300" />
                  {label}
                </div>
              ))}
            </div>

            {/* Footer note */}
            <p
              className="text-hero-sm mt-8 text-[10px] tracking-wider text-white/50 uppercase"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Powered by Groq · Cerebras · Gemini · Supabase — all free, no
              credit card required
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
          SECTION 2 — "Explore your code" (Chart visualization like Origin's Forecast)
      ═══════════════════════════════════════════════════════ */}
        <section
          id="features"
          className="relative scroll-mt-16 bg-gradient-to-b from-[#080808] via-[#0a1628] to-[#080808] py-28"
        >
          <div className="mx-auto max-w-5xl px-6 text-center">
            <h2
              className="mb-4 text-4xl leading-tight font-light text-white sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              <em className="font-normal italic">Explore</em> your code
            </h2>
            <p
              className="mx-auto mb-6 max-w-lg text-sm leading-relaxed text-zinc-400"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Watch your codebase come alive — track commits indexed, questions
              answered, and insights generated over time.
            </p>

            {/* Chart visualization card */}
            <div className="glass-strong mt-14 rounded-2xl p-6 text-left sm:p-8">
              <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p
                    className="mb-1 text-[10px] tracking-widest text-zinc-500 uppercase"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Files Indexed
                  </p>
                  <p
                    className="text-2xl font-semibold text-white"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    12,847
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="mb-1 text-[10px] tracking-widest text-zinc-500 uppercase"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Questions Answered
                  </p>
                  <div className="flex items-center gap-2">
                    <p
                      className="text-2xl font-semibold text-white"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      3,291
                    </p>
                    <span className="text-xs text-emerald-400">↗</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    +842 this month (34%)
                  </p>
                </div>
              </div>

              {/* SVG Chart */}
              <div className="relative">
                <svg
                  viewBox="0 0 800 200"
                  className="h-auto w-full"
                  preserveAspectRatio="none"
                >
                  {/* Grid lines */}
                  <line
                    x1="0"
                    y1="50"
                    x2="800"
                    y2="50"
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth="1"
                  />
                  <line
                    x1="0"
                    y1="100"
                    x2="800"
                    y2="100"
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth="1"
                  />
                  <line
                    x1="0"
                    y1="150"
                    x2="800"
                    y2="150"
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth="1"
                  />

                  {/* Area fill */}
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(14,165,233,0.3)" />
                      <stop offset="100%" stopColor="rgba(14,165,233,0)" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,180 C50,175 100,170 150,155 C200,140 250,130 300,110 C350,95 380,90 420,75 C460,60 500,50 550,45 C600,35 650,30 700,25 C750,20 780,18 800,15 L800,200 L0,200 Z"
                    fill="url(#areaGrad)"
                  />

                  {/* Line */}
                  <path
                    d="M0,180 C50,175 100,170 150,155 C200,140 250,130 300,110 C350,95 380,90 420,75 C460,60 500,50 550,45 C600,35 650,30 700,25 C750,20 780,18 800,15"
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="2"
                  />

                  {/* Data point circles */}
                  <circle
                    cx="300"
                    cy="110"
                    r="6"
                    fill="#080808"
                    stroke="#0ea5e9"
                    strokeWidth="2"
                  />
                  <circle
                    cx="550"
                    cy="45"
                    r="6"
                    fill="#080808"
                    stroke="#0ea5e9"
                    strokeWidth="2"
                  />
                </svg>

                {/* X-axis labels */}
                <div className="mt-3 flex justify-between px-1">
                  {[
                    "Week 1",
                    "Week 2",
                    "Week 3",
                    "Week 4",
                    "Week 5",
                    "Week 6",
                  ].map((w) => (
                    <span
                      key={w}
                      className="text-[9px] tracking-wider text-zinc-600 uppercase"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {w}
                    </span>
                  ))}
                </div>

                {/* Y-axis labels */}
                <div className="absolute top-0 right-0 bottom-8 flex flex-col justify-between pr-1 text-right">
                  {["3K", "2K", "1K", "500"].map((v) => (
                    <span
                      key={v}
                      className="text-[9px] text-zinc-600"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
          SECTION 3 — Two-column feature showcase
      ═══════════════════════════════════════════════════════ */}
        <section className="relative bg-[#080808] py-28">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Card 1 — AI Q&A */}
              <div
                id="ask"
                className="group relative scroll-mt-16 overflow-hidden rounded-2xl border border-sky-500/15 bg-linear-to-br from-sky-950/40 via-[#0c1220] to-[#080808] p-7 transition-all duration-500 hover:border-sky-500/30 hover:shadow-[0_0_40px_rgba(14,165,233,0.08)]"
              >
                {/* Corner glow on hover */}
                <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl transition-opacity duration-500 opacity-0 group-hover:opacity-100" />

                <h3
                  className="mb-2 text-2xl font-light text-white sm:text-3xl"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  <em className="font-normal italic">See</em> instant answers
                </h3>
                <p
                  className="mb-6 text-sm leading-relaxed text-zinc-400"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Ask questions in plain English — get precise, source-grounded
                  answers in seconds.
                </p>

                {/* Mock Q&A card */}
                <div className="glass space-y-3 rounded-xl p-4 transition-all duration-300 group-hover:bg-white/6">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 transition-colors duration-300 group-hover:bg-sky-500/20">
                      <Bot className="h-3.5 w-3.5 text-sky-400" />
                    </div>
                    <div>
                      <p
                        className="mb-1 text-xs text-zinc-500"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        AI Answer
                      </p>
                      <p className="text-sm leading-relaxed text-zinc-300">
                        The auth module uses{" "}
                        <code className="rounded bg-white/8 px-1.5 py-0.5 text-xs text-sky-300">
                          middleware.ts
                        </code>{" "}
                        to validate JWT tokens on every protected route. Clerk
                        handles OAuth for social logins, while refresh tokens
                        rotate via…
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-t border-white/6 pt-3">
                    <span
                      className="text-[10px] text-zinc-600"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      3 files referenced
                    </span>
                    <span className="text-[10px] text-zinc-600">•</span>
                    <span
                      className="text-[10px] text-emerald-500"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      98% confidence
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2 — Meeting summaries */}
              <div
                id="meetings"
                className="group relative scroll-mt-16 overflow-hidden rounded-2xl border border-violet-500/15 bg-linear-to-br from-violet-950/40 via-[#130d20] to-[#080808] p-7 transition-all duration-500 hover:border-violet-500/30 hover:shadow-[0_0_40px_rgba(139,92,246,0.08)]"
              >
                {/* Corner glow on hover */}
                <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <h3
                  className="mb-2 text-2xl font-light text-white sm:text-3xl"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  <em className="font-normal italic">Capture</em> every meeting
                </h3>
                <p
                  className="mb-6 text-sm leading-relaxed text-zinc-400"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Upload recordings and get AI-generated summaries with key
                  decisions and action items.
                </p>

                {/* Mock meeting card */}
                <div className="glass space-y-3 rounded-xl p-4 transition-all duration-300 group-hover:bg-white/6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-medium text-white">
                        Sprint Planning — June 2
                      </span>
                    </div>
                    <span
                      className="text-[10px] text-zinc-600"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      47 min
                    </span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { chapter: "API Migration", time: "0:00 – 12:30" },
                      { chapter: "Auth Refactor", time: "12:30 – 28:15" },
                      { chapter: "Component Ownership", time: "28:15 – 47:00" },
                    ].map((item) => (
                      <div
                        key={item.chapter}
                        className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2"
                      >
                        <span className="text-xs text-zinc-300">
                          {item.chapter}
                        </span>
                        <span
                          className="text-[10px] text-zinc-600"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {item.time}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 border-t border-white/6 pt-3">
                    <Sparkles className="h-3 w-3 text-sky-400" />
                    <span
                      className="text-[10px] text-zinc-500"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      3 action items extracted
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
          SECTION 4 — Final CTA
      ═══════════════════════════════════════════════════════ */}
        <section className="relative bg-linear-to-b from-[#080808] via-[#0a0d14] to-[#080808] py-28">
          {/* Top divider line */}
          <div className="absolute top-0 left-1/2 h-px w-[300px] -translate-x-1/2 bg-linear-to-r from-transparent via-white/10 to-transparent" />
          {/* Bottom divider line */}
          <div className="absolute bottom-0 left-1/2 h-px w-[300px] -translate-x-1/2 bg-linear-to-r from-transparent via-white/8 to-transparent" />
          {/* Sky ambient glow */}
          <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/6 blur-[140px]" />
          <div className="absolute top-1/2 right-0 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-violet-600/4 blur-[100px]" />

          <div className="relative mx-auto max-w-3xl px-6 text-center">
            <h2
              className="mb-4 text-4xl leading-tight font-light text-white sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              <em className="font-normal italic">Start</em> building today
            </h2>
            <p
              className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-zinc-400"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Join developers who use CodeContext to understand, navigate, and
              collaborate on codebases faster than ever.
            </p>

            <div className="flex justify-center">
              <HoverBorderGradient as={Link} href="/sign-up">
                Get Started — Free
                <ArrowRight className="h-3.5 w-3.5" />
              </HoverBorderGradient>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
          FOOTER — Origin-style multi-column
      ═══════════════════════════════════════════════════════ */}
        <footer className="border-t border-white/6 bg-[#080808] pt-10 pb-10">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mb-6 flex items-center">
              <Logo className="h-6 w-auto text-[#fafafa]" />
              <span className="text-sm font-semibold text-white">
                CodeContext
              </span>
            </div>
          </div>
        </footer>
      </div>
    </SmoothScroll>
  );
}
