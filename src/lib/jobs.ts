export interface JobListing {
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
	/** Plain text, paragraphs separated by blank lines. The feed sends HTML; see htmlToText. */
	description?: string;
}

export interface JobsFeed {
	jobs: JobListing[];
	fetchedAt: number | null;
}

// Jobs come from Jobicy's free API. Its terms allow commercial and subscription
// job boards, as long as Jobicy is credited with a link and Apply goes to the
// listing's own Jobicy URL (https://jobicy.com/jobs-rss-feed).
// Remotive was dropped on 2026-11-01: its feed was down to 12 jobs, a day late,
// and its terms forbid putting its listings behind a signup.
const JOBICY_URL = "https://jobicy.com/api/v2/remote-jobs?count=100";

// Jobicy asks for no more than one fetch an hour, so the list is stored in D1
// and only re-fetched once it is older than this.
const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000;

// Stored in the shared `site_content` key/value table. The settings module only
// reads its own keys from that table, so this row doesn't interfere with it.
// v3 switches the source to Jobicy (new IDs), so the old Remotive rows are ignored.
const CACHE_KEY = "jobs_feed_jobicy_v3";

// Descriptions are stored with the list in one D1 row, so each is capped.
const MAX_DESCRIPTION_CHARS = 6000;

// After a failed fetch, don't call the feed again from this isolate for a while.
// Without this, a stale cache plus a feed outage means every page view hits
// the feed, which is exactly what its rate limit asks us not to do.
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

interface JobicyJob {
	id: number;
	url: string;
	jobTitle?: string;
	companyName?: string;
	jobIndustry?: string[];
	jobType?: string[];
	jobGeo?: string;
	jobDescription?: string;
	pubDate?: string;
	salaryMin?: number;
	salaryMax?: number;
	salaryCurrency?: string;
	salaryPeriod?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$" };

/** "$215k–$230k/year" from Jobicy's salary fields, or undefined when none are given. */
export function formatSalary(job: Pick<JobicyJob, "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod">): string | undefined {
	const amounts = [job.salaryMin, job.salaryMax].filter((n): n is number => typeof n === "number" && n > 0);
	if (amounts.length === 0) return undefined;
	const symbol = CURRENCY_SYMBOLS[job.salaryCurrency ?? ""] ?? (job.salaryCurrency ? `${job.salaryCurrency} ` : "");
	const short = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k`.replace(".0k", "k") : String(n));
	const range = [...new Set(amounts)].map((n) => `${symbol}${short(n)}`).join("–");
	const period = { yearly: "/year", monthly: "/month", hourly: "/hour", weekly: "/week", daily: "/day" }[job.salaryPeriod ?? ""] ?? "";
	return range + period;
}

/** Maps one Jobicy listing onto the shape the pages use. Returns null for listings the pages can't show. */
export function fromJobicy(job: JobicyJob): JobListing | null {
	if (!job || typeof job.id !== "number" || !isWebUrl(job.url)) return null;
	const title = htmlToText(job.jobTitle);
	const company = htmlToText(job.companyName);
	if (!title || !company) return null;
	const industries = (Array.isArray(job.jobIndustry) ? job.jobIndustry : []).map((i) => htmlToText(i)).filter(Boolean);
	const type = Array.isArray(job.jobType) && job.jobType[0] ? job.jobType[0].toLowerCase().replace(/[\s-]+/g, "_") : undefined;
	return {
		id: job.id,
		url: job.url,
		title,
		company_name: company,
		job_type: type,
		candidate_required_location: job.jobGeo ? htmlToText(job.jobGeo) : undefined,
		salary: formatSalary(job),
		category: industries[0],
		tags: industries.slice(0, 8),
		publication_date: job.pubDate,
		description: htmlToText(job.jobDescription),
	};
}

async function fetchFromJobicy(): Promise<JobListing[] | null> {
	if (Date.now() - lastFailureAt < RETRY_AFTER_FAILURE_MS) return null;
	try {
		const response = await fetch(JOBICY_URL, { headers: { Accept: "application/json" } });
		if (!response.ok) throw new Error(`Jobicy responded ${response.status}`);
		const data = (await response.json()) as { jobs?: JobicyJob[] };
		const jobs = (data.jobs ?? []).map(fromJobicy).filter((job): job is JobListing => job !== null);
		// An empty answer would wipe the cached list, so treat it as a failed fetch.
		if (jobs.length === 0) throw new Error("Jobicy returned no jobs");
		return jobs;
	} catch (error) {
		lastFailureAt = Date.now();
		console.error("Buzzyfly jobs: failed to fetch from Jobicy", error);
		return null;
	}
}

/** Remote job listings, served from D1 and refreshed from Jobicy at most every six hours. */
export async function getJobsFeed(env: Env): Promise<JobsFeed> {
	if (!env.DB) {
		const jobs = await fetchFromJobicy();
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

	const fresh = await fetchFromJobicy();
	// If Jobicy is down, keep showing the last list we had rather than an empty page.
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
