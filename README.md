# MedSlime

MedSlime is a medical laboratory scientist exam-prep web app built with Next.js and Supabase. The current product combines national-exam practice, mistake review, AI explanations, uploaded-material analysis, study focus tools, achievements, and slime collection/gameplay.

## Stack

- Next.js / React / TypeScript
- Supabase Auth + Postgres
- OpenAI API for AI explanations and material analysis
- Vercel deployment
- ECPay integration for direct service/content entitlements

## MedSlime 2.0 product rules

### Game state

`public.player_account_state` is the gameplay source of truth.

```text
auth.users.id
    ↓
player_account_state.user_id
    ↓
player_account_state.state (jsonb)
```

Do not create another parallel game-state persistence path without an explicit migration.

Current slime collection state contains ownership and optional nickname only. Fragments and accessories are retired systems; duplicate slimes refund gameplay coins instead.

See [`supabase/SCHEMA_MAP.md`](supabase/SCHEMA_MAP.md) for the canonical table map and [`docs/game-balance-v1.md`](docs/game-balance-v1.md) for the current gacha/economy rules.

### Mistakes and exam history

- `public.player_mistakes` is the current mistake library.
- `public.exam_attempts` stores completed exam/free-quiz attempts and analytics snapshots.

### AI explanations

- Free accounts may use up to 5 detailed explanations per Taiwan calendar day.
- Daily uses reset and do not accumulate.
- AI uses are not purchasable credits and cannot be topped up, transferred, or stored.
- `shared_ai_explanations` is the shared national-exam explanation cache.
- `ai_question_explanations` is the per-user uploaded-material explanation cache.
- Purchased access to a specific national exam grants permanent access to that exam's full explanations.

### Payments

Gameplay currency and paid services are deliberately separated. There is no real-money path to coins, tickets, gacha pulls, fragments, accessories, AI credits, or another stored-value balance.

The active paid outcomes are:

```text
Payment
   ├─> MedSlime Pro 30-day access
   └─> permanent full-explanation access for one identified national exam
```

`supabase/payment_entitlement_v2.sql` is the **canonical payment migration**. Do not substitute older payment/AI-credit SQL files for it.

## Supabase SQL: what is current?

Start with [`supabase/README.md`](supabase/README.md) and [`supabase/SCHEMA_MAP.md`](supabase/SCHEMA_MAP.md) before running SQL.

Important rule:

> A file marked **RETIRED**, **ARCHIVE**, or **COMPATIBILITY NOTE** is historical documentation and must not be run on the current schema.

Key current migrations include:

- `supabase/payment_entitlement_v2.sql` — canonical payment + entitlement model and daily AI-detail usage RPCs
- `supabase/question_topic_taxonomy.sql` — canonical national-exam Topic/Subtopic taxonomy fields
- `supabase/exam_attempt_question_outcomes.sql` — all-question attempt outcome snapshots
- `supabase/remove_slime_accessories.sql` — one-time retirement cleanup for old accessory/fragment state
- `supabase/cleanup_legacy_schema.sql` — reversible archive of confirmed legacy tables

Historical AI stored-value files such as `ai_detail_credit_consumption.sql`, `ai_detail_free_quota.sql`, and `remove_ai_stored_value.sql` are retired compatibility notes only.

## Local setup

Copy `.env.example` to `.env.local` and configure the required values.

```bash
npm install
npm run dev
```

Core Supabase variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY`, ECPay `HASH_KEY`, or `HASH_IV` through `NEXT_PUBLIC_*` variables.

## Payment release gates

Checkout is protected by both public and server-side environment flags:

```env
NEXT_PUBLIC_ECPAY_ENABLED=false
NEXT_PUBLIC_SHOP_CHECKOUT_ENABLED=false
SHOP_CHECKOUT_ENABLED=false
```

Keep checkout disabled until the canonical payment migration has been applied, merchant review is approved, production credentials are configured, and callback/entitlement fulfillment has been tested.

## Before changing database structure

1. Read `supabase/README.md` and `supabase/SCHEMA_MAP.md`.
2. Confirm the migration is active rather than retired/archive.
3. Inspect current row counts and dependencies.
4. Prefer migration/archiving over manual deletion.
5. Smoke-test login, question practice, mistakes, AI explanations, tasks, achievements, focus tools, slime state, and payment entitlement reads after a schema change.
6. Update `supabase/SCHEMA_MAP.md` whenever the source of truth changes.

## Release

Use [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md) before enabling production payment or treating a deployment as a release candidate.
