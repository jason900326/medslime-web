-- Phase C: question topic taxonomy foundation
--
-- Adds stable topic metadata directly to the canonical national exam question bank.
-- Classification is one-time/shared per question; it is not user-specific and must
-- never be regenerated for every learner attempt.

alter table public.national_exam_questions
  add column if not exists topic text,
  add column if not exists subtopic text,
  add column if not exists concepts text[] not null default '{}',
  add column if not exists taxonomy_status text not null default 'pending',
  add column if not exists taxonomy_confidence numeric(4,3),
  add column if not exists taxonomy_version text,
  add column if not exists taxonomy_model text,
  add column if not exists taxonomy_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'national_exam_questions_taxonomy_status_check'
      and conrelid = 'public.national_exam_questions'::regclass
  ) then
    alter table public.national_exam_questions
      add constraint national_exam_questions_taxonomy_status_check
      check (taxonomy_status in ('pending', 'classified', 'needs_review'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'national_exam_questions_taxonomy_confidence_check'
      and conrelid = 'public.national_exam_questions'::regclass
  ) then
    alter table public.national_exam_questions
      add constraint national_exam_questions_taxonomy_confidence_check
      check (
        taxonomy_confidence is null
        or (taxonomy_confidence >= 0 and taxonomy_confidence <= 1)
      );
  end if;
end
$$;

create index if not exists national_exam_questions_taxonomy_status_idx
  on public.national_exam_questions (taxonomy_status);

create index if not exists national_exam_questions_subject_topic_idx
  on public.national_exam_questions (subject, topic)
  where taxonomy_status = 'classified';

comment on column public.national_exam_questions.topic is
  'Canonical broad topic used by MedSlime Pro topic-level analysis.';

comment on column public.national_exam_questions.subtopic is
  'More specific topic label under topic; stable enough for weakness analysis.';

comment on column public.national_exam_questions.concepts is
  'Small set of key concepts tested by the question. English medical terms may be retained when standard.';

comment on column public.national_exam_questions.taxonomy_status is
  'pending = not classified, classified = usable, needs_review = classifier uncertainty or catalog mismatch.';

comment on column public.national_exam_questions.taxonomy_version is
  'Classification prompt/catalog version, currently topic-taxonomy-v1.';
