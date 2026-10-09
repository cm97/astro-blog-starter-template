import type { APIRoute } from "astro";
import { issueStoredDownloadToken, resolveProductFile } from "../../../../lib/fulfillment";
import { ALL_PRODUCTS, BUZZYFLY_CONFIG } from "../../../../data/monetization";
import { logAdminAction } from "../../../../lib/audit";
import { sendDeliveryEmail } from "../../../../lib/email";
import { env } from "cloudflare:workers";

export const prerender = false;

/**
 * Re-issues a download link for an already-fulfilled order.
 *
 * The link is a random token stored in D1 (`download_tokens`), which is the
 * delivery path `/api/download` checks first. That matters here: production
 * has no `DOWNLOAD_TOKEN_SECRET` set, so minting an HMAC token instead would
 * produce a link that never resolves. A stored token also lets the link be
 * revoked later by deleting the row.
 *
 * The fresh link is emailed to the buyer with the same delivery email the
 * webhook sends, and also shown in the console so it can be pasted into a
 * reply if the email fails or the order has no address on file.
 */
export const POST: APIRoute = async ({ request, locals }) => {
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

	const downloadUrl = `${BUZZYFLY_CONFIG.siteUrl}/api/download?token=${token}`;
	backParams.set("resent", downloadUrl);

	let outcome: string;
	if (!order.customer_email) {
		outcome = "no email on file";
		backParams.set("email_error", "This order has no customer email on file, so nothing was sent.");
	} else {
		const delivery = await sendDeliveryEmail(
			{
				to: order.customer_email,
				downloadUrl,
				productName: ALL_PRODUCTS.find((p) => p.id === order.item_id)?.title ?? order.item_id,
				orderId: order.order_id,
				itemId: order.item_id,
			},
			env,
		);
		if (delivery.sent) {
			outcome = `emailed to ${order.customer_email}`;
			backParams.set("emailed", order.customer_email);
		} else {
			outcome = `email failed: ${delivery.reason}`;
			console.error(
				`Buzzyfly admin: resend email for order ${order.order_id} to ${order.customer_email} failed: ${delivery.reason}`,
			);
			backParams.set("email_error", `Email to ${order.customer_email} failed: ${delivery.reason}`);
		}
	}

	await logAdminAction(env, locals.adminUser ?? "unknown", "order_resend", `${order.order_id} — ${outcome}`);
	return redirect(backParams);
};

function redirect(params: URLSearchParams): Response {
	return new Response(null, { status: 303, headers: { Location: `/admin/orders?${params}` } });
}
