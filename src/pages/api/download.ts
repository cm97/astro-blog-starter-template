import type { APIRoute } from "astro";
import { resolveProductFile, checkDownloadRateLimit, logDownloadEvent } from "../../lib/fulfillment";
import {
	PRODUCT_COOKIE_MAX_AGE_SECONDS,
	isProduct,
	productCookieName,
	productLockedPage,
	verifyProductToken,
} from "../../lib/productAccess";
import { env } from "cloudflare:workers";

export const prerender = false;

/**
 * Secure Buzzyfly digital asset delivery. Streams a purchased file straight
 * out of the private `MY_PRODUCTS` R2 bucket (or the D1 `product_files`
 * fallback). Nothing is ever sent without a valid purchase token.
 *
 *   /api/download?token=<t>     link from the order email or PayPal return.
 *                               Verified, stored in an HttpOnly cookie for that
 *                               product, then the file is served.
 *   /api/download?product=<id>  re-download using that cookie, re-verified on
 *                               every request.
 *
 * Tokens are accepted only when they come from a verified payment: a revocable
 * D1 `download_tokens` row (order fulfiller / admin resend) or an HMAC token
 * signed with `DOWNLOAD_TOKEN_SECRET` (Stripe webhook, /buy/paypal-return). Each
 * token is bound to one product. Without one the response is 402.
 *
 * Rate limited per IP to prevent abuse at scale.
 */
export const GET: APIRoute = async ({ request, locals, url, cookies }) => {
	const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
	const queryToken = url.searchParams.get("token");
	const requested = url.searchParams.get("product");
	const product = isProduct(requested) ? requested : null;

	if (!queryToken && !product) return productLockedPage(null);

	// Rate limit to protect the bucket at scale.
	if (!checkDownloadRateLimit(ip)) {
		return new Response("Too many download attempts. Slow down.", { status: 429 });
	}

	const token = queryToken ?? (product ? cookies.get(productCookieName(product))?.value : undefined);
	const claims = await verifyProductToken(env, token);
	if (!claims || (product && claims.itemId !== product)) {
		return productLockedPage(product ?? claims?.itemId ?? null);
	}

	if (queryToken) {
		cookies.set(productCookieName(claims.itemId), queryToken, {
			path: "/api/download",
			httpOnly: true,
			secure: url.protocol === "https:",
			sameSite: "lax",
			maxAge: PRODUCT_COOKIE_MAX_AGE_SECONDS,
		});
	}

	if (claims.stored && env.DB) {
		// Best-effort usage counter — useful for spotting a shared link.
		try {
			await env.DB.prepare(`UPDATE download_tokens SET used_count = used_count + 1 WHERE token = ?`)
				.bind(token)
				.run();
		} catch (error) {
			console.error("Buzzyfly download: could not increment used_count", error);
		}
	}

	const productFile = resolveProductFile(claims.itemId);
	if (!productFile) return new Response("Product not found", { status: 404 });

	const object = await env.MY_PRODUCTS.get(productFile.r2Key);
	if (!object) {
		// Fallback: serve from D1 product_files table (populated when R2 is unavailable).
		if (env.DB) {
			let row: { content_b64: string; file_name: string; content_type: string } | null = null;
			try {
				row = await env.DB.prepare(
					`SELECT content_b64, file_name, content_type FROM product_files WHERE item_id = ?`,
				)
					.bind(claims.itemId)
					.first<{ content_b64: string; file_name: string; content_type: string }>();
			} catch (error) {
				console.error("Buzzyfly download: product_files fallback lookup failed", error);
			}
			if (row) {
				const bytes = Uint8Array.from(atob(row.content_b64), (c) => c.charCodeAt(0));
				await logDownloadEvent(env, claims.orderId, claims.itemId, ip);
				return new Response(bytes, {
					status: 200,
					headers: {
						"Content-Type": row.content_type,
						"Content-Disposition": `attachment; filename="${row.file_name}"`,
						"Content-Length": String(bytes.length),
						"Cache-Control": "private, no-store",
					},
				});
			}
		}
		console.error(`Buzzyfly download: R2 object missing for key ${productFile.r2Key}`);
		return new Response("File not found", { status: 404 });
	}

	// Log the download for analytics.
	await logDownloadEvent(env, claims.orderId, claims.itemId, ip);

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
