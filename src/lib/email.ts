import { BUZZYFLY_CONFIG } from "../data/monetization";

/**
 * Transactional email for order fulfillment.
 *
 * This exists because minting a download URL is not delivery. Before this
 * module, the webhook created a signed link and wrote it to the console —
 * which means a paying customer received nothing and the only copy of their
 * download link sat in a Cloudflare log. Payment succeeded, fulfillment
 * silently did not.
 *
 * Configure with EMAIL_API_KEY and EMAIL_FROM. The implementation targets
 * Resend's REST API because it needs no SDK and works on Workers, but any
 * provider with a JSON send endpoint can be swapped in below.
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

/**
 * Sends the download link. Returns a result rather than throwing so the
 * webhook can still return 200 — a provider retry would re-run fulfillment
 * and mint a second token, which is worse than one failed send that we log.
 *
 * The caller is expected to surface `sent: false` loudly. A delivery failure
 * means someone paid and is waiting, so it needs to be visibly different from
 * a successful fulfillment in the logs.
 */
export async function sendDeliveryEmail(
	message: DeliveryEmail,
	env: { EMAIL_API_KEY?: string; EMAIL_FROM?: string },
): Promise<EmailResult> {
	if (!env.EMAIL_API_KEY || !env.EMAIL_FROM) {
		return { sent: false, reason: "EMAIL_API_KEY or EMAIL_FROM is not configured" };
	}
	if (!message.to) {
		return { sent: false, reason: "no customer email on the order" };
	}

	try {
		const response = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.EMAIL_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: env.EMAIL_FROM,
				to: [message.to],
				subject: `Your ${message.productName} download`,
				html: renderHtml(message),
				text: renderText(message),
			}),
		});

		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			return { sent: false, reason: `provider returned ${response.status}: ${detail.slice(0, 200)}` };
		}

		return { sent: true };
	} catch (error) {
		return { sent: false, reason: `request failed: ${String(error)}` };
	}
}
