import type { APIRoute } from "astro";
import {
	createPost,
	imageExtension,
	MAX_IMAGE_BYTES,
	MAX_VIDEO_BYTES,
	videoExtension,
} from "../../lib/posts";

export const prerender = false;

function jsonError(message: string, status: number) {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const user = locals.user;
	if (!user) return jsonError("Sign in to publish a post.", 401);
	if (!env.DB) return jsonError("Posting is not configured on this deployment.", 500);

	const form = await request.formData().catch(() => null);
	if (!form) return jsonError("Invalid form submission.", 400);

	const title = String(form.get("title") ?? "").trim();
	const bodyMarkdown = String(form.get("body") ?? "").trim();
	const cover = form.get("cover");
	const video = form.get("video");

	if (!title || title.length > 140) return jsonError("Title must be 1-140 characters.", 400);
	if (!bodyMarkdown || bodyMarkdown.length > 20_000) {
		return jsonError("Post body must be 1-20,000 characters.", 400);
	}

	let coverImageKey: string | null = null;
	let videoKey: string | null = null;
	const postId = crypto.randomUUID();

	if (cover instanceof File && cover.size > 0) {
		const extension = imageExtension(cover.type);
		if (!extension) return jsonError("Cover image must be JPEG, PNG, WebP, or GIF.", 415);
		if (cover.size > MAX_IMAGE_BYTES) return jsonError("Cover image must be 8MB or smaller.", 413);
		coverImageKey = `covers/${postId}.${extension}`;
		await env.BLOG_MEDIA.put(coverImageKey, await cover.arrayBuffer(), {
			httpMetadata: { contentType: cover.type },
		});
	}

	if (video instanceof File && video.size > 0) {
		const extension = videoExtension(video.type);
		if (!extension) return jsonError("Video must be MP4, WebM, or MOV.", 415);
		if (video.size > MAX_VIDEO_BYTES) return jsonError("Video must be 50MB or smaller.", 413);
		videoKey = `videos/${postId}.${extension}`;
		await env.BLOG_MEDIA.put(videoKey, await video.arrayBuffer(), {
			httpMetadata: { contentType: video.type },
		});
	}

	const slug = await createPost(env, {
		id: postId,
		authorId: user.id,
		title,
		bodyMarkdown,
		coverImageKey,
		videoKey,
	});

	return new Response(JSON.stringify({ ok: true, slug }), {
		status: 201,
		headers: { "content-type": "application/json" },
	});
};
