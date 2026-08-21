import type { APIRoute } from "astro";
import { contentTypeFor, resolvePublicKey } from "../../lib/media";

export const prerender = false;

/**
 * Serves site media uploaded through the admin console.
 *
 * This is a PUBLIC route with no authentication, and it reads from the same
 * bucket that holds paid product downloads. It is therefore written to make
 * reaching those impossible rather than merely unlikely:
 *
 *   - the requested name goes through `resolvePublicKey`, which rejects path
 *     separators, `..`, and disallowed extensions, and is the only thing that
 *     may prepend the public prefix;
 *   - a multi-segment request (`a/b.png`) is refused outright, so a nested
 *     path can never be assembled;
 *   - nothing here ever reads a caller-supplied bucket key.
 *
 * A paid object lives under `products/`, has a `.zip` extension, and could
 * only be addressed by a key containing a slash — each of those is rejected
 * independently.
 */
export const GET: APIRoute = async ({ params, locals }) => {
	const env = locals.runtime.env;

	// `[...key]` yields the whole trailing path. Media names are flat, so
	// anything containing a separator is malformed and refused rather than
	// normalised — normalising is where traversal bugs come from.
	const requested = params.key ?? "";
	if (!requested || requested.includes("/")) {
		return new Response("Not found", { status: 404 });
	}

	const key = resolvePublicKey(requested);
	if (!key) return new Response("Not found", { status: 404 });

	const object = await env.MY_PRODUCTS.get(key);
	if (!object) return new Response("Not found", { status: 404 });

	const contentType =
		object.httpMetadata?.contentType ?? contentTypeFor(requested) ?? "application/octet-stream";

	return new Response(object.body, {
		status: 200,
		headers: {
			"Content-Type": contentType,
			"Content-Length": String(object.size),
			// Media is addressed by name and replaced by uploading a new name,
			// so it is safe to cache hard at the edge and in the browser.
			"Cache-Control": "public, max-age=31536000, immutable",
			ETag: object.httpEtag,
			// Never let a browser second-guess the type we chose from the
			// extension allowlist.
			"X-Content-Type-Options": "nosniff",
		},
	});
};
