# MedSlime Phase E — Payment release checklist

## Product outcomes

MedSlime has exactly two paid outcomes:

1. `pro-30d` — NT$149, fixed 30-day MedSlime Pro access.
2. `exam-full-explanation` — NT$59, permanent access to one selected national-exam explanation set.

Coins, tickets, gacha pulls and the daily free AI explanation limit are not purchasable stored value.

## Fulfillment rules

### Pro 30 days

A successful payment calls `fulfill_payment_order`.

- If the user has no active Pro, expiry becomes `now() + 30 days`.
- If the user already has active Pro, 30 days are added after the current expiry.
- Replayed ECPay callbacks are idempotent because an already-paid order returns without granting again.

### Exam explanation

A successful payment inserts one row in `exam_explanation_entitlements` keyed by `(user_id, exam_key)`.

- Access is permanent.
- Buying the same exam again is prevented by checkout preflight and the database primary key.
- Purchased exam explanations bypass the daily 5-use limit for that exam.

## Before enabling checkout

1. Run `supabase/payment_entitlement_v2.sql` once in the MedSlime Supabase project.
2. Run `supabase/verify_payment_entitlements.sql` and confirm:
   - all three tables resolve,
   - all four required entitlement columns are `true`,
   - `fulfill_payment_order`, `consume_ai_detail_daily_use`, and `refund_ai_detail_daily_use` exist.
3. In Vercel Production environment variables, set the real merchant values:
   - `ECPAY_MERCHANT_ID`
   - `ECPAY_HASH_KEY`
   - `ECPAY_HASH_IV`
   - `NEXT_PUBLIC_SITE_URL=https://medslime.vercel.app`
4. While testing ECPay staging, use `ECPAY_MODE=stage`.
5. For real production payments, switch to `ECPAY_MODE=production` only after the merchant account is approved.
6. Keep both checkout release gates false until the database and ECPay credentials are ready:
   - `NEXT_PUBLIC_SHOP_CHECKOUT_ENABLED=false`
   - `SHOP_CHECKOUT_ENABLED=false`
7. When ready to accept payments, set both checkout gates to `true` and redeploy Production.

## Release smoke test

Perform one transaction for each product before announcing payment availability.

### Pro transaction

Expected flow:

`商城 -> 開通 30 天 Pro -> 綠界 -> callback -> payment_orders.status=paid -> player_entitlements.pro_expires_at updated -> 付款完成 -> Pro Analysis available`

Then make a second Pro test purchase on the same test account and confirm the expiry extends from the existing future expiry instead of resetting from the current time.

### Exam explanation transaction

Expected flow:

`選擇考卷 -> NT$59 購買 -> 綠界 -> callback -> payment_orders.status=paid -> exam_explanation_entitlements row inserted -> 付款完成 -> that exam is permanently unlocked`

Then revisit the same exam and confirm the purchase button is replaced with the unlocked state and its explanations no longer consume the daily free quota.

## Callback security expectations

The callback must reject a success notification when any of these checks fail:

- CheckMacValue is invalid.
- MerchantID does not equal the configured merchant account.
- MedSlime order does not exist.
- The order provider is not ECPay.
- `TradeAmt` is missing, invalid, or differs from the server-created order amount.

Never fulfill an entitlement from the browser return URL alone. Only the verified server-to-server ECPay callback may mark an order paid and grant access.
