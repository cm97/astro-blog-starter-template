// One-off helper: generates a random admin username/password for the
// Buzzyfly admin console, plus the PBKDF2 salt+hash to store as Cloudflare
// secrets (ADMIN_USERNAME / ADMIN_PASSWORD_SALT / ADMIN_PASSWORD_HASH).
// The plaintext password is never stored anywhere — copy it down when this
// script prints it, then it's gone.
//
// Usage: node scripts/generate-admin-credentials.mjs

import { randomBytes, pbkdf2Sync } from "node:crypto";

const ITERATIONS = 100_000;

const username = "buzzyfly_admin";
const password = randomBytes(18).toString("base64url");
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");

console.log("Buzzyfly admin console credentials — save the password now, it will not be shown again.\n");
console.log(`Username: ${username}`);
console.log(`Password: ${password}\n`);
console.log("Set these as Cloudflare secrets (never commit them):");
console.log(`  npx wrangler secret put ADMIN_USERNAME`);
console.log(`    -> ${username}`);
console.log(`  npx wrangler secret put ADMIN_PASSWORD_SALT`);
console.log(`    -> ${salt.toString("hex")}`);
console.log(`  npx wrangler secret put ADMIN_PASSWORD_HASH`);
console.log(`    -> ${hash.toString("hex")}`);
