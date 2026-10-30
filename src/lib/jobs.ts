/** One listing, in the shape the /jobs pages render. */
export interface JobListing {
	/** Stable number derived from the Himalayas job URL; used in /jobs/<id>. */
	id: number;
	/** The job's page on himalayas.app. Their terms require linking back to it. */
	url: string;
	title: string;
	company_name: string;
	job_type?: string;
	candidate_required_location?: string;
	salary?: string;
	category?: string;
	tags?: string[];
	publication_date?: string;
	/** Plain text, paragraphs separated by blank lines. Himalayas sends HTML; see htmlToText. */
	description?: string;
}

export interface JobsFeed {
	jobs: JobListing[];
	fetchedAt: number | null;
}

/** The fields we read from a Himalayas job (https://github.com/Himalayas-App/remote-jobs-api). */
interface HimalayasJob {
	title?: string;
	companyName?: string;
	employmentType?: string;
	minSalary?: number | null;
	maxSalary?: number | null;
	salaryPeriod?: string;
	currency?: string;
	seniority?: string[];
	locationRestrictions?: string[];
	categories?: string[];
	parentCategories?: string[];
	description?: string;
	/** Unix seconds. */
	pubDate?: number;
	applicationLink?: string;
	guid?: string;
}

// Himalayas' API is free for commercial use as long as each listing links back
// to its himalayas.app page and Himalayas is credited as the source. Remotive's
// free API forbids showing its jobs behind a sign-up or paywall, which /jobs has.
const HIMALAYAS_URL = "https://himalayas.app/jobs/api";
// The API returns at most 20 jobs per request.
const PAGE_SIZE = 20;
const PAGES = 5;

// Himalayas refreshes its data once a day, so the list is stored in D1 and
// only re-fetched twice a day.
const REFRESH_AFTER_MS = 12 * 60 * 60 * 1000;

// Stored in the shared `site_content` key/value table. The settings module only
// reads its own keys from that table, so this row doesn't interfere with it.
const CACHE_KEY = "jobs_feed_himalayas_v1";

// Descriptions are stored with the list in one D1 row, so each is capped.
const MAX_DESCRIPTION_CHARS = 6000;

// After a failed fetch, don't call Himalayas again from this isolate for a while.
// Without this, a stale cache plus an outage means every page view hits their API.
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

/** FNV-1a: a short, stable number for a job URL, so /jobs/<id> links keep working across refreshes. */
function jobId(key: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < key.length; i++) {
		hash ^= key.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

const SALARY_PERIODS: Record<string, string> = { annual: "year", monthly: "month", hourly: "hour" };

function formatSalary(job: HimalayasJob): string | undefined {
	const amounts = [job.minSalary, job.maxSalary].filter((n): n is number => typeof n === "number" && n > 0);
	if (amounts.length === 0) return undefined;
	const money = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
	const range = amounts.length === 2 && amounts[0] !== amounts[1] ? `${money(amounts[0])}–${money(amounts[1])}` : money(amounts[0]);
	const period = job.salaryPeriod ? SALARY_PERIODS[job.salaryPeriod] : undefined;
	return `${range} ${job.currency || "USD"}${period ? ` / ${period}` : ""}`;
}

function formatLocation(places: string[] | undefined): string {
	if (!Array.isArray(places) || places.length === 0) return "Worldwide";
	return places.length > 4 ? `${places.slice(0, 4).join(", ")} +${places.length - 4} more` : places.join(", ");
}

function toListing(job: HimalayasJob): JobListing | null {
	const url = isWebUrl(job.applicationLink) ? job.applicationLink : isWebUrl(job.guid) ? job.guid : null;
	if (!url || !job.title || !job.companyName) return null;
	const pubDate = typeof job.pubDate === "number" ? new Date(job.pubDate * 1000) : null;
	const tags = [...(job.seniority ?? []), ...(job.categories ?? []).map((c) => c.replace(/-/g, " "))];
	return {
		id: jobId(job.guid || url),
		url,
		title: job.title,
		company_name: job.companyName,
		job_type: job.employmentType || undefined,
		candidate_required_location: formatLocation(job.locationRestrictions),
		salary: formatSalary(job),
		category: job.parentCategories?.[0],
		tags: tags.length ? tags.slice(0, 8) : undefined,
		publication_date: pubDate && Number.isFinite(pubDate.getTime()) ? pubDate.toISOString() : undefined,
		description: htmlToText(job.description),
	};
}

async function fetchFromHimalayas(): Promise<JobListing[] | null> {
	if (Date.now() - lastFailureAt < RETRY_AFTER_FAILURE_MS) return null;
	const jobs: JobListing[] = [];
	const seen = new Set<number>();
	try {
		// One page at a time, newest first, to stay well inside their rate limit.
		for (let page = 0; page < PAGES; page++) {
			const response = await fetch(`${HIMALAYAS_URL}?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, {
				headers: { Accept: "application/json" },
			});
			if (!response.ok) throw new Error(`Himalayas responded ${response.status}`);
			const data = (await response.json()) as { jobs?: HimalayasJob[] };
			const batch = Array.isArray(data.jobs) ? data.jobs : [];
			for (const raw of batch) {
				const listing = raw ? toListing(raw) : null;
				if (listing && !seen.has(listing.id)) {
					seen.add(listing.id);
					jobs.push(listing);
				}
			}
			if (batch.length < PAGE_SIZE) break;
		}
		return jobs;
	} catch (error) {
		console.error("Buzzyfly jobs: failed to fetch from Himalayas", error);
		// A later page failing still leaves a usable list; only a total failure backs off.
		if (jobs.length > 0) return jobs;
		lastFailureAt = Date.now();
		return null;
	}
}

/** Remote job listings, served from D1 and refreshed from Himalayas at most every twelve hours. */
export async function getJobsFeed(env: Env): Promise<JobsFeed> {
	if (!env.DB) {
		const jobs = await fetchFromHimalayas();
		return { jobs: jobs ?? [], fetchedAt: jobs ? Date.now() : null };
	}

	let cached: JobsFeed | null = null;
	try {
		const row = await env.DB.prepare(`SELECT value, updated_at FROM site_content WHERE key = ?`)
			.bind(CACHE_KEY)
			.first<{ value: string; updated_at: number }>();
		if (row) {
			const stored = JSON.parse(row.value) as JobListing[];
			cached = { jobs: stored.filter((job) => isWebUrl(job.url)), fetchedAt: row.updated_at };
		}
	} catch (error) {
		console.error("Buzzyfly jobs: failed to read cached jobs from D1", error);
	}

	if (cached?.fetchedAt && Date.now() - cached.fetchedAt < REFRESH_AFTER_MS) return cached;

	const fresh = await fetchFromHimalayas();
	// If Himalayas is down, keep showing the last list we had rather than an empty page.
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
export async function getJob(env: Env, id: number): Promise<{ job: JobListing; index: number } | null> {
	const { jobs } = await getJobsFeed(env);
	const index = jobs.findIndex((job) => job.id === id);
	return index === -1 ? null : { job: jobs[index], index };
}
