// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
	site: "https://buzzyfly.com",
	// /search renders its results in the browser and is marked noindex, so it
	// has nothing to offer a crawler — keep it out of the sitemap.
	integrations: [mdx(), sitemap({ filter: (page) => !page.includes("/search") })],
	adapter: cloudflare({
		platformProxy: {
			enabled: true,
		},
	}),
});
