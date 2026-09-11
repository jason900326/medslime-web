# Supabase migration guide

This directory contains both active migrations and historical compatibility notes. Do not assume every `.sql` file should be run.

## Canonical sources of truth

- `SCHEMA_MAP.md` — current table/source-of-truth map and product data rules
- `payment_entitlement_v2.sql` — canonical payment + direct-entitlement migration; also owns the current daily AI-detail usage RPCs

If another older payment or AI-credit SQL file conflicts with `payment_entitlement_v2.sql`, the v2 entitlement model wins.

## Current / active migrations

These files describe or create current MedSlime 2.0 structures. Run only when the migration has not already been applied to the target environment.

- `payment_entitlement_v2.sql`
- `question_topic_taxonomy.sql`
- `exam_attempt_question_outcomes.sql`
- `exam_attempt_review_items.sql`
- `exam_attempts_and_pro.sql`
- `phase_f_exam_review.sql`
- `phase_g_learning_memory.sql`
- `feedback_reports.sql`
- `cleanup_legacy_schema.sql`
- `remove_slime_accessories.sql` — one-time migration; do not manually repeat after it has already been applied

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
2. Check this file to confirm the SQL is active rather than retired.
3. Check whether the migration has already been applied in the target Supabase project.
4. Back up or verify affected data before destructive changes.
5. Keep payment checkout disabled until payment migrations and callback fulfillment are verified.

A historical filename is not an instruction to run it. Files whose first lines say `RETIRED`, `ARCHIVE`, or `COMPATIBILITY NOTE` are documentation only.
