import type { APIRoute } from "astro";
import { buildPostMarkdown, getFile, getGitHubConfig, putFile, slugify } from "../../../lib/github";
import { logAdminAction } from "../../../lib/audit";

export const prerender = false;

function backToNew(error: string): Response {
	return new Response(null, {
		status: 303,
		headers: { Location: `/admin/posts/new?error=${encodeURIComponent(error)}` },
	});
}

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const githubConfig = getGitHubConfig(env);
	if (!githubConfig) return backToNew("GitHub integration isn't configured.");

	const form = await request.formData().catch(() => null);
	const title = String(form?.get("title") ?? "").trim();
	const description = String(form?.get("description") ?? "").trim();
	const pubDate = String(form?.get("pubDate") ?? "").trim();
	const body = String(form?.get("body") ?? "").trim();
	const rawSlug = String(form?.get("slug") ?? "").trim();
	const slug = slugify(rawSlug || title);

	if (!title || !description || !pubDate || !body || !slug) {
		return backToNew("Title, description, publish date, and body are all required.");
	}

	const path = `src/content/blog/${slug}.md`;

	try {
		const existing = await getFile(githubConfig, path);
		if (existing) return backToNew(`A post with slug "${slug}" already exists.`);

		const markdown = buildPostMarkdown(
			{
				title,
				description,
				pubDate,
				heroImage: String(form?.get("heroImage") ?? "").trim() || undefined,
				featuredProductTitle: String(form?.get("featuredProductTitle") ?? "").trim() || undefined,
				featuredProductPrice: String(form?.get("featuredProductPrice") ?? "").trim() || undefined,
				featuredProductUrl: String(form?.get("featuredProductUrl") ?? "").trim() || undefined,
				featuredProductDescription:
					String(form?.get("featuredProductDescription") ?? "").trim() || undefined,
			},
			body,
		);

		await putFile(githubConfig, path, markdown, `Add blog post: ${title}`);
		await logAdminAction(env, locals.adminUser ?? "unknown", "post_create", slug);
	} catch (error) {
		console.error("Buzzyfly admin: failed to create post", error);
		return backToNew("Failed to publish the post. Check the GitHub token has write access.");
	}

	return new Response(null, { status: 303, headers: { Location: "/admin/posts?created=1" } });
};
