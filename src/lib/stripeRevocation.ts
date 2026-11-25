/**
 * Refund and dispute revocation for Stripe purchases.
 *
 * Stripe's charge.refunded / charge.dispute.created events carry the charge
 * and its payment_intent, not the Checkout Session id the order is stored
 * under. So when a checkout completes we remember payment_intent -> session
 * (stripe_payments), and when a refund or dispute lands we look the order up,
 * delete its access keys (download_tokens rows; every app request re-checks
 * D1, so access closes at once) and record the revocation (order_revocations)
 * so /thank-you, Admin > Resend and the webhook never mint a fresh key for it.
 *
 * Both tables are created here on first use, like ensureDropSchema, so no
 * manual D1 migration is needed. Keep in step with
 * migrations/0012_stripe_revocation.sql.
 */

export interface StripeRevocation {
	reason: "refund" | "dispute";
	eventId: string | null;
	paymentIntentId: string | null;
	chargeId: string | null;
}

export async function ensureStripeRevocationSchema(db: D1Database): Promise<void> {
	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS stripe_payments (
			   payment_intent TEXT PRIMARY KEY,
			   order_id       TEXT NOT NULL,
			   item_id        TEXT,
			   created_at     INTEGER NOT NULL
			 )`,
		)
		.run();
	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS order_revocations (
			   provider   TEXT NOT NULL,
			   order_id   TEXT NOT NULL,
			   reason     TEXT NOT NULL,
			   event_id   TEXT,
			   revoked_at INTEGER NOT NULL,
			   PRIMARY KEY (provider, order_id)
			 )`,
		)
		.run();
}

/** Remembers which Checkout Session a PaymentIntent paid for. Best-effort. */
export async function recordStripePayment(
	db: D1Database,
	payment: { paymentIntentId: string; orderId: string; itemId: string },
): Promise<void> {
	await ensureStripeRevocationSchema(db);
	await db
		.prepare(
			`INSERT INTO stripe_payments (payment_intent, order_id, item_id, created_at)
			 VALUES (?, ?, ?, ?)
			 ON CONFLICT (payment_intent) DO NOTHING`,
		)
		.bind(payment.paymentIntentId, payment.orderId, payment.itemId, Date.now())
		.run();
}

/**
 * Reads a verified Stripe event and returns a revocation for a full refund or
 * any new dispute; null for every other event (including partial refunds).
 */
export function parseStripeRevocation(payload: any): StripeRevocation | null {
	const type = payload?.type;
	const object = payload?.data?.object;
	const eventId = typeof payload?.id === "string" ? payload.id : null;
	const str = (value: unknown) => (typeof value === "string" && value ? value : null);

	if (type === "charge.refunded") {
		// charge.refunded also fires for partial refunds; only a full refund closes access.
		const fullyRefunded =
			object?.refunded === true ||
			(Number.isFinite(object?.amount) && Number(object?.amount_refunded) >= Number(object?.amount));
		if (!fullyRefunded) return null;
		return { reason: "refund", eventId, paymentIntentId: str(object?.payment_intent), chargeId: str(object?.id) };
	}
	if (type === "charge.dispute.created") {
		return { reason: "dispute", eventId, paymentIntentId: str(object?.payment_intent), chargeId: str(object?.charge) };
	}
	return null;
}

/** True when the order was refunded or disputed. Missing table = never revoked. */
export async function isOrderRevoked(env: Env, orderId: string, provider = "stripe"): Promise<boolean> {
	if (!env.DB) return false;
	try {
		const row = await env.DB.prepare(
			`SELECT 1 AS revoked FROM order_revocations WHERE provider = ? AND order_id = ? LIMIT 1`,
		)
			.bind(provider, orderId)
			.first<{ revoked: number }>();
		return Boolean(row);
	} catch (error) {
		if (/no such table/i.test(String(error))) return false;
		throw error;
	}
}

export type RevocationResult =
	| { revoked: true; orderId: string; tokensDeleted: number }
	| { revoked: false; reason: string };

/**
 * Closes access for the order behind a refunded or disputed charge.
 * Throws on a D1 failure so the webhook can answer 500 and Stripe retries:
 * a lost revocation would leave a refunded buyer with access.
 */
export async function revokeStripeOrder(env: Env, revocation: StripeRevocation): Promise<RevocationResult> {
	if (!env.DB) return { revoked: false, reason: "no D1 binding" };
	if (!revocation.paymentIntentId) return { revoked: false, reason: "event has no payment_intent" };

	await ensureStripeRevocationSchema(env.DB);
	const payment = await env.DB.prepare(`SELECT order_id FROM stripe_payments WHERE payment_intent = ? LIMIT 1`)
		.bind(revocation.paymentIntentId)
		.first<{ order_id: string }>();
	if (!payment?.order_id) {
		return { revoked: false, reason: `no order on record for ${revocation.paymentIntentId}` };
	}
	const orderId = String(payment.order_id);

	await env.DB.prepare(
		`INSERT INTO order_revocations (provider, order_id, reason, event_id, revoked_at)
		 VALUES ('stripe', ?, ?, ?, ?)
		 ON CONFLICT (provider, order_id) DO NOTHING`,
	)
		.bind(orderId, revocation.reason, revocation.eventId, Date.now())
		.run();
	const deleted = await env.DB.prepare(`DELETE FROM download_tokens WHERE order_id = ?`).bind(orderId).run();
	return { revoked: true, orderId, tokensDeleted: Number(deleted.meta?.changes ?? 0) };
}
