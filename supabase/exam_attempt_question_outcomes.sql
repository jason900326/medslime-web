-- Phase C: preserve every question outcome for topic-level analysis
--
-- `review_items` intentionally keeps only wrong / uncertain questions for review UX.
-- `question_outcomes` is a separate analytics snapshot containing every question in
-- a completed attempt, including correct answers and unanswered items. This lets
-- Pro 2.0 calculate topic accuracy without reconstructing old attempts from the
-- mutable mistake library.

alter table public.exam_attempts
  add column if not exists question_outcomes jsonb not null default '[]'::jsonb;

comment on column public.exam_attempts.question_outcomes is
  'Phase C per-question attempt snapshot. Each item stores canonical national_exam_questions id/key plus answered/correct/uncertain outcome for topic analytics.';
