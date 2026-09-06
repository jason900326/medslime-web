-- Run once in Supabase SQL Editor before enabling paid AI detail generation.
-- Cached AI detail reads remain free; only a new generation consumes one credit.

create or replace function public.consume_ai_detail_credit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer;
begin
  select ai_detail_credits
    into v_remaining
  from public.player_entitlements
  where user_id = p_user_id
  for update;

  if not found or coalesce(v_remaining, 0) <= 0 then
    raise exception 'AI_DETAIL_CREDIT_REQUIRED';
  end if;

  update public.player_entitlements
  set ai_detail_credits = ai_detail_credits - 1,
      updated_at = now()
  where user_id = p_user_id
  returning ai_detail_credits into v_remaining;

  return v_remaining;
end;
$$;

create or replace function public.refund_ai_detail_credit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer;
begin
  insert into public.player_entitlements (user_id, ai_detail_credits, updated_at)
  values (p_user_id, 1, now())
  on conflict (user_id) do update
    set ai_detail_credits = public.player_entitlements.ai_detail_credits + 1,
        updated_at = now()
  returning ai_detail_credits into v_remaining;

  return v_remaining;
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
