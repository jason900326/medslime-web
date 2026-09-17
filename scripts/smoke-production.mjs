import { spawn } from "node:child_process";

const host = "127.0.0.1";
const port = Number(process.env.SMOKE_PORT ?? 3100);
const baseUrl = `http://${host}:${port}`;
const timeoutMs = 30_000;
const logLines = [];

function rememberLog(chunk) {
  const text = String(chunk ?? "");
  if (!text) return;
  logLines.push(...text.split(/\r?\n/).filter(Boolean));
  if (logLines.length > 80) logLines.splice(0, logLines.length - 80);
}

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-H", host, "-p", String(port)],
  {
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

server.stdout.on("data", rememberLog);
server.stderr.on("data", rememberLog);

let exited = false;
server.once("exit", () => {
  exited = true;
});

async function waitForHealth() {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    if (exited) {
      throw new Error("Next.js production server exited before becoming ready.");
    }

    try {
      const response = await fetch(`${baseUrl}/api/health`, { redirect: "manual" });
      if (response.ok) {
        const payload = await response.json();
        if (payload?.ok === true && payload?.service === "medslime") return;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error(
    `Production server did not become healthy within ${timeoutMs}ms${
      lastError instanceof Error ? `: ${lastError.message}` : ""
    }`,
  );
}

async function assertHtml(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { redirect: "manual" });
  if (response.status !== 200) {
    throw new Error(`${pathname} returned HTTP ${response.status}; expected 200.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error(`${pathname} returned ${contentType || "no content-type"}; expected HTML.`);
  }

  const body = await response.text();
  if (!body.trim()) {
    throw new Error(`${pathname} returned an empty HTML response.`);
  }
}

async function shutdown() {
  if (server.exitCode !== null || server.signalCode !== null) return;
  server.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);
  if (server.exitCode === null && server.signalCode === null) server.kill("SIGKILL");
}

try {
  await waitForHealth();
  await assertHtml("/");
  await assertHtml("/about");
  console.log("Production smoke tests passed: /api/health, /, /about");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  if (logLines.length) {
    console.error("\nRecent Next.js server output:\n" + logLines.join("\n"));
  }
  process.exitCode = 1;
} finally {
  await shutdown();
}
