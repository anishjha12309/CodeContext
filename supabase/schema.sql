-- ============================================================
-- CodeContext — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable pgvector extension (pre-enabled on Supabase)
create extension if not exists vector;

-- ----------------------------------------------------------------
-- Users (synced from Clerk on first login)
-- ----------------------------------------------------------------
create table if not exists users (
  id           text primary key,          -- Clerk user ID
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  image_url    text,
  first_name   text,
  last_name    text,
  email_address text unique not null,
  credits      int default 150
);

-- ----------------------------------------------------------------
-- Projects
-- ----------------------------------------------------------------
create table if not exists projects (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  name        text not null,
  github_url  text not null,
  deleted_at  timestamptz
);

-- ----------------------------------------------------------------
-- User ↔ Project membership
-- ----------------------------------------------------------------
create table if not exists user_to_projects (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz default now(),
  user_id     text not null references users(id),
  project_id  text not null references projects(id),
  unique(user_id, project_id)
);

-- ----------------------------------------------------------------
-- Commits (with AI summaries)
-- ----------------------------------------------------------------
create table if not exists commits (
  id                   text primary key default gen_random_uuid()::text,
  created_at           timestamptz default now(),
  project_id           text not null references projects(id),
  commit_hash          text not null,
  commit_message       text not null,
  commit_author_name   text not null,
  commit_author_avatar text not null,
  commit_date          timestamptz not null,
  summary              text not null
);

-- ----------------------------------------------------------------
-- Source Code Embeddings (for semantic search)
-- ----------------------------------------------------------------
create table if not exists source_code_embeddings (
  id                text primary key default gen_random_uuid()::text,
  project_id        text not null references projects(id),
  file_name         text not null,
  source_code       text not null,
  summary           text not null,
  summary_embedding vector(3072)
);

create index if not exists source_code_embeddings_project_idx
  on source_code_embeddings(project_id);

-- ----------------------------------------------------------------
-- Questions (saved Q&A)
-- ----------------------------------------------------------------
create table if not exists questions (
  id               text primary key default gen_random_uuid()::text,
  created_at       timestamptz default now(),
  question         text not null,
  answer           text not null,
  files_references jsonb,
  project_id       text not null references projects(id),
  user_id          text not null references users(id)
);

-- ----------------------------------------------------------------
-- Meetings
-- ----------------------------------------------------------------
create table if not exists meetings (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  name        text not null,
  meeting_url text not null,
  project_id  text not null references projects(id),
  status      text default 'PROCESSING' check (status in ('PROCESSING', 'COMPLETED', 'FAILED'))
);

-- ----------------------------------------------------------------
-- Issues (meeting chapters, generated from transcript)
-- ----------------------------------------------------------------
create table if not exists issues (
  id          text primary key default gen_random_uuid()::text,
  created_at  timestamptz default now(),
  start_time  text not null,
  end_time    text not null,
  gist        text not null,
  headline    text not null,
  summary     text not null,
  meeting_id  text not null references meetings(id) on delete cascade
);

-- ----------------------------------------------------------------
-- Transactions (Razorpay payment records)
-- ----------------------------------------------------------------
create table if not exists transactions (
  id                    text primary key default gen_random_uuid()::text,
  created_at            timestamptz default now(),
  razorpay_order_id     text unique not null,
  razorpay_payment_id   text,
  razorpay_signature    text,
  amount                int not null,   -- amount in paise
  credits               int not null,   -- credits purchased
  status                text default 'PENDING' check (status in ('PENDING', 'SUCCESS', 'FAILED')),
  user_id               text not null references users(id)
);

-- ----------------------------------------------------------------
-- Vector similarity search function
-- ----------------------------------------------------------------
create or replace function match_source_code(
  query_embedding   vector(3072),
  match_threshold   float,
  match_count       int,
  p_project_id      text
)
returns table (
  id          text,
  file_name   text,
  source_code text,
  summary     text,
  similarity  float
)
language sql stable
as $$
  select
    id,
    file_name,
    source_code,
    summary,
    1 - (summary_embedding <=> query_embedding) as similarity
  from source_code_embeddings
  where project_id = p_project_id
    and summary_embedding is not null
    and 1 - (summary_embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;

-- ----------------------------------------------------------------
-- Vector embedding updater (called after insert to set pgvector column)
-- ----------------------------------------------------------------
create or replace function set_embedding(p_id text, p_embedding text)
returns void language plpgsql as $$
begin
  execute format(
    'update source_code_embeddings set summary_embedding = %L::vector where id = %L',
    p_embedding, p_id
  );
end;
$$;

-- ----------------------------------------------------------------
-- Atomic credit helpers (used from server to avoid race conditions)
-- ----------------------------------------------------------------
create or replace function decrement_credits(p_user_id text, p_amount int)
returns void language sql as $$
  update users set credits = credits - p_amount, updated_at = now()
  where id = p_user_id;
$$;

create or replace function increment_credits(p_user_id text, p_amount int)
returns void language sql as $$
  update users set credits = credits + p_amount, updated_at = now()
  where id = p_user_id;
$$;
