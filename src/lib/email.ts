import { BUZZYFLY_CONFIG } from "../data/monetization";

/**
 * Transactional email for order fulfillment via the Cloudflare Email Service
 * Workers binding (env.EMAIL). No external account or API key required —
 * authentication is handled natively by the platform.
 *
 * Prerequisites (one-time, per domain):
 *   1. Cloudflare dashboard → Compute → Email Service → Email Sending
 *   2. Click "Onboard Domain" and select buzzyfly.com
 *   Cloudflare adds all required DNS records automatically.
 */

export interface DeliveryEmail {
	to: string;
	downloadUrl: string;
	productName: string;
	orderId: string;
}

export interface EmailResult {
	sent: boolean;
	reason?: string;
}

function parseFrom(from: string): { email: string; name?: string } {
	const match = from.match(/^(.+?)\s*<([^>]+)>$/);
	if (match) return { name: match[1].trim(), email: match[2].trim() };
	return { email: from.trim() };
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function renderHtml({ downloadUrl, productName }: DeliveryEmail): string {
	return `<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#16191c;max-width:520px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;margin:0 0 16px">Your download is ready</h1>
    <p style="margin:0 0 16px">Thanks for buying <strong>${escapeHtml(productName)}</strong>.</p>
    <p style="margin:0 0 24px">
      <a href="${downloadUrl}" style="display:inline-block;background:#1f4d3a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:600">Download ${escapeHtml(productName)}</a>
    </p>
    <p style="margin:0 0 16px;color:#6b6a64;font-size:14px">
      This link expires in 3 days. If it lapses before you grab the file, reply to this
      email and you'll get a fresh one.
    </p>
    <p style="margin:0;color:#6b6a64;font-size:14px">— ${escapeHtml(BUZZYFLY_CONFIG.brandName)}</p>
  </body>
</html>`;
}

function renderText({ downloadUrl, productName }: DeliveryEmail): string {
	return [
		`Thanks for buying ${productName}.`,
		"",
		"Your download link:",
		downloadUrl,
		"",
		"This link expires in 3 days. If it lapses before you grab the file, reply to this email and you'll get a fresh one.",
		"",
		`— ${BUZZYFLY_CONFIG.brandName}`,
	].join("\n");
}

interface EmailBinding {
	send(message: {
		from: string;
		to: string;
		subject: string;
		html?: string;
		text?: string;
	}): Promise<{ messageId: string }>;
}

export async function sendDeliveryEmail(
	message: DeliveryEmail,
	env: { EMAIL?: EmailBinding; EMAIL_FROM?: string; EMAIL_API_KEY?: string },
): Promise<EmailResult> {
	if (!env.EMAIL) {
		return { sent: false, reason: "EMAIL binding is not configured in wrangler.json" };
	}
	if (!message.to) {
		return { sent: false, reason: "no customer email on the order" };
	}

	const fromStr = env.EMAIL_FROM ?? `${BUZZYFLY_CONFIG.brandName} <orders@buzzyfly.com>`;
	const { email: fromEmail, name: fromName } = parseFrom(fromStr);
	const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

	try {
		await env.EMAIL.send({
			from,
			to: message.to,
			subject: `Your ${message.productName} download`,
			html: renderHtml(message),
			text: renderText(message),
		});
		return { sent: true };
	} catch (error) {
		return { sent: false, reason: `send failed: ${String(error)}` };
	}
}
