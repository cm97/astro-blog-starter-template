export interface RemotiveJob {
	id: number;
	url: string;
	title: string;
	company_name: string;
	job_type?: string;
	candidate_required_location?: string;
	salary?: string;
}

export interface JobsFeed {
	jobs: RemotiveJob[];
	fetchedAt: number | null;
}

const REMOTIVE_URL = "https://remotive.com/api/remote-jobs?limit=25";

// Remotive asks API users to keep requests to a handful per day, so the list is
// stored in D1 and only re-fetched once it is older than this.
const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000;

// Stored in the shared `site_content` key/value table. The settings module only
// reads its own keys from that table, so this row doesn't interfere with it.
const CACHE_KEY = "jobs_feed_remotive";

async function fetchFromRemotive(): Promise<RemotiveJob[] | null> {
	try {
		const response = await fetch(REMOTIVE_URL);
		if (!response.ok) return null;
		const data = (await response.json()) as { jobs?: RemotiveJob[] };
		// Keep only what the page shows; the full payload includes long HTML descriptions.
		return (data.jobs ?? []).map((job) => ({
			id: job.id,
			url: job.url,
			title: job.title,
			company_name: job.company_name,
			job_type: job.job_type,
			candidate_required_location: job.candidate_required_location,
			salary: job.salary,
		}));
	} catch (error) {
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
		if (row) cached = { jobs: JSON.parse(row.value) as RemotiveJob[], fetchedAt: row.updated_at };
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
