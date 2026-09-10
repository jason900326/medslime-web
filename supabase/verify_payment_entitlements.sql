-- MedSlime Phase E payment entitlement verification.
-- Read-only: safe to run in Supabase SQL Editor after payment_entitlement_v2.sql.

select
  to_regclass('public.payment_orders') as payment_orders_table,
  to_regclass('public.player_entitlements') as player_entitlements_table,
  to_regclass('public.exam_explanation_entitlements') as exam_explanation_entitlements_table;

select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payment_orders'
      and column_name = 'entitlement_type'
  ) as has_entitlement_type,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payment_orders'
      and column_name = 'entitlement_key'
  ) as has_entitlement_key,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payment_orders'
      and column_name = 'entitlement_metadata'
  ) as has_entitlement_metadata,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'player_entitlements'
      and column_name = 'pro_expires_at'
  ) as has_pro_expires_at;

select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'fulfill_payment_order',
    'consume_ai_detail_daily_use',
    'refund_ai_detail_daily_use'
  )
order by p.proname;

select
  entitlement_type,
  status,
  count(*) as orders
from public.payment_orders
group by entitlement_type, status
order by entitlement_type, status;

select
  count(*) as permanent_exam_entitlements
from public.exam_explanation_entitlements;

select
  count(*) filter (where pro_expires_at > now()) as active_pro_users,
  count(*) filter (where pro_expires_at is not null and pro_expires_at <= now()) as expired_pro_users
from public.player_entitlements;
