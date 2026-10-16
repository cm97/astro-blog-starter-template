import { issueStoredDownloadToken } from "./fulfillment";

/**
 * Access control and storage for the Buzzyfly Monthly Drop web app (/drop).
 *
 * The Monthly Drop is a $19/month Stripe subscription. On checkout the webhook
 * records the subscription here and emails the buyer an unlock link carrying a
 * random token stored in D1 (`download_tokens`, item_id = DROP_ITEM_ID). They
 * redeem it once at /drop/unlock, which stores it in an HttpOnly cookie.
 *
 * Every request re-checks the token AND the subscription status, so access ends
 * when Stripe reports the subscription canceled or unpaid
 * (customer.subscription.updated / .deleted events on the webhook endpoint).
 *
 * The subscriber's work (client names, checklists, reviews) is saved per
 * checkout session in `drop_app_data`, so it follows them across devices.
 */
export const DROP_ITEM_ID = "buzzyfly-monthly-drop";
export const DROP_COOKIE = "bf_drop";
/** The unlock token outlives any billing period; the subscription status decides access. */
export const DROP_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 400;
/** Stripe statuses that keep access open. past_due keeps it while Stripe retries the card. */
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);
/** Saved app data is small (form fields and a client list). Cap it so a bad client can't fill D1. */
export const DROP_DATA_MAX_BYTES = 200_000;

export function isDropItem(itemId: string): boolean {
	return itemId === DROP_ITEM_ID;
}

let schemaReady = false;

/** Keep in step with migrations/0009_monthly_drop.sql. Runs once per Worker isolate. */
export async function ensureDropSchema(db: D1Database): Promise<void> {
	if (schemaReady) return;
	await db.batch([
		db.prepare(
			`CREATE TABLE IF NOT EXISTS drop_subscriptions (
			   subscription_id     TEXT PRIMARY KEY,
			   checkout_session_id TEXT,
			   customer_id         TEXT,
			   customer_email      TEXT,
			   status              TEXT NOT NULL,
			   created_at          INTEGER NOT NULL,
			   updated_at          INTEGER NOT NULL
			 )`,
		),
		db.prepare(
			`CREATE INDEX IF NOT EXISTS idx_drop_subscriptions_session ON drop_subscriptions (checkout_session_id)`,
		),
		db.prepare(`CREATE INDEX IF NOT EXISTS idx_drop_subscriptions_email ON drop_subscriptions (customer_email)`),
		db.prepare(
			`CREATE TABLE IF NOT EXISTS drop_app_data (
			   account_id TEXT NOT NULL,
			   issue      TEXT NOT NULL,
			   data_json  TEXT NOT NULL,
			   updated_at INTEGER NOT NULL,
			   PRIMARY KEY (account_id, issue)
			 )`,
		),
	]);
	schemaReady = true;
}

/** Records a new subscription from a completed checkout. Never downgrades a status a later event already set. */
export async function recordDropCheckout(
	db: D1Database,
	sub: { subscriptionId: string; checkoutSessionId: string; customerId: string | null; customerEmail: string | null },
): Promise<void> {
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO drop_subscriptions
			   (subscription_id, checkout_session_id, customer_id, customer_email, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, 'active', ?, ?)
			 ON CONFLICT (subscription_id) DO UPDATE SET
			   checkout_session_id = excluded.checkout_session_id,
			   customer_id = COALESCE(drop_subscriptions.customer_id, excluded.customer_id),
			   customer_email = COALESCE(drop_subscriptions.customer_email, excluded.customer_email)`,
		)
		.bind(sub.subscriptionId, sub.checkoutSessionId, sub.customerId, sub.customerEmail?.toLowerCase() ?? null, now, now)
		.run();
}

/** Applies a customer.subscription.* event. Events can arrive before the checkout event, so this upserts. */
export async function recordDropStatus(
	db: D1Database,
	sub: { subscriptionId: string; customerId: string | null; status: string },
): Promise<void> {
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO drop_subscriptions
			   (subscription_id, checkout_session_id, customer_id, customer_email, status, created_at, updated_at)
			 VALUES (?, NULL, ?, NULL, ?, ?, ?)
			 ON CONFLICT (subscription_id) DO UPDATE SET
			   status = excluded.status,
			   customer_id = COALESCE(drop_subscriptions.customer_id, excluded.customer_id),
			   updated_at = excluded.updated_at`,
		)
		.bind(sub.subscriptionId, sub.customerId, sub.status, now, now)
		.run();
}

/** Mints the long-lived unlock token emailed to a new subscriber. */
export function issueDropToken(
	env: Env,
	order: { orderId: string; customerEmail: string | null },
): Promise<string | null> {
	return issueStoredDownloadToken(
		env,
		{ orderId: order.orderId, itemId: DROP_ITEM_ID, customerEmail: order.customerEmail },
		DROP_TOKEN_TTL_SECONDS,
	);
}

export interface DropAccount {
	/** Checkout session id: the stable key the subscriber's saved data hangs off. */
	accountId: string;
	email: string | null;
}

export type DropAccess = { ok: true; account: DropAccount } | { ok: false; reason: "no-token" | "invalid" | "inactive" };

/**
 * Checks an unlock token and the subscription behind it.
 *
 * A token with no subscription row on record (e.g. issued by hand from the
 * admin console before the status events existed) is honoured: there is no
 * cancellation to enforce. Once Stripe reports a status, that status wins.
 */
export async function checkDropAccess(env: Env, token: string | null | undefined): Promise<DropAccess> {
	if (!token || !/^[0-9a-f]{64}$/.test(token)) return { ok: false, reason: "no-token" };
	if (!env.DB) return { ok: false, reason: "invalid" };

	const row = await env.DB.prepare(
		`SELECT order_id, item_id, customer_email, expires_at FROM download_tokens WHERE token = ?`,
	)
		.bind(token)
		.first<{ order_id: string; item_id: string; customer_email: string | null; expires_at: number }>();
	if (!row || !isDropItem(String(row.item_id)) || Number(row.expires_at) < Date.now()) {
		return { ok: false, reason: "invalid" };
	}

	const account: DropAccount = { accountId: String(row.order_id), email: row.customer_email };

	let subs: { status: string }[] = [];
	try {
		await ensureDropSchema(env.DB);
		const bySession = await env.DB.prepare(`SELECT status FROM drop_subscriptions WHERE checkout_session_id = ?`)
			.bind(account.accountId)
			.all<{ status: string }>();
		subs = bySession.results ?? [];
		if (subs.length === 0 && account.email) {
			const byEmail = await env.DB.prepare(`SELECT status FROM drop_subscriptions WHERE customer_email = ?`)
				.bind(account.email.toLowerCase())
				.all<{ status: string }>();
			subs = byEmail.results ?? [];
		}
	} catch (error) {
		// Don't lock a paying subscriber out because of a storage hiccup.
		console.error("Buzzyfly drop: subscription lookup failed", error);
		return { ok: true, account };
	}

	if (subs.length === 0) return { ok: true, account };
	return subs.some((s) => ACTIVE_STATUSES.has(s.status)) ? { ok: true, account } : { ok: false, reason: "inactive" };
}

export async function loadDropData(db: D1Database, accountId: string, issue: string): Promise<string | null> {
	await ensureDropSchema(db);
	const row = await db
		.prepare(`SELECT data_json FROM drop_app_data WHERE account_id = ? AND issue = ?`)
		.bind(accountId, issue)
		.first<{ data_json: string }>();
	return row?.data_json ?? null;
}

export async function saveDropData(db: D1Database, accountId: string, issue: string, dataJson: string): Promise<void> {
	await ensureDropSchema(db);
	await db
		.prepare(
			`INSERT INTO drop_app_data (account_id, issue, data_json, updated_at) VALUES (?, ?, ?, ?)
			 ON CONFLICT (account_id, issue) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`,
		)
		.bind(accountId, issue, dataJson, Date.now())
		.run();
}
