import { BUZZYFLY_CONFIG, ALL_PRODUCTS, DONE_FOR_YOU, UPSELL_MAP } from "../data/monetization";
import { INTAKE_QUESTIONS, intakeMailto } from "./doneForYou";

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
	itemId?: string;
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

export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function setupIntakeHtml(orderId: string): string {
	return `<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#16191c">Next: your setup</p>
    <p style="margin:0 0 12px">Answer these and the setup starts. Short answers are fine.</p>
    <ol style="margin:0 0 16px;padding-left:20px">
      ${INTAKE_QUESTIONS.map((q) => `<li style="margin:0 0 6px">${escapeHtml(q)}</li>`).join("\n      ")}
    </ol>
    <p style="margin:0 0 16px">
      <a href="${escapeHtml(intakeMailto(orderId))}" style="display:inline-block;background:#1f4d3a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:600">Send my answers</a>
    </p>
    <p style="margin:0 0 16px;color:#6b6a64;font-size:14px">
      Or email them to ${escapeHtml(BUZZYFLY_CONFIG.orderEmail)}. Your finished setup arrives within
      ${DONE_FOR_YOU.turnaroundDays} working days of your answers, followed by a ${DONE_FOR_YOU.callMinutes}-minute handover call.
    </p>`;
}

function renderHtml({ downloadUrl, productName, itemId, orderId }: DeliveryEmail): string {
	const isSetup = itemId === DONE_FOR_YOU.productId;
	const upsellId = itemId ? UPSELL_MAP[itemId] : null;
	const upsellProduct = upsellId ? ALL_PRODUCTS.find((p) => p.id === upsellId) : null;

	const upsellBlock = upsellProduct
		? `<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#16191c">One more thing</p>
    <p style="margin:0 0 16px;color:#6b6a64;font-size:14px">
      You have <strong>${escapeHtml(productName)}</strong>. The logical next piece is the
      <strong>${escapeHtml(upsellProduct.title)}</strong>. ${escapeHtml(upsellProduct.description)}
      Same 30-day money-back guarantee.
    </p>
    <p style="margin:0">
      <a href="${BUZZYFLY_CONFIG.siteUrl}${upsellProduct.buyUrl}" style="display:inline-block;background:#374151;color:#fff;text-decoration:none;padding:10px 20px;border-radius:4px;font-weight:600;font-size:14px">
        Get ${escapeHtml(upsellProduct.title)} — ${upsellProduct.price}
      </a>
    </p>`
		: "";

	return `<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#16191c;max-width:520px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;margin:0 0 16px">${isSetup ? "Your setup is booked" : "Your download is ready"}</h1>
    <p style="margin:0 0 16px">Thanks for buying <strong>${escapeHtml(productName)}</strong>.${isSetup ? " Every Buzzyfly file is below, so you can start using them today." : ""}</p>
    <p style="margin:0 0 24px">
      <a href="${downloadUrl}" style="display:inline-block;background:#1f4d3a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:600">Download ${isSetup ? "every file" : escapeHtml(productName)}</a>
    </p>
    <p style="margin:0 0 16px;color:#6b6a64;font-size:14px">
      This link expires in 3 days. If it lapses before you grab the file, reply to this
      email and you'll get a fresh one.
    </p>
    ${isSetup ? setupIntakeHtml(orderId) : ""}
    ${upsellBlock}
    <p style="margin:24px 0 0;color:#6b6a64;font-size:14px">— ${escapeHtml(BUZZYFLY_CONFIG.brandName)}</p>
  </body>
</html>`;
}

function renderText({ downloadUrl, productName, itemId }: DeliveryEmail): string {
	const upsellId = itemId ? UPSELL_MAP[itemId] : null;
	const upsellProduct = upsellId ? ALL_PRODUCTS.find((p) => p.id === upsellId) : null;

	const lines = [
		`Thanks for buying ${productName}.`,
		"",
		"Your download link:",
		downloadUrl,
		"",
		"This link expires in 3 days. If it lapses before you grab the file, reply to this email and you'll get a fresh one.",
	];

	if (itemId === DONE_FOR_YOU.productId) {
		lines.push(
			"",
			"---",
			"",
			"Next: your setup. Answer these and the setup starts. Short answers are fine.",
			"",
			...INTAKE_QUESTIONS.map((q, i) => `${i + 1}. ${q}`),
			"",
			`Email your answers to ${BUZZYFLY_CONFIG.orderEmail}. Your finished setup arrives within ${DONE_FOR_YOU.turnaroundDays} working days of your answers, followed by a ${DONE_FOR_YOU.callMinutes}-minute handover call.`,
		);
	}

	if (upsellProduct) {
		lines.push(
			"",
			"---",
			"",
			`You have ${productName}. The logical next piece is the ${upsellProduct.title}.`,
			upsellProduct.description,
			"Same 30-day money-back guarantee.",
			`Get it here (${upsellProduct.price}): ${BUZZYFLY_CONFIG.siteUrl}${upsellProduct.buyUrl}`,
		);
	}

	lines.push("", `— ${BUZZYFLY_CONFIG.brandName}`);
	return lines.join("\n");
}

export interface EmailBinding {
	send(message: {
		from: string;
		to: string;
		subject: string;
		html?: string;
		text?: string;
	}): Promise<{ messageId: string }>;
}

// Must match `send_email[0].allowed_sender_addresses` in wrangler.json. The
// binding rejects any other From address at runtime, so a typo in EMAIL_FROM
// would otherwise fail every send.
export const ALLOWED_SENDERS = ["orders@buzzyfly.com", "hello@buzzyfly.com"];
const DEFAULT_FROM = `${BUZZYFLY_CONFIG.brandName} <orders@buzzyfly.com>`;

export function resolveFrom(env: { EMAIL_FROM?: string }): string {
	if (!env.EMAIL_FROM) return DEFAULT_FROM;
	const { email, name } = parseFrom(env.EMAIL_FROM);
	if (!ALLOWED_SENDERS.includes(email.toLowerCase())) {
		console.error(
			`Buzzyfly email: EMAIL_FROM "${email}" is not an allowed sender (${ALLOWED_SENDERS.join(", ")}); using ${DEFAULT_FROM}`,
		);
		return DEFAULT_FROM;
	}
	return name ? `${name} <${email}>` : email;
}

export interface FollowUpEmail {
	to: string;
	itemId: string;
	orderId: string;
}

export async function sendFollowUpEmail(
	message: FollowUpEmail,
	env: { EMAIL?: EmailBinding; EMAIL_FROM?: string },
): Promise<EmailResult> {
	if (!env.EMAIL) return { sent: false, reason: "EMAIL binding not configured" };
	if (!message.to) return { sent: false, reason: "no email address" };

	const upsellId = UPSELL_MAP[message.itemId];
	const upsellProduct = upsellId ? ALL_PRODUCTS.find((p) => p.id === upsellId) : null;
	const purchasedProduct = ALL_PRODUCTS.find((p) => p.id === message.itemId);
	const productName = purchasedProduct?.title ?? message.itemId;

	const from = resolveFrom(env);
	const subject = `Quick check-in on your ${productName}`;

	const upsellSection = upsellProduct
		? `<p style="margin:0 0 16px;color:#6b6a64;font-size:14px">
      If you've run it once or twice and it's working, the next piece is the
      <strong>${escapeHtml(upsellProduct.title)}</strong> (${upsellProduct.price}).
      ${escapeHtml(upsellProduct.description)}
    </p>
    <p style="margin:0">
      <a href="${BUZZYFLY_CONFIG.siteUrl}${upsellProduct.buyUrl}" style="display:inline-block;background:#374151;color:#fff;text-decoration:none;padding:10px 20px;border-radius:4px;font-weight:600;font-size:14px">
        Get ${escapeHtml(upsellProduct.title)} — ${upsellProduct.price}
      </a>
    </p>`
		: `<p style="margin:0;color:#6b6a64;font-size:14px">
      You've got the complete system. If you have any questions about using it, just reply to this email.
    </p>`;

	const html = `<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#16191c;max-width:520px;margin:0 auto;padding:24px">
    <p style="margin:0 0 16px">Hey — just checking in.</p>
    <p style="margin:0 0 16px">
      You downloaded <strong>${escapeHtml(productName)}</strong> a couple of days ago.
      Did it do what you needed it to?
    </p>
    <p style="margin:0 0 24px;color:#6b6a64;font-size:14px">
      If anything's not working or unclear, reply here and you'll get a person, not a ticket.
    </p>
    ${upsellSection}
    <p style="margin:24px 0 0;color:#6b6a64;font-size:14px">— ${escapeHtml(BUZZYFLY_CONFIG.brandName)}</p>
  </body>
</html>`;

	const lines = [
		"Hey — just checking in.",
		"",
		`You downloaded ${productName} a couple of days ago. Did it do what you needed it to?`,
		"",
		"If anything's not working or unclear, reply here and you'll get a person, not a ticket.",
	];

	if (upsellProduct) {
		lines.push(
			"",
			`If it's working, the next piece is the ${upsellProduct.title} (${upsellProduct.price}):`,
			`${BUZZYFLY_CONFIG.siteUrl}${upsellProduct.buyUrl}`,
		);
	}

	lines.push("", `— ${BUZZYFLY_CONFIG.brandName}`);
	const text = lines.join("\n");

	try {
		await env.EMAIL.send({ from, to: message.to, subject, html, text });
		return { sent: true };
	} catch (error) {
		console.error(`Buzzyfly email: follow-up send failed for order ${message.orderId} to ${message.to}`, error);
		return { sent: false, reason: `send failed: ${String(error)}` };
	}
}

export async function sendDeliveryEmail(
	message: DeliveryEmail,
	env: { EMAIL?: EmailBinding; EMAIL_FROM?: string },
): Promise<EmailResult> {
	if (!env.EMAIL) {
		return { sent: false, reason: "EMAIL binding is not configured in wrangler.json" };
	}
	if (!message.to) {
		return { sent: false, reason: "no customer email on the order" };
	}

	try {
		await env.EMAIL.send({
			from: resolveFrom(env),
			to: message.to,
			subject:
				message.itemId === DONE_FOR_YOU.productId
					? `Your ${message.productName}: files + next step`
					: `Your ${message.productName} download`,
			html: renderHtml(message),
			text: renderText(message),
		});
		return { sent: true };
	} catch (error) {
		console.error(`Buzzyfly email: delivery send failed for order ${message.orderId} to ${message.to}`, error);
		return { sent: false, reason: `send failed: ${String(error)}` };
	}
}

/**
 * Tells the owner a done-for-you setup was bought, so the buyer isn't left
 * waiting on an inbox nobody is watching. No-op for every other product.
 * Never throws: the buyer's own delivery must not depend on it.
 */
export async function sendDoneForYouAlert(
	env: { EMAIL?: EmailBinding; EMAIL_FROM?: string },
	order: { provider: string; orderId: string; itemId: string; buyerEmail: string | null },
): Promise<void> {
	if (order.itemId !== DONE_FOR_YOU.productId) return;
	if (!env.EMAIL) {
		console.error(`Buzzyfly setup: NEW DONE-FOR-YOU ORDER ${order.orderId} (${order.buyerEmail ?? "no email"}) — EMAIL binding missing, no alert sent`);
		return;
	}
	const text = [
		"New done-for-you setup order.",
		"",
		`Buyer: ${order.buyerEmail ?? "no email on the order — check the payment provider"}`,
		`Order: ${order.provider} ${order.orderId}`,
		"",
		"They've been sent every file and the intake questions. Their answers will arrive at this address.",
		`Promised turnaround: ${DONE_FOR_YOU.turnaroundDays} working days from their answers, then a ${DONE_FOR_YOU.callMinutes}-minute handover call.`,
		"",
		"If they haven't sent answers in 2 days, nudge them by replying to their order email.",
	].join("\n");
	try {
		await env.EMAIL.send({
			from: resolveFrom(env),
			to: BUZZYFLY_CONFIG.orderEmail,
			subject: `New done-for-you setup order — ${order.buyerEmail ?? order.orderId}`,
			text,
		});
	} catch (error) {
		console.error(`Buzzyfly setup: owner alert failed for order ${order.orderId}`, error);
	}
}
