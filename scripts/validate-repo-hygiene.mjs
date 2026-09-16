import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];

const packageJson = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8"),
);

for (const section of [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
]) {
  const dependencies = packageJson[section] ?? {};

  for (const [name, spec] of Object.entries(dependencies)) {
    if (typeof spec === "string" && spec.trim().toLowerCase() === "latest") {
      errors.push(`${section}.${name} must use a pinned or bounded version, not latest`);
    }
  }
}

const legacyGlobalCss = path.join(root, "app", "global.css");
if (existsSync(legacyGlobalCss)) {
  errors.push("app/global.css is retired; use app/globals.css");
}

const slimeDirectory = path.join(root, "public", "slimes");
if (existsSync(slimeDirectory)) {
  for (const entry of readdirSync(slimeDirectory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith("-accessory.png")) {
      errors.push(`retired slime accessory asset found: public/slimes/${entry.name}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Repository hygiene validation failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Repository hygiene validation passed.");
