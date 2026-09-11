-- Phase F: preserve the full question set for each attempt so review can show
-- every question exactly as the student saw it, including free quizzes.

alter table public.exam_attempts
  add column if not exists question_items jsonb not null default '[]'::jsonb;

comment on column public.exam_attempts.question_items is
  'Full per-question snapshot for this attempt: stem, options, official answer, user answer, uncertainty and source metadata.';
