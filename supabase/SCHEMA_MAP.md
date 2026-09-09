# MedSlime Supabase schema map

Last audited: 2026-09-09

This file defines the intended source of truth for the current MedSlime app. Keep it updated when adding or replacing tables so the project does not accumulate duplicate persistence paths again.

## Active tables

| Table | Role | Current app usage |
| --- | --- | --- |
| `player_account_state` | Game-state source of truth | Coins, tickets, streak, companion, slimes, pity, pulls, activity, task claims, achievement claims, focus history |
| `player_mistakes` | User mistake library | Current mistake read/write store |
| `player_entitlements` | AI-detail entitlements | Daily free allowance + purchased AI-detail balance |
| `payment_orders` | Payment ledger | ECPay checkout / callback / order status; real-money purchases must not grant gameplay coins |
| `national_exam_questions` | National-exam question bank | Current national-exam API |
| `shared_ai_explanations` | Shared national-exam AI cache | Shared quick/detail explanations |
| `ai_question_explanations` | Per-user material AI cache | Material quick/detail explanations |
| `ai_explanation_events` | AI explanation analytics | Cache-view / generated events |
| `ai_explanation_feedback` | AI explanation feedback | Helpful / not-helpful feedback |
| `material_analysis_cache` | Uploaded-material analysis cache | Exact/similar material analysis cache |
| `learning_profiles` | Onboarding/study profile | Current learning-profile API |
| `beta_feedback` | Beta feedback | Authenticated beta feedback |
| `feedback_reports` | User problem reports | Current feedback-report API |

## Legacy tables archived in `medslime_legacy`

The current default branch has no application references to these tables. They are archived by `cleanup_legacy_schema.sql` instead of being dropped immediately.

- `achievement_claims`
- `ai_explanation_usage`
- `documents`
- `focus_sessions`
- `generated_exams`
- `mistakes`
- `player_game_state`
- `player_slimes`
- `player_task_claims`
- `player_task_events`
- `player_task_quiz_events`

## Game-state rule

Do not create a second game-state persistence path.

The canonical game state is:

```text
Auth user (`auth.users.id`)
        ↓
public.player_account_state.user_id
        ↓
public.player_account_state.state (jsonb)
```

The `state` JSON currently owns the gameplay fields, including:

- `coins`
- `tickets`
- `streak`
- `companionId`
- `slimes`
- `freePullDate`
- `pity`
- `totalPulls`
- `totalQuestionsAnswered`
- `totalMistakesReviewed`
- `activityByDate`
- `claimedAchievementIds`
- `claimedTaskIds`
- `focusHistory`
- `hasSeenOnboarding`

Each `slimes[slimeId]` entry should contain only collection state needed by the current app, currently `owned` and optional `nickname`. The retired fields `fragments`, `accessoryUnlocked`, and `accessoryEquipped` must not be created by new code.

`supabase/remove_slime_accessories.sql` backs up the current account-state table and removes those retired fields from every player's slime JSON. It also removes the retired accessory achievement ids `accessory-first` and `special-ssr-accessory` from `claimedAchievementIds`.

If MedSlime 2.0 later normalizes parts of this JSON into relational tables, do it as an explicit migration and update this document at the same time.

## Gacha rule

The MedSlime 2.0 collection loop is intentionally simple:

```text
new slime      -> add to collection
duplicate slime -> refund gameplay coins
```

Fragments and accessories are retired gameplay systems. Gacha selection may prioritize unowned slimes within the rolled rarity, but it must not route duplicates into fragment or accessory progression.

Current duplicate-refund amounts remain temporary balancing values until the MedSlime 2.0 economy pass is complete.

## Cleanup policy

1. Check GitHub references.
2. Check database foreign keys, views, functions and row counts.
3. Archive old tables into `medslime_legacy`.
4. Run production smoke tests.
5. Keep the legacy schema during the MedSlime 2.0 transition.
6. Only drop archived tables after the new version has been stable and a backup exists.

## Payment rule

Gameplay currency and paid services are deliberately separated.

```text
Study / tasks / achievements
        ↓
      coins
        ↓
  slime gacha
```

There must be no payment path that turns real money into `coins`, tickets, gacha pulls, fragments, accessories or any other randomized gameplay resource.

The payment path currently allowed by the code/database is:

```text
ECPay payment
      ↓
payment_orders (grant_type = ai_detail)
      ↓
player_entitlements.ai_detail_credits
```

`supabase/remove_coin_purchases.sql` is the production migration for existing databases. It preserves historical coin order rows for audit, cancels unfinished coin orders, blocks new coin-granting orders, and replaces `fulfill_payment_order()` with AI-detail-only fulfillment.

If the AI-detail commercial model is later replaced by MedSlime Pro or another non-credit product, update the product catalog, checkout validation, fulfillment RPC, entitlement schema and this document together.
