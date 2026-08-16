import type { APIRoute } from "astro";
import { resolveDeliverable, verifyDownloadToken } from "../../lib/fulfillment";

export const prerender = false;

/**
 * Secure Buzzyfly digital asset delivery. Streams a purchased file straight
 * out of the private `MY_PRODUCTS` R2 bucket, gated behind the signed,
 * time-limited token minted by `/api/webhook` on a verified purchase. The
 * bucket itself is never made public — every download is authorized per
 * request.
 */
export const GET: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const url = new URL(request.url);
	const token = url.searchParams.get("token");

	if (!token) return new Response("Missing download token", { status: 400 });
	if (!env.DOWNLOAD_TOKEN_SECRET) {
		console.error("Buzzyfly download: DOWNLOAD_TOKEN_SECRET is not configured");
		return new Response("Downloads not configured", { status: 500 });
	}

	const claims = await verifyDownloadToken(token, env.DOWNLOAD_TOKEN_SECRET);
	if (!claims) return new Response("Invalid or expired download link", { status: 401 });

	const deliverable = await resolveDeliverable(env.DB, claims.itemId);
	if (!deliverable) return new Response("Product not found", { status: 404 });

	const object = await env.MY_PRODUCTS.get(deliverable.r2Key);
	if (!object) {
		console.error(`Buzzyfly download: R2 object missing for key ${deliverable.r2Key}`);
		return new Response("File not found", { status: 404 });
	}

	return new Response(object.body, {
		status: 200,
		headers: {
			"Content-Type": deliverable.contentType,
			// Quotes and newlines in a filename would let a crafted product name
			// inject extra header directives, so only safe characters survive.
			"Content-Disposition": `attachment; filename="${deliverable.fileName.replace(/[^\w.\- ]/g, "_")}"`,
			"Content-Length": String(object.size),
			"Cache-Control": "private, no-store",
		},
	});
};
