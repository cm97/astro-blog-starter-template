import type { APIRoute } from "astro";

export const prerender = false;

function parseRange(header: string | null, size: number): { offset: number; length?: number } | undefined {
	if (!header) return undefined;
	const match = /^bytes=(\d+)-(\d+)?$/.exec(header);
	if (!match) return undefined;
	const offset = Number(match[1]);
	if (offset >= size) return undefined;
	if (match[2]) {
		const end = Math.min(Number(match[2]), size - 1);
		return { offset, length: end - offset + 1 };
	}
	return { offset };
}

/**
 * Public reader for reader-uploaded blog media (cover images, inline post
 * images, post videos) stored in the BLOG_MEDIA R2 bucket. Supports Range
 * requests so `<video>` seeking works.
 */
export const GET: APIRoute = async ({ params, request, locals }) => {
	const env = locals.runtime.env;
	const key = params.key;
	if (!key) return new Response("Not found", { status: 404 });

	const head = await env.BLOG_MEDIA.head(key);
	if (!head) return new Response("Not found", { status: 404 });

	const range = parseRange(request.headers.get("range"), head.size);
	const object = await env.BLOG_MEDIA.get(key, range ? { range } : undefined);
	if (!object) return new Response("Not found", { status: 404 });

	const headers = new Headers();
	if (object.httpMetadata?.contentType) headers.set("content-type", object.httpMetadata.contentType);
	headers.set("etag", object.httpEtag);
	headers.set("Cache-Control", "public, max-age=31536000, immutable");
	headers.set("Accept-Ranges", "bytes");

	if (range) {
		const end = range.offset + (range.length ?? head.size - range.offset) - 1;
		headers.set("Content-Range", `bytes ${range.offset}-${end}/${head.size}`);
		headers.set("Content-Length", String(end - range.offset + 1));
		return new Response(object.body, { status: 206, headers });
	}

	headers.set("Content-Length", String(head.size));
	return new Response(object.body, { status: 200, headers });
};
