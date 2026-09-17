import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];

const packageJson = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8"),
);
const packageLock = JSON.parse(
  readFileSync(path.join(root, "package-lock.json"), "utf8"),
);

const dependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];
const exactVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

for (const section of dependencySections) {
  const dependencies = packageJson[section] ?? {};

  for (const [name, spec] of Object.entries(dependencies)) {
    if (typeof spec !== "string") continue;

    const normalizedSpec = spec.trim();
    if (normalizedSpec.toLowerCase() === "latest") {
      errors.push(`${section}.${name} must use a pinned or bounded version, not latest`);
      continue;
    }

    if (exactVersionPattern.test(normalizedSpec)) {
      const lockedVersion = packageLock.packages?.[`node_modules/${name}`]?.version;
      if (!lockedVersion) {
        errors.push(`${section}.${name} is pinned to ${normalizedSpec} but missing from package-lock.json`);
      } else if (lockedVersion !== normalizedSpec) {
        errors.push(
          `${section}.${name} is pinned to ${normalizedSpec} but package-lock.json resolves ${lockedVersion}`,
        );
      }
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

const generatedDatabaseTypes = path.join(root, "lib", "supabase", "database.types.ts");
if (!existsSync(generatedDatabaseTypes)) {
  errors.push("lib/supabase/database.types.ts is required; regenerate it from the live Supabase schema");
}

const typedSupabaseClients = [
  ["lib/supabase/client.ts", "createBrowserClient<Database>"],
  ["lib/supabase/server.ts", "createServerClient<Database>"],
  ["lib/supabase/admin.ts", "createSupabaseClient<Database>"],
];

for (const [relativePath, typedClientCall] of typedSupabaseClients) {
  const filePath = path.join(root, relativePath);
  if (!existsSync(filePath)) {
    errors.push(`${relativePath} is missing`);
    continue;
  }

  const source = readFileSync(filePath, "utf8");
  if (!source.includes("database.types") || !source.includes(typedClientCall)) {
    errors.push(
      `${relativePath} must use the generated Database type (${typedClientCall})`,
    );
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
