-- MedSlime 2.0: one-time 14-day MedSlime Pro free trial.
--
-- Behavior:
--   * Existing accounts receive 14 free days when this migration is applied.
--   * Future accounts receive 14 free days automatically at signup.
--   * The grant is one-time per auth user, tracked by pro_trial_granted_at.
--   * If an account already has active Pro time, the 14 free days are appended
--     instead of replacing or shortening the existing entitlement.
--   * Paid Pro keeps using pro_expires_at, so buying 30 days during the trial
--     naturally extends from the current expiry.

begin;

alter table public.player_entitlements
  add column if not exists pro_trial_granted_at timestamptz;

comment on column public.player_entitlements.pro_trial_granted_at is
  'Timestamp when the account received its one-time 14-day MedSlime Pro trial.';

create or replace function public.grant_new_user_pro_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.player_entitlements (
    user_id,
    pro_expires_at,
    pro_trial_granted_at,
    updated_at
  ) values (
    new.id,
    now() + interval '14 days',
    now(),
    now()
  )
  on conflict (user_id) do update
    set pro_expires_at = case
          when public.player_entitlements.pro_trial_granted_at is null then
            greatest(
              coalesce(public.player_entitlements.pro_expires_at, now()),
              now()
            ) + interval '14 days'
          else public.player_entitlements.pro_expires_at
        end,
        pro_trial_granted_at = coalesce(
          public.player_entitlements.pro_trial_granted_at,
          now()
        ),
        updated_at = case
          when public.player_entitlements.pro_trial_granted_at is null then now()
          else public.player_entitlements.updated_at
        end;

  return new;
end;
$$;

revoke all on function public.grant_new_user_pro_trial()
  from public, anon, authenticated;

-- Supabase Auth lives in the auth schema; this trigger covers email/password and
-- OAuth signups without coupling the trial to one particular frontend flow.
drop trigger if exists medslime_new_user_pro_trial on auth.users;

create trigger medslime_new_user_pro_trial
after insert on auth.users
for each row
execute function public.grant_new_user_pro_trial();

-- Give the same one-time launch trial to accounts that already existed before
-- this migration. The WHERE clause makes this backfill idempotent.
insert into public.player_entitlements (
  user_id,
  pro_expires_at,
  pro_trial_granted_at,
  updated_at
)
select
  users.id,
  now() + interval '14 days',
  now(),
  now()
from auth.users as users
on conflict (user_id) do update
  set pro_expires_at = greatest(
        coalesce(public.player_entitlements.pro_expires_at, now()),
        now()
      ) + interval '14 days',
      pro_trial_granted_at = now(),
      updated_at = now()
where public.player_entitlements.pro_trial_granted_at is null;

commit;

-- VERIFY ----------------------------------------------------------------------
select
  count(*) as entitlement_rows,
  count(*) filter (where pro_trial_granted_at is not null) as trial_grants,
  count(*) filter (where pro_expires_at > now()) as active_pro
from public.player_entitlements;
