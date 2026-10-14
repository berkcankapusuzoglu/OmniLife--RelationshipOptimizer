#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const secretPatterns = [
  ["private key material", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["live Stripe secret key", /\bsk_live_[A-Za-z0-9]{16,}\b/],
  ["Stripe webhook secret", /\bwhsec_[A-Za-z0-9]{16,}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["hardcoded password value", /(?:KEYSTORE_PASSWORD|KEY_PASSWORD|E2E_PASSWORD)\s*[:=]\s*["'](?![^"']*(?:your|placeholder|example|<|>|\$))[^"']{8,}["']/i],
  ["hardcoded password in browser input", /(?:page|sharedPage|mobilePage)\.fill\([^,]*password[^,]*,\s*["'](?![^"']*(?:your|placeholder|example|<|>|\$))[^"']{8,}["']/i],
];

const ignoredFile = (file) => {
  const basename = path.posix.basename(file);
  return basename.startsWith(".env") || /\.(?:keystore|jks|p12|pfx)$/i.test(basename);
};
const signingFile = (file) => /\.(?:keystore|jks|p12|pfx)$/i.test(file);
const failures = [];

for (const file of trackedFiles) {
  if (signingFile(file)) {
    failures.push(`${file}: tracked signing file`);
    continue;
  }
  if (ignoredFile(file)) continue;

  let contents;
  try {
    const bytes = readFileSync(file);
    if (bytes.includes(0)) continue;
    contents = bytes.toString("utf8");
  } catch {
    failures.push(`${file}: unable to scan tracked file`);
    continue;
  }

  for (const [label, pattern] of secretPatterns) {
    if (pattern.test(contents)) failures.push(`${file}: ${label}`);
  }
}

if (failures.length) {
  console.error(`Secret check failed (${failures.length} finding(s)):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Secret check passed (${trackedFiles.length} tracked paths checked; .env* and signing file contents excluded).`);
}
