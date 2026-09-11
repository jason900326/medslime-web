# MedSlime Release Checklist

Use this checklist before treating `main` as a release candidate, enabling production checkout, or making a schema/product-model change live.

## 1. Repository and build

- [ ] `main` contains the intended release commits and no stale prototype PR is required for the release.
- [ ] Vercel deployment/build for the release commit is green.
- [ ] No TypeScript/build errors remain.
- [ ] README, `supabase/README.md`, `supabase/SCHEMA_MAP.md`, and `docs/game-balance-v1.md` match the code that is being released.
- [ ] No new code references retired slime fields: `fragments`, `accessoryUnlocked`, `accessoryEquipped`, `accessory`, `accessoryImage`.

### CI baseline installed

The repository now has `.github/workflows/ci.yml` as the minimum release CI layer.

- [x] Runs automatically on pushes to `main`.
- [x] Runs automatically on pull requests targeting `main`.
- [x] Uses Node 22 and reproducible `npm ci` installation.
- [x] Runs `npm run lint`.
- [x] Runs `npm run typecheck` (`tsc --noEmit`).
- [x] Runs `npm run build`.
- [x] ECPay stage readiness validation is wired as a manual workflow-dispatch job and requires the `PAYMENT_SECRET` GitHub Actions secret before it can run.
- [ ] Add Playwright end-to-end smoke tests as a later hardening layer; this is not part of the minimum CI release gate.

Generated PDF.js assets copied into `public/` during `postinstall` are intentionally excluded from ESLint because they are third-party vendor files. Localized pre-existing lint debt remains warning-level only in explicitly scoped files; new lint errors elsewhere still fail CI.

## 2. Database / Supabase

- [ ] Read `supabase/README.md` before running SQL.
- [ ] Confirm every SQL file to be run is active, not marked `RETIRED`, `ARCHIVE`, or `COMPATIBILITY NOTE`.
- [ ] Confirm the migration has not already been applied to the target environment.
- [ ] `public.player_account_state` remains the canonical gameplay state store.
- [ ] `public.player_mistakes` remains the canonical mistake library.
- [ ] `public.exam_attempts` contains the expected attempt/review/analytics fields.
- [ ] `public.player_entitlements` and `public.exam_explanation_entitlements` match the current entitlement model.
- [ ] Schema changes that can affect existing users have been backed up or made reversible where practical.
- [ ] `supabase/SCHEMA_MAP.md` is updated whenever a source of truth changes.

## 3. AI explanation rules

- [ ] Free accounts receive at most 5 detailed-explanation uses per Taiwan calendar day.
- [ ] Daily uses reset rather than accumulate.
- [ ] There is no purchasable/top-up AI-credit balance.
- [ ] Cached/shared explanations do not bypass the user's daily service limit unless a matching paid exam entitlement exists.
- [ ] A purchased exam-explanation entitlement grants permanent access only to the identified exam.
- [ ] Shared national-exam explanations read from `shared_ai_explanations` before generating a missing explanation.

## 4. Payment safety

- [ ] `supabase/payment_entitlement_v2.sql` is the canonical payment migration for the target environment.
- [ ] No product, API, RPC, or fulfillment path converts real money into coins, tickets, gacha pulls, fragments, accessories, AI credits, wallet balance, or another prepaid consumable value.
- [ ] Current paid products grant only direct service/content entitlements: MedSlime Pro time or one identified exam's full explanations.
- [ ] Merchant/product configuration matches the app catalog and server-side validation.
- [ ] Payment callback fulfillment is idempotent.
- [ ] Pro extension behavior is correct for both active and expired users.
- [ ] Duplicate purchase of an already-owned exam explanation does not create duplicate entitlement rows.
- [ ] Production ECPay credentials are configured only in server-side environment variables.
- [ ] `HASH_KEY`, `HASH_IV`, and `SUPABASE_SERVICE_ROLE_KEY` are never exposed through `NEXT_PUBLIC_*` variables.

### Checkout gate

Keep these disabled until payment-provider review and production fulfillment testing are complete:

```env
NEXT_PUBLIC_ECPAY_ENABLED=false
NEXT_PUBLIC_SHOP_CHECKOUT_ENABLED=false
SHOP_CHECKOUT_ENABLED=false
```

Before switching them on:

- [ ] Merchant/provider review is approved.
- [ ] Production credentials are configured.
- [ ] A production-like checkout succeeds.
- [ ] Callback updates the order exactly once.
- [ ] The expected Pro/exam entitlement is immediately readable by the app.
- [ ] Failed/cancelled payment does not grant an entitlement.

## 5. Authentication and account separation

- [ ] Sign-up, login, logout, and session refresh work.
- [ ] A user's game state, mistakes, attempts, entitlements, uploads, and AI history are not visible to another account.
- [ ] RLS/service-role usage matches the intended trust boundary.
- [ ] Owner/test reset is unavailable in production and requires its explicit non-production environment gate.

## 6. Core learning smoke test

- [ ] National-exam question list loads.
- [ ] A quiz/exam can be started and submitted.
- [ ] Correct / wrong / uncertain outcomes are saved correctly.
- [ ] Mistakes appear in the mistake-review flow.
- [ ] Attempt history is saved and displays correctly.
- [ ] Topic/Subtopic analytics work for Pro users with sufficient classified data.
- [ ] Uploaded-material analysis/explanations still work for supported flows.
- [ ] AI explanation feedback/reporting still submits successfully.

## 7. Game-system smoke test

- [ ] Daily free gacha pull works once per day.
- [ ] Coin and ticket costs are correct.
- [ ] Gacha rates shown in UI match `docs/game-balance-v1.md` and implementation.
- [ ] 10-pull guarantees at least one SR or SSR.
- [ ] SSR pity is 80 pulls.
- [ ] Duplicate slimes refund the intended coin amount and do not create fragments/accessories.
- [ ] Single-pull reveal/flip works.
- [ ] Ten-pull stacked reveal, swipe/next, and result summary work.
- [ ] Slime collection and companion selection persist after refresh/login.
- [ ] Home My Room and focus timer show the selected slime body image without accessory-state dependencies.
- [ ] Tasks, achievements, streak, focus sessions, coins, and tickets still persist correctly.

## 8. Responsive / user-facing QA

- [ ] Home, Study, Shop, Gacha, Slimes, Tasks, Achievements, Focus, login, and major exam pages are usable on mobile width.
- [ ] No modal/overlay traps scrolling or hides its close/primary action.
- [ ] User-facing text does not mention retired paid coins, AI credits, fragments, or accessories as active products/features.
- [ ] Shop clearly describes what a payment grants and does not present a stored balance.
- [ ] Error messages do not expose server secrets or internal stack traces.

## 9. Final go / no-go

A release is **NO-GO** if any of the following is true:

- Vercel/build is failing.
- The database migration/source of truth is ambiguous.
- Checkout can grant stored value or randomized gameplay resources.
- Payment callback/entitlement fulfillment is unverified.
- Cross-account data isolation is broken.
- A destructive migration has not been checked against current production data.

When all applicable items are checked, record the release commit SHA and deployment in the release/operations notes.
