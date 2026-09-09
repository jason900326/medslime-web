-- MedSlime security hardening — 2026-09-09
--
-- Supabase Security Advisor flagged public.rls_auto_enable() because the
-- SECURITY DEFINER event-trigger function was executable by anon/authenticated.
-- The function only needs to be invoked by PostgreSQL through its event trigger;
-- application roles must never call it through PostgREST RPC.

begin;

revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;

comment on function public.rls_auto_enable() is
  'DDL event-trigger helper. Not callable by application roles; automatically enables RLS on new public tables.';

commit;

-- payment_orders and player_entitlements intentionally keep RLS enabled with no
-- client policies. They are server-only tables accessed through trusted server
-- routes/service_role, so deny-by-default is the intended behavior.
