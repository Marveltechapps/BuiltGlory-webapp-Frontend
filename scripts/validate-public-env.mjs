/**
 * Validates the public web app API URL. Does not print other values.
 * Usage: node scripts/validate-public-env.mjs --file .env.production.example
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const fileIdx = args.indexOf("--file");
const envFile = fileIdx >= 0 ? args[fileIdx + 1] : ".env.production.example";
const envPath = path.isAbsolute(envFile) ? envFile : path.join(root, envFile);
const stagingFile = /staging/i.test(path.basename(envFile));

if (!fs.existsSync(envPath)) {
  console.error(`FAIL missing env file: ${envFile}`);
  process.exit(1);
}

let raw = "";
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 1) continue;
  if (trimmed.slice(0, eq).trim() === "NEXT_PUBLIC_API_BASE_URL") {
    raw = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
}

const issues = [];
let url;
try {
  url = new URL(raw);
} catch {
  issues.push("NEXT_PUBLIC_API_BASE_URL must be an absolute URL");
}

if (url) {
  if (url.protocol !== "https:") issues.push("NEXT_PUBLIC_API_BASE_URL must use https://");
  if (/localhost|127\.0\.0\.1/i.test(url.hostname)) issues.push("NEXT_PUBLIC_API_BASE_URL must not use localhost");
  const pathName = url.pathname.replace(/\/$/, "");
  if (pathName !== "/api/v1") issues.push("NEXT_PUBLIC_API_BASE_URL path must be /api/v1");
  if (stagingFile && !/staging/i.test(url.hostname)) issues.push("staging API hostname must include 'staging'");
  if (stagingFile && url.hostname === "api.builtglory.com") issues.push("staging must not call the production API host");
  if (!stagingFile && /staging/i.test(url.hostname)) issues.push("production API hostname must not include 'staging'");
}

if (issues.length) {
  console.log("FAIL:");
  for (const issue of issues) console.log(" - " + issue);
  process.exit(1);
}

console.log(`PASS ${stagingFile ? "staging" : "production"} web env (${url.hostname}${url.pathname}).`);
