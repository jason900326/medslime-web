# Supabase migration guide

This directory contains both active schema SQL and historical compatibility notes. Do not assume every `.sql` file should be run.

## Canonical sources of truth

- `SCHEMA_MAP.md` — current table/source-of-truth map and product data rules
- `lib/supabase/database.types.ts` — generated TypeScript snapshot of the live public schema
- Supabase migration ledger — authoritative record of migrations tracked by the production project
- `payment_entitlement_v2.sql` — canonical payment + direct-entitlement schema reference; also owns the current daily AI-detail usage RPCs

If another older payment or AI-credit SQL file conflicts with `payment_entitlement_v2.sql`, the v2 entitlement model wins.

## Production migration ledger

Last audited: 2026-09-17.

The production Supabase project currently reports only these tracked migrations:

- `20260912023407_add_14_day_pro_trial`
- `20260912025943_limit_signup_trial_and_add_welcome_gift`

Most older SQL files in this directory predate the current tracked migration ledger. They may describe schema that is already present in production even though they do not appear in migration history.

Do **not** invent or backfill fake migration versions merely to make the ledger look complete. The live schema, generated database types, and `SCHEMA_MAP.md` are the evidence for current production state.

## Going-forward migration rule

From 2026-09-17 onward, every new database change must be applied as a named Supabase migration. This includes tables, columns, indexes, RPCs, triggers, grants, RLS policies, and destructive cleanup.

For every new schema change:

1. Inspect the live schema and existing migration ledger first.
2. Apply the change through the Supabase migration workflow with a unique descriptive migration name.
3. Keep the SQL change in source control; do not make undocumented dashboard-only DDL changes.
4. Regenerate `lib/supabase/database.types.ts` from the updated live schema.
5. Run lint, TypeScript typecheck, and build before merging application code that depends on the change.
6. Update `SCHEMA_MAP.md` when the source of truth, ownership, or persistence model changes.

Do not rewrite or renumber already-applied production migrations.

## Current schema SQL references

These files describe or create current MedSlime 2.0 structures. They are useful schema references, but an old filename is **not** proof that the corresponding SQL still needs to be executed.

- `payment_entitlement_v2.sql`
- `question_topic_taxonomy.sql`
- `exam_attempt_question_outcomes.sql`
- `exam_attempt_review_items.sql`
- `exam_attempts_and_pro.sql`
- `phase_f_exam_review.sql`
- `phase_g_learning_memory.sql`
- `feedback_reports.sql`
- `cleanup_legacy_schema.sql`
- `remove_slime_accessories.sql` — one-time cleanup; do not manually repeat after it has already been applied

## Generated database types

`lib/supabase/database.types.ts` is generated from the live MedSlime Supabase project and must not be hand-maintained as an alternative schema definition.

The browser, server, and service-role clients all use the generated `Database` generic. This is intentional: table names, columns, inserts, updates, filters, and RPC arguments should fail TypeScript checks when application code drifts from the real schema.

After any migration, regenerate the file before changing code around the affected tables. If generated typing exposes an incompatibility, fix the application/schema mismatch rather than weakening the clients back to untyped access.

## RETIRED / archive compatibility notes — DO NOT RUN

The following files are preserved only so repository history does not mislead a future developer into recreating removed stored-value behavior:

- `ai_detail_credit_consumption.sql` — retired AI-credit consumption model
- `ai_detail_free_quota.sql` — retired free-quota + purchasable AI-credit model
- `remove_ai_stored_value.sql` — retired compatibility note for the old AI stored-value cleanup path
- `remove_coin_purchases.sql` — retired compatibility note from the old paid-coin / AI-credit transition
- `ecpay_setup.sql` — legacy payment setup superseded by `payment_entitlement_v2.sql`

Current product rules are intentionally different from those historical files:

```text
Free detailed explanations
  -> up to 5 uses per Taiwan calendar day
  -> reset daily
  -> unused uses never accumulate
  -> cannot be purchased or topped up

Paid access
  -> fixed 30-day MedSlime Pro entitlement
  -> permanent entitlement to one identified national exam's full explanations

Gameplay currency
  -> earned through gameplay only
  -> never purchased with real money
```

## Before running any SQL

1. Read `SCHEMA_MAP.md`.
2. Check this file to confirm the SQL is current rather than retired.
3. Check the production migration ledger and live schema to confirm whether the change already exists.
4. Back up or verify affected data before destructive changes.
5. Keep payment checkout disabled until payment migrations and callback fulfillment are verified.

A historical filename is not an instruction to run it. Files whose first lines say `RETIRED`, `ARCHIVE`, or `COMPATIBILITY NOTE` are documentation only.
