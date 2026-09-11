-- Phase F — Exam Review & Adaptive Explanation
-- Run this once in the MedSlime Supabase SQL editor before testing Phase F.

-- 1) Preserve the full question set for each attempt when available.
alter table public.exam_attempts
  add column if not exists question_items jsonb not null default '[]'::jsonb;

comment on column public.exam_attempts.question_items is
  'Full per-question snapshot for this attempt: stem, options, official answer, user answer, uncertainty and source metadata.';

-- 2) Persistent user-owned learning memory attached to the canonical question key.
create table if not exists public.user_question_learning_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_key text not null,
  concept_unfamiliar boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, question_key)
);

create index if not exists user_question_learning_state_user_updated_idx
  on public.user_question_learning_state (user_id, updated_at desc);

alter table public.user_question_learning_state enable row level security;

drop policy if exists "users can read own question learning state"
  on public.user_question_learning_state;
create policy "users can read own question learning state"
  on public.user_question_learning_state
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert own question learning state"
  on public.user_question_learning_state;
create policy "users can insert own question learning state"
  on public.user_question_learning_state
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update own question learning state"
  on public.user_question_learning_state;
create policy "users can update own question learning state"
  on public.user_question_learning_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.user_question_learning_state to authenticated;

comment on table public.user_question_learning_state is
  'Persistent user-owned flags and notes keyed by canonical question_key.';
