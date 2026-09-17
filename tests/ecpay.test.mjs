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
  const previousMode = process.env.ECPAY_MODE;
  try {
    process.env.ECPAY_MODE = "production";
    assert.equal(getEcpayCheckoutUrl(), ECPAY_PRODUCTION_URL);

    process.env.ECPAY_MODE = "stage";
    assert.equal(getEcpayCheckoutUrl(), ECPAY_STAGE_URL);
  } finally {
    if (previousMode === undefined) delete process.env.ECPAY_MODE;
    else process.env.ECPAY_MODE = previousMode;
  }
});
