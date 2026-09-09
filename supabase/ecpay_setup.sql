-- Run once in Supabase SQL Editor before enabling ECPay checkout.
-- MedSlime coins are intentionally NOT purchasable with real money.

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_trade_no text not null unique,
  product_id text not null,
  total_amount integer not null check (total_amount > 0),
  grant_type text not null check (grant_type = 'ai_detail'),
  grant_amount integer not null check (grant_amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  provider text not null default 'ecpay',
  provider_trade_no text,
  provider_message text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_orders enable row level security;

create table if not exists public.player_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ai_detail_credits integer not null default 0 check (ai_detail_credits >= 0),
  updated_at timestamptz not null default now()
);

alter table public.player_entitlements enable row level security;

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
