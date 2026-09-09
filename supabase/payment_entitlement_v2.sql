-- MedSlime 2.0 Payment Entitlement model.
-- Run once in Supabase SQL Editor before enabling SHOP_CHECKOUT_ENABLED.
--
-- Paid outcomes are direct service/content entitlements only:
--   * pro_30d          -> fixed 30-day MedSlime Pro access
--   * exam_explanation -> permanent access to one identified national exam
--
-- There is deliberately no stored-value wallet, AI credit balance, paid coin,
-- ticket, gacha pull or other prepaid consumable value in this model.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- -----------------------------------------------------------------------------
-- 0. Ensure the two core tables exist. The legacy ai_detail_credits column is
--    retained only because older deployed databases may still have it; active
--    code never treats it as purchasable value.
-- -----------------------------------------------------------------------------

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_trade_no text not null unique,
  product_id text not null,
  total_amount integer not null check (total_amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  provider text not null default 'ecpay',
  provider_trade_no text,
  provider_message text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entitlement_type text,
  entitlement_key text,
  entitlement_metadata jsonb not null default '{}'::jsonb
);

alter table public.payment_orders enable row level security;

create table if not exists public.player_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ai_detail_credits integer not null default 0,
  ai_detail_free_period text,
  ai_detail_free_used integer not null default 0,
  pro_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.player_entitlements
  add column if not exists ai_detail_credits integer not null default 0,
  add column if not exists ai_detail_free_period text,
  add column if not exists ai_detail_free_used integer not null default 0,
  add column if not exists pro_expires_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.player_entitlements enable row level security;

-- -----------------------------------------------------------------------------
-- 1. Payment ledger: preserve historical rows, but move all new orders to direct
--    entitlement fields.
-- -----------------------------------------------------------------------------

alter table public.payment_orders
  add column if not exists entitlement_type text,
  add column if not exists entitlement_key text,
  add column if not exists entitlement_metadata jsonb not null default '{}'::jsonb;

-- Legacy stored-value columns remain readable for historical audit only if an
-- older database still has them. Their NOT NULL/check restrictions must not
-- constrain new direct-entitlement orders.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payment_orders'
      and column_name = 'grant_type'
  ) then
    execute 'alter table public.payment_orders alter column grant_type drop not null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payment_orders'
      and column_name = 'grant_amount'
  ) then
    execute 'alter table public.payment_orders alter column grant_amount drop not null';
  end if;
end $$;

alter table public.payment_orders
  drop constraint if exists payment_orders_ai_detail_only_check,
  drop constraint if exists payment_orders_grant_type_check,
  drop constraint if exists payment_orders_grant_amount_check,
  drop constraint if exists payment_orders_entitlement_type_check,
  drop constraint if exists payment_orders_entitlement_target_check;

alter table public.payment_orders
  add constraint payment_orders_entitlement_type_check
  check (
    entitlement_type is null
    or entitlement_type in ('pro_30d', 'exam_explanation')
  ) not valid;

alter table public.payment_orders
  add constraint payment_orders_entitlement_target_check
  check (
    entitlement_type is null
    or (entitlement_type = 'pro_30d' and entitlement_key is null)
    or (
      entitlement_type = 'exam_explanation'
      and nullif(btrim(entitlement_key), '') is not null
    )
  ) not valid;

-- Old pending stored-value orders must never be fulfilled after this migration.
update public.payment_orders
set status = 'cancelled',
    provider_message = coalesce(provider_message, 'legacy_stored_value_order_retired'),
    updated_at = now()
where status = 'pending'
  and entitlement_type is null;

-- -----------------------------------------------------------------------------
-- 2. Permanent per-exam explanation access.
-- -----------------------------------------------------------------------------

create table if not exists public.exam_explanation_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_key text not null,
  year text not null,
  session text not null,
  subject text not null,
  order_id uuid references public.payment_orders(id) on delete set null,
  purchased_at timestamptz not null default now(),
  primary key (user_id, exam_key)
);

create index if not exists exam_explanation_entitlements_user_idx
  on public.exam_explanation_entitlements (user_id, purchased_at desc);

alter table public.exam_explanation_entitlements enable row level security;

drop policy if exists "exam_explanation_entitlements_select_own"
  on public.exam_explanation_entitlements;

create policy "exam_explanation_entitlements_select_own"
  on public.exam_explanation_entitlements
  for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.exam_explanation_entitlements to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Daily detailed-explanation service limit. This is a daily usage limit,
--    never a stored balance.
-- -----------------------------------------------------------------------------

drop function if exists public.consume_ai_detail_daily_use(uuid);
drop function if exists public.refund_ai_detail_daily_use(uuid);

create function public.consume_ai_detail_daily_use(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := to_char(timezone('Asia/Taipei', now()), 'YYYY-MM-DD');
  v_used integer := 0;
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
    into v_used
  from public.player_entitlements
  where user_id = p_user_id
  for update;

  if coalesce(v_used, 0) >= 5 then
    raise exception 'AI_DETAIL_DAILY_LIMIT_REACHED';
  end if;

  v_used := coalesce(v_used, 0) + 1;

  update public.player_entitlements
  set ai_detail_credits = 0,
      ai_detail_free_period = v_period,
      ai_detail_free_used = v_used,
      updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object(
    'remaining', greatest(0, 5 - v_used),
    'limit', 5
  );
end;
$$;

create function public.refund_ai_detail_daily_use(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := to_char(timezone('Asia/Taipei', now()), 'YYYY-MM-DD');
  v_used integer := 0;
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

  select
    case
      when ai_detail_free_period = v_period then ai_detail_free_used
      else 0
    end
    into v_used
  from public.player_entitlements
  where user_id = p_user_id
  for update;

  v_used := greatest(0, coalesce(v_used, 0) - 1);

  update public.player_entitlements
  set ai_detail_credits = 0,
      ai_detail_free_period = v_period,
      ai_detail_free_used = v_used,
      updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object(
    'remaining', greatest(0, 5 - v_used),
    'limit', 5
  );
end;
$$;

revoke all on function public.consume_ai_detail_daily_use(uuid) from public, anon, authenticated;
revoke all on function public.refund_ai_detail_daily_use(uuid) from public, anon, authenticated;
grant execute on function public.consume_ai_detail_daily_use(uuid) to service_role;
grant execute on function public.refund_ai_detail_daily_use(uuid) to service_role;

-- Retire the old credit-named RPCs after the app has a backwards-compatible
-- fallback during deployment.
drop function if exists public.consume_ai_detail_credit(uuid);
drop function if exists public.refund_ai_detail_credit(uuid);
drop function if exists public.refund_ai_detail_credit(uuid, text);

-- -----------------------------------------------------------------------------
-- 4. Fulfillment: one payment directly opens one service/content entitlement.
-- -----------------------------------------------------------------------------

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
  v_year text;
  v_session text;
  v_subject text;
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

  if v_order.entitlement_type = 'pro_30d' then
    insert into public.player_entitlements (
      user_id,
      ai_detail_credits,
      pro_expires_at,
      updated_at
    ) values (
      v_order.user_id,
      0,
      now() + interval '30 days',
      now()
    )
    on conflict (user_id) do update
      set ai_detail_credits = 0,
          pro_expires_at = (
            case
              when public.player_entitlements.pro_expires_at is not null
                and public.player_entitlements.pro_expires_at > now()
                then public.player_entitlements.pro_expires_at
              else now()
            end
          ) + interval '30 days',
          updated_at = now();

  elsif v_order.entitlement_type = 'exam_explanation' then
    if nullif(btrim(v_order.entitlement_key), '') is null then
      raise exception 'exam entitlement key missing';
    end if;

    v_year := nullif(btrim(v_order.entitlement_metadata->>'year'), '');
    v_session := nullif(btrim(v_order.entitlement_metadata->>'session'), '');
    v_subject := nullif(btrim(v_order.entitlement_metadata->>'subject'), '');

    if v_year is null or v_session is null or v_subject is null then
      raise exception 'exam entitlement metadata missing';
    end if;

    insert into public.exam_explanation_entitlements (
      user_id,
      exam_key,
      year,
      session,
      subject,
      order_id,
      purchased_at
    ) values (
      v_order.user_id,
      v_order.entitlement_key,
      v_year,
      v_session,
      v_subject,
      v_order.id,
      now()
    )
    on conflict (user_id, exam_key) do nothing;

  else
    raise exception 'unsupported entitlement type';
  end if;

  update public.payment_orders
  set status = 'paid',
      provider_trade_no = p_provider_trade_no,
      paid_at = now(),
      updated_at = now()
  where id = v_order.id;
end;
$$;

revoke all on function public.fulfill_payment_order(text, text) from public, anon, authenticated;
grant execute on function public.fulfill_payment_order(text, text) to service_role;

comment on table public.exam_explanation_entitlements is
  'Permanent access to one specifically identified national-exam explanation set.';
comment on column public.payment_orders.entitlement_type is
  'Direct paid outcome: pro_30d or exam_explanation. Never a stored-value balance.';
comment on column public.payment_orders.entitlement_key is
  'Target identity for permanent content entitlements, currently national-exam exam_key.';

commit;

-- VERIFY ----------------------------------------------------------------------
select
  entitlement_type,
  status,
  count(*) as orders
from public.payment_orders
group by entitlement_type, status
order by entitlement_type, status;

select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.payment_orders'::regclass
  and conname like 'payment_orders_entitlement_%'
order by conname;
