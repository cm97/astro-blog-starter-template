/**
 * Telegram bot, called directly through Telegram's free Bot API (no paid
 * middleman). Two jobs:
 *
 * 1. Sale alerts: the payment webhook sends the owner a message the moment an
 *    order is fulfilled. Goes to TELEGRAM_OWNER_CHAT_ID.
 * 2. Channel posts: the hourly cron posts each new blog article to the public
 *    Buzzyfly channel (TELEGRAM_CHANNEL_ID), one per run, to bring in readers.
 *
 * Setup (owner): create the bot with @BotFather, then
 *   npx wrangler secret put TELEGRAM_BOT_TOKEN
 *   npx wrangler secret put TELEGRAM_OWNER_CHAT_ID   (your numeric chat id)
 *   npx wrangler secret put TELEGRAM_CHANNEL_ID      (e.g. @buzzyfly, bot must be a channel admin)
 * With the token unset, everything here is a silent no-op.
 */

export interface TelegramEnv {
	TELEGRAM_BOT_TOKEN?: string;
	TELEGRAM_OWNER_CHAT_ID?: string;
	TELEGRAM_CHANNEL_ID?: string;
}

export interface TelegramResult {
	sent: boolean;
	reason?: string;
}

const API = "https://api.telegram.org";

/** Escapes text for Telegram's HTML parse mode (only &, < and > matter). */
export function escapeTelegram(text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** "jane.doe@gmail.com" -> "ja***@gmail.com": enough to recognise, not the full address. */
export function maskEmail(email: string | null | undefined): string {
	if (!email || !email.includes("@")) return "no email";
	const [user, domain] = email.split("@");
	return `${user.slice(0, 2)}***@${domain}`;
}

export async function sendTelegram(
	env: TelegramEnv,
	chatId: string | undefined,
	html: string,
	fetcher: typeof fetch = fetch,
): Promise<TelegramResult> {
	if (!env.TELEGRAM_BOT_TOKEN) return { sent: false, reason: "TELEGRAM_BOT_TOKEN not set" };
	if (!chatId) return { sent: false, reason: "no chat id set" };
	try {
		const res = await fetcher(`${API}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML" }),
		});
		if (res.ok) return { sent: true };
		// Never log the URL: it contains the bot token.
		const body = await res.text().catch(() => "");
		return { sent: false, reason: `Telegram ${res.status}: ${body.slice(0, 200)}` };
	} catch (error) {
		return { sent: false, reason: `Telegram request failed: ${(error as Error).message}` };
	}
}

export function saleAlertText(sale: {
	productTitle: string;
	price?: string;
	provider: string;
	orderId: string;
	customerEmail: string | null;
	source?: string | null;
	delivered: boolean;
}): string {
	const lines = [
		`💰 <b>New Buzzyfly sale</b>`,
		`${escapeTelegram(sale.productTitle)}${sale.price ? ` (${escapeTelegram(sale.price)})` : ""}`,
		`Buyer: ${escapeTelegram(maskEmail(sale.customerEmail))}`,
		`Order: ${escapeTelegram(sale.orderId)} via ${escapeTelegram(sale.provider)}`,
	];
	if (sale.source) lines.push(`Source: ${escapeTelegram(sale.source)}`);
	lines.push(sale.delivered ? "Delivery email: sent ✅" : "⚠️ Delivery email FAILED. Check the logs and resend.");
	return lines.join("\n");
}

/** Sends a sale alert to the owner. Never throws: a failed alert must not affect fulfillment. */
export async function notifySale(
	env: TelegramEnv,
	sale: Parameters<typeof saleAlertText>[0],
	fetcher: typeof fetch = fetch,
): Promise<TelegramResult> {
	const result = await sendTelegram(env, env.TELEGRAM_OWNER_CHAT_ID, saleAlertText(sale), fetcher);
	if (!result.sent && env.TELEGRAM_BOT_TOKEN) {
		console.error(`Buzzyfly Telegram: sale alert for ${sale.orderId} failed: ${result.reason}`);
	}
	return result;
}

export interface FeedItem {
	title: string;
	link: string;
	description: string;
	/** Milliseconds since epoch, 0 if the feed has no usable pubDate. */
	published: number;
}

/** Items from our RSS feed, in feed order. */
export function rssItems(xml: string): FeedItem[] {
	const decode = (s: string) =>
		s
			.replace(/^<!\[CDATA\[|\]\]>$/g, "")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#39;|&apos;/g, "'")
			.replace(/&amp;/g, "&")
			.trim();
	const field = (block: string, tag: string) => {
		const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
		return m ? decode(m[1]) : "";
	};
	const items: FeedItem[] = [];
	for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
		const link = field(m[1], "link");
		const published = Date.parse(field(m[1], "pubDate")) || 0;
		if (link) items.push({ title: field(m[1], "title"), link, description: field(m[1], "description"), published });
	}
	return items;
}

export function channelPostText(item: FeedItem): string {
	const description = item.description.length > 280 ? `${item.description.slice(0, 277)}...` : item.description;
	const lines = [`<b>${escapeTelegram(item.title)}</b>`];
	if (description) lines.push(escapeTelegram(description));
	lines.push("", escapeTelegram(item.link));
	return lines.join("\n");
}

const POSTS_TABLE = `CREATE TABLE IF NOT EXISTS telegram_posts (link TEXT PRIMARY KEY, posted_at INTEGER NOT NULL)`;

/**
 * Posts the oldest blog article the channel hasn't had yet. On the very first
 * run it records every existing article as already posted, so the channel
 * isn't flooded with the back catalogue. Returns the link posted, or null.
 */
export async function postNewArticleToChannel(
	env: TelegramEnv & { DB?: D1Database },
	assets: Fetcher,
	fetcher: typeof fetch = fetch,
): Promise<string | null> {
	if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHANNEL_ID || !env.DB) return null;
	const db = env.DB;
	await db.prepare(POSTS_TABLE).run();

	const res = await assets.fetch("https://buzzyfly.com/rss.xml");
	if (!res.ok) throw new Error(`rss.xml not readable (${res.status})`);
	const items = rssItems(await res.text());
	if (!items.length) return null;

	const known = await db.prepare(`SELECT link FROM telegram_posts`).all<{ link: string }>();
	const posted = new Set((known.results ?? []).map((r) => r.link));
	const now = Date.now();

	if (posted.size === 0) {
		await db.batch(
			items.map((i) => db.prepare(`INSERT OR IGNORE INTO telegram_posts (link, posted_at) VALUES (?, ?)`).bind(i.link, now)),
		);
		console.log(`Buzzyfly Telegram: channel start point set (${items.length} existing articles skipped)`);
		return null;
	}

	// Oldest unposted first, so the channel reads in publishing order.
	const next = items.filter((i) => !posted.has(i.link)).sort((a, b) => a.published - b.published)[0];
	if (!next) return null;

	const result = await sendTelegram(env, env.TELEGRAM_CHANNEL_ID, channelPostText(next), fetcher);
	if (!result.sent) throw new Error(`channel post failed: ${result.reason}`);
	await db.prepare(`INSERT OR IGNORE INTO telegram_posts (link, posted_at) VALUES (?, ?)`).bind(next.link, now).run();
	return next.link;
}
