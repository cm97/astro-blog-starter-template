/**
 * Fulfillment watchdog (BACKLOG 0f), run from the hourly cron in worker-entry.ts.
 *
 * The webhook is the only thing that records a paid Stripe order in
 * `fulfillments` and unlocks the app. If a delivery is lost (endpoint down,
 * bad signing secret, a Payment Link with no item_id), the buyer has paid and
 * nobody knows. This job asks Stripe for the last 7 days of completed,
 * paid Checkout Sessions and emails the owner once about any that have no
 * `fulfillments` row, so they can be fixed by hand from /admin.
 *
 * It only reads Stripe. It needs a restricted key with read access to
 * Checkout Sessions, set as the Cloudflare secret STRIPE_WATCHDOG_KEY. Without
 * that key it does nothing. Alerts are deduped in `fulfillment_alerts` under
 * the provider name WATCHDOG_ALERT_PROVIDER, so no migration is needed.
 */
import { BUZZYFLY_CONFIG } from "../data/monetization";
import { escapeHtml, resolveFrom } from "./email";

export const WATCHDOG_ALERT_PROVIDER = "stripe-unfulfilled";
/** Leave the webhook time to arrive before calling a session missing. */
const GRACE_MS = 30 * 60 * 1000;
const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

interface StripeSession {
	id: string;
	payment_status?: string;
	created?: number;
	amount_total?: number | null;
	currency?: string | null;
	customer_details?: { email?: string | null } | null;
	customer_email?: string | null;
	metadata?: Record<string, string> | null;
}

export interface WatchdogEnv {
	DB?: D1Database;
	EMAIL?: { send(msg: { from: string; to: string; subject: string; html?: string; text?: string }): Promise<unknown> };
	EMAIL_FROM?: string;
	STRIPE_WATCHDOG_KEY?: string;
}

export type WatchdogResult =
	| { status: "skipped"; reason: string }
	| { status: "stripe-error"; httpStatus: number }
	| { status: "ok" }
	| { status: "alerted"; missing: string[] }
	| { status: "alert-failed"; missing: string[] };

export async function runFulfillmentWatchdog(
	env: WatchdogEnv,
	opts: { now?: number; fetchImpl?: typeof fetch } = {},
): Promise<WatchdogResult> {
	const key = env.STRIPE_WATCHDOG_KEY?.trim();
	if (!key) return { status: "skipped", reason: "STRIPE_WATCHDOG_KEY not set" };
	if (!env.DB) return { status: "skipped", reason: "no D1 binding" };
	const now = opts.now ?? Date.now();
	const doFetch = opts.fetchImpl ?? fetch;

	const since = Math.floor((now - LOOKBACK_MS) / 1000);
	const url = `https://api.stripe.com/v1/checkout/sessions?status=complete&limit=100&created%5Bgte%5D=${since}`;
	const res = await doFetch(url, { headers: { Authorization: `Bearer ${key}` } });
	if (!res.ok) {
		console.error(`Buzzyfly watchdog: Stripe returned ${res.status}`);
		return { status: "stripe-error", httpStatus: res.status };
	}
	const body = (await res.json()) as { data?: StripeSession[]; has_more?: boolean };
	if (body.has_more) console.log("Buzzyfly watchdog: more than 100 sessions in 7 days; checked the newest 100");

	const paid = (body.data ?? []).filter(
		(s) =>
			s.id &&
			(s.payment_status === "paid" || s.payment_status === "no_payment_required") &&
			(s.created ?? 0) * 1000 <= now - GRACE_MS,
	);
	if (paid.length === 0) return { status: "ok" };

	const ids = paid.map((s) => s.id);
	const marks = ids.map(() => "?").join(", ");
	const fulfilled = await env.DB.prepare(
		`SELECT order_id FROM fulfillments WHERE provider = 'stripe' AND order_id IN (${marks})`,
	)
		.bind(...ids)
		.all<{ order_id: string }>();
	const alerted = await env.DB.prepare(
		`SELECT order_id FROM fulfillment_alerts WHERE provider = ? AND order_id IN (${marks})`,
	)
		.bind(WATCHDOG_ALERT_PROVIDER, ...ids)
		.all<{ order_id: string }>();
	const known = new Set([...(fulfilled.results ?? []), ...(alerted.results ?? [])].map((r) => r.order_id));
	const missing = paid.filter((s) => !known.has(s.id));
	if (missing.length === 0) return { status: "ok" };

	const missingIds = missing.map((s) => s.id);
	// Only record the alert once it actually went out, so a failed send retries next hour.
	if (!(await sendWatchdogAlert(missing, env))) return { status: "alert-failed", missing: missingIds };
	await env.DB.batch(
		missingIds.map((id) =>
			env.DB!.prepare(`INSERT OR IGNORE INTO fulfillment_alerts (provider, order_id, alerted_at) VALUES (?, ?, ?)`).bind(
				WATCHDOG_ALERT_PROVIDER,
				id,
				now,
			),
		),
	);
	return { status: "alerted", missing: missingIds };
}

function describe(s: StripeSession): string {
	const email = s.customer_details?.email ?? s.customer_email ?? "no email";
	const amount = typeof s.amount_total === "number" ? `${(s.amount_total / 100).toFixed(2)} ${(s.currency ?? "").toUpperCase()}` : "amount unknown";
	const item = s.metadata?.item_id ?? "no item_id";
	const when = s.created ? new Date(s.created * 1000).toUTCString() : "unknown time";
	return `${s.id} | ${email} | ${amount} | ${item} | ${when}`;
}

async function sendWatchdogAlert(missing: StripeSession[], env: WatchdogEnv): Promise<boolean> {
	if (!env.EMAIL) {
		console.error(`Buzzyfly watchdog: ${missing.length} paid session(s) not fulfilled, but no EMAIL binding to alert the owner`);
		return false;
	}
	const subject =
		missing.length === 1
			? `Paid but not delivered: Stripe session ${missing[0].id}`
			: `${missing.length} paid Stripe orders were not delivered`;
	const lines = missing.map(describe);
	const intro =
		"Stripe shows these as paid, but the site has no order record, so the buyer may not have their app. Check the webhook in Stripe, then unlock the order from /admin.";
	const text = [intro, "", ...lines.map((l) => `- ${l}`)].join("\n");
	const html = `<!doctype html><html><body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
<h2 style="margin:0 0 12px">${escapeHtml(subject)}</h2>
<p>${escapeHtml(intro)}</p>
<ul style="padding-left:1.2em">${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
<p style="color:#666;font-size:14px">— Buzzyfly fulfillment watchdog</p>
</body></html>`;
	try {
		await env.EMAIL.send({ from: resolveFrom(env), to: BUZZYFLY_CONFIG.orderEmail, subject, html, text });
		return true;
	} catch (error) {
		console.error("Buzzyfly watchdog: owner alert failed; retrying next hour", error);
		return false;
	}
}
