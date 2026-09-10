const args = process.argv.slice(2);
const baseUrlArg = args.find((arg) => arg.startsWith("--base-url="));
const baseUrl = (baseUrlArg?.split("=").slice(1).join("=") || process.env.PAYMENT_BASE_URL || "https://medslime.vercel.app").replace(/\/$/, "");
const secret = process.env.PAYMENT_SECRET || process.env.TAXONOMY_SECRET;

if (!secret) {
  console.error("Missing PAYMENT_SECRET or TAXONOMY_SECRET in this shell.");
  process.exit(1);
}

console.log("MedSlime Phase E payment stage readiness");
console.log(`Base URL: ${baseUrl}`);

const response = await fetch(`${baseUrl}/api/internal/payments/readiness`, {
  headers: { "x-payment-secret": secret },
  cache: "no-store",
});

let payload;
try {
  payload = await response.json();
} catch {
  payload = null;
}

if (!response.ok) {
  console.error(`Readiness failed: HTTP ${response.status}`);
  if (payload) console.error(payload);
  process.exit(1);
}

const rows = [
  ["Vercel env", payload.vercelEnv],
  ["ECPay mode", payload.ecpayMode],
  ["Safe environment", payload.safeEnvironment],
  ["Server checkout enabled", payload.serverCheckoutEnabled],
  ["Public checkout enabled", payload.publicCheckoutEnabled],
  ["Public ECPay enabled", payload.publicEcpayEnabled],
  ["Merchant ID configured", payload.credentials?.merchantId],
  ["HashKey configured", payload.credentials?.hashKey],
  ["HashIV configured", payload.credentials?.hashIv],
  ["Stage tester allowlist configured", payload.stageTesterAllowlistConfigured],
  ["payment_orders schema", payload.schema?.paymentOrders],
  ["player_entitlements schema", payload.schema?.playerEntitlements],
  ["exam_explanation_entitlements schema", payload.schema?.examExplanationEntitlements],
];

for (const [label, value] of rows) {
  console.log(`${label}: ${value}`);
}

const checks = [
  payload.ecpayMode === "stage",
  payload.safeEnvironment === true,
  payload.serverCheckoutEnabled === true,
  payload.publicCheckoutEnabled === true,
  payload.publicEcpayEnabled === true,
  payload.credentials?.merchantId === true,
  payload.credentials?.hashKey === true,
  payload.credentials?.hashIv === true,
  payload.stageTesterAllowlistConfigured === true,
  payload.schema?.paymentOrders === true,
  payload.schema?.playerEntitlements === true,
  payload.schema?.examExplanationEntitlements === true,
];

if (checks.every(Boolean)) {
  console.log("\nPASS: ECPay stage environment is ready for a real test checkout.");
  process.exit(0);
}

console.error("\nFAIL: ECPay stage environment is not ready yet.");
if (payload.environmentProblem) console.error(`Environment problem: ${payload.environmentProblem}`);
if (Array.isArray(payload.schemaErrors) && payload.schemaErrors.length > 0) {
  console.error(payload.schemaErrors.join("\n"));
}
process.exit(1);
