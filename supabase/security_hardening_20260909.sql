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

-- NOTE:
-- payment_orders and player_entitlements intentionally have RLS enabled with no
-- client policies. They are server-only tables accessed through trusted server
-- routes/service_role. Supabase may report this as an informational lint; the
-- deny-by-default behavior is intentional.
--
-- After deploying this file, re-run Supabase Security Advisor. The anon/authenticated
-- SECURITY DEFINER executable warnings for rls_auto_enable should disappear.
