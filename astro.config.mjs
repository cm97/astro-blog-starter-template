// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";
import { readdirSync, readFileSync } from "node:fs";

// Blog posts marked `draft: true` render but stay out of the sitemap (see
// the `draft` field in src/content.config.ts).
const draftPostUrls = readdirSync("./src/content/blog")
	.filter((file) => /^draft:\s*true\s*$/m.test(readFileSync(`./src/content/blog/${file}`, "utf8").split(/^---$/m)[1] ?? ""))
	.map((file) => `https://buzzyfly.com/blog/${file.replace(/\.mdx?$/, "")}/`);

// https://astro.build/config
export default defineConfig({
	site: "https://buzzyfly.com",
	output: "server",
	adapter: cloudflare({
		platformProxy: {
			enabled: true,
		},
		workerEntryPoint: { path: "./src/worker-entry.ts" },
	}),
	// Duplicate posts merged into one post per topic. Keep these so old links
	// and search results still land on the merged post.
	redirects: {
		"/blog/onboarding-checklist-full": { status: 301, destination: "/blog/client-onboarding-checklist-template/" },
		"/blog/onboarding-checklist": { status: 301, destination: "/blog/client-onboarding-checklist-template/" },
		"/blog/client-onboarding-system": { status: 301, destination: "/blog/client-onboarding-checklist-template/" },
		"/blog/stop-rebuilding-onboarding": { status: 301, destination: "/blog/client-onboarding-checklist-template/" },
		"/blog/follow-up-emails-that-get-replies": { status: 301, destination: "/blog/follow-up-email-after-no-response/" },
		"/blog/follow-up-system-small-business": { status: 301, destination: "/blog/follow-up-email-after-no-response/" },
		"/blog/follow-up-system": { status: 301, destination: "/blog/follow-up-email-after-no-response/" },
		"/blog/follow-up-templates": { status: 301, destination: "/blog/follow-up-email-after-no-response/" },
		"/blog/weekly-reset-checklist": { status: 301, destination: "/blog/weekly-reset/" },
		"/blog/weekly-reset-small-business": { status: 301, destination: "/blog/weekly-reset/" },
		"/blog/weekly-reset-that-survives-thursday": { status: 301, destination: "/blog/weekly-reset/" },
		"/blog/third-post": { status: 301, destination: "/blog/weekly-reset/" },
		"/blog/intake-form": { status: 301, destination: "/blog/client-intake-form-template/" },
		"/blog/intake-form-template": { status: 301, destination: "/blog/client-intake-form-template/" },
		"/blog/intake-form-that-stops-ghosting": { status: 301, destination: "/blog/client-intake-form-template/" },
		"/blog/retention": { status: 301, destination: "/blog/retention-checklist/" },
		"/blog/retention-checklist-keep-clients": { status: 301, destination: "/blog/retention-checklist/" },
		"/blog/scope-creep": { status: 301, destination: "/blog/scope-creep-script/" },
		"/blog/scope-creep-how-to-say-no": { status: 301, destination: "/blog/scope-creep-script/" },
		"/blog/pricing": { status: 301, destination: "/blog/pricing-your-time-without-guessing/" },
		"/blog/pricing-worksheet": { status: 301, destination: "/blog/pricing-your-time-without-guessing/" },
		"/blog/proposal-template": { status: 301, destination: "/blog/proposal-that-closes/" },
		"/blog/discovery-questions": { status: 301, destination: "/blog/client-discovery-questions/" },
		"/blog/first-client-sprint": { status: 301, destination: "/blog/first-client-7-day-sprint/" },
		"/blog/time-blocking": { status: 301, destination: "/blog/time-blocking-for-solo-operators/" },
		// Starter-template slugs renamed to the words people search for.
		"/blog/first-post": { status: 301, destination: "/blog/why-i-built-the-buzzyfly-digital-system/" },
		"/blog/second-post": { status: 301, destination: "/blog/signs-your-business-is-running-you/" },
		"/blog/markdown-style-guide": { status: 301, destination: "/blog/templates-vs-systems/" },
		"/blog/using-mdx": { status: 301, destination: "/blog/how-to-use-the-buzzyfly-digital-system/" },
		// Thin duplicates merged into the fuller post on the same topic.
		"/blog/the-product": { status: 301, destination: "/blog/product-contents/" },
		"/blog/lead-magnet-ideas": { status: 301, destination: "/blog/free-checklist-lead-magnet/" },
	},
	integrations: [
		mdx(),
		sitemap({
			// The free tools are static files in public/, which the sitemap
			// integration does not see on its own.
			customPages: [
				"https://buzzyfly.com/tools/weekly-reset",
				"https://buzzyfly.com/tools/follow-up-writer",
				"https://buzzyfly.com/tools/client-onboarding",
			],
			// Only pages a searcher should land on: no admin console, order
			// confirmations, unsubscribe page, or routes that only redirect.
			filter: (page) =>
				!/^https:\/\/buzzyfly\.com\/(admin|success|thank-you|unsubscribe|products|app)(\/|$)/.test(page) &&
				!draftPostUrls.includes(page),
		}),
	],
	devToolbar: { enabled: false },
});
