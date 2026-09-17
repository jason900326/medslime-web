import assert from "node:assert/strict";
import test from "node:test";
import {
  ECPAY_PRODUCTION_URL,
  ECPAY_STAGE_URL,
  createCheckMacValue,
  createMerchantTradeNo,
  formatMerchantTradeDate,
  getEcpayCheckoutUrl,
  verifyCheckMacValue,
} from "../lib/ecpay.ts";
import {
  getPaymentCallbackBaseUrl,
  getPaymentEnvironmentProblem,
  isAllowedStageTester,
} from "../lib/payment-environment.ts";

const officialCheckoutVector = {
  ChoosePayment: "ALL",
  EncryptType: "1",
  ItemName: "Apple iphone 15",
  MerchantID: "3002607",
  MerchantTradeDate: "2023/03/12 15:30:23",
  MerchantTradeNo: "ecpay20230312153023",
  PaymentType: "aio",
  ReturnURL: "https://www.ecpay.com.tw/receive.php",
  TotalAmount: "30000",
  TradeDesc: "促銷方案",
};

const officialHashKey = "pwFHCqoQZGmho4w6";
const officialHashIv = "EkRm7iFT261dpevs";
const officialCheckMacValue =
  "6C51C9E6888DE861FD62FB1DD17029FC742634498FD813DC43D4243B5685B840";

const paymentEnvKeys = [
  "ECPAY_MODE",
  "VERCEL_ENV",
  "VERCEL_URL",
  "PAYMENT_CALLBACK_BASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "PAYMENT_STAGE_TEST_EMAILS",
];

function withPaymentEnv(run) {
  const before = Object.fromEntries(
    paymentEnvKeys.map((key) => [key, process.env[key]]),
  );
  try {
    for (const key of paymentEnvKeys) delete process.env[key];
    run();
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("createCheckMacValue matches ECPay's official AioCheckOut vector", () => {
  assert.equal(
    createCheckMacValue(officialCheckoutVector, officialHashKey, officialHashIv),
    officialCheckMacValue,
  );
});

test("verifyCheckMacValue accepts a valid checksum and rejects tampering", () => {
  const signed = {
    ...officialCheckoutVector,
    CheckMacValue: officialCheckMacValue,
  };
  assert.equal(verifyCheckMacValue(signed, officialHashKey, officialHashIv), true);

  assert.equal(
    verifyCheckMacValue(
      { ...signed, TotalAmount: "30001" },
      officialHashKey,
      officialHashIv,
    ),
    false,
  );
});

test("createCheckMacValue ignores an existing CheckMacValue field", () => {
  assert.equal(
    createCheckMacValue(
      { ...officialCheckoutVector, CheckMacValue: "stale-value" },
      officialHashKey,
      officialHashIv,
    ),
    officialCheckMacValue,
  );
});

test("merchant trade numbers stay within ECPay's 20-character limit", () => {
  const tradeNo = createMerchantTradeNo();
  assert.match(tradeNo, /^MS[0-9]{12}[0-9A-F]{6}$/);
  assert.equal(tradeNo.length, 20);
});

test("merchant trade dates are formatted in Asia/Taipei", () => {
  assert.equal(
    formatMerchantTradeDate(new Date("2026-01-01T04:05:06.000Z")),
    "2026/01/01 12:05:06",
  );
});

test("checkout URL follows ECPAY_MODE", () => {
  withPaymentEnv(() => {
    process.env.ECPAY_MODE = "production";
    assert.equal(getEcpayCheckoutUrl(), ECPAY_PRODUCTION_URL);

    process.env.ECPAY_MODE = "stage";
    assert.equal(getEcpayCheckoutUrl(), ECPAY_STAGE_URL);
  });
});

test("payment environment blocks production/stage mode mismatches", () => {
  withPaymentEnv(() => {
    process.env.VERCEL_ENV = "production";
    process.env.ECPAY_MODE = "stage";
    assert.equal(
      getPaymentEnvironmentProblem(),
      "Production deployment cannot create ECPay stage payments.",
    );

    process.env.VERCEL_ENV = "preview";
    process.env.ECPAY_MODE = "production";
    assert.equal(
      getPaymentEnvironmentProblem(),
      "Preview deployment cannot create ECPay production payments.",
    );

    process.env.VERCEL_ENV = "preview";
    process.env.ECPAY_MODE = "stage";
    assert.equal(getPaymentEnvironmentProblem(), null);
  });
});

test("payment callback base URL prefers explicit and preview origins", () => {
  withPaymentEnv(() => {
    process.env.PAYMENT_CALLBACK_BASE_URL = "https://pay.example.com/";
    assert.equal(
      getPaymentCallbackBaseUrl("https://fallback.example.com"),
      "https://pay.example.com",
    );

    delete process.env.PAYMENT_CALLBACK_BASE_URL;
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "medslime-preview.vercel.app";
    assert.equal(
      getPaymentCallbackBaseUrl("https://fallback.example.com"),
      "https://medslime-preview.vercel.app",
    );

    delete process.env.VERCEL_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://medslime.example.com/";
    assert.equal(
      getPaymentCallbackBaseUrl("https://fallback.example.com"),
      "https://medslime.example.com",
    );
  });
});

test("stage tester allowlist is normalized and production bypasses it", () => {
  withPaymentEnv(() => {
    process.env.ECPAY_MODE = "stage";
    process.env.PAYMENT_STAGE_TEST_EMAILS = " One@Example.com, two@example.com ";
    assert.equal(isAllowedStageTester("one@example.com"), true);
    assert.equal(isAllowedStageTester(" TWO@example.com "), true);
    assert.equal(isAllowedStageTester("other@example.com"), false);
    assert.equal(isAllowedStageTester(null), false);

    process.env.ECPAY_MODE = "production";
    assert.equal(isAllowedStageTester("other@example.com"), true);
  });
});
