-- Phase G — Learning Memory
-- Run once after Phase F. This adds mastery progress for manually marked
-- "觀念不熟" questions and an authenticated RPC that updates the streak
-- whenever a completed attempt is saved.

alter table public.user_question_learning_state
  add column if not exists mastery_streak integer not null default 0,
  add column if not exists mastered_at timestamptz,
  add column if not exists last_practiced_at timestamptz;

alter table public.user_question_learning_state
  drop constraint if exists user_question_learning_state_mastery_streak_check;

alter table public.user_question_learning_state
  add constraint user_question_learning_state_mastery_streak_check
  check (mastery_streak between 0 and 3);

comment on column public.user_question_learning_state.mastery_streak is
  'Consecutive confident-correct answers since the learner marked this question concept-unfamiliar. Resets on wrong, skipped, or uncertain answers.';

comment on column public.user_question_learning_state.mastered_at is
  'Set when a concept-unfamiliar question reaches three consecutive confident-correct answers and is automatically cleared.';

comment on column public.user_question_learning_state.last_practiced_at is
  'Last completed attempt that contained this question while it was being tracked as concept-unfamiliar.';

create or replace function public.apply_question_mastery_outcomes(p_outcomes jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_question_key text;
  v_answered boolean;
  v_correct boolean;
  v_uncertain boolean;
  v_current public.user_question_learning_state%rowtype;
  v_next_streak integer;
  v_mastered integer := 0;
  v_updated integer := 0;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_outcomes is null or jsonb_typeof(p_outcomes) <> 'array' then
    return jsonb_build_object('updated', 0, 'mastered', 0);
  end if;

  for v_item in select * from jsonb_array_elements(p_outcomes)
  loop
    v_question_key := nullif(trim(coalesce(v_item->>'questionKey', '')), '');
    if v_question_key is null then
      continue;
    end if;

    select *
      into v_current
      from public.user_question_learning_state
     where user_id = v_user_id
       and question_key = v_question_key
     for update;

    -- Mastery streak exists only to resolve a learner's explicit
    -- "觀念不熟" flag. Questions that are not currently flagged are ignored.
    if not found or not v_current.concept_unfamiliar then
      continue;
    end if;

    v_answered := coalesce((v_item->>'answered')::boolean, false);
    v_uncertain := coalesce((v_item->>'uncertain')::boolean, false);
    v_correct := case
      when v_item ? 'correct' and v_item->>'correct' is not null
        then (v_item->>'correct')::boolean
      else false
    end;

    if v_answered and v_correct and not v_uncertain then
      v_next_streak := least(3, coalesce(v_current.mastery_streak, 0) + 1);
    else
      v_next_streak := 0;
    end if;

    if v_next_streak >= 3 then
      update public.user_question_learning_state
         set concept_unfamiliar = false,
             mastery_streak = 3,
             mastered_at = now(),
             last_practiced_at = now(),
             updated_at = now()
       where user_id = v_user_id
         and question_key = v_question_key;
      v_mastered := v_mastered + 1;
    else
      update public.user_question_learning_state
         set mastery_streak = v_next_streak,
             mastered_at = null,
             last_practiced_at = now(),
             updated_at = now()
       where user_id = v_user_id
         and question_key = v_question_key;
    end if;

    v_updated := v_updated + 1;
  end loop;

  return jsonb_build_object('updated', v_updated, 'mastered', v_mastered);
end;
$$;

grant execute on function public.apply_question_mastery_outcomes(jsonb) to authenticated;
