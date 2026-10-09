import type { APIRoute } from "astro";
import { BUZZYFLY_CONFIG } from "../../../data/monetization";
import { HOLD_DAYS, cleanCode, ensureAffiliateSchema, type Affiliate } from "../../../lib/affiliates";
import { logAdminAction } from "../../../lib/audit";
import { resolveFrom, type EmailBinding } from "../../../lib/email";

export const prerender = false;

const back = (params: Record<string, string>) =>
	new Response(null, { status: 303, headers: { location: `/admin/affiliates?${new URLSearchParams(params)}` } });

/** Emails a newly approved partner their link and private stats page. */
async function sendWelcome(env: { EMAIL?: EmailBinding; EMAIL_FROM?: string }, partner: Affiliate): Promise<string | null> {
	if (!env.EMAIL) return "EMAIL binding not configured";
	const link = `${BUZZYFLY_CONFIG.siteUrl}/r/${partner.code}`;
	const stats = `${BUZZYFLY_CONFIG.siteUrl}/partners/stats?t=${partner.stats_token}`;
	const text = [
		`Hi ${partner.name},`,
		"",
		"You're in. Welcome to the Buzzyfly partner program.",
		"",
		`Your link: ${link}`,
		`Straight to the store: ${link}?to=/store`,
		`Straight to the done-for-you setup: ${link}?to=/setup`,
		"",
		`Your private stats page (keep it to yourself): ${stats}`,
		"",
		`You earn ${partner.rate_pct}% of each sale your link sends within 30 days of the click. Commissions are paid by PayPal once each sale's ${HOLD_DAYS}-day money-back window has closed.`,
		"",
		"When you share the link, say you earn a commission. Please don't promise buyers income or results.",
		"",
		"Reply to this email any time.",
		"",
		`— ${BUZZYFLY_CONFIG.brandName}`,
	].join("\n");
	try {
		await env.EMAIL.send({ from: resolveFrom(env), to: partner.email, subject: "You're a Buzzyfly partner — here's your link", text });
		return null;
	} catch (error) {
		console.error("Buzzyfly partners: welcome email failed", partner.code, error);
		return String(error);
	}
}

/** Partner admin actions from /admin/affiliates. Behind the admin session (src/middleware.ts). */
export const POST: APIRoute = async ({ request, locals }) => {
	const env = locals.runtime.env;
	if (!env.DB) return back({ error: "No D1 database bound." });
	const form = await request.formData().catch(() => null);
	const action = String(form?.get("action") ?? "");
	const code = cleanCode(form?.get("code"));
	const provider = String(form?.get("provider") ?? "");
	const orderId = String(form?.get("order_id") ?? "");
	const actor = locals.adminUser ?? "admin";

	await ensureAffiliateSchema(env.DB);

	try {
		switch (action) {
			case "approve":
			case "activate": {
				if (!code) break;
				const partner = await env.DB.prepare(`SELECT * FROM affiliates WHERE code = ?`).bind(code).first<Affiliate>();
				if (!partner) return back({ error: "Partner not found." });
				await env.DB.prepare(
					`UPDATE affiliates SET status = 'active', approved_at = COALESCE(approved_at, ?) WHERE code = ?`,
				)
					.bind(Date.now(), code)
					.run();
				await logAdminAction(env, actor, `partner.${action}`, code);
				if (action === "approve") {
					const failed = await sendWelcome(env as unknown as { EMAIL?: EmailBinding; EMAIL_FROM?: string }, partner);
					if (failed) return back({ error: `Approved ${code}, but the welcome email failed (${failed}). Send them their link by hand.` });
					return back({ ok: `Approved ${code} and emailed them their link.` });
				}
				return back({ ok: `Reactivated ${code}.` });
			}
			case "pause": {
				if (!code) break;
				await env.DB.prepare(`UPDATE affiliates SET status = 'paused' WHERE code = ?`).bind(code).run();
				await logAdminAction(env, actor, "partner.pause", code);
				return back({ ok: `Paused ${code}. New clicks and sales won't be credited.` });
			}
			case "decline": {
				if (!code) break;
				// Only applications: an approved partner with history gets paused instead.
				await env.DB.prepare(`DELETE FROM affiliates WHERE code = ? AND status = 'pending'`).bind(code).run();
				await logAdminAction(env, actor, "partner.decline", code);
				return back({ ok: `Declined ${code}.` });
			}
			case "rate": {
				const rate = Number(form?.get("rate_pct"));
				if (!code || !Number.isInteger(rate) || rate < 0 || rate > 90) return back({ error: "Rate must be a whole number from 0 to 90." });
				await env.DB.prepare(`UPDATE affiliates SET rate_pct = ? WHERE code = ?`).bind(rate, code).run();
				await logAdminAction(env, actor, "partner.rate", `${code} ${rate}%`);
				return back({ ok: `${code} now earns ${rate}% on new sales.` });
			}
			case "paid": {
				if (!provider || !orderId) break;
				await env.DB.prepare(
					`UPDATE affiliate_commissions SET status = 'paid', paid_at = ? WHERE provider = ? AND order_id = ? AND status = 'pending'`,
				)
					.bind(Date.now(), provider, orderId)
					.run();
				await logAdminAction(env, actor, "partner.commission.paid", `${provider} ${orderId}`);
				return back({ ok: "Marked paid." });
			}
			case "pay_all": {
				if (!code) break;
				const cutoff = Date.now() - HOLD_DAYS * 24 * 60 * 60 * 1000;
				const result = await env.DB.prepare(
					`UPDATE affiliate_commissions SET status = 'paid', paid_at = ? WHERE code = ? AND status = 'pending' AND created_at <= ?`,
				)
					.bind(Date.now(), code, cutoff)
					.run();
				await logAdminAction(env, actor, "partner.commission.pay_all", code);
				return back({ ok: `Marked ${result.meta?.changes ?? 0} commission(s) for ${code} as paid.` });
			}
			case "void": {
				if (!provider || !orderId) break;
				await env.DB.prepare(
					`UPDATE affiliate_commissions SET status = 'void' WHERE provider = ? AND order_id = ? AND status = 'pending'`,
				)
					.bind(provider, orderId)
					.run();
				await logAdminAction(env, actor, "partner.commission.void", `${provider} ${orderId}`);
				return back({ ok: "Commission voided (refund)." });
			}
		}
	} catch (error) {
		console.error("Buzzyfly partners: admin action failed", action, error);
		return back({ error: "That didn't save. Check the activity log and try again." });
	}
	return back({ error: "Unknown action." });
};
