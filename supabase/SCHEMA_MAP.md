# MedSlime Supabase schema map

Last audited: 2026-09-09

This file defines the intended source of truth for the current MedSlime app. Keep it updated when adding or replacing tables so the project does not accumulate duplicate persistence paths again.

## Active tables

| Table | Role | Current app usage |
| --- | --- | --- |
| `player_account_state` | Game-state source of truth | Coins, tickets, streak, companion, slimes, pity, pulls, activity, task claims, achievement claims, focus history |
| `player_mistakes` | User mistake library | Current mistake read/write store |
| `player_entitlements` | Service entitlements | Daily free detailed-explanation usage + fixed Pro expiry (`pro_expires_at`) |
| `exam_explanation_entitlements` | Permanent paid content access | One row per user + purchased national-exam explanation set |
| `exam_attempts` | Exam/free-quiz attempt history | Score history, review snapshots, all-question outcomes, subject trends and Pro analysis |
| `payment_orders` | Payment ledger | ECPay ledger; new orders store direct `entitlement_type` / `entitlement_key`, never wallet or credit grants |
| `national_exam_questions` | National-exam question bank + shared topic taxonomy | Current national-exam/free-quiz APIs; Phase C adds canonical `topic`, `subtopic`, `concepts` metadata |
| `shared_ai_explanations` | Shared national-exam explanation cache | Internal cost optimization for reusable national-exam explanations |
| `ai_question_explanations` | Per-user material AI cache | Material explanations generated from user-uploaded content |
| `ai_explanation_events` | AI explanation analytics | Existing-content view / generated events |
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
new slime       -> add to collection
duplicate slime -> refund gameplay coins
```

Fragments and accessories are retired gameplay systems. Gacha selection may prioritize unowned slimes within the rolled rarity, but it must not route duplicates into fragment or accessory progression.

Current duplicate-refund amounts remain temporary balancing values until the MedSlime 2.0 economy pass is complete.

## Question-taxonomy rule

Phase C classifies every canonical national-exam question once and stores the shared result on `national_exam_questions`.

```text
national exam question
       ↓
subject
       ↓
topic
       ↓
subtopic
       ↓
concepts[]
```

The active migration is `supabase/question_topic_taxonomy.sql`. It adds:

- `topic`
- `subtopic`
- `concepts`
- `taxonomy_status` (`pending`, `classified`, `needs_review`)
- `taxonomy_confidence`
- `taxonomy_version`
- `taxonomy_model`
- `taxonomy_updated_at`

Taxonomy is question metadata, not learner data. A question is classified once and the result is reused for every user, every attempt, free quiz, Pro analysis and later weak-topic quiz generation.

Top-level `topic` values must come from the canonical subject catalog in `lib/topic-taxonomy-catalog.ts`; this avoids AI-created synonyms splitting one medical topic into several analytics buckets. `subtopic` may be more specific, and `concepts` should contain only a small set of genuine tested concepts.

`app/api/internal/taxonomy/backfill` is an internal batch classifier. It requires `TAXONOMY_ADMIN_SECRET`, processes only `pending` rows, stores the prompt/catalog version, and sends uncertain/catalog-mismatched results to `needs_review` instead of silently treating them as valid analytics data.

Do not classify the same question again for each user attempt. Do not expose the internal backfill endpoint as a learner feature.

## Detailed-explanation rule

Free detailed explanations are a daily service limit, not a stored balance.

```text
Free account
    ↓
up to 5 detailed-explanation views / Taiwan calendar day
    ↓
reset daily; unused uses do not carry over
```

The active RPC names are `consume_ai_detail_daily_use` and `refund_ai_detail_daily_use`. The historical credit-named RPCs are retired by `payment_entitlement_v2.sql`.

Whether an explanation must be generated by AI or can be read from `shared_ai_explanations` is an internal implementation detail. Cache status must not grant extra user access or change the daily service limit.

A purchased national-exam explanation set is different from the daily free service limit. It grants permanent access only to the specifically purchased exam. When that entitlement matches the current national-exam question, the detailed explanation does not consume one of the user's five daily free views.

The paid content model is:

```text
Single exam full explanation (NT$59)
    -> permanent access to one specified exam's full explanations
    -> lazy generation: read shared cache first; generate only missing questions

MedSlime Pro 30-day access (NT$149)
    -> cross-exam subject performance / weak-subject ranking
    -> recent score trend comparisons
    -> review priority suggestions based on attempts + mistakes
    -> Pro analysis dashboard for the active 30-day period
```

Do not advertise a Pro capability until the corresponding code path exists in production.

## Exam-attempt rule

`exam_attempts` stores one row for each completed national-exam or free-quiz attempt. It is separate from `player_mistakes`: attempt history is exam-centric, while mistakes remain question-centric.

```text
completed quiz
      ├─> exam_attempts   -> score/history/trends
      └─> player_mistakes -> wrong/uncertain questions
```

Phase C adds `exam_attempts.question_outcomes` through `supabase/exam_attempt_question_outcomes.sql`.

`review_items` and `question_outcomes` have deliberately different jobs:

```text
review_items
    -> only wrong / uncertain questions
    -> drives learner review UI

question_outcomes
    -> every question in that completed attempt
    -> canonical national_exam_questions id + question key
    -> answered / correct / uncertain outcome
    -> drives topic-level Pro analytics
```

A correct answer must therefore remain available to analytics even though it never enters the mistake library. Unanswered questions are retained with `answered=false` and `correct=null`, so future topic accuracy can distinguish skipped items from attempted wrong answers.

Old attempts created before this migration legitimately have an empty `question_outcomes` array. Do not fabricate topic history for those rows. New national-exam and free-quiz attempts populate the snapshot at submission time.

The Study area intentionally exposes learner flows separately: `/study/records` is 作答歷史與 Pro 分析；`/study/mistakes` is the standalone 錯題複習 experience.

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

There must also be no payment path that grants a stored AI credit balance, generic wallet balance, or other prepaid consumable value.

The only active payment outcomes are direct service/content entitlements:

```text
Payment
   ├─> entitlement_type = pro_30d
   │      └─> player_entitlements.pro_expires_at (+30 days)
   │
   └─> entitlement_type = exam_explanation
          └─> exam_explanation_entitlements(user_id, exam_key)
```

For Pro, another successful 30-day purchase extends an already-active expiry by 30 days; otherwise it starts from the payment time.

For a single-exam purchase, `entitlement_key` must be the canonical exam key (`year-session-subject`). The fulfillment RPC inserts a permanent row into `exam_explanation_entitlements`; duplicate ownership is idempotent and does not create another access record.

`supabase/payment_entitlement_v2.sql` is the canonical payment migration. It:

1. moves `payment_orders` to direct entitlement fields,
2. creates permanent per-exam explanation access,
3. retires credit-named daily-usage RPCs,
4. replaces `fulfill_payment_order` with direct Pro / exam fulfillment,
5. cancels any still-pending legacy stored-value orders.

The old `ecpay_setup.sql`, `remove_coin_purchases.sql`, and `remove_ai_stored_value.sql` are retained only as retired compatibility notes so they cannot recreate the old stored-value model.

Keep both `NEXT_PUBLIC_SHOP_CHECKOUT_ENABLED=false` and `SHOP_CHECKOUT_ENABLED=false` until:

1. `payment_entitlement_v2.sql` has been run successfully in Supabase,
2. the payment-provider merchant review is approved,
3. ECPay production credentials are configured,
4. a stage/production test confirms callback fulfillment and entitlement reads.
