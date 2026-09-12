-- MedSlime signup campaign: 2026-09-12 00:00 through 2026-09-25 23:59:59 Asia/Taipei.
-- Eligible accounts receive a one-time 14-day Pro trial from signup and may claim
-- one welcome gift of 10 gameplay-only gacha tickets.

begin;

alter table public.player_entitlements
  add column if not exists welcome_gift_claimed_at timestamptz;

-- Undo the broad backfill from the first trial migration for accounts that were
-- created before this campaign. If the row was trial-only, restore no Pro expiry;
-- if an active paid Pro period had been extended, subtract only the 14-day gift.
update public.player_entitlements e
set pro_expires_at = case
      when e.pro_expires_at is null then null
      when abs(
        extract(
          epoch from (
            (e.pro_expires_at - e.pro_trial_granted_at) - interval '14 days'
          )
        )
      ) <= 300
        then null
      else e.pro_expires_at - interval '14 days'
    end,
    pro_trial_granted_at = null,
    updated_at = now()
from auth.users u
where u.id = e.user_id
  and e.pro_trial_granted_at is not null
  and (
    u.created_at < timestamptz '2026-09-12 00:00:00+08'
    or u.created_at >= timestamptz '2026-09-26 00:00:00+08'
  );

-- If this migration is applied after the campaign has already started, backfill
-- only users whose signup timestamp falls inside the exact campaign window.
insert into public.player_entitlements (
  user_id,
  pro_expires_at,
  pro_trial_granted_at,
  updated_at
)
select
  u.id,
  u.created_at + interval '14 days',
  now(),
  now()
from auth.users u
where u.created_at >= timestamptz '2026-09-12 00:00:00+08'
  and u.created_at < timestamptz '2026-09-26 00:00:00+08'
on conflict (user_id) do nothing;

update public.player_entitlements e
set pro_expires_at = greatest(
      coalesce(e.pro_expires_at, u.created_at),
      u.created_at
    ) + interval '14 days',
    pro_trial_granted_at = now(),
    updated_at = now()
from auth.users u
where u.id = e.user_id
  and u.created_at >= timestamptz '2026-09-12 00:00:00+08'
  and u.created_at < timestamptz '2026-09-26 00:00:00+08'
  and e.pro_trial_granted_at is null;

create or replace function public.grant_new_user_pro_trial()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.created_at < timestamptz '2026-09-12 00:00:00+08'
     or new.created_at >= timestamptz '2026-09-26 00:00:00+08' then
    return new;
  end if;

  insert into public.player_entitlements (
    user_id,
    pro_expires_at,
    pro_trial_granted_at,
    updated_at
  ) values (
    new.id,
    new.created_at + interval '14 days',
    now(),
    now()
  )
  on conflict (user_id) do update
  set pro_expires_at = case
        when public.player_entitlements.pro_trial_granted_at is null then
          greatest(
            coalesce(public.player_entitlements.pro_expires_at, new.created_at),
            new.created_at
          ) + interval '14 days'
        else public.player_entitlements.pro_expires_at
      end,
      pro_trial_granted_at = coalesce(
        public.player_entitlements.pro_trial_granted_at,
        now()
      ),
      updated_at = now();

  return new;
end;
$$;

-- Keep the existing trigger name, but the function now has a hard campaign cutoff.
drop trigger if exists medslime_new_user_pro_trial on auth.users;
create trigger medslime_new_user_pro_trial
after insert on auth.users
for each row
execute function public.grant_new_user_pro_trial();

-- Server-only, one-time welcome gift claim. Eligibility is based on immutable
-- auth.users.created_at, not the current date, so an eligible user can claim later.
create or replace function public.claim_campaign_welcome_gift(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_created_at timestamptz;
  v_claimed_at timestamptz;
  v_ticket_total integer := 0;
begin
  select created_at
    into v_created_at
  from auth.users
  where id = p_user_id;

  if not found
     or v_created_at < timestamptz '2026-09-12 00:00:00+08'
     or v_created_at >= timestamptz '2026-09-26 00:00:00+08' then
    return jsonb_build_object(
      'eligible', false,
      'claimed', false,
      'alreadyClaimed', false,
      'ticketsAdded', 0,
      'ticketTotal', 0
    );
  end if;

  insert into public.player_entitlements (user_id, updated_at)
  values (p_user_id, now())
  on conflict (user_id) do nothing;

  select welcome_gift_claimed_at
    into v_claimed_at
  from public.player_entitlements
  where user_id = p_user_id
  for update;

  if v_claimed_at is not null then
    select case
      when jsonb_typeof(state->'tickets') = 'number'
        then greatest(0, (state->>'tickets')::integer)
      else 0
    end
      into v_ticket_total
    from public.player_account_state
    where user_id = p_user_id;

    return jsonb_build_object(
      'eligible', true,
      'claimed', true,
      'alreadyClaimed', true,
      'ticketsAdded', 0,
      'ticketTotal', coalesce(v_ticket_total, 0)
    );
  end if;

  insert into public.player_account_state (user_id, state, updated_at)
  values (
    p_user_id,
    jsonb_build_object('tickets', 10),
    now()
  )
  on conflict (user_id) do update
  set state = jsonb_set(
        coalesce(public.player_account_state.state, '{}'::jsonb),
        '{tickets}',
        to_jsonb(
          greatest(
            0,
            case
              when jsonb_typeof(public.player_account_state.state->'tickets') = 'number'
                then (public.player_account_state.state->>'tickets')::integer
              else 0
            end
          ) + 10
        ),
        true
      ),
      updated_at = now();

  update public.player_entitlements
  set welcome_gift_claimed_at = now(),
      updated_at = now()
  where user_id = p_user_id;

  select case
    when jsonb_typeof(state->'tickets') = 'number'
      then greatest(0, (state->>'tickets')::integer)
    else 0
  end
    into v_ticket_total
  from public.player_account_state
  where user_id = p_user_id;

  return jsonb_build_object(
    'eligible', true,
    'claimed', true,
    'alreadyClaimed', false,
    'ticketsAdded', 10,
    'ticketTotal', coalesce(v_ticket_total, 10)
  );
end;
$$;

revoke all on function public.claim_campaign_welcome_gift(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_campaign_welcome_gift(uuid)
  to service_role;

comment on column public.player_entitlements.welcome_gift_claimed_at is
  'One-time 10-ticket welcome gift claim timestamp for the 2026-09 signup campaign.';

commit;

-- VERIFY
select
  count(*) filter (
    where u.created_at >= timestamptz '2026-09-12 00:00:00+08'
      and u.created_at < timestamptz '2026-09-26 00:00:00+08'
      and e.pro_trial_granted_at is not null
  ) as eligible_trial_accounts,
  count(*) filter (
    where (u.created_at < timestamptz '2026-09-12 00:00:00+08'
      or u.created_at >= timestamptz '2026-09-26 00:00:00+08')
      and e.pro_trial_granted_at is not null
  ) as ineligible_trial_accounts
from auth.users u
left join public.player_entitlements e on e.user_id = u.id;
