import crypto from "node:crypto";

export const ECPAY_STAGE_URL =
  "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";
export const ECPAY_PRODUCTION_URL =
  "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5";

function ecpayUrlEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/%20/g, "+")
    .replace(/%2D/gi, "-")
    .replace(/%5F/gi, "_")
    .replace(/%2E/gi, ".")
    .replace(/%21/gi, "!")
    .replace(/%2A/gi, "*")
    .replace(/%28/gi, "(")
    .replace(/%29/gi, ")");
}

export function createCheckMacValue(
  params: Record<string, string>,
  hashKey: string,
  hashIv: string,
) {
  const entries = Object.entries(params)
    .filter(([key]) => key !== "CheckMacValue")
    .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const query = entries.map(([key, value]) => `${key}=${value}`).join("&");
  const raw = `HashKey=${hashKey}&${query}&HashIV=${hashIv}`;
  const encoded = ecpayUrlEncode(raw).toLowerCase();

  return crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

export function verifyCheckMacValue(
  params: Record<string, string>,
  hashKey: string,
  hashIv: string,
) {
  const received = params.CheckMacValue?.toUpperCase();
  if (!received) return false;
  return createCheckMacValue(params, hashKey, hashIv) === received;
}

export function createMerchantTradeNo() {
  const timestamp = Date.now().toString().slice(-12);
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `MS${timestamp}${random}`.slice(0, 20);
}

export function formatMerchantTradeDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}/${map.month}/${map.day} ${map.hour}:${map.minute}:${map.second}`;
}

export function getEcpayCheckoutUrl() {
  return process.env.ECPAY_MODE === "production"
    ? ECPAY_PRODUCTION_URL
    : ECPAY_STAGE_URL;
}
