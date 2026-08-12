import type { APIRoute } from "astro";

export const prerender = false;

/**
 * Public read-only access to admin-uploaded site images. Only ever reaches
 * into the `site-media/` prefix of the MY_PRODUCTS bucket — the
 * `products/` prefix (paid downloads) stays gated behind ../api/download.ts.
 */
export const GET: APIRoute = async ({ params, locals }) => {
	const env = locals.runtime.env;
	const key = params.key;
	if (!key) return new Response("Not found", { status: 404 });

	const object = await env.MY_PRODUCTS.get(`site-media/${key}`);
	if (!object) return new Response("Not found", { status: 404 });

	return new Response(object.body, {
		status: 200,
		headers: {
			"Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
			"Content-Length": String(object.size),
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
};
