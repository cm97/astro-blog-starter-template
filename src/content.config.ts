import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
		description: z.string(),
		// Transform string to Date object
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: z.string().optional(),
		category: z.string().optional(),
		// Optional Buzzyfly product callout, rendered in BlogPost.astro when present.
		featuredProductTitle: z.string().optional(),
		featuredProductPrice: z.string().optional(),
		featuredProductUrl: z.string().optional(),
		featuredProductDescription: z.string().optional(),
	}),
});

// AI tools directory. Entries adapted from github.com/durofycom/ai-tools (MIT, see LICENSE in the folder).
const aitools = defineCollection({
	loader: glob({ base: "./src/content/aitools", pattern: "*.md" }),
	schema: z.object({
		name: z.string(),
		slug: z.string(),
		website: z.string().url(),
		description: z.string(),
		categories: z.array(z.string()).default([]),
		use_cases: z.array(z.string()).default([]),
		modalities: z.array(z.string()).default([]),
		pricing: z.enum(["free", "freemium", "paid", "open-source"]),
		api: z.boolean().default(false),
		self_hosted: z.boolean().default(false),
		features: z.array(z.string()).default([]),
		launch_date: z.coerce.string().optional(),
		verified: z.boolean().default(false),
	}),
});

export const collections = { blog, aitools };
