# Phase F — Exam Review & Adaptive Explanation

Phase F turns a completed quiz into a full digital review flow instead of a wrong-question-only list.

## Product behavior

- The post-submit screen is intentionally lightweight and routes the learner to the saved attempt.
- Attempt detail is the main review surface.
- The whole completed question set is reconstructed from `question_outcomes` and the canonical national-exam bank; when `question_items` snapshots exist they take priority.
- Each question shows the learner's answer and the official answer.
- Review filters: all / wrong / uncertain / concept unfamiliar.
- `觀念不熟` is persistent per user + canonical `questionKey`, so it follows the same question across later review contexts.
- Private notes are also persistent per user + canonical `questionKey`.
- Paid NT$59 exam access unlocks explanations for every question in that exam, but explanations remain lazy: nothing generates until a learner opens a question.

## Adaptive Explanation V2

National-exam explanation cache keys are versioned with `::adaptive-v2`; existing V1 cache rows are not destroyed and do not block a fresh V2 explanation from being generated once.

Every V2 explanation keeps a stable teaching skeleton:

- tested concept
- official answer
- solution logic
- A/B/C/D option analysis (all four are addressed, but obvious distractors may be brief)
- key takeaways
- memory point
- genuine trap, when one exists

The optional teaching block chooses exactly one useful representation instead of forcing the same format on every question:

- none
- bullets
- comparison table
- ordered steps
- formula / calculation sequence
- interpretation clues for ECG, image, chart or laboratory interpretation

Unused teaching formats stay empty. The UI renders the chosen structure and allows useful sections to be appended to the learner's question note.

## Database migration

Before testing persistent `觀念不熟` and private notes, run:

```text
supabase/phase_f_exam_review.sql
```

It adds:

- `exam_attempts.question_items` (future-proof full attempt snapshot storage)
- `user_question_learning_state`
  - `concept_unfamiliar`
  - `note`
  - RLS scoped to the authenticated user

The app remains backward compatible if `question_items` is not present yet. The learning-state table is required for persisting notes and `觀念不熟`.

## Smoke test

1. Apply `supabase/phase_f_exam_review.sql`.
2. Complete a national exam or free quiz.
3. On the lightweight result overlay, open `查看這次作答紀錄`.
4. Confirm the attempt shows the full question set, including correct questions.
5. Confirm each question shows the learner answer and official answer.
6. Toggle `觀念不熟`, reload the page, and confirm it remains selected.
7. Type a private note, wait for `已儲存`, reload, and confirm it remains.
8. Open a detailed explanation and verify A/B/C/D are all addressed without forced equal-length prose.
9. For a comparison-worthy question, verify the adaptive block can render a real comparison table; for a simple recall question it may correctly render no extra block or only bullets.
10. Use `＋ 加到筆記`, then confirm the content appears in the question note and persists.
11. On an NT$59-entitled exam, open several explanations and confirm they do not consume the daily free explanation limit.
