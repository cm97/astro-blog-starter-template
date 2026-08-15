// Key/value store for editable landing-page copy.
//
// Reads always merge over SITE_CONTENT_DEFAULTS, so the site renders correctly
// against an empty table and any key the operator hasn't touched keeps its
// designed default.

import { SITE_CONTENT_DEFAULTS } from "../data/siteDefaults";

export type SiteContent = Record<string, string>;

/**
 * Loads all saved copy merged over the defaults.
 *
 * A database error here would otherwise take down the public landing page, so
 * failures fall back to the defaults and are logged rather than thrown.
 */
export async function getSiteContent(db: D1Database | undefined): Promise<SiteContent> {
	if (!db) return { ...SITE_CONTENT_DEFAULTS };

	try {
		const { results } = await db.prepare("SELECT key, value FROM site_content").all<{
			key: string;
			value: string;
		}>();

		const saved: SiteContent = {};
		for (const row of results ?? []) {
			// An empty saved value means "use the default" rather than
			// "render nothing", which is what an operator clearing a field expects.
			if (row.value.trim() !== "") saved[row.key] = row.value;
		}

		return { ...SITE_CONTENT_DEFAULTS, ...saved };
	} catch (error) {
		console.error("Buzzyfly site content: falling back to defaults —", error);
		return { ...SITE_CONTENT_DEFAULTS };
	}
}

/** Writes a batch of copy changes in a single round trip. */
export async function saveSiteContent(db: D1Database, entries: SiteContent): Promise<void> {
	const timestamp = Math.floor(Date.now() / 1000);
	const statements = Object.entries(entries).map(([key, value]) =>
		db
			.prepare(
				`INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, ?)
				 ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
			)
			.bind(key, value, timestamp),
	);

	if (statements.length > 0) await db.batch(statements);
}
