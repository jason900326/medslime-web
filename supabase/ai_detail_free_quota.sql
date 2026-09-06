-- Add monthly free AI-detail allowance on top of purchased credits.
-- Run once in Supabase SQL Editor before merging this branch.
-- Policy: 10 free NEW AI-detail generations per account per calendar month (Taiwan time).
-- Cached detailed explanations remain free and consume nothing.

alter table public.player_entitlements
  add column if not exists ai_detail_free_period text,
  add column if not exists ai_detail_free_used integer not null default 0
    check (ai_detail_free_used >= 0);

drop function if exists public.consume_ai_detail_credit(uuid);
drop function if exists public.refund_ai_detail_credit(uuid);
drop function if exists public.refund_ai_detail_credit(uuid, text);

create function public.consume_ai_detail_credit(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := to_char(timezone('Asia/Taipei', now()), 'YYYY-MM');
  v_paid integer := 0;
  v_free_used integer := 0;
  v_source text;
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
    v_source := 'free';
    v_free_used := v_free_used + 1;

    update public.player_entitlements
    set ai_detail_free_used = v_free_used,
        updated_at = now()
    where user_id = p_user_id;
  elsif coalesce(v_paid, 0) > 0 then
    v_source := 'paid';
    v_paid := v_paid - 1;

    update public.player_entitlements
    set ai_detail_credits = v_paid,
        updated_at = now()
    where user_id = p_user_id;
  else
    raise exception 'AI_DETAIL_CREDIT_REQUIRED';
  end if;

  return jsonb_build_object(
    'source', v_source,
    'freeRemaining', greatest(0, 10 - v_free_used),
    'paidRemaining', greatest(0, v_paid),
    'remaining', greatest(0, 10 - v_free_used) + greatest(0, v_paid)
  );
end;
$$;

create function public.refund_ai_detail_credit(
  p_user_id uuid,
  p_source text
)
returns jsonb
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

  if p_source = 'free' then
    if (select ai_detail_free_period from public.player_entitlements where user_id = p_user_id) = v_period
       and v_free_used > 0 then
      v_free_used := v_free_used - 1;
      update public.player_entitlements
      set ai_detail_free_used = v_free_used,
          updated_at = now()
      where user_id = p_user_id;
    end if;
  elsif p_source = 'paid' then
    v_paid := v_paid + 1;
    update public.player_entitlements
    set ai_detail_credits = v_paid,
        updated_at = now()
    where user_id = p_user_id;
  else
    raise exception 'INVALID_AI_DETAIL_CREDIT_SOURCE';
  end if;

  return jsonb_build_object(
    'freeRemaining', greatest(0, 10 - v_free_used),
    'paidRemaining', greatest(0, v_paid),
    'remaining', greatest(0, 10 - v_free_used) + greatest(0, v_paid)
  );
end;
$$;

revoke all on function public.consume_ai_detail_credit(uuid) from public;
revoke all on function public.consume_ai_detail_credit(uuid) from anon;
revoke all on function public.consume_ai_detail_credit(uuid) from authenticated;
grant execute on function public.consume_ai_detail_credit(uuid) to service_role;

revoke all on function public.refund_ai_detail_credit(uuid, text) from public;
revoke all on function public.refund_ai_detail_credit(uuid, text) from anon;
revoke all on function public.refund_ai_detail_credit(uuid, text) from authenticated;
grant execute on function public.refund_ai_detail_credit(uuid, text) to service_role;
