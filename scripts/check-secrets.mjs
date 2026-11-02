#!/usr/bin/env node
// Fails if a secret (API key, signing secret, private key, token) is in any
// file git tracks or is about to commit. The repo is public, so anything
// committed can be read by anyone, forever. Secrets belong in Cloudflare
// (`npx wrangler secret put NAME`), never in the repo.
//
// Usage: node scripts/check-secrets.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const PATTERNS = [
	["Stripe secret key", /\b[sr]k_(live|test)_[A-Za-z0-9]{16,}/],
	["Stripe webhook secret", /\bwhsec_[A-Za-z0-9]{16,}/],
	["GitHub token", /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{30,}/],
	["Anthropic API key", /\bsk-ant-[A-Za-z0-9_-]{20,}/],
	["xAI / Grok API key", /\bxai-[A-Za-z0-9]{20,}/],
	["OpenAI API key", /\bsk-(proj-)?[A-Za-z0-9]{32,}/],
	["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
	["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
	["Slack token", /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
	["Resend API key", /\bre_[A-Za-z0-9]{8}_[A-Za-z0-9]{16,}/],
	["Cloudflare API token", /\bCLOUDFLARE_API_TOKEN\s*[=:]\s*["']?[A-Za-z0-9_-]{30,}/],
	["Private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
	[
		"Secret value in config",
		/"(\w*(SECRET|PASSWORD|API_KEY|TOKEN)\w*)"\s*:\s*"[^"]{12,}"/,
	],
];

// Files that are allowed to look like secrets: this scanner itself, and test
// fixtures that use obviously fake values.
const SKIP = [/^scripts\/check-secrets\.mjs$/, /^package-lock\.json$/, /^tests\//, /\.(png|jpe?g|gif|webp|ico|mp4|woff2?|zip|pdf)$/i];

const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
const files = new Set([
	...git("ls-files").split("\n"),
	...git("diff", "--cached", "--name-only", "--diff-filter=ACM").split("\n"),
]);

const hits = [];
for (const file of files) {
	if (!file || SKIP.some((re) => re.test(file))) continue;
	let text;
	try {
		if (statSync(file).size > 2_000_000) continue;
		text = readFileSync(file, "utf8");
	} catch {
		continue; // deleted or unreadable
	}
	text.split("\n").forEach((line, i) => {
		for (const [name, re] of PATTERNS) {
			if (re.test(line)) hits.push(`${file}:${i + 1}  ${name}`);
		}
	});
}

if (hits.length) {
	console.error("Possible secrets found. Remove them, move them to `npx wrangler secret put`, and tell the owner to rotate any real one:");
	for (const h of hits) console.error("  " + h);
	process.exit(1);
}
console.log(`check-secrets: ${files.size} files clean`);
