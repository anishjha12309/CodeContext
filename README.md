<div align="center">

# CodeContext

**AI-powered codebase understanding for development teams.**

Ask questions about any GitHub repository in plain English, get instant AI-generated commit summaries, and turn meeting recordings into searchable transcripts — all in one place.

[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)

</div>

---

## What it does

Connect a GitHub repository and CodeContext will:

1. **Index your codebase** — every file is summarised by an LLM and stored as a vector embedding
2. **Answer questions** — ask anything in plain English; semantic search finds the relevant files and streams a grounded answer back
3. **Summarise commits** — recent commits are automatically explained in plain language
4. **Transcribe meetings** — upload an audio recording and get an AI-generated chapter breakdown with timestamps

Everything is gated behind a simple credit system and protected per-project so teams can collaborate without stepping on each other's data.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| API | tRPC 11 + React Query 5, SuperJSON |
| Auth | Clerk |
| Database & Storage | Supabase (Postgres + pgvector + file storage) |
| AI — Q&A | Groq · LLaMA 3.3-70B |
| AI — Code summaries | Cerebras · llama-4-scout-17b |
| AI — Embeddings | Google Gemini · text-embedding-001 (3072 dims) |
| AI — Transcription | Groq · Whisper large-v3 |
| Payments | Razorpay (INR, 1 INR = 1 credit) |
| Styling | Tailwind CSS v4, Radix UI, Motion |

---

## Features

### Codebase Q&A
Ask questions about your repository in plain English. Each question embeds the query via Gemini, runs a pgvector similarity search over indexed source files, and streams a context-grounded answer via Groq. File references are shown alongside the answer and can be saved for later.

### Commit Intelligence
Recent commits are fetched from GitHub and summarised using LLaMA, giving every team member a plain-English changelog without reading diffs.

### Meeting Transcription
Upload an `.mp3` or `.wav` recording. Groq Whisper transcribes it, then the transcript is automatically segmented into named chapters with start/end timestamps — making long meetings easy to navigate.

### Team Collaboration
Invite teammates to a project via a shareable link. Saved Q&A sessions are visible to all members, creating a living knowledge base for the codebase.

### Credit System
- Creating a project costs **50 credits**
- Asking a question costs **1 credit**
- Credits are purchased in-app via Razorpay

---

## Getting started

### Prerequisites

- [Bun](https://bun.sh) (or Node.js ≥ 18)
- A [Supabase](https://supabase.com) project with pgvector enabled
- A [Clerk](https://clerk.com) application
- API keys for [Groq](https://console.groq.com), [Cerebras](https://cloud.cerebras.ai), and [Google AI Studio](https://aistudio.google.com)
- A [Razorpay](https://razorpay.com) test account

### 1. Clone and install

```bash
git clone https://github.com/your-username/codecontext.git
cd codecontext
bun install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in every variable in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# AI providers
GROQ_API_KEY=
CEREBRAS_API_KEY=
GEMINI_API_KEY=

# GitHub (optional — required for private repos)
GITHUB_TOKEN=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
```

### 3. Set up the database

Run the following SQL in your Supabase SQL editor to create the required tables, enable pgvector, and create the helper RPCs (`match_source_code`, `increment_credits`, `decrement_credits`). Schema files are in `supabase/`.

### 4. Start the dev server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Development commands

```bash
bun dev           # Start dev server with hot reload
bun build         # Production build
bun start         # Run production server
bun check         # Lint + TypeScript check
bun typecheck     # TypeScript only
bun lint:fix      # ESLint with auto-fix
bun format:write  # Prettier
```

---

## Project structure

```
src/
├── app/
│   ├── (auth)/              # Clerk sign-in / sign-up
│   ├── (protected)/         # Authenticated routes
│   │   ├── dashboard/       # Project overview + commit feed
│   │   ├── qa/              # Codebase Q&A interface
│   │   ├── meetings/        # Meeting upload + transcripts
│   │   ├── billing/         # Credit purchase
│   │   └── create/          # New project form
│   └── api/
│       ├── trpc/            # tRPC handler
│       ├── razorpay/        # Payment endpoints
│       ├── upload-meeting/  # Audio upload
│       └── process-meeting/ # Transcription pipeline
├── server/api/
│   ├── trpc.ts              # Context + middleware
│   └── routers/project.ts  # All tRPC procedures
├── lib/
│   ├── github-loader.ts     # Repo indexing pipeline
│   ├── github.ts            # Commit polling
│   ├── groq.ts              # LLM + Whisper
│   ├── cerebras.ts          # Code summarisation
│   ├── gemini.ts            # Vector embeddings
│   └── supabase.ts          # DB clients
└── hooks/
    └── use-project.ts       # Active project (localStorage)
```

---

## How the indexing pipeline works

```
GitHub repo URL
      │
      ▼
Fetch files (batches of 10, max 50 files)
      │
      ▼
Summarise each file via Cerebras (batches of 10)
      │
      ▼
Generate vector embeddings via Gemini (batches of 25)
      │
      ▼
Insert into Supabase source_code_embeddings (pgvector)
```

Q&A queries embed the question, run a cosine similarity search, and stream the answer back through Groq.

---

## License

MIT
