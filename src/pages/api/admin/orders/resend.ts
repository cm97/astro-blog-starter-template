import type { APIRoute } from "astro";
import { createDownloadToken, resolveProductFile } from "../../../../lib/fulfillment";
import { BUZZYFLY_CONFIG } from "../../../../data/monetization";
import { logAdminAction } from "../../../../lib/audit";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	const form = await request.formData().catch(() => null);
	const id = form?.get("id");
	const q = String(form?.get("q") ?? "");
	const backParams = new URLSearchParams();
	if (q) backParams.set("q", q);

	if (!id || !env.DB || !env.DOWNLOAD_TOKEN_SECRET) {
		backParams.set("resent", "");
		return redirect(backParams);
	}

	const order = await env.DB.prepare(
		`SELECT order_id, item_id, provider, customer_email FROM fulfillments WHERE id = ?`,
	)
		.bind(id)
		.first<{ order_id: string; item_id: string; provider: string; customer_email: string | null }>();

	if (!order || !resolveProductFile(order.item_id)) {
		return redirect(backParams);
	}

	const token = await createDownloadToken(
		{ orderId: order.order_id, itemId: order.item_id },
		env.DOWNLOAD_TOKEN_SECRET,
	);
	const downloadUrl = `${BUZZYFLY_CONFIG.siteUrl}/api/download?token=${token}`;

	await logAdminAction(env, locals.adminUser ?? "unknown", "order_resend", order.order_id);

	backParams.set("resent", downloadUrl);
	return redirect(backParams);
};

function redirect(params: URLSearchParams): Response {
	return new Response(null, { status: 303, headers: { Location: `/admin/orders?${params}` } });
}
