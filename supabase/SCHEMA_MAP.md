# MedSlime Supabase schema map

Last audited: 2026-09-09

This file defines the intended source of truth for the current MedSlime app. Keep it updated when adding or replacing tables so the project does not accumulate duplicate persistence paths again.

## Active tables

| Table | Role | Current app usage |
| --- | --- | --- |
| `player_account_state` | Game-state source of truth | Coins, tickets, streak, companion, slimes, pity, pulls, activity, task claims, achievement claims, focus history |
| `player_mistakes` | User mistake library | Current mistake read/write store |
| `player_entitlements` | AI-detail entitlements | Daily free allowance + purchased AI-detail balance |
| `payment_orders` | Payment ledger | ECPay checkout / callback / order status |
| `national_exam_questions` | National-exam question bank | Current national-exam API |
| `shared_ai_explanations` | Shared national-exam AI cache | Shared quick/detail explanations |
| `ai_question_explanations` | Per-user material AI cache | Material quick/detail explanations |
| `ai_explanation_events` | AI explanation analytics | Cache-view / generated events |
| `ai_explanation_feedback` | AI explanation feedback | Helpful / not-helpful feedback |
| `material_analysis_cache` | Uploaded-material analysis cache | Exact/similar material analysis cache |
| `learning_profiles` | Onboarding/study profile | Current learning-profile API |
| `beta_feedback` | Beta feedback | Authenticated beta feedback |
| `feedback_reports` | User problem reports | Current feedback-report API |

## Legacy tables to archive

The current default branch has no application references to these tables. They should be moved to `medslime_legacy` by `cleanup_legacy_schema.sql`, not dropped immediately.

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

If MedSlime 2.0 later normalizes parts of this JSON into relational tables, do it as an explicit migration and update this document at the same time.

## Cleanup policy

1. Check GitHub references.
2. Check database foreign keys, views, functions and row counts.
3. Archive old tables into `medslime_legacy`.
4. Run production smoke tests.
5. Keep the legacy schema during the MedSlime 2.0 transition.
6. Only drop archived tables after the new version has been stable and a backup exists.

## Payment note

`payment_orders` is still active and must not be archived while ECPay code exists. The current payment schema still supports `grant_type = 'coins'`; removing real-money coin purchases is a separate MedSlime 2.0 migration and should update the product catalog, checkout validation, and fulfillment RPC together.
