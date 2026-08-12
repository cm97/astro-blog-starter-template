// Thin wrapper around the GitHub Contents API so the admin console can commit
// blog post and site-config changes straight to this repo. Optional: every
// caller checks `getGitHubConfig()` first and degrades to read-only when it's
// not configured (no GITHUB_TOKEN/OWNER/REPO set).

export interface GitHubConfig {
	token: string;
	owner: string;
	repo: string;
	branch: string;
}

export function getGitHubConfig(env: Env): GitHubConfig | null {
	if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) return null;
	return {
		token: env.GITHUB_TOKEN,
		owner: env.GITHUB_OWNER,
		repo: env.GITHUB_REPO,
		branch: env.GITHUB_BRANCH || "main",
	};
}

function toBase64(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let binary = "";
	bytes.forEach((b) => (binary += String.fromCharCode(b)));
	return btoa(binary);
}

function fromBase64(b64: string): string {
	const binary = atob(b64.replace(/\n/g, ""));
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return new TextDecoder().decode(bytes);
}

async function contentsRequest(
	config: GitHubConfig,
	path: string,
	init: RequestInit,
): Promise<Response> {
	return fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${config.token}`,
			Accept: "application/vnd.github+json",
			"Content-Type": "application/json",
			"User-Agent": "buzzyfly-admin-console",
			...init.headers,
		},
	});
}

export interface GitHubFile {
	content: string;
	sha: string;
}

/** Fetches a file's text content + blob sha, or null if it doesn't exist. */
export async function getFile(config: GitHubConfig, path: string): Promise<GitHubFile | null> {
	const res = await contentsRequest(config, `${path}?ref=${config.branch}`, { method: "GET" });
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`GitHub getFile(${path}) failed: ${res.status} ${await res.text()}`);

	const data = (await res.json()) as { content: string; sha: string };
	return { content: fromBase64(data.content), sha: data.sha };
}

/** Creates or updates a file. Pass `sha` (from `getFile`) when updating an existing file. */
export async function putFile(
	config: GitHubConfig,
	path: string,
	content: string,
	message: string,
	sha?: string,
): Promise<{ sha: string; commitUrl: string }> {
	const res = await contentsRequest(config, path, {
		method: "PUT",
		body: JSON.stringify({
			message,
			content: toBase64(content),
			branch: config.branch,
			...(sha ? { sha } : {}),
		}),
	});
	if (!res.ok) throw new Error(`GitHub putFile(${path}) failed: ${res.status} ${await res.text()}`);

	const data = (await res.json()) as { content: { sha: string }; commit: { html_url: string } };
	return { sha: data.content.sha, commitUrl: data.commit.html_url };
}

export async function deleteFile(
	config: GitHubConfig,
	path: string,
	sha: string,
	message: string,
): Promise<void> {
	const res = await contentsRequest(config, path, {
		method: "DELETE",
		body: JSON.stringify({ message, sha, branch: config.branch }),
	});
	if (!res.ok)
		throw new Error(`GitHub deleteFile(${path}) failed: ${res.status} ${await res.text()}`);
}

// --- Blog post frontmatter -------------------------------------------------

export interface BlogPostFields {
	title: string;
	description: string;
	pubDate: string;
	updatedDate?: string;
	heroImage?: string;
	featuredProductTitle?: string;
	featuredProductPrice?: string;
	featuredProductUrl?: string;
	featuredProductDescription?: string;
}

const FRONTMATTER_KEYS: (keyof BlogPostFields)[] = [
	"title",
	"description",
	"pubDate",
	"updatedDate",
	"heroImage",
	"featuredProductTitle",
	"featuredProductPrice",
	"featuredProductUrl",
	"featuredProductDescription",
];

/** Serializes post fields + markdown body into a `src/content/blog/*.md` file. */
export function buildPostMarkdown(fields: BlogPostFields, body: string): string {
	const lines = ["---"];
	for (const key of FRONTMATTER_KEYS) {
		const value = fields[key];
		if (value) lines.push(`${key}: ${JSON.stringify(value)}`);
	}
	lines.push("---", "", body.trim(), "");
	return lines.join("\n");
}

/** Parses a `src/content/blog/*.md` file back into its frontmatter fields + body. */
export function parsePostMarkdown(raw: string): { fields: BlogPostFields; body: string } {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return { fields: { title: "", description: "", pubDate: "" }, body: raw };

	const [, frontmatter, body] = match;
	const fields: Record<string, string> = {};

	for (const line of frontmatter.split(/\r?\n/)) {
		const lineMatch = line.match(/^(\w+):\s*(.*)$/);
		if (!lineMatch) continue;
		const [, key, rawValue] = lineMatch;
		const trimmed = rawValue.trim();
		try {
			fields[key] = trimmed.startsWith('"') ? JSON.parse(trimmed) : trimmed;
		} catch {
			fields[key] = trimmed;
		}
	}

	return {
		fields: {
			title: fields.title ?? "",
			description: fields.description ?? "",
			pubDate: fields.pubDate ?? "",
			updatedDate: fields.updatedDate,
			heroImage: fields.heroImage,
			featuredProductTitle: fields.featuredProductTitle,
			featuredProductPrice: fields.featuredProductPrice,
			featuredProductUrl: fields.featuredProductUrl,
			featuredProductDescription: fields.featuredProductDescription,
		},
		body: body.trim(),
	};
}

export function slugify(title: string): string {
	return title
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

// --- Site settings (src/data/monetization.ts) -------------------------------

export const MONETIZATION_CONFIG_PATH = "src/data/monetization.ts";

const PATCHABLE_SETTINGS_KEYS = [
	"brandName",
	"siteUrl",
	"defaultProductTitle",
	"defaultProductPrice",
	"defaultProductDescription",
	"newsletterTitle",
	"newsletterDescription",
] as const;

export type PatchableSettingsKey = (typeof PATCHABLE_SETTINGS_KEYS)[number];

/**
 * Rewrites the string-valued fields of `BUZZYFLY_CONFIG` inside an existing
 * `monetization.ts` source string, leaving everything else (comments,
 * `PRODUCT_FILE_MAP`) untouched. Each key is unique to the config block, so a
 * targeted per-key regex is safe and keeps the diff minimal.
 */
export function patchMonetizationConfig(
	raw: string,
	updates: Partial<Record<PatchableSettingsKey, string>>,
): string {
	let patched = raw;
	for (const key of PATCHABLE_SETTINGS_KEYS) {
		const value = updates[key];
		if (value === undefined) continue;
		const pattern = new RegExp(`(\\b${key}:\\s*)"[^"]*"`);
		patched = patched.replace(pattern, `$1${JSON.stringify(value)}`);
	}
	return patched;
}
