alter table public.exam_attempts
  add column if not exists review_items jsonb not null default '[]'::jsonb;

comment on column public.exam_attempts.review_items is
  'Snapshot of wrong/uncertain questions for this specific attempt so historical result pages can show exactly what needed review.';
