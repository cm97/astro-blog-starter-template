// Buzzyfly partner (affiliate) program.
//
// A partner shares buzzyfly.com/r/<code>. That route checks the code is an
// active partner, counts the click, and drops a 30-day `bf_ref` cookie. When
// the visitor later buys:
//   - PayPal: /buy/<product> stores (order id -> code) before sending them to
//     PayPal, and /buy/paypal-return records the commission once paid.
//   - Stripe: the TrafficSource script sets the Payment Link's
//     client_reference_id to "aff-<code>", and the webhook records it.
// A commission is "pending" until the 30-day refund window closes, then it is
// payable. Payouts are made by hand (PayPal) and marked paid in /admin/affiliates.

import { DONE_FOR_YOU, getProduct } from "../data/monetization";

export {
	REF_COOKIE,
	REF_COOKIE_MAX_AGE_SECONDS,
	STRIPE_REF_PREFIX,
	cleanCode,
	codeFromCookieHeader,
	codeFromStripeReference,
} from "./affiliateRef";

/** Commission rate for new partners, in percent of the sale price. */
export const DEFAULT_RATE_PCT = 40;
/** Commission rate on the done-for-you setup: it costs the owner hours, not nothing. */
export const SETUP_RATE_PCT = 20;
/** Commissions become payable once the money-back window on the sale has closed. */
export const HOLD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Where /r/<code> may send the visitor: a path on this site only. Anything
 * else (absolute URLs, protocol-relative "//evil.com", backslash tricks) goes
 * to the homepage, so the route can't be used as an open redirect.
 */
export function safeLandingPath(value: string | null | undefined): string {
	if (!value || value.length > 200) return "/";
	if (!value.startsWith("/") || value.startsWith("//") || /[\\\s]/.test(value)) return "/";
	return value;
}

export function commissionRateFor(itemId: string, partnerRatePct: number): number {
	return itemId === DONE_FOR_YOU.productId ? Math.min(partnerRatePct, SETUP_RATE_PCT) : partnerRatePct;
}

export function commissionCents(saleCents: number, ratePct: number): number {
	if (!Number.isFinite(saleCents) || saleCents <= 0) return 0;
	return Math.round((saleCents * ratePct) / 100);
}

/** The listed price of a product in cents, used when the payment provider didn't report an amount. */
export function listPriceCents(itemId: string): number {
	const price = getProduct(itemId)?.price ?? "";
	const dollars = Number(price.replace(/[^0-9.]/g, ""));
	return Number.isFinite(dollars) ? Math.round(dollars * 100) : 0;
}

export function isPayable(createdAt: number, now = Date.now()): boolean {
	return now - createdAt >= HOLD_DAYS * DAY_MS;
}

export function formatCents(cents: number): string {
	return `$${(cents / 100).toFixed(2)}`;
}

export function randomToken(bytes = 24): string {
	const buf = new Uint8Array(bytes);
	crypto.getRandomValues(buf);
	return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// --- D1 ----------------------------------------------------------------------

/**
 * Creates the partner tables (migration 0009) if they're missing. Keep in step
 * with migrations/0009_affiliates.sql. Cheap enough to call before each write.
 */
export async function ensureAffiliateSchema(db: D1Database): Promise<void> {
	await db.batch([
		db.prepare(
			`CREATE TABLE IF NOT EXISTS affiliates (
			   code         TEXT PRIMARY KEY,
			   name         TEXT NOT NULL,
			   email        TEXT NOT NULL UNIQUE,
			   website      TEXT,
			   audience     TEXT,
			   payout_email TEXT,
			   status       TEXT NOT NULL DEFAULT 'pending',
			   rate_pct     INTEGER NOT NULL DEFAULT ${DEFAULT_RATE_PCT},
			   stats_token  TEXT NOT NULL UNIQUE,
			   created_at   INTEGER NOT NULL,
			   approved_at  INTEGER
			 )`,
		),
		db.prepare(
			`CREATE TABLE IF NOT EXISTS affiliate_clicks (
			   code   TEXT NOT NULL,
			   day    TEXT NOT NULL,
			   clicks INTEGER NOT NULL DEFAULT 0,
			   PRIMARY KEY (code, day)
			 )`,
		),
		db.prepare(
			`CREATE TABLE IF NOT EXISTS affiliate_order_refs (
			   provider   TEXT NOT NULL,
			   order_id   TEXT NOT NULL,
			   code       TEXT NOT NULL,
			   created_at INTEGER NOT NULL,
			   PRIMARY KEY (provider, order_id)
			 )`,
		),
		db.prepare(
			`CREATE TABLE IF NOT EXISTS affiliate_commissions (
			   provider         TEXT NOT NULL,
			   order_id         TEXT NOT NULL,
			   code             TEXT NOT NULL,
			   item_id          TEXT NOT NULL,
			   sale_cents       INTEGER NOT NULL,
			   rate_pct         INTEGER NOT NULL,
			   commission_cents INTEGER NOT NULL,
			   status           TEXT NOT NULL DEFAULT 'pending',
			   created_at       INTEGER NOT NULL,
			   paid_at          INTEGER,
			   PRIMARY KEY (provider, order_id)
			 )`,
		),
		db.prepare(`CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_code ON affiliate_commissions (code)`),
	]);
}

export interface Affiliate {
	code: string;
	name: string;
	email: string;
	website: string | null;
	audience: string | null;
	payout_email: string | null;
	status: "pending" | "active" | "paused";
	rate_pct: number;
	stats_token: string;
	created_at: number;
	approved_at: number | null;
}

export async function findActiveAffiliate(db: D1Database, code: string): Promise<Affiliate | null> {
	return db
		.prepare(`SELECT * FROM affiliates WHERE code = ? AND status = 'active'`)
		.bind(code)
		.first<Affiliate>();
}

export async function recordClick(db: D1Database, code: string, now = Date.now()): Promise<void> {
	const day = new Date(now).toISOString().slice(0, 10);
	await db
		.prepare(
			`INSERT INTO affiliate_clicks (code, day, clicks) VALUES (?, ?, 1)
			 ON CONFLICT (code, day) DO UPDATE SET clicks = clicks + 1`,
		)
		.bind(code, day)
		.run();
}

/** Remembers which partner sent a PayPal order, so the return page can credit them. */
export async function rememberOrderRef(db: D1Database, provider: string, orderId: string, code: string): Promise<void> {
	await ensureAffiliateSchema(db);
	await db
		.prepare(
			`INSERT INTO affiliate_order_refs (provider, order_id, code, created_at) VALUES (?, ?, ?, ?)
			 ON CONFLICT (provider, order_id) DO NOTHING`,
		)
		.bind(provider, orderId, code, Date.now())
		.run();
}

export async function lookupOrderRef(db: D1Database, provider: string, orderId: string): Promise<string | null> {
	await ensureAffiliateSchema(db);
	const row = await db
		.prepare(`SELECT code FROM affiliate_order_refs WHERE provider = ? AND order_id = ?`)
		.bind(provider, orderId)
		.first<{ code: string }>();
	return row?.code ?? null;
}

export type CommissionOutcome =
	| { recorded: true; commissionCents: number }
	| { recorded: false; reason: string };

/**
 * Credits a partner for a paid order. Safe to call on retries: one commission
 * per (provider, order_id). Never throws, because a partner record must never
 * get in the way of delivering a buyer's file.
 */
export async function recordCommission(
	db: D1Database | undefined,
	sale: {
		provider: string;
		orderId: string;
		itemId: string;
		code: string | null;
		buyerEmail: string | null;
		saleCents: number | null;
	},
): Promise<CommissionOutcome> {
	if (!db) return { recorded: false, reason: "no database" };
	if (!sale.code) return { recorded: false, reason: "no partner" };
	try {
		await ensureAffiliateSchema(db);
		const partner = await findActiveAffiliate(db, sale.code);
		if (!partner) return { recorded: false, reason: `partner ${sale.code} is not active` };

		const buyer = (sale.buyerEmail ?? "").trim().toLowerCase();
		const own = [partner.email, partner.payout_email].filter(Boolean).map((e) => e!.toLowerCase());
		if (buyer && own.includes(buyer)) return { recorded: false, reason: "self-referral" };

		const saleCents = sale.saleCents && sale.saleCents > 0 ? sale.saleCents : listPriceCents(sale.itemId);
		const rate = commissionRateFor(sale.itemId, partner.rate_pct);
		const cents = commissionCents(saleCents, rate);
		if (cents <= 0) return { recorded: false, reason: "zero-value sale" };

		const result = await db
			.prepare(
				`INSERT INTO affiliate_commissions
				   (provider, order_id, code, item_id, sale_cents, rate_pct, commission_cents, status, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
				 ON CONFLICT (provider, order_id) DO NOTHING`,
			)
			.bind(sale.provider, sale.orderId, partner.code, sale.itemId, saleCents, rate, cents, Date.now())
			.run();
		if ((result.meta?.changes ?? 0) === 0) return { recorded: false, reason: "already recorded" };
		return { recorded: true, commissionCents: cents };
	} catch (error) {
		console.error("Buzzyfly partners: failed to record commission", sale.provider, sale.orderId, error);
		return { recorded: false, reason: "database error" };
	}
}

export interface PartnerSummary {
	clicks30d: number;
	sales: number;
	pendingCents: number;
	payableCents: number;
	paidCents: number;
}

export async function partnerSummary(db: D1Database, code: string, now = Date.now()): Promise<PartnerSummary> {
	const since = new Date(now - 30 * DAY_MS).toISOString().slice(0, 10);
	const holdCutoff = now - HOLD_DAYS * DAY_MS;
	const [clicks, money] = await Promise.all([
		db
			.prepare(`SELECT COALESCE(SUM(clicks), 0) AS n FROM affiliate_clicks WHERE code = ? AND day >= ?`)
			.bind(code, since)
			.first<{ n: number }>(),
		db
			.prepare(
				`SELECT
				   COALESCE(SUM(CASE WHEN status != 'void' THEN 1 END), 0) AS sales,
				   COALESCE(SUM(CASE WHEN status = 'pending' AND created_at > ? THEN commission_cents END), 0) AS pending,
				   COALESCE(SUM(CASE WHEN status = 'pending' AND created_at <= ? THEN commission_cents END), 0) AS payable,
				   COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_cents END), 0) AS paid
				 FROM affiliate_commissions WHERE code = ?`,
			)
			.bind(holdCutoff, holdCutoff, code)
			.first<{ sales: number; pending: number; payable: number; paid: number }>(),
	]);
	return {
		clicks30d: clicks?.n ?? 0,
		sales: money?.sales ?? 0,
		pendingCents: money?.pending ?? 0,
		payableCents: money?.payable ?? 0,
		paidCents: money?.paid ?? 0,
	};
}
