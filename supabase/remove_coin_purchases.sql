-- MedSlime 2.0 payment cleanup: remove real-money coin purchases.
--
-- Run this once in Supabase SQL Editor AFTER deploying the app changes that
-- remove coin products from the storefront.
--
-- This migration preserves historical payment rows. Existing rows with
-- grant_type = 'coins' remain readable for audit, but new/updated payment rows
-- may only use grant_type = 'ai_detail'.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Any old coin order that never completed should no longer be fulfillable.
update public.payment_orders
set status = 'cancelled',
    provider_message = coalesce(provider_message, 'coin_purchase_disabled'),
    updated_at = now()
where grant_type = 'coins'
  and status = 'pending';

-- NOT VALID preserves historical coin rows while enforcing the rule for all
-- new/changed rows going forward.
alter table public.payment_orders
  drop constraint if exists payment_orders_ai_detail_only_check;

alter table public.payment_orders
  add constraint payment_orders_ai_detail_only_check
  check (grant_type = 'ai_detail') not valid;

-- Fulfillment is now intentionally limited to AI-detail service purchases.
create or replace function public.fulfill_payment_order(
  p_merchant_trade_no text,
  p_provider_trade_no text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.payment_orders%rowtype;
begin
  select * into v_order
  from public.payment_orders
  where merchant_trade_no = p_merchant_trade_no
  for update;

  if not found then
    raise exception 'payment order not found';
  end if;

  if v_order.status = 'paid' then
    return;
  end if;

  if v_order.status <> 'pending' then
    raise exception 'payment order is not pending';
  end if;

  if v_order.grant_type <> 'ai_detail' then
    raise exception 'unsupported grant type';
  end if;

  insert into public.player_entitlements (user_id, ai_detail_credits, updated_at)
  values (v_order.user_id, v_order.grant_amount, now())
  on conflict (user_id) do update
    set ai_detail_credits = public.player_entitlements.ai_detail_credits + excluded.ai_detail_credits,
        updated_at = now();

  update public.payment_orders
  set status = 'paid',
      provider_trade_no = p_provider_trade_no,
      paid_at = now(),
      updated_at = now()
  where id = v_order.id;
end;
$$;

revoke all on function public.fulfill_payment_order(text, text) from public;
revoke all on function public.fulfill_payment_order(text, text) from anon;
revoke all on function public.fulfill_payment_order(text, text) from authenticated;
grant execute on function public.fulfill_payment_order(text, text) to service_role;

comment on constraint payment_orders_ai_detail_only_check on public.payment_orders is
  'MedSlime 2.0: real-money purchases cannot grant gameplay coins. Historical coin rows are retained for audit.';

commit;

-- VERIFY ----------------------------------------------------------------------

select
  grant_type,
  status,
  count(*) as orders
from public.payment_orders
group by grant_type, status
order by grant_type, status;

select
  conname,
  convalidated,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.payment_orders'::regclass
  and conname = 'payment_orders_ai_detail_only_check';

-- Expected:
--   * New coin orders are rejected by the DB constraint.
--   * fulfill_payment_order rejects anything except ai_detail.
--   * Historical coin rows, if any, remain in payment_orders for audit.
