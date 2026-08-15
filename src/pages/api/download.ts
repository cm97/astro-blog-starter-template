import type { APIRoute } from "astro";
import { resolveProductFile, verifyDownloadToken } from "../../lib/fulfillment";

export const prerender = false;

/**
 * Secure Buzzyfly digital asset delivery. Streams a purchased file straight
 * out of the private `MY_PRODUCTS` R2 bucket. The bucket itself is never made
 * public — every download is authorized per request.
 *
 * Two kinds of token are accepted:
 *
 *  1. A random token stored in the D1 `download_tokens` table. These are issued
 *     by the out-of-band fulfiller (the hourly "Buzzyfly order watch" task,
 *     which polls Stripe directly). This path needs NO shared secret, which is
 *     why it exists: it lets a paid order be delivered even when the Worker
 *     secrets have not been configured. It is also revocable — delete the row
 *     and the link dies immediately.
 *
 *  2. An HMAC-signed token minted by `/api/webhook` using
 *     `DOWNLOAD_TOKEN_SECRET`. This is the instant path and takes over
 *     automatically once that secret is set in production.
 *
 * Checked in that order. Both resolve to the same product lookup and stream.
 */
export const GET: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const url = new URL(request.url);
	const token = url.searchParams.get("token");

	if (!token) return new Response("Missing download token", { status: 400 });

	let claims: { orderId: string; itemId: string } | null = null;

	// Path 1 — D1-backed token.
	if (env.DB) {
		try {
			const row = await env.DB.prepare(
				`SELECT order_id, item_id, expires_at FROM download_tokens WHERE token = ?`,
			)
				.bind(token)
				.first<{ order_id: string; item_id: string; expires_at: number }>();

			if (row) {
				if (Number(row.expires_at) < Date.now()) {
					return new Response(
						"This download link has expired. Reply to your order email and a fresh one will be sent.",
						{ status: 401 },
					);
				}

				claims = { orderId: String(row.order_id), itemId: String(row.item_id) };

				// Best-effort usage counter — useful for spotting a shared link.
				// Never fail the download over it.
				try {
					await env.DB.prepare(
						`UPDATE download_tokens SET used_count = used_count + 1 WHERE token = ?`,
					)
						.bind(token)
						.run();
				} catch (error) {
					console.error("Buzzyfly download: could not increment used_count", error);
				}
			}
		} catch (error) {
			console.error("Buzzyfly download: D1 token lookup failed", error);
		}
	}

	// Path 2 — HMAC-signed token from /api/webhook.
	if (!claims && env.DOWNLOAD_TOKEN_SECRET) {
		claims = await verifyDownloadToken(token, env.DOWNLOAD_TOKEN_SECRET);
	}

	if (!claims) return new Response("Invalid or expired download link", { status: 401 });

	const productFile = resolveProductFile(claims.itemId);
	if (!productFile) return new Response("Product not found", { status: 404 });

	const object = await env.MY_PRODUCTS.get(productFile.r2Key);
	if (!object) {
		console.error(`Buzzyfly download: R2 object missing for key ${productFile.r2Key}`);
		return new Response("File not found", { status: 404 });
	}

	return new Response(object.body, {
		status: 200,
		headers: {
			"Content-Type": productFile.contentType,
			"Content-Disposition": `attachment; filename="${productFile.fileName}"`,
			"Content-Length": String(object.size),
			"Cache-Control": "private, no-store",
		},
	});
};
