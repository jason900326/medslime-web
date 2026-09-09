# MedSlime

MedSlime is a medical laboratory scientist exam-prep web app built with Next.js and Supabase. The current product combines national-exam practice, mistake review, AI explanations, uploaded-material analysis, study focus tools, achievements, and slime collection/gameplay.

## Stack

- Next.js / React / TypeScript
- Supabase Auth + Postgres
- OpenAI API for AI explanations and material analysis
- Vercel deployment
- ECPay integration code (checkout remains release-gated by environment variables)

## Important architecture rules

### Game state

`public.player_account_state` is the current gameplay source of truth.

```text
auth.users.id
    ↓
player_account_state.user_id
    ↓
player_account_state.state (jsonb)
```

Do not create another parallel game-state persistence path without an explicit migration.

See [`supabase/SCHEMA_MAP.md`](supabase/SCHEMA_MAP.md) for the current table map and legacy-table policy.

### Mistakes

Current mistake data lives in `public.player_mistakes`.

### AI explanations

- `shared_ai_explanations`: shared national-exam explanation cache
- `ai_question_explanations`: per-user uploaded-material explanation cache
- `ai_explanation_events`: usage/analytics events
- `ai_explanation_feedback`: explanation feedback
- `player_entitlements`: AI-detail allowance/balance

### Legacy database cleanup

Old tables are not dropped immediately. The migration in
[`supabase/cleanup_legacy_schema.sql`](supabase/cleanup_legacy_schema.sql) moves confirmed legacy tables into a separate `medslime_legacy` schema after dependency checks.

Keep the legacy schema until MedSlime 2.0 has been stable long enough to safely remove it.

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

Keep checkout disabled while payment-provider review or payment-model changes are in progress.

The current payment implementation still contains legacy support for purchasing coins. Removing real-money coin purchases is a separate MedSlime 2.0 migration and must update the product catalog, checkout validation, and payment fulfillment logic together.

## Supabase SQL files

- `supabase/ecpay_setup.sql` — ECPay order / fulfillment setup
- `supabase/ai_detail_free_quota.sql` — daily free AI-detail quota
- `supabase/ai_detail_credit_consumption.sql` — AI-detail credit handling
- `supabase/feedback_reports.sql` — feedback reporting
- `supabase/cleanup_legacy_schema.sql` — reversible legacy-table archive
- `supabase/SCHEMA_MAP.md` — canonical table map

## Before changing database structure

1. Confirm current GitHub references.
2. Inspect database row counts and dependencies.
3. Prefer migration/archiving over manual deletion.
4. Smoke-test login, question practice, mistakes, AI explanations, tasks, achievements, focus tools, and slime state after a schema change.
5. Update `supabase/SCHEMA_MAP.md` whenever the source of truth changes.
