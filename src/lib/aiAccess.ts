import type { AstroCookies } from "astro";
import { AI_PRO } from "../data/monetization";

/**
 * Freemium access control for Buzzyfly AI (/ai).
 *
 *   free  — AI_PRO.freeDailyUses generations per day, counted per hashed IP
 *   pro   — an active Stripe subscription (ai_subscriptions), signed in via an
 *           emailed one-time link that sets the `buzzyfly_ai_session` cookie
 *
 * Every function fails closed for pro (no DB → nobody is pro) and open-but-
 * bounded for free (no DB → free tier still works, capped per request).
 */

export const AI_SESSION_COOKIE = "buzzyfly_ai_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const LOGIN_TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export interface AiAccess {
	pro: boolean;
	email: string | null;
	used: number;
	limit: number;
	remaining: number;
}

function randomToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

/** Hashed visitor key for free-tier counting. The raw IP is never stored. */
export async function visitorKey(request: Request): Promise<string> {
	const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
	return sha256Hex(`buzzyfly-ai:${ip}`);
}

export async function isActiveSubscriber(env: Env, email: string): Promise<boolean> {
	if (!env.DB) return false;
	const row = await env.DB.prepare(`SELECT status FROM ai_subscriptions WHERE email = ?`)
		.bind(normalizeEmail(email))
		.first<{ status: string }>();
	return !!row && ACTIVE_STATUSES.has(row.status);
}

/** Returns the signed-in subscriber's email, only while their subscription is active. */
export async function getProEmail(env: Env, cookies: AstroCookies): Promise<string | null> {
	const token = cookies.get(AI_SESSION_COOKIE)?.value;
	if (!token || !env.DB) return null;
	const session = await env.DB.prepare(
		`SELECT email, expires_at FROM ai_sessions WHERE token = ?`,
	)
		.bind(token)
		.first<{ email: string; expires_at: number }>();
	if (!session || session.expires_at < Date.now()) return null;
	return (await isActiveSubscriber(env, session.email)) ? session.email : null;
}

async function usedToday(env: Env, visitor: string): Promise<number> {
	if (!env.DB) return 0;
	const row = await env.DB.prepare(`SELECT count FROM ai_usage WHERE visitor = ? AND day = ?`)
		.bind(visitor, today())
		.first<{ count: number }>();
	return row?.count ?? 0;
}

export async function getAiAccess(env: Env, request: Request, cookies: AstroCookies): Promise<AiAccess> {
	const email = await getProEmail(env, cookies);
	const pro = !!email;
	const limit = pro ? AI_PRO.proDailyUses : AI_PRO.freeDailyUses;
	const used = await usedToday(env, pro ? `pro:${email}` : await visitorKey(request));
	return { pro, email, used, limit, remaining: Math.max(0, limit - used) };
}

/** Records one generation against today's allowance. */
export async function recordUse(env: Env, request: Request, access: AiAccess): Promise<void> {
	if (!env.DB) return;
	const visitor = access.pro ? `pro:${access.email}` : await visitorKey(request);
	await env.DB.prepare(
		`INSERT INTO ai_usage (visitor, day, count) VALUES (?, ?, 1)
		 ON CONFLICT(visitor, day) DO UPDATE SET count = count + 1`,
	)
		.bind(visitor, today())
		.run();
}

/** Creates or updates a subscription row. Called from the Stripe webhook. */
export async function upsertSubscription(
	env: Env,
	sub: { email: string; customerId: string | null; subscriptionId: string | null; status: string },
): Promise<void> {
	if (!env.DB) return;
	const now = Date.now();
	await env.DB.prepare(
		`INSERT INTO ai_subscriptions
		   (email, stripe_customer_id, stripe_subscription_id, status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)
		 ON CONFLICT(email) DO UPDATE SET
		   stripe_customer_id = excluded.stripe_customer_id,
		   stripe_subscription_id = excluded.stripe_subscription_id,
		   status = excluded.status,
		   updated_at = excluded.updated_at`,
	)
		.bind(normalizeEmail(sub.email), sub.customerId, sub.subscriptionId, sub.status, now, now)
		.run();
}

/** Updates the status of a known subscription (renewal failure, cancellation…). */
export async function updateSubscriptionStatus(
	env: Env,
	subscriptionId: string,
	status: string,
): Promise<boolean> {
	if (!env.DB) return false;
	const result = await env.DB.prepare(
		`UPDATE ai_subscriptions SET status = ?, updated_at = ? WHERE stripe_subscription_id = ?`,
	)
		.bind(status, Date.now(), subscriptionId)
		.run();
	return (result.meta?.changes ?? 0) > 0;
}

export async function issueLoginToken(env: Env, email: string): Promise<string | null> {
	if (!env.DB) return null;
	const token = randomToken();
	await env.DB.prepare(`INSERT INTO ai_login_tokens (token, email, expires_at) VALUES (?, ?, ?)`)
		.bind(token, normalizeEmail(email), Date.now() + LOGIN_TOKEN_TTL_MS)
		.run();
	return token;
}

/** Consumes a one-time login token and returns a new session token for the cookie. */
export async function redeemLoginToken(
	env: Env,
	token: string,
): Promise<{ sessionToken: string; maxAgeSeconds: number } | null> {
	if (!env.DB || !token) return null;
	const row = await env.DB.prepare(
		`DELETE FROM ai_login_tokens WHERE token = ? RETURNING email, expires_at`,
	)
		.bind(token)
		.first<{ email: string; expires_at: number }>();
	if (!row || row.expires_at < Date.now()) return null;
	if (!(await isActiveSubscriber(env, row.email))) return null;

	const sessionToken = randomToken();
	await env.DB.prepare(`INSERT INTO ai_sessions (token, email, expires_at) VALUES (?, ?, ?)`)
		.bind(sessionToken, row.email, Date.now() + SESSION_TTL_MS)
		.run();
	return { sessionToken, maxAgeSeconds: SESSION_TTL_MS / 1000 };
}

export async function endSession(env: Env, cookies: AstroCookies): Promise<void> {
	const token = cookies.get(AI_SESSION_COOKIE)?.value;
	if (token && env.DB) {
		await env.DB.prepare(`DELETE FROM ai_sessions WHERE token = ?`).bind(token).run();
	}
	cookies.delete(AI_SESSION_COOKIE, { path: "/" });
}
