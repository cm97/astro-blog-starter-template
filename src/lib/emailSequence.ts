import { BUZZYFLY_CONFIG } from "../data/monetization";
import { EMAIL_SEQUENCE, SEQUENCE_INTERVAL_MS, type SequenceEmail } from "../data/emailSequence";
import { escapeHtml, resolveFrom, type EmailBinding, type EmailResult } from "./email";
import { getSettings } from "./settings";

const CHECKLIST_URL = `${BUZZYFLY_CONFIG.siteUrl}/blog/weekly-reset/`;
const STORE_URL = `${BUZZYFLY_CONFIG.siteUrl}/store`;
const WEEKLY_RESET_BUY_URL = `${BUZZYFLY_CONFIG.siteUrl}/buy/weekly-reset-checklist`;
const BATCH_SIZE = 50;
// The sequence sells the Digital System. Someone who already bought it (or the
// bundle that contains it) gets the post-purchase emails instead, not this pitch.
const SKIP_SYSTEM_BUYERS = `AND NOT EXISTS (
		SELECT 1 FROM fulfillments f
		WHERE lower(f.customer_email) = lower(subscribers.email)
		  AND f.item_id IN ('buzzyfly-digital-system', 'complete-business-bundle')
	)`;

export function unsubscribeUrl(token: string): string {
	return `${BUZZYFLY_CONFIG.siteUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
}

function fillVars(value: string): string {
	return value
		.replace(/\{checklist\}/g, CHECKLIST_URL)
		.replace(/\{store\}/g, STORE_URL)
		.replace(/\{weeklyResetBuy\}/g, WEEKLY_RESET_BUY_URL)
		.replace(/\{orderEmail\}/g, BUZZYFLY_CONFIG.orderEmail);
}

// Escape, then turn bare URLs and email addresses into links.
function inlineHtml(value: string): string {
	return escapeHtml(value)
		.replace(/https?:\/\/[^\s<]+[^\s<.,)]/g, (url) => `<a href="${url}" style="color:#1f4d3a">${url}</a>`)
		.replace(
			/(^|[\s(])([\w.+-]+@[\w-]+\.[\w.]+[\w])/g,
			(_m, pre, addr) => `${pre}<a href="mailto:${addr}" style="color:#1f4d3a">${addr}</a>`,
		);
}

function bodyToHtml(body: string): string {
	return body
		.split(/\n\s*\n/)
		.map((block) => {
			const lines = block.split("\n").map((l) => l.trim());
			if (lines.every((l) => l.startsWith("- "))) {
				return `<ul style="margin:0 0 16px;padding-left:20px">${lines
					.map((l) => `<li style="margin:0 0 6px">${inlineHtml(l.slice(2))}</li>`)
					.join("")}</ul>`;
			}
			if (lines.every((l) => /^\d+\.\s/.test(l))) {
				return `<ol style="margin:0 0 16px;padding-left:20px">${lines
					.map((l) => `<li style="margin:0 0 6px">${inlineHtml(l.replace(/^\d+\.\s/, ""))}</li>`)
					.join("")}</ol>`;
			}
			if (lines.every((l) => l.startsWith(">"))) {
				return `<blockquote style="margin:0 0 16px;padding:8px 14px;border-left:3px solid #1f4d3a;background:#f4f6f5">${lines
					.map((l) => inlineHtml(l.replace(/^>\s?/, "")))
					.join("<br>")}</blockquote>`;
			}
			return `<p style="margin:0 0 16px">${lines.map(inlineHtml).join("<br>")}</p>`;
		})
		.join("\n");
}

export function renderSequenceEmail(
	email: SequenceEmail,
	unsubscribeToken?: string,
	mailingAddress = "",
): { subject: string; html: string; text: string } {
	const body = fillVars(email.body);
	const signature = `— ${BUZZYFLY_CONFIG.emailSignature}`;
	const reason = `You're getting this because you signed up for the free weekly reset checklist at ${BUZZYFLY_CONFIG.siteUrl.replace(/^https?:\/\//, "")}.`;
	const unsub = unsubscribeToken ? unsubscribeUrl(unsubscribeToken) : null;
	const address = mailingAddress.trim();

	const footerText = [reason, unsub ? `Unsubscribe: ${unsub}` : null, address || null]
		.filter(Boolean)
		.join("\n");

	const text = `${body.replace(/^>\s?/gm, "  ")}\n\n${signature}\n\n--\n${footerText}\n`;

	const html = `<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#16191c;max-width:560px;margin:0 auto;padding:24px">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(email.preview)}</span>
    ${bodyToHtml(body)}
    <p style="margin:0 0 24px">${escapeHtml(signature)}</p>
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0 12px">
    <p style="margin:0;color:#6b6a64;font-size:12px">
      ${escapeHtml(reason)}
      ${unsub ? `<br><a href="${unsub}" style="color:#6b6a64">Unsubscribe</a>` : ""}
      ${address ? `<br>${escapeHtml(address)}` : ""}
    </p>
  </body>
</html>`;

	return { subject: email.subject, html, text };
}

export async function sendSequenceEmail(
	step: number,
	to: string,
	unsubscribeToken: string | undefined,
	env: { DB?: D1Database; EMAIL?: EmailBinding; EMAIL_FROM?: string },
	// Pass when sending in bulk to avoid re-reading settings per email.
	mailingAddress?: string,
): Promise<EmailResult> {
	if (!env.EMAIL) return { sent: false, reason: "EMAIL binding not configured" };
	const email = EMAIL_SEQUENCE[step];
	if (!email) return { sent: false, reason: `no sequence email at step ${step}` };

	const address = mailingAddress ?? (await getSettings(env)).mailingAddress;
	const { subject, html, text } = renderSequenceEmail(email, unsubscribeToken, address);
	try {
		await env.EMAIL.send({ from: resolveFrom(env), to, subject, html, text });
		return { sent: true };
	} catch (error) {
		return { sent: false, reason: `send failed: ${String(error)}` };
	}
}

interface DueSubscriber {
	email: string;
	unsubscribe_token: string | null;
	sequence_step: number;
}

/**
 * Sends the next sequence email to every subscriber whose last one went out
 * at least SEQUENCE_INTERVAL_MS ago. Called from the hourly cron.
 *
 * Each subscriber's step is claimed (advanced) before sending, so an
 * overlapping run can never send the same email twice. A failed send is
 * logged and skipped rather than retried, matching the buyer follow-up job.
 */
export async function sendDueSequenceEmails(env: {
	DB?: D1Database;
	EMAIL?: EmailBinding;
	EMAIL_FROM?: string;
}): Promise<{ sent: number; failed: number }> {
	if (!env.DB || !env.EMAIL) return { sent: 0, failed: 0 };
	// US anti-spam law (CAN-SPAM) requires a postal address in marketing
	// email. Hold the weekly emails until one is set (Admin > Settings);
	// nobody loses their place.
	const { mailingAddress } = await getSettings(env);
	if (!mailingAddress.trim()) {
		console.log("Buzzyfly sequence: paused until a mailing address is set in Admin > Settings");
		return { sent: 0, failed: 0 };
	}

	const now = Date.now();
	const lastStep = EMAIL_SEQUENCE.length - 1;
	const dueSql = (skipBuyers: boolean) =>
		`SELECT email, unsubscribe_token, sequence_step
		 FROM subscribers
		 WHERE unsubscribed_at IS NULL
		   AND sequence_step < ?
		   AND COALESCE(sequence_sent_at, created_at, 0) <= ?
		   ${skipBuyers ? SKIP_SYSTEM_BUYERS : ""}
		 ORDER BY COALESCE(sequence_sent_at, created_at, 0) ASC
		 LIMIT ?`;
	let due;
	try {
		due = await env.DB.prepare(dueSql(true))
			.bind(lastStep, now - SEQUENCE_INTERVAL_MS, BATCH_SIZE)
			.all<DueSubscriber>();
	} catch (error) {
		// No fulfillments table yet: send to everyone rather than stop the sequence.
		console.error("Buzzyfly sequence: buyer check failed, sending without it", error);
		due = await env.DB.prepare(dueSql(false))
			.bind(lastStep, now - SEQUENCE_INTERVAL_MS, BATCH_SIZE)
			.all<DueSubscriber>();
	}

	let sent = 0;
	let failed = 0;
	for (const sub of due.results ?? []) {
		const step = sub.sequence_step + 1;

		const claim = await env.DB.prepare(
			`UPDATE subscribers SET sequence_step = ?, sequence_sent_at = ?
			 WHERE email = ? AND sequence_step = ?`,
		)
			.bind(step, now, sub.email, sub.sequence_step)
			.run();
		if (!claim.meta.changes) continue;

		let token = sub.unsubscribe_token;
		if (!token) {
			token = crypto.randomUUID();
			await env.DB.prepare(
				`UPDATE subscribers SET unsubscribe_token = ? WHERE email = ? AND unsubscribe_token IS NULL`,
			)
				.bind(token, sub.email)
				.run();
		}

		const result = await sendSequenceEmail(step, sub.email, token, env, mailingAddress);
		if (result.sent) sent++;
		else {
			failed++;
			console.error(`Buzzyfly sequence: step ${step} to ${sub.email} failed: ${result.reason}`);
		}
	}
	return { sent, failed };
}
