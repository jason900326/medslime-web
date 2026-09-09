-- MedSlime 2.0: national-exam attempt history + fixed 30-day Pro entitlement.
-- Run once in Supabase SQL Editor after deploying the matching app changes.

alter table public.player_entitlements
  add column if not exists pro_expires_at timestamptz;

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year text not null,
  session text not null,
  subject text not null,
  exam_key text not null,
  answered_count integer not null default 0 check (answered_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  score numeric(6,2) not null default 0,
  review_count integer not null default 0 check (review_count >= 0),
  uncertain_count integer not null default 0 check (uncertain_count >= 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists exam_attempts_user_completed_idx
  on public.exam_attempts (user_id, completed_at desc);

create index if not exists exam_attempts_user_exam_idx
  on public.exam_attempts (user_id, exam_key, completed_at desc);

alter table public.exam_attempts enable row level security;

-- Recreate policies idempotently.
drop policy if exists "exam_attempts_select_own" on public.exam_attempts;
drop policy if exists "exam_attempts_insert_own" on public.exam_attempts;
drop policy if exists "exam_attempts_delete_own" on public.exam_attempts;

create policy "exam_attempts_select_own"
  on public.exam_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "exam_attempts_insert_own"
  on public.exam_attempts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "exam_attempts_delete_own"
  on public.exam_attempts
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.exam_attempts to authenticated;

comment on table public.exam_attempts is
  'One row per completed national-exam attempt. Used for history, score trends and Pro analysis.';

comment on column public.player_entitlements.pro_expires_at is
  'Fixed-term MedSlime Pro access expiry. Null or past means no active Pro access.';
