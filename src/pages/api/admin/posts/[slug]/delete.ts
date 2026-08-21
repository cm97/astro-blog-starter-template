import type { APIRoute } from "astro";
import { deleteFile, getGitHubConfig } from "../../../../../lib/github";
import { logAdminAction } from "../../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, params, locals }) => {
	const env = locals.runtime.env;
	const githubConfig = getGitHubConfig(env);
	const slug = params.slug;
	if (!githubConfig || !slug) return new Response(null, { status: 303, headers: { Location: "/admin/posts" } });

	const form = await request.formData().catch(() => null);
	const sha = String(form?.get("sha") ?? "");
	const path = `src/content/blog/${slug}.md`;

	if (sha) {
		try {
			await deleteFile(githubConfig, path, sha, `Delete blog post: ${slug}`);
			await logAdminAction(env, locals.adminUser ?? "unknown", "post_delete", slug);
		} catch (error) {
			console.error("Buzzyfly admin: failed to delete post", error);
			return new Response(null, {
				status: 303,
				headers: { Location: `/admin/posts/${slug}?error=${encodeURIComponent("Failed to delete the post.")}` },
			});
		}
	}

	return new Response(null, { status: 303, headers: { Location: "/admin/posts?deleted=1" } });
};
