import type { APIRoute } from "astro";
import { imageExtension, MAX_IMAGE_BYTES, mediaUrl } from "../../lib/posts";

export const prerender = false;

/** Inline image upload used by the composer while writing a post body. */
export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const user = locals.user;
	if (!user) return new Response(JSON.stringify({ error: "Sign in to upload images." }), { status: 401 });
	if (!env.DB) return new Response(JSON.stringify({ error: "Uploads are not configured." }), { status: 500 });

	const form = await request.formData().catch(() => null);
	const file = form?.get("file");
	if (!(file instanceof File)) {
		return new Response(JSON.stringify({ error: "No file provided." }), { status: 400 });
	}

	const extension = imageExtension(file.type);
	if (!extension) {
		return new Response(JSON.stringify({ error: "Only JPEG, PNG, WebP, or GIF images are allowed." }), {
			status: 415,
		});
	}
	if (file.size > MAX_IMAGE_BYTES) {
		return new Response(JSON.stringify({ error: "Images must be 8MB or smaller." }), { status: 413 });
	}

	const key = `inline/${user.id}/${crypto.randomUUID()}.${extension}`;
	await env.BLOG_MEDIA.put(key, await file.arrayBuffer(), {
		httpMetadata: { contentType: file.type },
	});

	return new Response(JSON.stringify({ url: mediaUrl(key) }), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
};
