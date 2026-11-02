import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
		// Google shows about 60 characters of a title and 160 of a description.
		// When the on-page headline is longer, set a short seoTitle for search.
		seoTitle: z.string().max(60, "seoTitle must be 60 characters or fewer").optional(),
		description: z.string().max(160, "description must be 160 characters or fewer"),
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
	}).refine((d) => d.seoTitle || d.title.length <= 60, {
		message: "title is over 60 characters: add a seoTitle of 60 or fewer for search results",
		path: ["seoTitle"],
	}),
});

export const collections = { blog };
