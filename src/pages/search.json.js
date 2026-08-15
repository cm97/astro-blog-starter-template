import { getCollection } from "astro:content";

/**
 * Buzzyfly site search index.
 *
 * This is prerendered at build time into a static /search.json file, so search
 * costs nothing at runtime: the browser downloads this once and filters it
 * locally. Every blog post is indexed automatically — to make a non-blog page
 * findable, add an entry to STATIC_PAGES below.
 */

const STATIC_PAGES = [
	{
		title: "Home",
		description: "Small ideas, long distances.",
		url: "/",
		type: "Page",
		text:
			"Buzzyfly home. Practical systems, reusable templates, and honest write-ups " +
			"on getting things done, sent straight from the Buzzyfly notebook.",
	},
	{
		title: "About Buzzyfly",
		description: "Why Buzzyfly exists and what the Digital System is actually for.",
		url: "/about/",
		type: "Page",
		text:
			"About Buzzyfly. Why the Buzzyfly Digital System exists: onboarding, weekly " +
			"planning, and follow-up workflows built to hold up on the days you do not " +
			"feel like running them.",
	},
];

/** Strip Markdown/MDX syntax down to searchable prose. */
function toPlainText(source) {
	return (source ?? "")
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/`[^`]*`/g, " ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/^import\s+.*$/gm, " ")
		.replace(/<[^>]*>/g, " ")
		.replace(/[#>*_~|]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export async function GET() {
	const posts = await getCollection("blog");

	const postDocs = posts
		.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
		.map((post) => ({
			title: post.data.title,
			description: post.data.description ?? "",
			url: `/blog/${post.id}/`,
			type: "Post",
			date: post.data.pubDate.toISOString(),
			text: toPlainText(post.body).slice(0, 1500),
		}));

	return new Response(JSON.stringify([...STATIC_PAGES, ...postDocs]), {
		headers: { "content-type": "application/json" },
	});
}
