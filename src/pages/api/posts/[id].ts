import type { APIRoute } from "astro";
import { deleteOwnedPost } from "../../../lib/posts";

export const prerender = false;

export const DELETE: APIRoute = async ({ params, locals }) => {
	const env = locals.runtime.env;
	const user = locals.user;
	if (!user) return new Response(JSON.stringify({ error: "Sign in required." }), { status: 401 });

	const id = params.id;
	if (!id) return new Response(JSON.stringify({ error: "Missing post id." }), { status: 400 });

	const deleted = await deleteOwnedPost(env, id, user.id);
	if (!deleted) {
		return new Response(JSON.stringify({ error: "Post not found." }), { status: 404 });
	}

	const keys = [deleted.coverImageKey, deleted.videoKey].filter((key): key is string => Boolean(key));
	if (keys.length > 0) await env.BLOG_MEDIA.delete(keys);

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
};
