/**
 * IndexNow: tells Bing, Yahoo, DuckDuckGo, Yandex and other participating
 * search engines about our pages. Google is not part of IndexNow.
 *
 * The Worker's hourly cron calls submitSitemapToIndexNow(); it only does any
 * work once a week (Monday, 06:00 UTC), when it reads the built sitemap from
 * static assets and submits every URL in one request. The key file that
 * proves we own the site is public/<INDEXNOW_KEY>.txt.
 */

export const INDEXNOW_KEY = "673ef3d149a75388065f766b7b7a90bc";
export const INDEXNOW_HOST = "buzzyfly.com";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const SITEMAP_URL = `https://${INDEXNOW_HOST}/sitemap-0.xml`;
// IndexNow accepts up to 10,000 URLs per request.
const MAX_URLS = 10_000;

/** True for the one hourly cron run each week that should submit. */
export function isIndexNowRun(scheduledTime: number): boolean {
	const d = new Date(scheduledTime);
	return d.getUTCDay() === 1 && d.getUTCHours() === 6;
}

/** Every <loc> on our own host from a sitemap, de-duplicated, in order. */
export function sitemapUrls(xml: string): string[] {
	const seen = new Set<string>();
	for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
		const url = match[1].replace(/&amp;/g, "&");
		try {
			if (new URL(url).hostname === INDEXNOW_HOST) seen.add(url);
		} catch {
			// not a URL: skip it
		}
	}
	return [...seen].slice(0, MAX_URLS);
}

export function indexNowPayload(urls: string[]) {
	return {
		host: INDEXNOW_HOST,
		key: INDEXNOW_KEY,
		keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
		urlList: urls,
	};
}

/**
 * Reads the sitemap from static assets and submits it. Returns the IndexNow
 * HTTP status (200 or 202 mean accepted), or null if there was nothing to send.
 */
export async function submitSitemapToIndexNow(assets: Fetcher, fetcher: typeof fetch = fetch): Promise<number | null> {
	const res = await assets.fetch(SITEMAP_URL);
	if (!res.ok) throw new Error(`sitemap not readable (${res.status})`);
	const urls = sitemapUrls(await res.text());
	if (!urls.length) return null;
	const sent = await fetcher(INDEXNOW_ENDPOINT, {
		method: "POST",
		headers: { "content-type": "application/json; charset=utf-8" },
		body: JSON.stringify(indexNowPayload(urls)),
	});
	if (sent.status !== 200 && sent.status !== 202) {
		throw new Error(`IndexNow refused ${urls.length} URLs (${sent.status})`);
	}
	return sent.status;
}
