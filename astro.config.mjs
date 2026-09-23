// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
	site: "https://buzzyfly.com",
	output: "server",
	adapter: cloudflare({
		// No astro:assets usage, so skip the Cloudflare Images binding (a paid
		// product) the adapter would otherwise add.
		imageService: "passthrough",
	}),
	// The site doesn't use Astro sessions (admin auth is a signed cookie). Left
	// on, the adapter would add a SESSION KV binding and provision a namespace
	// on the next deploy.
	session: false,
	integrations: [mdx(), sitemap()],
});
