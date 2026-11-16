#!/usr/bin/env node
// Guards CLAUDE.md's live-site rules. Runs before every build (npm "prebuild"),
// so CI and the Deploy workflow both stop if a banned item reaches src/,
// including direct pushes to main that skip review.
//
// The allowed Stripe Payment Links are read from CLAUDE.md itself, so when the
// owner changes rule 5 the guard follows without a code change.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const STRIPE = /https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+/g;
const allowedLinks = new Set(readFileSync(join(root, "CLAUDE.md"), "utf8").match(STRIPE) ?? []);

// Old products that still exist only for past buyers (no offer, not for sale).
const SKIP = ["src/apps-private/", "src/lib/dropPages.ts"];
const TEXT = /\.(astro|ts|tsx|js|mjs|md|mdx|html|json)$/;

// [rule, pattern]: text that must never be on the site.
const BANNED = [
	["rule 1: no instant download/delivery claims", /instant(ly)? (download|delivery|access)/i],
	["rule 2: no Monthly Drop subscription link", /eVq4gB/],
	["rule 4: refund wording (no money-back / results guarantee)", /money[- ]back guarantee|if it doesn'?t help|7-day refund/i],
	["rule 4: refund wording (the product is an app, not files)", /files (are )?not delivered|not as listed/i],
	["rule 5: there is no $97 bundle", /\$97\b|complete business bundle/i],
	["no outcome promises", /reply-generating/i],
];
// Rule 3: the owner's inbox never appears on public pages.
const PUBLIC = ["src/pages/", "src/components/", "src/layouts/", "src/content/"];
const OWNER_EMAIL = /coachmanager@gmail\.com/i;

function* files(dir) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) yield* files(path);
		else if (TEXT.test(name)) yield path;
	}
}

const problems = [];
for (const path of files(join(root, "src"))) {
	const rel = relative(root, path);
	if (SKIP.some((s) => rel.startsWith(s))) continue;
	readFileSync(path, "utf8").split("\n").forEach((line, i) => {
		const at = `${rel}:${i + 1}`;
		for (const link of line.match(STRIPE) ?? []) {
			if (!allowedLinks.has(link)) problems.push(`${at}  rule 5: ${link} is not an allowed Payment Link (see CLAUDE.md)`);
		}
		for (const [rule, re] of BANNED) if (re.test(line)) problems.push(`${at}  ${rule}`);
		if (PUBLIC.some((p) => rel.startsWith(p)) && OWNER_EMAIL.test(line)) problems.push(`${at}  rule 3: owner email on a public page`);
	});
}

if (problems.length) {
	console.error(`\nCLAUDE.md live-site rules broken in ${problems.length} place(s). Fix these before building:\n`);
	for (const p of problems) console.error(`  ${p}`);
	console.error("");
	process.exit(1);
}
console.log(`Live-site rules OK (${allowedLinks.size} allowed Payment Links from CLAUDE.md).`);
