export type EcpayMode = "stage" | "production";

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

export function getEcpayMode(): EcpayMode {
  return process.env.ECPAY_MODE === "production" ? "production" : "stage";
}

export function getPaymentEnvironmentProblem() {
  const mode = getEcpayMode();
  const vercelEnv = process.env.VERCEL_ENV;

  if (vercelEnv === "production" && mode !== "production") {
    return "Production deployment cannot create ECPay stage payments.";
  }

  if (vercelEnv === "preview" && mode !== "stage") {
    return "Preview deployment cannot create ECPay production payments.";
  }

  return null;
}

export function getPaymentCallbackBaseUrl(fallbackOrigin: string) {
  const explicit = process.env.PAYMENT_CALLBACK_BASE_URL?.trim();
  if (explicit) return trimTrailingSlash(explicit);

  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL?.trim()) {
    return trimTrailingSlash(`https://${process.env.VERCEL_URL.trim()}`);
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return trimTrailingSlash(configured || fallbackOrigin);
}

export function stageTesterEmails() {
  return (process.env.PAYMENT_STAGE_TEST_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedStageTester(email: string | null | undefined) {
  if (getEcpayMode() !== "stage") return true;
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return stageTesterEmails().includes(normalized);
}

export function getPaymentReadinessSnapshot() {
  const environmentProblem = getPaymentEnvironmentProblem();
  return {
    vercelEnv: process.env.VERCEL_ENV ?? "local",
    ecpayMode: getEcpayMode(),
    safeEnvironment: !environmentProblem,
    environmentProblem,
    serverCheckoutEnabled: process.env.SHOP_CHECKOUT_ENABLED === "true",
    publicCheckoutEnabled:
      process.env.NEXT_PUBLIC_SHOP_CHECKOUT_ENABLED === "true",
    publicEcpayEnabled: process.env.NEXT_PUBLIC_ECPAY_ENABLED === "true",
    credentials: {
      merchantId: Boolean(process.env.ECPAY_MERCHANT_ID?.trim()),
      hashKey: Boolean(process.env.ECPAY_HASH_KEY?.trim()),
      hashIv: Boolean(process.env.ECPAY_HASH_IV?.trim()),
    },
    stageTesterAllowlistConfigured: stageTesterEmails().length > 0,
  };
}
