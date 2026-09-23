/**
 * Custom Cloudflare Worker entry point.
 *
 * Wraps the Astro-generated worker so we can add a `scheduled` handler
 * alongside the HTTP `fetch` handler. Astro handles all web requests;
 * the cron logic lives here and runs on a Cloudflare cron trigger.
 */

import type { SSRManifest } from "astro";
import { App } from "astro/app";
import { handle } from "@astrojs/cloudflare/handler";
import { BUZZYFLY_CONFIG } from "./data/monetization";
import { sendFollowUpEmail } from "./lib/email";

interface Env {
	DB?: D1Database;
	EMAIL?: { send(msg: { from: string; to: string; subject: string; html?: string; text?: string }): Promise<{ messageId: string }> };
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

async function scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
	if (!env.DB) return;

	ctx.waitUntil(
		(async () => {
			// 1. Owner alert for any new fulfilled orders
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
			if (newOrders.length > 0) {
				await sendOwnerAlert(newOrders, env);
				const now = Date.now();
				const stmts = newOrders.map((o) =>
					env.DB!.prepare(
						`INSERT OR IGNORE INTO fulfillment_alerts (provider, order_id, alerted_at)
						 VALUES (?, ?, ?)`,
					).bind(o.provider, o.order_id, now),
				);
				await env.DB!.batch(stmts);
			}

			// 2. 2-day follow-up emails for buyers who haven't received one yet
			if (env.EMAIL) {
				const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
				const cutoff = Date.now() - TWO_DAYS_MS;

				const pending = await env.DB!.prepare(
					`SELECT f.provider, f.order_id, f.item_id, f.customer_email
					 FROM fulfillments f
					 LEFT JOIN followup_emails fe ON f.provider = fe.provider AND f.order_id = fe.order_id
					 WHERE fe.order_id IS NULL
					   AND f.customer_email IS NOT NULL
					   AND f.created_at <= ?
					 ORDER BY f.created_at ASC
					 LIMIT 20`,
				).bind(cutoff).all<FulfillmentRow>();

				const toFollowUp = pending.results ?? [];
				if (toFollowUp.length > 0) {
					const now = Date.now();
					for (const order of toFollowUp) {
						if (!order.customer_email) continue;
						const result = await sendFollowUpEmail(
							{ to: order.customer_email, itemId: order.item_id, orderId: order.order_id },
							env,
						);
						console.log(
							`Buzzyfly follow-up: order ${order.order_id} -> sent=${result.sent}${result.reason ? ` (${result.reason})` : ""}`,
						);
						// Record attempt regardless of send result so we don't retry forever
						await env.DB!.prepare(
							`INSERT OR IGNORE INTO followup_emails (provider, order_id, sent_at, success)
							 VALUES (?, ?, ?, ?)`,
						).bind(order.provider, order.order_id, now, result.sent ? 1 : 0).run();
					}
				}
			}
		})(),
	);
}

/**
 * Entry point contract for `@astrojs/cloudflare` (`workerEntryPoint` in
 * astro.config.mjs): the adapter calls this with the SSR manifest and deploys
 * whatever it returns, so the cron handler ships in the same Worker as the site.
 */
export function createExports(manifest: SSRManifest) {
	const app = new App(manifest);
	return {
		default: {
			async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
				// @ts-expect-error — Env carries the site's bindings; the adapter only needs ASSETS.
				return handle(manifest, app, request, env, ctx);
			},
			scheduled,
		},
	};
}
