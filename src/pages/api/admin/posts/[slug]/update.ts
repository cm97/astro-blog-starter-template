import type { APIRoute } from "astro";
import { buildPostMarkdown, getGitHubConfig, putFile } from "../../../../../lib/github";
import { logAdminAction } from "../../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, params, locals }) => {
	const env = locals.runtime.env;
	const githubConfig = getGitHubConfig(env);
	const slug = params.slug;
	if (!githubConfig || !slug) return new Response(null, { status: 303, headers: { Location: "/admin/posts" } });

	const form = await request.formData().catch(() => null);
	const sha = String(form?.get("sha") ?? "");
	const title = String(form?.get("title") ?? "").trim();
	const description = String(form?.get("description") ?? "").trim();
	const pubDate = String(form?.get("pubDate") ?? "").trim();
	const body = String(form?.get("body") ?? "").trim();

	const errorRedirect = (error: string) =>
		new Response(null, {
			status: 303,
			headers: { Location: `/admin/posts/${slug}?error=${encodeURIComponent(error)}` },
		});

	if (!title || !description || !pubDate || !body || !sha) {
		return errorRedirect("Title, description, publish date, and body are all required.");
	}

	const path = `src/content/blog/${slug}.md`;

	try {
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

		await putFile(githubConfig, path, markdown, `Update blog post: ${title}`, sha);
		await logAdminAction(env, locals.adminUser ?? "unknown", "post_update", slug);
	} catch (error) {
		console.error("Buzzyfly admin: failed to update post", error);
		return errorRedirect("Failed to save changes. The post may have changed since you loaded it — reopen it and try again.");
	}

	return new Response(null, { status: 303, headers: { Location: "/admin/posts?created=1" } });
};
