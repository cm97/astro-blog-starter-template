import { BUZZYFLY_CONFIG } from "../data/monetization";
import { escapeHtml, type EmailBinding, type EmailResult } from "./email";

/**
 * One-off email from the brand address (Admin > Send email), sent through the
 * same Cloudflare Email Service binding as order emails, so it costs nothing
 * and never exposes a personal address. Every send is kept in `outbox_emails`
 * so there is a "sent" history.
 */

export interface OutboxEntry {
	id: number;
	to_address: string;
	subject: string;
	body: string;
	from_name: string;
	sent: number;
	error: string | null;
	created_at: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function ensureOutboxTable(db: D1Database): Promise<void> {
	await db
		.prepare(
			`CREATE TABLE IF NOT EXISTS outbox_emails (
			   id         INTEGER PRIMARY KEY AUTOINCREMENT,
			   to_address TEXT NOT NULL,
			   subject    TEXT NOT NULL,
			   body       TEXT NOT NULL,
			   from_name  TEXT NOT NULL,
			   sent       INTEGER NOT NULL,
			   error      TEXT,
			   created_at INTEGER NOT NULL
			 )`,
		)
		.run();
}

/** Display name for the From line: letters, digits, spaces and basic punctuation only. */
export function cleanFromName(value: string): string {
	const cleaned = value.replace(/[^\p{L}\p{N} .,'&-]/gu, "").trim().slice(0, 60);
	return cleaned || BUZZYFLY_CONFIG.brandName;
}

function bodyToHtml(body: string): string {
	return body
		.split(/\n\s*\n/)
		.map((p) => `<p style="margin:0 0 16px">${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
		.join("\n");
}

export async function sendBrandEmail(
	env: { DB?: D1Database; EMAIL?: EmailBinding },
	message: { to: string; subject: string; body: string; fromName: string },
): Promise<EmailResult> {
	const to = message.to.trim();
	const subject = message.subject.trim().slice(0, 200);
	const body = message.body.trim();
	const fromName = cleanFromName(message.fromName);

	if (!EMAIL_RE.test(to)) return { sent: false, reason: "That email address doesn't look right." };
	if (!subject || !body) return { sent: false, reason: "Subject and message are both required." };

	let result: EmailResult;
	if (!env.EMAIL) {
		result = { sent: false, reason: "Email sending isn't configured (EMAIL binding missing)." };
	} else {
		try {
			await env.EMAIL.send({
				from: `${fromName} <${BUZZYFLY_CONFIG.brandEmail}>`,
				to,
				subject,
				text: body,
				html: `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#16191c;max-width:560px;margin:0 auto;padding:24px">${bodyToHtml(body)}</body></html>`,
			});
			result = { sent: true };
		} catch (error) {
			console.error(`Buzzyfly outbox: send to ${to} ("${subject}") failed`, error);
			result = { sent: false, reason: `Send failed: ${String(error)}` };
		}
	}

	if (env.DB) {
		try {
			await ensureOutboxTable(env.DB);
			await env.DB.prepare(
				`INSERT INTO outbox_emails (to_address, subject, body, from_name, sent, error, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
				.bind(to, subject, body, fromName, result.sent ? 1 : 0, result.reason ?? null, Date.now())
				.run();
		} catch (error) {
			console.error("Buzzyfly outbox: failed to record email", error);
		}
	}
	return result;
}

export async function listOutbox(env: { DB?: D1Database }, limit = 25): Promise<OutboxEntry[]> {
	if (!env.DB) return [];
	try {
		await ensureOutboxTable(env.DB);
		const rows = await env.DB.prepare(`SELECT * FROM outbox_emails ORDER BY created_at DESC LIMIT ?`)
			.bind(limit)
			.all<OutboxEntry>();
		return rows.results ?? [];
	} catch {
		return [];
	}
}
