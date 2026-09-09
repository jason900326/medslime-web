-- MedSlime Supabase legacy cleanup (stage 1)
--
-- Goal:
--   Keep the public schema focused on tables used by the current app while
--   preserving old data for rollback/audit during the MedSlime 2.0 migration.
--
-- IMPORTANT:
--   This script DOES NOT DROP DATA. It moves confirmed legacy tables from
--   public -> medslime_legacy. Keep that schema until MedSlime 2.0 is stable.
--
-- Current source-of-truth notes from the default branch:
--   * Game state:         public.player_account_state
--   * Mistakes:           public.player_mistakes
--   * AI entitlement:     public.player_entitlements
--   * National exam data: public.national_exam_questions
--   * AI caches/events:   public.shared_ai_explanations,
--                        public.ai_question_explanations,
--                        public.ai_explanation_events,
--                        public.ai_explanation_feedback,
--                        public.material_analysis_cache
--
-- Legacy/archive candidates below have no current default-branch application
-- references found during the 2026-09-09 cleanup audit.

-- -----------------------------------------------------------------------------
-- 1) PRE-FLIGHT: inspect tables + approximate row counts
-- -----------------------------------------------------------------------------

with legacy_candidates(table_name) as (
  select unnest(array[
    'achievement_claims',
    'ai_explanation_usage',
    'documents',
    'focus_sessions',
    'generated_exams',
    'mistakes',
    'player_game_state',
    'player_slimes',
    'player_task_claims',
    'player_task_events',
    'player_task_quiz_events'
  ]::text[])
)
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.reltuples::bigint as estimated_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join legacy_candidates lc on lc.table_name = c.relname
where c.relkind in ('r', 'p')
  and n.nspname = 'public'
order by c.relname;

-- -----------------------------------------------------------------------------
-- 2) PRE-FLIGHT: active public tables must not FK into archive candidates
--    Expected result before proceeding: 0 rows
-- -----------------------------------------------------------------------------

with legacy_candidates(table_name) as (
  select unnest(array[
    'achievement_claims',
    'ai_explanation_usage',
    'documents',
    'focus_sessions',
    'generated_exams',
    'mistakes',
    'player_game_state',
    'player_slimes',
    'player_task_claims',
    'player_task_events',
    'player_task_quiz_events'
  ]::text[])
)
select
  child_ns.nspname as referencing_schema,
  child.relname as referencing_table,
  con.conname as constraint_name,
  parent.relname as referenced_legacy_table
from pg_constraint con
join pg_class child on child.oid = con.conrelid
join pg_namespace child_ns on child_ns.oid = child.relnamespace
join pg_class parent on parent.oid = con.confrelid
join pg_namespace parent_ns on parent_ns.oid = parent.relnamespace
join legacy_candidates lc on lc.table_name = parent.relname
where con.contype = 'f'
  and parent_ns.nspname = 'public'
  and child_ns.nspname = 'public'
  and child.relname not in (
    'achievement_claims',
    'ai_explanation_usage',
    'documents',
    'focus_sessions',
    'generated_exams',
    'mistakes',
    'player_game_state',
    'player_slimes',
    'player_task_claims',
    'player_task_events',
    'player_task_quiz_events'
  )
order by child.relname, con.conname;

-- -----------------------------------------------------------------------------
-- 3) PRE-FLIGHT: find views/materialized views that mention a legacy table name
--    Review any rows before archiving.
-- -----------------------------------------------------------------------------

with legacy_candidates(table_name) as (
  select unnest(array[
    'achievement_claims',
    'ai_explanation_usage',
    'documents',
    'focus_sessions',
    'generated_exams',
    'mistakes',
    'player_game_state',
    'player_slimes',
    'player_task_claims',
    'player_task_events',
    'player_task_quiz_events'
  ]::text[])
)
select
  v.schemaname,
  v.viewname,
  lc.table_name as matched_legacy_table
from pg_views v
cross join legacy_candidates lc
where v.schemaname = 'public'
  and v.definition ilike '%' || lc.table_name || '%'
union all
select
  mv.schemaname,
  mv.matviewname,
  lc.table_name
from pg_matviews mv
cross join legacy_candidates lc
where mv.schemaname = 'public'
  and mv.definition ilike '%' || lc.table_name || '%'
order by 1, 2, 3;

-- -----------------------------------------------------------------------------
-- 4) PRE-FLIGHT: find SQL/PLpgSQL functions whose source text mentions a legacy
--    table. Review any rows before archiving.
-- -----------------------------------------------------------------------------

with legacy_candidates(table_name) as (
  select unnest(array[
    'achievement_claims',
    'ai_explanation_usage',
    'documents',
    'focus_sessions',
    'generated_exams',
    'mistakes',
    'player_game_state',
    'player_slimes',
    'player_task_claims',
    'player_task_events',
    'player_task_quiz_events'
  ]::text[])
)
select distinct
  n.nspname as function_schema,
  p.proname as function_name,
  lc.table_name as matched_legacy_table
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join legacy_candidates lc
where n.nspname = 'public'
  and pg_get_functiondef(p.oid) ilike '%' || lc.table_name || '%'
order by 1, 2, 3;

-- -----------------------------------------------------------------------------
-- 5) ARCHIVE: reversible move out of public
-- -----------------------------------------------------------------------------

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create schema if not exists medslime_legacy;
comment on schema medslime_legacy is
  'Archived MedSlime tables from pre-2.0 schemas. Not used by the current app; retained temporarily for rollback/audit.';

-- Do not expose archived tables through normal client roles.
revoke all on schema medslime_legacy from anon;
revoke all on schema medslime_legacy from authenticated;

do $$
declare
  v_table text;
  v_oid regclass;
  v_conflicts integer;
  v_candidates text[] := array[
    'achievement_claims',
    'ai_explanation_usage',
    'documents',
    'focus_sessions',
    'generated_exams',
    'mistakes',
    'player_game_state',
    'player_slimes',
    'player_task_claims',
    'player_task_events',
    'player_task_quiz_events'
  ];
begin
  foreach v_table in array v_candidates loop
    v_oid := to_regclass(format('public.%I', v_table));

    if v_oid is null then
      raise notice 'Skipping %, table not found in public.', v_table;
      continue;
    end if;

    if to_regclass(format('medslime_legacy.%I', v_table)) is not null then
      raise exception
        'Cannot archive %. medslime_legacy.% already exists.',
        v_table,
        v_table;
    end if;

    select count(*)
      into v_conflicts
    from pg_constraint con
    join pg_class child on child.oid = con.conrelid
    join pg_namespace child_ns on child_ns.oid = child.relnamespace
    where con.contype = 'f'
      and con.confrelid = v_oid
      and child_ns.nspname = 'public'
      and child.relname <> all(v_candidates);

    if v_conflicts > 0 then
      raise exception
        'Cannot archive %. It is still referenced by % FK(s) from active public tables.',
        v_table,
        v_conflicts;
    end if;

    execute format('alter table public.%I set schema medslime_legacy', v_table);
    execute format(
      'comment on table medslime_legacy.%I is %L',
      v_table,
      'Archived by supabase/cleanup_legacy_schema.sql. Restore to public only for an intentional rollback.'
    );

    raise notice 'Archived public.% -> medslime_legacy.%', v_table, v_table;
  end loop;
end $$;

commit;

-- -----------------------------------------------------------------------------
-- 6) VERIFY
-- -----------------------------------------------------------------------------

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;

select table_name
from information_schema.tables
where table_schema = 'medslime_legacy'
  and table_type = 'BASE TABLE'
order by table_name;

-- Do NOT DROP medslime_legacy yet.
-- Keep it through the MedSlime 2.0 migration and a stable-production window.
