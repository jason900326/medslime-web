-- Monthly free AI-detail allowance + paid credits.
-- Run once in Supabase SQL Editor before deploying this branch.
-- Policy: each signed-in account gets 10 new AI detail generations per calendar month (Taiwan time).
-- Cached detail reads remain free and do not touch either allowance.

alter table public.player_entitlements
  add column if not exists ai_detail_free_period text,
  add column if not exists ai_detail_free_used integer not null default 0
    check (ai_detail_free_used >= 0);

create or replace function public.consume_ai_detail_credit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := to_char(timezone('Asia/Taipei', now()), 'YYYY-MM');
  v_paid integer := 0;
  v_free_used integer := 0;
begin
  insert into public.player_entitlements (
    user_id,
    ai_detail_credits,
    ai_detail_free_period,
    ai_detail_free_used,
    updated_at
  ) values (
    p_user_id,
    0,
    v_period,
    0,
    now()
  )
  on conflict (user_id) do nothing;

  select ai_detail_credits, ai_detail_free_used
    into v_paid, v_free_used
  from public.player_entitlements
  where user_id = p_user_id
  for update;

  update public.player_entitlements
  set ai_detail_free_period = v_period,
      ai_detail_free_used = 0,
      updated_at = now()
  where user_id = p_user_id
    and coalesce(ai_detail_free_period, '') <> v_period;

  if found then
    v_free_used := 0;
  end if;

  if v_free_used < 10 then
    v_free_used := v_free_used + 1;
    update public.player_entitlements
    set ai_detail_free_used = v_free_used,
        updated_at = now()
    where user_id = p_user_id;

    return (10 - v_free_used) + v_paid;
  end if;

  if coalesce(v_paid, 0) <= 0 then
    raise exception 'AI_DETAIL_CREDIT_REQUIRED';
  end if;

  update public.player_entitlements
  set ai_detail_credits = ai_detail_credits - 1,
      updated_at = now()
  where user_id = p_user_id
  returning ai_detail_credits into v_paid;

  return v_paid;
end;
$$;

create or replace function public.refund_ai_detail_credit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := to_char(timezone('Asia/Taipei', now()), 'YYYY-MM');
  v_paid integer := 0;
  v_free_used integer := 0;
begin
  insert into public.player_entitlements (
    user_id,
    ai_detail_credits,
    ai_detail_free_period,
    ai_detail_free_used,
    updated_at
  ) values (
    p_user_id,
    0,
    v_period,
    0,
    now()
  )
  on conflict (user_id) do nothing;

  select ai_detail_credits, ai_detail_free_used
    into v_paid, v_free_used
  from public.player_entitlements
  where user_id = p_user_id
  for update;

  -- If the current month's free pool is not exhausted, put the failed generation
  -- back into that pool. At the exact 10th-free-use boundary we refund as paid
  -- credit instead, which preserves the user's total allowance without risking loss.
  if coalesce(v_free_used, 0) > 0 and v_free_used < 10 then
    update public.player_entitlements
    set ai_detail_free_used = ai_detail_free_used - 1,
        updated_at = now()
    where user_id = p_user_id;
    v_free_used := v_free_used - 1;
  else
    update public.player_entitlements
    set ai_detail_credits = ai_detail_credits + 1,
        updated_at = now()
    where user_id = p_user_id
    returning ai_detail_credits into v_paid;
  end if;

  return greatest(0, 10 - v_free_used) + v_paid;
end;
$$;

revoke all on function public.consume_ai_detail_credit(uuid) from public;
revoke all on function public.consume_ai_detail_credit(uuid) from anon;
revoke all on function public.consume_ai_detail_credit(uuid) from authenticated;
grant execute on function public.consume_ai_detail_credit(uuid) to service_role;

revoke all on function public.refund_ai_detail_credit(uuid) from public;
revoke all on function public.refund_ai_detail_credit(uuid) from anon;
revoke all on function public.refund_ai_detail_credit(uuid) from authenticated;
grant execute on function public.refund_ai_detail_credit(uuid) to service_role;
