/**
 * Custom Cloudflare Worker entry point.
 *
 * wrangler.json `main` points here. Astro's handler serves every HTTP request
 * through `fetch`; the hourly cron trigger in wrangler.json lands in
 * `scheduled` below.
 */

import astroHandler from "@astrojs/cloudflare/entrypoints/server";
import { BUZZYFLY_CONFIG } from "./data/monetization";
import { escapeHtml, resolveFrom, sendFollowUpEmail } from "./lib/email";
import { sendDueSequenceEmails } from "./lib/emailSequence";
import { ensureDownloadSchema, ensureEmailSequenceSchema } from "./lib/schema";

interface CronEnv {
	DB?: D1Database;
	EMAIL?: { send(msg: { from: string; to: string; subject: string; html?: string; text?: string }): Promise<{ messageId: string }> };
	EMAIL_FROM?: string;
}

interface FulfillmentRow {
	provider: string;
	order_id: string;
	item_id: string;
	customer_email: string | null;
	created_at: number;
}

async function sendOwnerAlert(orders: FulfillmentRow[], env: CronEnv): Promise<boolean> {
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
				`<li><strong>${escapeHtml(o.order_id)}</strong> (${o.provider})<br>${escapeHtml(o.customer_email ?? "no email")}<br>${new Date(o.created_at).toUTCString()}</li>`,
		)
		.join("")}</ul>
<p style="color:#666;font-size:14px">— Buzzyfly cron alert</p>
</body></html>`;

	// Same Cloudflare Email binding the customer emails use. On failure the
	// orders stay un-alerted, so they retry next hour.
	if (!env.EMAIL) {
		console.error(`Buzzyfly cron: owner alert skipped for ${count} order(s) — EMAIL binding not configured`);
		return false;
	}
	try {
		await env.EMAIL.send({ from: resolveFrom(env), to: BUZZYFLY_CONFIG.orderEmail, subject, html, text });
	} catch (error) {
		console.error(
			`Buzzyfly cron: owner alert to ${BUZZYFLY_CONFIG.orderEmail} failed for orders ${orders.map((o) => o.order_id).join(", ")}; retrying next hour`,
			error,
		);
		return false;
	}
	return true;
}

async function runJob(name: string, job: () => Promise<void>): Promise<void> {
	try {
		await job();
	} catch (error) {
		console.error(`Buzzyfly cron: ${name} failed`, error);
	}
}

// 1. Owner alert for any new fulfilled orders.
async function alertNewOrders(db: D1Database, env: CronEnv): Promise<void> {
	const result = await db
		.prepare(
			`SELECT f.provider, f.order_id, f.item_id, f.customer_email, f.created_at
			 FROM fulfillments f
			 LEFT JOIN fulfillment_alerts a
			   ON f.provider = a.provider AND f.order_id = a.order_id
			 WHERE a.order_id IS NULL
			 ORDER BY f.created_at DESC
			 LIMIT 50`,
		)
		.all<FulfillmentRow>();

	const newOrders = result.results ?? [];
	if (newOrders.length === 0) return;

	// Only mark orders as alerted once the alert actually went out, so a missing
	// email setup or a failed send is retried next hour instead of lost.
	if (!(await sendOwnerAlert(newOrders, env))) return;
	const now = Date.now();
	await db.batch(
		newOrders.map((o) =>
			db
				.prepare(
					`INSERT OR IGNORE INTO fulfillment_alerts (provider, order_id, alerted_at)
					 VALUES (?, ?, ?)`,
				)
				.bind(o.provider, o.order_id, now),
		),
	);
}

// 2. Two-day follow-up email for recent buyers who haven't had one yet.
async function followUpRecentBuyers(db: D1Database, env: CronEnv): Promise<void> {
	if (!env.EMAIL) return;

	const DAY_MS = 24 * 60 * 60 * 1000;
	const cutoff = Date.now() - 2 * DAY_MS;
	// The email says "a couple of days ago", so skip orders older than a week.
	const oldest = Date.now() - 7 * DAY_MS;

	const pending = await db
		.prepare(
			`SELECT f.provider, f.order_id, f.item_id, f.customer_email
			 FROM fulfillments f
			 LEFT JOIN followup_emails fe ON f.provider = fe.provider AND f.order_id = fe.order_id
			 WHERE fe.order_id IS NULL
			   AND f.customer_email IS NOT NULL
			   AND f.created_at <= ?
			   AND f.created_at >= ?
			 ORDER BY f.created_at ASC
			 LIMIT 20`,
		)
		.bind(cutoff, oldest)
		.all<FulfillmentRow>();

	const now = Date.now();
	const results: { order: FulfillmentRow; sent: boolean }[] = [];
	for (const order of pending.results ?? []) {
		if (!order.customer_email) continue;
		const result = await sendFollowUpEmail(
			{ to: order.customer_email, itemId: order.item_id, orderId: order.order_id },
			env,
		);
		if (result.sent) console.log(`Buzzyfly follow-up: order ${order.order_id} -> sent to ${order.customer_email}`);
		else console.error(`Buzzyfly follow-up: order ${order.order_id} to ${order.customer_email} failed: ${result.reason}`);
		results.push({ order, sent: result.sent });
	}

	// If nothing sent at all, the binding itself is broken (e.g. the domain
	// isn't onboarded to Cloudflare Email Service). Don't record those attempts,
	// so the buyers get their follow-up once it's fixed, inside the 7-day window.
	if (results.length && !results.some((r) => r.sent)) {
		console.error(`Buzzyfly follow-up: all ${results.length} sends failed — will retry next hour`);
		return;
	}

	// Otherwise record every attempt, so a single bad address isn't retried forever.
	for (const { order, sent } of results) {
		await db
			.prepare(
				`INSERT OR IGNORE INTO followup_emails (provider, order_id, sent_at, success)
				 VALUES (?, ?, ?, ?)`,
			)
			.bind(order.provider, order.order_id, now, sent ? 1 : 0)
			.run();
	}
}

async function scheduled(_event: ScheduledEvent, env: CronEnv, ctx: ExecutionContext): Promise<void> {
	const db = env.DB;
	if (!db) return;

	// Each job is isolated so one failure (e.g. a missing table) doesn't stop the others.
	ctx.waitUntil(
		(async () => {
			// 0. Apply the email-sequence schema if it's missing (no-op once applied).
			await runJob("schema", async () => {
				const added = await ensureEmailSequenceSchema(db);
				if (added.length) console.log(`Buzzyfly schema: added ${added.join(", ")}`);
			});
			await runJob("download schema", () => ensureDownloadSchema(db));
			await runJob("owner alert", () => alertNewOrders(db, env));
			await runJob("buyer follow-up", () => followUpRecentBuyers(db, env));
			// 3. Weekly email sequence for free-checklist subscribers.
			await runJob("email sequence", async () => {
				const { sent, failed } = await sendDueSequenceEmails(env);
				if (sent || failed) console.log(`Buzzyfly sequence: sent=${sent} failed=${failed}`);
			});
		})(),
	);
}

export default {
	fetch: astroHandler.fetch,
	scheduled,
};
