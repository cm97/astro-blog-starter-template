import { BUZZYFLY_CONFIG, ALL_PRODUCTS, UPSELL_MAP, absoluteBuyUrl } from "../data/monetization";

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

function renderHtml({ downloadUrl, productName, itemId }: DeliveryEmail): string {
	const upsellId = itemId ? UPSELL_MAP[itemId] : null;
	const upsellProduct = upsellId ? ALL_PRODUCTS.find((p) => p.id === upsellId) : null;

	const upsellBlock = upsellProduct
		? `<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#16191c">One more thing</p>
    <p style="margin:0 0 16px;color:#6b6a64;font-size:14px">
      You have <strong>${escapeHtml(productName)}</strong>. The logical next piece is the
      <strong>${escapeHtml(upsellProduct.title)}</strong>. ${escapeHtml(upsellProduct.description)}
      Same refund rule: 30-day refund if you can't access the app or it isn't as described.
    </p>
    <p style="margin:0">
      <a href="${absoluteBuyUrl(upsellProduct)}" style="display:inline-block;background:#374151;color:#fff;text-decoration:none;padding:10px 20px;border-radius:4px;font-weight:600;font-size:14px">
        Get ${escapeHtml(upsellProduct.title)} — ${upsellProduct.price}
      </a>
    </p>`
		: "";

	return `<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#16191c;max-width:520px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;margin:0 0 16px">Your app is ready</h1>
    <p style="margin:0 0 16px">Thanks for buying <strong>${escapeHtml(productName)}</strong>.</p>
    <p style="margin:0 0 24px">
      <a href="${downloadUrl}" style="display:inline-block;background:#1f4d3a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:600">Open the app</a>
    </p>
    <p style="margin:0 0 16px;color:#6b6a64;font-size:14px">
      This is your personal access link. Keep this email. Open the link once on each
      phone or computer you want to use. Nothing to download or install.
    </p>
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
		"Open the app:",
		downloadUrl,
		"",
		"This is your personal access link. Keep this email. Open the link once on each phone or computer you want to use. Nothing to download or install.",
	];

	if (upsellProduct) {
		lines.push(
			"",
			"---",
			"",
			`You have ${productName}. The logical next piece is the ${upsellProduct.title}.`,
			upsellProduct.description,
			"Same refund rule: 30-day refund if you can't access the app or it isn't as described.",
			`Get it here (${upsellProduct.price}): ${absoluteBuyUrl(upsellProduct)}`,
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
		headers?: Record<string, string>;
	}): Promise<{ messageId: string }>;
}

// Must match `send_email[0].allowed_sender_addresses` in wrangler.json. The
// binding rejects any other From address at runtime, so a typo in EMAIL_FROM
// would otherwise fail every send.
export const ALLOWED_SENDERS = ["orders@buzzyfly.com", "hello@buzzyfly.com", "support@buzzyfly.com"];
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
      <a href="${absoluteBuyUrl(upsellProduct)}" style="display:inline-block;background:#374151;color:#fff;text-decoration:none;padding:10px 20px;border-radius:4px;font-weight:600;font-size:14px">
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
      You got <strong>${escapeHtml(productName)}</strong> a couple of days ago.
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
		`You got ${productName} a couple of days ago. Did it do what you needed it to?`,
		"",
		"If anything's not working or unclear, reply here and you'll get a person, not a ticket.",
	];

	if (upsellProduct) {
		lines.push(
			"",
			`If it's working, the next piece is the ${upsellProduct.title} (${upsellProduct.price}):`,
			`${absoluteBuyUrl(upsellProduct)}`,
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
			subject: `Your ${message.productName} access link`,
			html: renderHtml(message),
			text: renderText(message),
		});
		return { sent: true };
	} catch (error) {
		console.error(`Buzzyfly email: delivery send failed for order ${message.orderId} to ${message.to}`, error);
		return { sent: false, reason: `send failed: ${String(error)}` };
	}
}

export interface DropWelcomeEmail {
	to: string;
	unlockUrl: string;
	orderId: string;
}

/**
 * Welcome email for a new Monthly Drop subscriber. Unlike the download email,
 * the link opens the web app at /drop and keeps working while the
 * subscription is active, so there is no expiry warning.
 */
export async function sendDropWelcomeEmail(
	message: DropWelcomeEmail,
	env: { EMAIL?: EmailBinding; EMAIL_FROM?: string },
): Promise<EmailResult> {
	if (!env.EMAIL) return { sent: false, reason: "EMAIL binding is not configured in wrangler.json" };
	if (!message.to) return { sent: false, reason: "no customer email on the order" };

	const brand = escapeHtml(BUZZYFLY_CONFIG.brandName);
	const html = `<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#16191c;max-width:520px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;margin:0 0 16px">Your Monthly Drop is ready</h1>
    <p style="margin:0 0 16px">Thanks for subscribing to the <strong>Buzzyfly Monthly Drop</strong>.</p>
    <p style="margin:0 0 24px">
      <a href="${message.unlockUrl}" style="display:inline-block;background:#1f4d3a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:600">Open the Monthly Drop app</a>
    </p>
    <p style="margin:0 0 16px;font-size:14px">
      It works on any phone, tablet or computer. When it opens, tap <strong>Install app</strong> to put the
      Buzzyfly icon on your home screen. After that, tap the icon to open it like any other app.
      Your work saves automatically and follows you to any device you open this link on.
    </p>
    <p style="margin:0 0 16px;font-size:14px">
      This month: five year-end client emails that write themselves, the Q4 weekly reset,
      a client working agreement, and the year-end client review.
    </p>
    <p style="margin:0 0 16px;color:#6b6a64;font-size:14px">
      Keep this email. The link is your key. A new drop is added to the app each month.
      To cancel, reply to this email.
    </p>
    <p style="margin:24px 0 0;color:#6b6a64;font-size:14px">— ${brand}</p>
  </body>
</html>`;
	const text = [
		"Thanks for subscribing to the Buzzyfly Monthly Drop.",
		"",
		"Open the Monthly Drop app:",
		message.unlockUrl,
		"",
		"It works on any phone, tablet or computer. When it opens, tap Install app to put the Buzzyfly icon on your home screen. After that, tap the icon to open it like any other app. Your work saves automatically and follows you to any device you open this link on.",
		"",
		"This month: five year-end client emails that write themselves, the Q4 weekly reset, a client working agreement, and the year-end client review.",
		"",
		"Keep this email. The link is your key. A new drop is added to the app each month. To cancel, reply to this email.",
		"",
		`— ${BUZZYFLY_CONFIG.brandName}`,
	].join("\n");

	try {
		await env.EMAIL.send({
			from: resolveFrom(env),
			to: message.to,
			subject: "Your Buzzyfly Monthly Drop is ready",
			html,
			text,
		});
		return { sent: true };
	} catch (error) {
		console.error(`Buzzyfly email: drop welcome send failed for order ${message.orderId} to ${message.to}`, error);
		return { sent: false, reason: `send failed: ${String(error)}` };
	}
}

export interface JobsWelcomeEmail {
	to: string;
	unlockUrl: string;
	orderId: string;
}

/**
 * Welcome email for a new Jobs member. The thank-you page already unlocks
 * /jobs in the browser they paid in; this link is for their other devices.
 */
export async function sendJobsWelcomeEmail(
	message: JobsWelcomeEmail,
	env: { EMAIL?: EmailBinding; EMAIL_FROM?: string },
): Promise<EmailResult> {
	if (!env.EMAIL) return { sent: false, reason: "EMAIL binding is not configured in wrangler.json" };
	if (!message.to) return { sent: false, reason: "no customer email on the order" };

	const brand = escapeHtml(BUZZYFLY_CONFIG.brandName);
	const support = escapeHtml(BUZZYFLY_CONFIG.supportEmail);
	const html = `<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#16191c;max-width:520px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;margin:0 0 16px">Your Buzzyfly Jobs membership is active</h1>
    <p style="margin:0 0 16px">Thanks for joining. The full remote jobs board is open in the browser you paid in.</p>
    <p style="margin:0 0 24px">
      <a href="${message.unlockUrl}" style="display:inline-block;background:#2337ff;color:#fff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:600">Open the jobs board</a>
    </p>
    <p style="margin:0 0 16px;font-size:14px">
      Open this link once on each phone or computer you want to use. Keep this email. The link is your key.
    </p>
    <p style="margin:0 0 16px;color:#6b6a64;font-size:14px">
      Your membership renews monthly until you cancel. To cancel, email ${support} and we stop it before your next billing date.
    </p>
    <p style="margin:24px 0 0;color:#6b6a64;font-size:14px">— ${brand}</p>
  </body>
</html>`;
	const text = [
		"Your Buzzyfly Jobs membership is active.",
		"",
		"Thanks for joining. The full remote jobs board is open in the browser you paid in.",
		"",
		"Open the jobs board on any other device:",
		message.unlockUrl,
		"",
		"Open this link once on each phone or computer you want to use. Keep this email. The link is your key.",
		"",
		`Your membership renews monthly until you cancel. To cancel, email ${BUZZYFLY_CONFIG.supportEmail} and we stop it before your next billing date.`,
		"",
		`— ${BUZZYFLY_CONFIG.brandName}`,
	].join("\n");

	try {
		await env.EMAIL.send({
			from: resolveFrom(env),
			to: message.to,
			subject: "Your Buzzyfly Jobs membership is active",
			html,
			text,
		});
		return { sent: true };
	} catch (error) {
		console.error(`Buzzyfly email: jobs welcome send failed for order ${message.orderId} to ${message.to}`, error);
		return { sent: false, reason: `send failed: ${String(error)}` };
	}
}
