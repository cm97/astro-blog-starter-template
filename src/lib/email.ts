import { BUZZYFLY_CONFIG, ALL_PRODUCTS, UPSELL_MAP } from "../data/monetization";

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

function escapeHtml(value: string): string {
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
      Customers who bought <strong>${escapeHtml(productName)}</strong> often grab the
      <strong>${escapeHtml(upsellProduct.title)}</strong> next — it's the logical next piece.
    </p>
    <p style="margin:0">
      <a href="${upsellProduct.stripeUrl}" style="display:inline-block;background:#374151;color:#fff;text-decoration:none;padding:10px 20px;border-radius:4px;font-weight:600;font-size:14px">
        Get ${escapeHtml(upsellProduct.title)} — ${upsellProduct.price}
      </a>
    </p>`
		: "";

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

	if (upsellProduct) {
		lines.push(
			"",
			"---",
			"",
			`Customers who bought ${productName} often grab the ${upsellProduct.title} next.`,
			`Get it here (${upsellProduct.price}): ${upsellProduct.stripeUrl}`,
		);
	}

	lines.push("", `— ${BUZZYFLY_CONFIG.brandName}`);
	return lines.join("\n");
}

export interface WelcomeEmail {
	to: string;
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

function resolveFrom(env: { EMAIL_FROM?: string }): string {
	return env.EMAIL_FROM ?? `${BUZZYFLY_CONFIG.brandName} <orders@buzzyfly.com>`;
}

export async function sendWelcomeEmail(
	message: WelcomeEmail,
	env: { EMAIL?: EmailBinding; EMAIL_FROM?: string },
): Promise<EmailResult> {
	if (!env.EMAIL) return { sent: false, reason: "EMAIL binding not configured" };
	if (!message.to) return { sent: false, reason: "no email address" };

	const freeChecklistUrl = `${BUZZYFLY_CONFIG.siteUrl}/blog/weekly-reset-checklist/`;
	const from = resolveFrom(env);
	const subject = "Your free checklist is here";

	const html = `<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#16191c;max-width:520px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;margin:0 0 16px">Your 20-minute weekly reset checklist</h1>
    <p style="margin:0 0 16px">Thanks for signing up. Here's the checklist:</p>
    <p style="margin:0 0 24px">
      <a href="${freeChecklistUrl}" style="display:inline-block;background:#1f4d3a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:600">Open the checklist</a>
    </p>
    <p style="margin:0 0 16px;color:#6b6a64;font-size:14px">
      The checklist is the same one inside the paid Weekly Reset Checklist product — the
      difference is the paid version adds the inbox-clearing routine, mid-week check-in, and
      priority-setting template so the whole week stays on track, not just Monday morning.
    </p>
    <p style="margin:0 0 16px;color:#6b6a64;font-size:14px">
      If the checklist helps, the full version is <a href="https://buy.stripe.com/5kQ7sNdxub3o0sk1lcaVa05" style="color:#1f4d3a">$15</a>.
      No pressure — just letting you know it exists.
    </p>
    <p style="margin:0;color:#6b6a64;font-size:14px">— ${escapeHtml(BUZZYFLY_CONFIG.brandName)}</p>
  </body>
</html>`;

	const text = [
		"Your 20-minute weekly reset checklist",
		"",
		"Thanks for signing up. Here's the checklist:",
		freeChecklistUrl,
		"",
		"The checklist is the same one inside the paid Weekly Reset Checklist product — the difference is the paid version adds the inbox-clearing routine, mid-week check-in, and priority-setting template so the whole week stays on track, not just Monday morning.",
		"",
		"If the checklist helps, the full version is $15: https://buy.stripe.com/5kQ7sNdxub3o0sk1lcaVa05",
		"",
		`— ${BUZZYFLY_CONFIG.brandName}`,
	].join("\n");

	try {
		await env.EMAIL.send({ from, to: message.to, subject, html, text });
		return { sent: true };
	} catch (error) {
		return { sent: false, reason: `send failed: ${String(error)}` };
	}
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
      It's what most people grab next.
    </p>
    <p style="margin:0">
      <a href="${upsellProduct.stripeUrl}" style="display:inline-block;background:#374151;color:#fff;text-decoration:none;padding:10px 20px;border-radius:4px;font-weight:600;font-size:14px">
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
			upsellProduct.stripeUrl,
		);
	}

	lines.push("", `— ${BUZZYFLY_CONFIG.brandName}`);
	const text = lines.join("\n");

	try {
		await env.EMAIL.send({ from, to: message.to, subject, html, text });
		return { sent: true };
	} catch (error) {
		return { sent: false, reason: `send failed: ${String(error)}` };
	}
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

export interface AiLoginEmail {
	to: string;
	loginUrl: string;
	/** True right after checkout, false when the subscriber asked to sign in again. */
	welcome: boolean;
}

/** Emails a Buzzyfly AI Pro subscriber a one-time sign-in link. */
export async function sendAiLoginEmail(
	message: AiLoginEmail,
	env: { EMAIL?: EmailBinding; EMAIL_FROM?: string },
): Promise<EmailResult> {
	if (!env.EMAIL) return { sent: false, reason: "EMAIL binding not configured" };
	if (!message.to) return { sent: false, reason: "no email address" };

	const from = resolveFrom(env);
	const subject = message.welcome
		? "Welcome to Buzzyfly AI Pro — sign in here"
		: "Your Buzzyfly AI sign-in link";
	const intro = message.welcome
		? "Thanks for subscribing to Buzzyfly AI Pro. Click below to unlock Pro on this device."
		: "Here's your link to sign in to Buzzyfly AI Pro.";

	const html = `<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#16191c;max-width:520px;margin:0 auto;padding:24px">
    <p style="margin:0 0 16px">${escapeHtml(intro)}</p>
    <p style="margin:0 0 24px">
      <a href="${message.loginUrl}" style="display:inline-block;background:#1f4d3a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:600">Sign in to Buzzyfly AI</a>
    </p>
    <p style="margin:0 0 16px;color:#6b6a64;font-size:14px">
      The link works once and expires in 24 hours. On another device, use
      "Already subscribed?" on ${escapeHtml(BUZZYFLY_CONFIG.siteUrl)}/ai to get a new one.
    </p>
    <p style="margin:24px 0 0;color:#6b6a64;font-size:14px">— ${escapeHtml(BUZZYFLY_CONFIG.brandName)}</p>
  </body>
</html>`;

	const text = [
		intro,
		"",
		message.loginUrl,
		"",
		`The link works once and expires in 24 hours. On another device, use "Already subscribed?" on ${BUZZYFLY_CONFIG.siteUrl}/ai to get a new one.`,
		"",
		`— ${BUZZYFLY_CONFIG.brandName}`,
	].join("\n");

	try {
		await env.EMAIL.send({ from, to: message.to, subject, html, text });
		return { sent: true };
	} catch (error) {
		return { sent: false, reason: `send failed: ${String(error)}` };
	}
}
