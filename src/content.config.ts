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

export const collections = { blog };
