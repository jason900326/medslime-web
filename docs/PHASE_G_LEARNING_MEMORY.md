# Phase G — Learning Memory

Phase G turns the per-question state introduced in Phase F into a real learning-memory layer.

## Product behavior

- `學習紀錄` now has four views: `作答紀錄`, `觀念不熟`, `我的筆記`, and `Pro 分析`.
- `觀念不熟` is keyed by canonical `questionKey`, so the same question keeps its state across national exams, free quizzes, weak-topic practice, and review.
- A flagged question keeps `mastery_streak` progress.
- A completed attempt counts as a confident-correct repetition only when the question was answered correctly **and** was not marked uncertain.
- Wrong, unanswered, or uncertain outcomes reset the streak to 0.
- At 3 consecutive confident-correct outcomes, `concept_unfamiliar` is cleared automatically and `mastered_at` is recorded.
- Notes remain private and keyed by the same canonical question key.

## Entitlement UX

The learning-records page loads all purchased exam explanation entitlements once and caches them for the current browser session. Attempt cards and the attempt detail page reuse that cache.

Directly opening an attempt detail page still performs one background entitlement load when no fresh session cache exists. Server-side explanation endpoints continue to verify entitlement independently; the client cache is only a UX optimization and is not an authorization boundary.

## Required migration

Run this in the MedSlime Supabase SQL editor before mastery persistence testing:

```text
supabase/phase_g_learning_memory.sql
```

It adds these columns to `user_question_learning_state`:

- `mastery_streak`
- `mastered_at`
- `last_practiced_at`

It also creates authenticated RPC:

```text
apply_question_mastery_outcomes(jsonb)
```

## Smoke test

1. Open an attempt and mark one question `觀念不熟`.
2. Confirm `學習紀錄 → 觀念不熟` shows that question with `連續答對 0 / 3`.
3. Add a note and confirm it appears in `學習紀錄 → 我的筆記`.
4. Complete the same canonical question correctly without `不確定`; confirm streak becomes `1 / 3`.
5. Repeat until the third confident-correct result; confirm the question disappears from `觀念不熟` and `mastered_at` is populated.
6. During the streak, one wrong / skipped / uncertain outcome should reset progress to `0 / 3`.
7. From `學習紀錄`, open an already-unlocked exam attempt. It should not visibly run a second entitlement check before showing the unlocked state.
