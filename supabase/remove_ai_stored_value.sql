-- MedSlime 2.0: remove stored-value AI credits from the active product model.
-- Run once in Supabase SQL Editor after deploying the matching app changes.
--
-- Policy:
--   * Free accounts may generate 5 NEW AI detailed explanations per Taiwan calendar day.
--   * Cached explanations consume nothing.
--   * Unused daily uses do not carry over.
--   * AI uses cannot be purchased, topped up, transferred, or stored as a paid balance.
--
-- The legacy ai_detail_credits column is left in place temporarily for backwards
-- compatibility with historical migrations, but it is zeroed and no longer read
-- or consumed by the active RPC below.

update public.player_entitlements
set ai_detail_credits = 0,
    updated_at = now()
where ai_detail_credits <> 0;

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
  v_period text := to_char(timezone('Asia/Taipei', now()), 'YYYY-MM-DD');
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

  update public.player_entitlements
  set ai_detail_credits = 0,
      ai_detail_free_period = v_period,
      ai_detail_free_used = 0,
      updated_at = now()
  where user_id = p_user_id
    and coalesce(ai_detail_free_period, '') <> v_period;

  select ai_detail_free_used
    into v_free_used
  from public.player_entitlements
  where user_id = p_user_id
  for update;

  if coalesce(v_free_used, 0) >= 5 then
    raise exception 'AI_DETAIL_CREDIT_REQUIRED';
  end if;

  v_free_used := coalesce(v_free_used, 0) + 1;

  update public.player_entitlements
  set ai_detail_credits = 0,
      ai_detail_free_period = v_period,
      ai_detail_free_used = v_free_used,
      updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object(
    'source', 'free',
    'freeRemaining', greatest(0, 5 - v_free_used),
    'paidRemaining', 0,
    'remaining', greatest(0, 5 - v_free_used)
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
  v_period text := to_char(timezone('Asia/Taipei', now()), 'YYYY-MM-DD');
  v_free_used integer := 0;
begin
  if p_source <> 'free' then
    raise exception 'INVALID_AI_DETAIL_CREDIT_SOURCE';
  end if;

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

  select
    case
      when ai_detail_free_period = v_period then ai_detail_free_used
      else 0
    end
    into v_free_used
  from public.player_entitlements
  where user_id = p_user_id
  for update;

  v_free_used := greatest(0, coalesce(v_free_used, 0) - 1);

  update public.player_entitlements
  set ai_detail_credits = 0,
      ai_detail_free_period = v_period,
      ai_detail_free_used = v_free_used,
      updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object(
    'freeRemaining', greatest(0, 5 - v_free_used),
    'paidRemaining', 0,
    'remaining', greatest(0, 5 - v_free_used)
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
