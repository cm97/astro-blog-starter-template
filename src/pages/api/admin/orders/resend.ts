import type { APIRoute } from "astro";
import { issueStoredDownloadToken, resolveProductFile } from "../../../../lib/fulfillment";
import { BUZZYFLY_CONFIG } from "../../../../data/monetization";
import { logAdminAction } from "../../../../lib/audit";

export const prerender = false;

/**
 * Re-issues a download link for an already-fulfilled order.
 *
 * The link is a random token stored in D1 (`download_tokens`), which is the
 * delivery path `/api/download` checks first. That matters here: production
 * has no `DOWNLOAD_TOKEN_SECRET` set, so minting an HMAC token instead would
 * produce a link that never resolves. A stored token also lets the link be
 * revoked later by deleting the row.
 */
export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const form = await request.formData().catch(() => null);

	// `fulfillments` has no surrogate id — (provider, order_id) identifies a row.
	const provider = String(form?.get("provider") ?? "");
	const orderId = String(form?.get("order_id") ?? "");
	const q = String(form?.get("q") ?? "");

	const backParams = new URLSearchParams();
	if (q) backParams.set("q", q);

	if (!provider || !orderId || !env.DB) {
		backParams.set("error", "Could not re-issue a link for that order.");
		return redirect(backParams);
	}

	const order = await env.DB.prepare(
		`SELECT order_id, item_id, provider, customer_email FROM fulfillments
		 WHERE provider = ? AND order_id = ?`,
	)
		.bind(provider, orderId)
		.first<{ order_id: string; item_id: string; provider: string; customer_email: string | null }>();

	if (!order) {
		backParams.set("error", "Order not found.");
		return redirect(backParams);
	}

	if (!resolveProductFile(order.item_id)) {
		backParams.set("error", `No product file is mapped for item "${order.item_id}".`);
		return redirect(backParams);
	}

	let token: string | null = null;
	try {
		token = await issueStoredDownloadToken(env, {
			orderId: order.order_id,
			itemId: order.item_id,
			customerEmail: order.customer_email,
		});
	} catch (error) {
		console.error("Buzzyfly admin: failed to issue download token", error);
	}

	if (!token) {
		backParams.set("error", "Could not issue a download token.");
		return redirect(backParams);
	}

	await logAdminAction(env, locals.adminUser ?? "unknown", "order_resend", order.order_id);

	backParams.set("resent", `${BUZZYFLY_CONFIG.siteUrl}/api/download?token=${token}`);
	return redirect(backParams);
};

function redirect(params: URLSearchParams): Response {
	return new Response(null, { status: 303, headers: { Location: `/admin/orders?${params}` } });
}
