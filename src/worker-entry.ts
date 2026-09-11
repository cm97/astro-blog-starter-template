/**
 * Custom Cloudflare Worker entry point.
 *
 * Wraps the Astro-generated worker so we can add a `scheduled` handler
 * alongside the HTTP `fetch` handler. Astro handles all web requests;
 * the cron logic lives here and runs on a Cloudflare cron trigger.
 */

import worker from "astro/app/cloudflare";
import { BUZZYFLY_CONFIG } from "./data/monetization";

interface Env {
	DB?: D1Database;
	EMAIL_API_KEY?: string;
	EMAIL_FROM?: string;
}

interface FulfillmentRow {
	provider: string;
	order_id: string;
	item_id: string;
	customer_email: string | null;
	created_at: number;
}

async function sendOwnerAlert(orders: FulfillmentRow[], env: Env): Promise<void> {
	if (!env.EMAIL_API_KEY || !env.EMAIL_FROM) return;

	const count = orders.length;
	const lines = orders.map((o) => {
		const date = new Date(o.created_at).toUTCString();
		return `• Order ${o.order_id} (${o.provider}) — ${o.customer_email ?? "no email"} — ${date}`;
	});

	const subject =
		count === 1 ? `New Buzzyfly order: ${orders[0].order_id}` : `${count} new Buzzyfly orders`;

	const text = [`New order${count > 1 ? "s" : ""} in the last hour:`, "", ...lines].join("\n");

	const html = `<!doctype html><html><body style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
<h2 style="margin:0 0 12px">${subject}</h2>
<ul style="padding-left:1.2em">${orders
		.map(
			(o) =>
				`<li><strong>${o.order_id}</strong> (${o.provider})<br>${o.customer_email ?? "no email"}<br>${new Date(o.created_at).toUTCString()}</li>`,
		)
		.join("")}</ul>
<p style="color:#666;font-size:14px">— Buzzyfly cron alert</p>
</body></html>`;

	await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.EMAIL_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: env.EMAIL_FROM,
			to: [BUZZYFLY_CONFIG.orderEmail],
			subject,
			html,
			text,
		}),
	});
}

const cronHandler = {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return worker.fetch(request, env, ctx);
	},

	async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		if (!env.DB) return;

		ctx.waitUntil(
			(async () => {
				// Find fulfillments that haven't been alerted yet
				const result = await env.DB!.prepare(
					`SELECT f.provider, f.order_id, f.item_id, f.customer_email, f.created_at
					 FROM fulfillments f
					 LEFT JOIN fulfillment_alerts a
					   ON f.provider = a.provider AND f.order_id = a.order_id
					 WHERE a.order_id IS NULL
					 ORDER BY f.created_at DESC
					 LIMIT 50`,
				).all<FulfillmentRow>();

				const newOrders = result.results ?? [];
				if (newOrders.length === 0) return;

				await sendOwnerAlert(newOrders, env);

				// Mark each as alerted so next run skips it
				const now = Date.now();
				const stmts = newOrders.map((o) =>
					env.DB!.prepare(
						`INSERT OR IGNORE INTO fulfillment_alerts (provider, order_id, alerted_at)
						 VALUES (?, ?, ?)`,
					).bind(o.provider, o.order_id, now),
				);
				await env.DB!.batch(stmts);
			})(),
		);
	},
};

export default cronHandler;
