-- MedSlime 2.0: remove the retired slime fragment/accessory state.
--
-- Run this after the application code no longer creates or depends on:
--   fragments
--   accessoryUnlocked
--   accessoryEquipped
--
-- The migration is intentionally conservative:
-- 1. It creates a one-time backup in medslime_legacy.
-- 2. It keeps owned/nickname and every unrelated game-state field intact.
-- 3. It removes retired accessory achievement ids from claimedAchievementIds.
-- 4. It is safe to run more than once.

begin;

create schema if not exists medslime_legacy;

create table if not exists medslime_legacy.player_account_state_before_accessory_cleanup
as
select *
from public.player_account_state;

update public.player_account_state as pas
set
  state = jsonb_set(
    jsonb_set(
      pas.state,
      '{slimes}',
      case
        when jsonb_typeof(pas.state -> 'slimes') = 'object' then
          coalesce(
            (
              select jsonb_object_agg(
                slime.key,
                slime.value
                  - 'fragments'
                  - 'accessoryUnlocked'
                  - 'accessoryEquipped'
              )
              from jsonb_each(pas.state -> 'slimes') as slime(key, value)
            ),
            '{}'::jsonb
          )
        else '{}'::jsonb
      end,
      true
    ),
    '{claimedAchievementIds}',
    case
      when jsonb_typeof(pas.state -> 'claimedAchievementIds') = 'array' then
        coalesce(
          (
            select jsonb_agg(claim.value)
            from jsonb_array_elements_text(
              pas.state -> 'claimedAchievementIds'
            ) as claim(value)
            where claim.value not in (
              'accessory-first',
              'special-ssr-accessory'
            )
          ),
          '[]'::jsonb
        )
      else '[]'::jsonb
    end,
    true
  ),
  updated_at = now();

commit;

-- Verification ---------------------------------------------------------------
-- Both values should be 0 after the migration.

select count(*) as rows_with_legacy_slime_accessory_fields
from public.player_account_state as pas
where exists (
  select 1
  from jsonb_each(
    case
      when jsonb_typeof(pas.state -> 'slimes') = 'object'
        then pas.state -> 'slimes'
      else '{}'::jsonb
    end
  ) as slime(key, value)
  where slime.value ? 'fragments'
     or slime.value ? 'accessoryUnlocked'
     or slime.value ? 'accessoryEquipped'
);

select count(*) as rows_with_retired_accessory_achievement_ids
from public.player_account_state as pas
where exists (
  select 1
  from jsonb_array_elements_text(
    case
      when jsonb_typeof(pas.state -> 'claimedAchievementIds') = 'array'
        then pas.state -> 'claimedAchievementIds'
      else '[]'::jsonb
    end
  ) as claim(value)
  where claim.value in ('accessory-first', 'special-ssr-accessory')
);

-- Optional spot check: inspect simplified slime state.
select
  user_id,
  state -> 'slimes' as slimes,
  state -> 'claimedAchievementIds' as claimed_achievement_ids
from public.player_account_state
order by updated_at desc
limit 10;
