export interface RemotiveJob {
	id: number;
	url: string;
	title: string;
	company_name: string;
	job_type?: string;
	candidate_required_location?: string;
	salary?: string;
	category?: string;
	tags?: string[];
	publication_date?: string;
	/** Plain text, paragraphs separated by blank lines. Remotive sends HTML; see htmlToText. */
	description?: string;
}

export interface JobsFeed {
	jobs: RemotiveJob[];
	fetchedAt: number | null;
}

const REMOTIVE_URL = "https://remotive.com/api/remote-jobs?limit=100";

// Remotive asks API users to keep requests to a handful per day, so the list is
// stored in D1 and only re-fetched once it is older than this.
const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000;

// Stored in the shared `site_content` key/value table. The settings module only
// reads its own keys from that table, so this row doesn't interfere with it.
// v2 adds descriptions for the /jobs/<id> pages.
const CACHE_KEY = "jobs_feed_remotive_v2";

// Descriptions are stored with the list in one D1 row, so each is capped.
const MAX_DESCRIPTION_CHARS = 6000;

// After a failed fetch, don't call Remotive again from this isolate for a while.
// Without this, a stale cache plus a Remotive outage means every page view hits
// Remotive, which is exactly what their rate limit asks us not to do.
const RETRY_AFTER_FAILURE_MS = 15 * 60 * 1000;
let lastFailureAt = 0;

// Listing links come from a third-party feed, so only plain web links are rendered.
function isWebUrl(value: unknown): value is string {
	if (typeof value !== "string") return false;
	try {
		const { protocol } = new URL(value);
		return protocol === "https:" || protocol === "http:";
	} catch {
		return false;
	}
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/**
 * Turns a listing's HTML description into plain text. The HTML comes from a
 * third party, so it is never rendered as HTML: the page prints this text,
 * which Astro escapes. Block tags become line breaks so paragraphs and bullet
 * lists survive.
 */
export function htmlToText(html: string | undefined): string {
	if (!html) return "";
	const text = html
		.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
		.replace(/<li[^>]*>/gi, "\n• ")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/(p|div|h[1-6]|ul|ol|blockquote|tr)>/gi, "\n\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
			if (code[0] === "#") {
				const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
				return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
			}
			return ENTITIES[code.toLowerCase()] ?? match;
		})
		.replace(/[ \t]+/g, " ")
		.replace(/ *\n */g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
	return text.length > MAX_DESCRIPTION_CHARS ? `${text.slice(0, MAX_DESCRIPTION_CHARS).trimEnd()}…` : text;
}

async function fetchFromRemotive(): Promise<RemotiveJob[] | null> {
	if (Date.now() - lastFailureAt < RETRY_AFTER_FAILURE_MS) return null;
	try {
		const response = await fetch(REMOTIVE_URL, { headers: { Accept: "application/json" } });
		if (!response.ok) throw new Error(`Remotive responded ${response.status}`);
		const data = (await response.json()) as { jobs?: (RemotiveJob & { description?: string })[] };
		// Keep only what the pages show, with the HTML description reduced to plain text.
		return (data.jobs ?? [])
			.filter((job) => job && job.title && job.company_name && isWebUrl(job.url))
			.map((job) => ({
				id: job.id,
				url: job.url,
				title: job.title,
				company_name: job.company_name,
				job_type: job.job_type,
				candidate_required_location: job.candidate_required_location,
				salary: job.salary,
				category: job.category,
				tags: Array.isArray(job.tags) ? job.tags.slice(0, 8) : undefined,
				publication_date: job.publication_date,
				description: htmlToText(job.description),
			}));
	} catch (error) {
		lastFailureAt = Date.now();
		console.error("Buzzyfly jobs: failed to fetch from Remotive", error);
		return null;
	}
}

/** Remote job listings, served from D1 and refreshed from Remotive at most every six hours. */
export async function getJobsFeed(env: Env): Promise<JobsFeed> {
	if (!env.DB) {
		const jobs = await fetchFromRemotive();
		return { jobs: jobs ?? [], fetchedAt: jobs ? Date.now() : null };
	}

	let cached: JobsFeed | null = null;
	try {
		const row = await env.DB.prepare(`SELECT value, updated_at FROM site_content WHERE key = ?`)
			.bind(CACHE_KEY)
			.first<{ value: string; updated_at: number }>();
		if (row) {
			const stored = JSON.parse(row.value) as RemotiveJob[];
			cached = { jobs: stored.filter((job) => isWebUrl(job.url)), fetchedAt: row.updated_at };
		}
	} catch (error) {
		console.error("Buzzyfly jobs: failed to read cached jobs from D1", error);
	}

	if (cached?.fetchedAt && Date.now() - cached.fetchedAt < REFRESH_AFTER_MS) return cached;

	const fresh = await fetchFromRemotive();
	// If Remotive is down, keep showing the last list we had rather than an empty page.
	if (!fresh) return cached ?? { jobs: [], fetchedAt: null };

	const now = Date.now();
	try {
		await env.DB.prepare(
			`INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, ?)
			 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
		)
			.bind(CACHE_KEY, JSON.stringify(fresh), now)
			.run();
	} catch (error) {
		console.error("Buzzyfly jobs: failed to cache jobs in D1", error);
	}
	return { jobs: fresh, fetchedAt: now };
}

/** One listing and its position in the feed (the first FREE_JOBS_PREVIEW are open to everyone). */
export async function getJob(env: Env, id: number): Promise<{ job: RemotiveJob; index: number } | null> {
	const { jobs } = await getJobsFeed(env);
	const index = jobs.findIndex((job) => job.id === id);
	return index === -1 ? null : { job: jobs[index], index };
}
